package handlers

import (
	"backend-sion/config"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
)

// ─────────────────────────────────────────────────────────────────────────────
// Telegram channel ingestion for the Music module.
//
// The bot must be an admin of the worship channel. It long-polls getUpdates
// for channel_post audio messages and upserts references (file_id) into
// music_telegram_files. Downloads are proxied on-demand so the bot token is
// never exposed to the client and Telegram remains the file store — nothing to
// copy, nothing to delete weekly.
//
// Env:
//
//	TELEGRAM_BOT_TOKEN        — from BotFather
//	TELEGRAM_MUSIC_CHANNEL_ID — numeric channel id (e.g. -1001234567890)
//
// ─────────────────────────────────────────────────────────────────────────────
const telegramAPIBase = "https://api.telegram.org"

func telegramToken() string { return strings.TrimSpace(os.Getenv("TELEGRAM_BOT_TOKEN")) }

func telegramChannelID() int64 {
	id, _ := strconv.ParseInt(strings.TrimSpace(os.Getenv("TELEGRAM_MUSIC_CHANNEL_ID")), 10, 64)
	return id
}

func telegramConfigured() bool { return telegramToken() != "" && telegramChannelID() != 0 }

// tgIngestedFile is the normalized shape we persist.
type tgIngestedFile struct {
	FileID       string
	FileUniqueID string
	MessageID    int64
	FileName     string
	Title        string
	Performer    string
	MimeType     string
	Duration     int
	FileSize     int64
	Date         int64 // unix seconds
}

// ── getUpdates payload (only the fields we need) ──
type tgAudio struct {
	FileID       string `json:"file_id"`
	FileUniqueID string `json:"file_unique_id"`
	FileName     string `json:"file_name"`
	Title        string `json:"title"`
	Performer    string `json:"performer"`
	MimeType     string `json:"mime_type"`
	Duration     int    `json:"duration"`
	FileSize     int64  `json:"file_size"`
}

type tgMessage struct {
	MessageID int64 `json:"message_id"`
	Date      int64 `json:"date"`
	Chat      struct {
		ID int64 `json:"id"`
	} `json:"chat"`
	Audio    *tgAudio `json:"audio"`
	Document *tgAudio `json:"document"`
}

type tgUpdate struct {
	UpdateID    int64      `json:"update_id"`
	ChannelPost *tgMessage `json:"channel_post"`
}

type tgUpdatesResponse struct {
	OK     bool       `json:"ok"`
	Result []tgUpdate `json:"result"`
}

// parseChannelAudios extracts audio files from a getUpdates response body.
func parseChannelAudios(body []byte, channelID int64) ([]tgIngestedFile, int64, error) {
	var resp tgUpdatesResponse
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, 0, err
	}
	if !resp.OK {
		return nil, 0, fmt.Errorf("telegram getUpdates returned ok=false")
	}
	var files []tgIngestedFile
	var maxUpdate int64
	for _, u := range resp.Result {
		if u.UpdateID > maxUpdate {
			maxUpdate = u.UpdateID
		}
		post := u.ChannelPost
		if post == nil {
			continue
		}
		if channelID != 0 && post.Chat.ID != channelID {
			continue
		}
		a := post.Audio
		if a == nil && post.Document != nil && strings.HasPrefix(post.Document.MimeType, "audio") {
			a = post.Document
		}
		if a == nil || a.FileUniqueID == "" {
			continue
		}
		files = append(files, tgIngestedFile{
			FileID: a.FileID, FileUniqueID: a.FileUniqueID, MessageID: post.MessageID,
			FileName: a.FileName, Title: a.Title, Performer: a.Performer,
			MimeType: a.MimeType, Duration: a.Duration, FileSize: a.FileSize, Date: post.Date,
		})
	}
	return files, maxUpdate, nil
}

// StartTelegramIngestion launches the long-poll goroutine. No-op (with a log
// line) when the bot isn't configured, so the rest of the module works without it.
// music_telegram_files is NOT church-scoped in the background ingestion:
// files are global audio assets. When the HTTP handler lists them, it filters by church_id.
func StartTelegramIngestion() {
	if !telegramConfigured() {
		log.Println("[telegram] not configured (TELEGRAM_BOT_TOKEN / TELEGRAM_MUSIC_CHANNEL_ID) — channel ingestion disabled")
		return
	}
	go func() {
		log.Println("[telegram] channel ingestion started")
		var offset int64
		client := &http.Client{Timeout: 70 * time.Second}
		for {
			files, maxUpdate, err := fetchTelegramUpdates(client, offset)
			if err != nil {
				log.Printf("[telegram] getUpdates error: %v", err)
				time.Sleep(10 * time.Second)
				continue
			}
			if maxUpdate >= offset {
				offset = maxUpdate + 1
			}
			if len(files) == 0 {
				continue
			}
			db := config.GetDB()
			if db == nil || db.DB == nil {
				log.Println("[telegram] DB unavailable, skipping batch")
				continue
			}
			n := 0
			for _, f := range files {
				if err := upsertTelegramFile(db.DB, f); err != nil {
					log.Printf("[telegram] upsert error (%s): %v", f.FileUniqueID, err)
					continue
				}
				n++
			}
			if n > 0 {
				log.Printf("[telegram] ingested %d audio file(s)", n)
			}
		}
	}()
}

func fetchTelegramUpdates(client *http.Client, offset int64) ([]tgIngestedFile, int64, error) {
	q := url.Values{}
	q.Set("timeout", "50")
	q.Set("offset", strconv.FormatInt(offset, 10))
	q.Set("allowed_updates", `["channel_post"]`)
	endpoint := fmt.Sprintf("%s/bot%s/getUpdates?%s", telegramAPIBase, telegramToken(), q.Encode())
	resp, err := client.Get(endpoint)
	if err != nil {
		return nil, 0, err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, 0, err
	}
	return parseChannelAudios(body, telegramChannelID())
}

// upsertTelegramFile persists a file reference using the global pool.
// music_telegram_files does not have church_id — it is a shared audio asset store.
func upsertTelegramFile(db *sql.DB, f tgIngestedFile) error {
	var channelDate any
	if f.Date > 0 {
		channelDate = time.Unix(f.Date, 0).UTC()
	}
	_, err := db.Exec(`
		INSERT INTO music_telegram_files
			(file_unique_id, file_id, message_id, file_name, title, performer, mime_type, duration, file_size, channel_date)
		VALUES ($1,$2,$3,NULLIF($4,''),NULLIF($5,''),NULLIF($6,''),NULLIF($7,''),$8,$9,$10)
		ON CONFLICT (file_unique_id) DO UPDATE SET
			file_id      = EXCLUDED.file_id,
			message_id   = EXCLUDED.message_id,
			file_name    = EXCLUDED.file_name,
			title        = EXCLUDED.title,
			performer    = EXCLUDED.performer,
			mime_type    = EXCLUDED.mime_type,
			duration     = EXCLUDED.duration,
			file_size    = EXCLUDED.file_size,
			channel_date = EXCLUDED.channel_date
	`, f.FileUniqueID, f.FileID, nullableInt64(f.MessageID), f.FileName, f.Title, f.Performer, f.MimeType, f.Duration, f.FileSize, channelDate)
	return err
}

func nullableInt64(v int64) any {
	if v == 0 {
		return nil
	}
	return v
}

// ─────────────────────────────────────────────────────────────────────────────
// HTTP handlers
// ─────────────────────────────────────────────────────────────────────────────

// TelegramStatus reports whether the channel integration is wired up.
func (h *MusicHandler) TelegramStatus(c echo.Context) error {
	return c.JSON(http.StatusOK, map[string]bool{"configured": telegramConfigured()})
}

// ListTelegramFiles returns ingested audio files, newest first, optional ?q= search.
// music_telegram_files is a shared store (no church_id). All authenticated users
// of a church can list the shared audio assets.
func (h *MusicHandler) ListTelegramFiles(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	qParam := strings.ToLower(strings.TrimSpace(c.QueryParam("q")))
	limit := 50
	if l, e := strconv.Atoi(c.QueryParam("limit")); e == nil && l > 0 && l <= 200 {
		limit = l
	}
	rows, err := q.Query(`
		SELECT id::text, COALESCE(title,''), COALESCE(file_name,''), COALESCE(performer,''),
		       COALESCE(mime_type,''), COALESCE(duration,0), COALESCE(file_size,0),
		       COALESCE(to_char(channel_date,'YYYY-MM-DD"T"HH24:MI:SS"Z"'),'')
		FROM music_telegram_files
		WHERE ($1 = '' OR lower(coalesce(title, file_name, '')) LIKE '%' || $1 || '%')
		ORDER BY channel_date DESC NULLS LAST, created_at DESC
		LIMIT $2
	`, qParam, limit)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "no se pudieron listar los archivos"})
	}
	defer rows.Close()

	type fileDTO struct {
		ID          string `json:"id"`
		Title       string `json:"title"`
		FileName    string `json:"file_name"`
		Performer   string `json:"performer"`
		MimeType    string `json:"mime_type"`
		Duration    int    `json:"duration"`
		FileSize    int64  `json:"file_size"`
		ChannelDate string `json:"channel_date"`
	}
	out := []fileDTO{}
	for rows.Next() {
		var d fileDTO
		if err := rows.Scan(&d.ID, &d.Title, &d.FileName, &d.Performer, &d.MimeType, &d.Duration, &d.FileSize, &d.ChannelDate); err != nil {
			continue
		}
		out = append(out, d)
	}
	return c.JSON(http.StatusOK, out)
}

// DownloadTelegramFile proxies a file from Telegram. The bytes stream through
// the backend so the bot token never reaches the client.
func (h *MusicHandler) DownloadTelegramFile(c echo.Context) error {
	if !telegramConfigured() {
		return c.JSON(http.StatusServiceUnavailable, map[string]string{"error": "Telegram no está configurado"})
	}
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	id := c.Param("id")
	var fileID, fileName, mimeType string
	if err := q.QueryRow(`
		SELECT file_id,
		       COALESCE(NULLIF(file_name,''), NULLIF(title,''), 'audio'),
		       COALESCE(NULLIF(mime_type,''), 'application/octet-stream')
		FROM music_telegram_files WHERE id = $1
	`, id).Scan(&fileID, &fileName, &mimeType); err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "archivo no encontrado"})
	}

	client := &http.Client{Timeout: 60 * time.Second}

	filePath, err := telegramGetFilePath(client, fileID)
	if err != nil {
		return c.JSON(http.StatusBadGateway, map[string]string{"error": "no se pudo obtener el archivo de Telegram"})
	}

	fileURL := fmt.Sprintf("%s/file/bot%s/%s", telegramAPIBase, telegramToken(), filePath)
	resp, err := client.Get(fileURL)
	if err != nil {
		return c.JSON(http.StatusBadGateway, map[string]string{"error": "no se pudo descargar el archivo"})
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return c.JSON(http.StatusBadGateway, map[string]string{"error": "Telegram devolvió un error al descargar"})
	}

	c.Response().Header().Set("Content-Type", mimeType)
	c.Response().Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%q", sanitizeFilename(fileName)))
	if cl := resp.Header.Get("Content-Length"); cl != "" {
		c.Response().Header().Set("Content-Length", cl)
	}
	c.Response().WriteHeader(http.StatusOK)
	_, err = io.Copy(c.Response().Writer, resp.Body)
	return err
}

func telegramGetFilePath(client *http.Client, fileID string) (string, error) {
	endpoint := fmt.Sprintf("%s/bot%s/getFile?file_id=%s", telegramAPIBase, telegramToken(), url.QueryEscape(fileID))
	resp, err := client.Get(endpoint)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	var parsed struct {
		OK     bool `json:"ok"`
		Result struct {
			FilePath string `json:"file_path"`
		} `json:"result"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&parsed); err != nil {
		return "", err
	}
	if !parsed.OK || parsed.Result.FilePath == "" {
		return "", fmt.Errorf("getFile failed")
	}
	return parsed.Result.FilePath, nil
}

func sanitizeFilename(name string) string {
	name = strings.ReplaceAll(name, "\"", "")
	name = strings.ReplaceAll(name, "/", "-")
	name = strings.ReplaceAll(name, "\\", "-")
	if strings.TrimSpace(name) == "" {
		return "audio"
	}
	return name
}

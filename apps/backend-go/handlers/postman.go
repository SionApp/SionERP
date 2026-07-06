package handlers

import (
	"fmt"
	"net/http"
	"os"
	"sort"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
)

// ─── Postman Collection v2.1 structs ────────────────────────────────────────

type postmanCollection struct {
	Info     postmanInfo     `json:"info"`
	Item     []postmanFolder `json:"item"`
	Variable []postmanVar    `json:"variable"`
}

type postmanInfo struct {
	PostmanID string `json:"_postman_id"`
	Name      string `json:"name"`
	Schema    string `json:"schema"`
}

type postmanFolder struct {
	Name string        `json:"name"`
	Item []postmanItem `json:"item"`
}

type postmanItem struct {
	Name    string         `json:"name"`
	Request postmanRequest `json:"request"`
}

type postmanRequest struct {
	Method string          `json:"method"`
	Header []postmanHeader `json:"header"`
	Body   *postmanBody    `json:"body,omitempty"`
	URL    postmanURL      `json:"url"`
}

type postmanHeader struct {
	Key   string `json:"key"`
	Value string `json:"value"`
	Type  string `json:"type"`
}

type postmanBody struct {
	Mode    string             `json:"mode"`
	Raw     string             `json:"raw"`
	Options postmanBodyOptions `json:"options"`
}

type postmanBodyOptions struct {
	Raw postmanBodyRaw `json:"raw"`
}

type postmanBodyRaw struct {
	Language string `json:"language"`
}

type postmanURL struct {
	Raw      string          `json:"raw"`
	Host     []string        `json:"host"`
	Path     []string        `json:"path"`
	Variable []postmanPathVar `json:"variable,omitempty"`
}

type postmanPathVar struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}

type postmanVar struct {
	Key   string `json:"key"`
	Value string `json:"value"`
	Type  string `json:"type"`
}

// ─── Handler ─────────────────────────────────────────────────────────────────

type PostmanHandler struct{}

func NewPostmanHandler() *PostmanHandler {
	return &PostmanHandler{}
}

// publicPaths no requieren Authorization header
var publicPaths = map[string]bool{
	"/api/v1/health":       true,
	"/api/v1/auth/login":   true,
	"/api/v1/auth/logout":  true,
	"/api/v1/setup":        true,
	"/api/v1/setup/status": true,
}

// folderLabels traduce el segmento de ruta a un nombre legible
var folderLabels = map[string]string{
	"auth":         "🔐 Auth",
	"users":        "👤 Usuarios",
	"dashboard":    "📊 Dashboard",
	"setup":        "⚙️ Setup",
	"modules":      "🧩 Módulos",
	"invitations":  "✉️ Invitaciones",
	"settings":     "🔧 Configuración",
	"preferences":  "🎛️ Preferencias",
	"permissions":  "🛡️ Permisos",
	"discipleship": "⛪ Discipulado",
	"notifications": "🔔 Notificaciones",
	"zones":        "🗺️ Zonas",
	"health":       "💚 Health",
}

func (h *PostmanHandler) ExportCollection(c echo.Context) error {
	// Solo disponible fuera de producción
	if os.Getenv("APP_ENV") == "production" {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "not found"})
	}

	routes := c.Echo().Routes()

	folders := map[string][]postmanItem{}
	folderOrder := []string{}
	seen := map[string]bool{}

	for _, r := range routes {
		// Saltar rutas internas de Echo y el propio endpoint de export
		if strings.Contains(r.Name, "echo") ||
			strings.Contains(r.Path, "/__") ||
			r.Path == "/api/v1/__postman" {
			continue
		}

		dedup := r.Method + " " + r.Path
		if seen[dedup] {
			continue
		}
		seen[dedup] = true

		folder := extractFolderName(r.Path)
		item := buildPostmanItem(r.Method, r.Path)

		if _, exists := folders[folder]; !exists {
			folders[folder] = []postmanItem{}
			folderOrder = append(folderOrder, folder)
		}
		folders[folder] = append(folders[folder], item)
	}

	sort.Strings(folderOrder)

	var items []postmanFolder
	for _, key := range folderOrder {
		label := folderLabels[key]
		if label == "" {
			label = capitalize(key)
		}
		items = append(items, postmanFolder{
			Name: label,
			Item: folders[key],
		})
	}

	collection := postmanCollection{
		Info: postmanInfo{
			PostmanID: fmt.Sprintf("%d", time.Now().UnixNano()),
			Name:      "SionERP API",
			Schema:    "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
		},
		Item: items,
		Variable: []postmanVar{
			{Key: "base_url", Value: "http://localhost:8080", Type: "string"},
			{Key: "token", Value: "", Type: "string"},
		},
	}

	c.Response().Header().Set(
		"Content-Disposition",
		"attachment; filename=sionerp.postman_collection.json",
	)
	return c.JSON(http.StatusOK, collection)
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

func extractFolderName(path string) string {
	// /api/v1/discipleship/goals/:id → "discipleship"
	trimmed := strings.TrimPrefix(path, "/api/v1/")
	parts := strings.SplitN(trimmed, "/", 2)
	if len(parts) > 0 && parts[0] != "" {
		return parts[0]
	}
	return "general"
}

func buildPostmanItem(method, path string) postmanItem {
	rawURL := "{{base_url}}" + path

	// Separar segmentos y detectar path variables
	segments := strings.Split(strings.TrimPrefix(path, "/"), "/")
	var pathParts []string
	var pathVars []postmanPathVar

	for _, seg := range segments {
		if strings.HasPrefix(seg, ":") {
			varName := strings.TrimPrefix(seg, ":")
			pathParts = append(pathParts, ":"+varName)
			pathVars = append(pathVars, postmanPathVar{Key: varName, Value: ""})
		} else {
			pathParts = append(pathParts, seg)
		}
	}

	// Headers
	headers := []postmanHeader{
		{Key: "Content-Type", Value: "application/json", Type: "text"},
	}
	if !publicPaths[path] {
		headers = append(headers, postmanHeader{
			Key:   "Authorization",
			Value: "Bearer {{token}}",
			Type:  "text",
		})
	}

	// Body para métodos con payload
	var body *postmanBody
	if method == "POST" || method == "PUT" || method == "PATCH" {
		body = &postmanBody{
			Mode: "raw",
			Raw:  "{}",
			Options: postmanBodyOptions{
				Raw: postmanBodyRaw{Language: "json"},
			},
		}
	}

	return postmanItem{
		Name: buildItemName(method, path),
		Request: postmanRequest{
			Method: method,
			Header: headers,
			Body:   body,
			URL: postmanURL{
				Raw:      rawURL,
				Host:     []string{"{{base_url}}"},
				Path:     pathParts,
				Variable: pathVars,
			},
		},
	}
}

func buildItemName(method, path string) string {
	// /api/v1/discipleship/goals/:id/assignments → "GET Goals Assignments"
	clean := strings.TrimPrefix(path, "/api/v1/")
	parts := strings.Split(clean, "/")

	var words []string
	for _, p := range parts {
		if strings.HasPrefix(p, ":") || p == "" {
			continue
		}
		words = append(words, capitalize(strings.ReplaceAll(p, "-", " ")))
	}

	return method + " " + strings.Join(words, " ")
}

func capitalize(s string) string {
	if s == "" {
		return s
	}
	return strings.ToUpper(s[:1]) + s[1:]
}

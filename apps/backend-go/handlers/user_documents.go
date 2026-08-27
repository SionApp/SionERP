// Package handlers — CRUD de metadata para documentos adjuntos de usuario
// (issue #58). El archivo en sí se sube directo a Supabase Storage (bucket
// privado church-documents) desde el cliente — mismo patrón que
// avatares/imágenes de eventos. Este handler sólo registra/lista/borra la
// fila de metadata (nombre, path, quién lo subió), vía TenantTx como
// cualquier otra tabla de negocio — el cliente JS no puede escribir acá
// directo porque la RLS de user_documents depende de
// current_setting('app.current_church_id'), que sólo TenantTx setea.
package handlers

import (
	"net/http"

	"backend-sion/utils"

	"github.com/labstack/echo/v4"
)

type UserDocumentsHandler struct{}

func NewUserDocumentsHandler() *UserDocumentsHandler { return &UserDocumentsHandler{} }

// canManageUserDocuments: staff+ gestiona cualquiera; un usuario gestiona
// los suyos propios — mismo criterio que UpdateUser para el propio perfil.
func canManageUserDocuments(c echo.Context, targetUserID string) bool {
	currentUserID, _ := c.Get("user_id").(string)
	currentRole, _ := c.Get("db_role").(string)
	return currentUserID == targetUserID || utils.IsAdminRole(currentRole)
}

type userDocumentDTO struct {
	ID          string `json:"id"`
	FileName    string `json:"file_name"`
	StoragePath string `json:"storage_path"`
	UploadedBy  string `json:"uploaded_by_name"`
	CreatedAt   string `json:"created_at"`
}

// GetDocuments GET /users/:id/documents
func (h *UserDocumentsHandler) GetDocuments(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	userID := c.Param("id")
	if !canManageUserDocuments(c, userID) {
		return c.JSON(http.StatusForbidden, map[string]string{"error": "no tenés acceso a estos documentos"})
	}
	churchID, _ := c.Get("church_id").(string)

	rows, err := q.Query(`
		SELECT d.id, d.file_name, d.storage_path,
		       COALESCE(TRIM(u.first_name || ' ' || u.last_name), 'Sistema'),
		       to_char(d.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
		FROM user_documents d
		LEFT JOIN users u ON u.id = d.uploaded_by AND u.church_id = $1
		WHERE d.user_id = $2 AND d.church_id = $1
		ORDER BY d.created_at DESC
	`, churchID, userID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "no se pudieron listar los documentos"})
	}
	defer rows.Close()

	out := []userDocumentDTO{}
	for rows.Next() {
		var d userDocumentDTO
		if err := rows.Scan(&d.ID, &d.FileName, &d.StoragePath, &d.UploadedBy, &d.CreatedAt); err != nil {
			continue
		}
		out = append(out, d)
	}
	return c.JSON(http.StatusOK, out)
}

type createUserDocumentRequest struct {
	FileName    string `json:"file_name"`
	StoragePath string `json:"storage_path"`
}

// CreateDocument POST /users/:id/documents — registra la metadata DESPUÉS
// de que el archivo ya se subió a Storage (el frontend arma storage_path
// con el prefijo {church_id}/{user_id}/... que exige la política de RLS).
func (h *UserDocumentsHandler) CreateDocument(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	userID := c.Param("id")
	if !canManageUserDocuments(c, userID) {
		return c.JSON(http.StatusForbidden, map[string]string{"error": "no tenés acceso a estos documentos"})
	}
	churchID, _ := c.Get("church_id").(string)
	uploadedBy, _ := c.Get("user_id").(string)

	var req createUserDocumentRequest
	if err := c.Bind(&req); err != nil || req.FileName == "" || req.StoragePath == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "file_name y storage_path son obligatorios"})
	}

	_, err = q.Exec(`
		INSERT INTO user_documents (church_id, user_id, file_name, storage_path, uploaded_by)
		VALUES ($1, $2, $3, $4, NULLIF($5,'')::uuid)
	`, churchID, userID, req.FileName, req.StoragePath, uploadedBy)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "no se pudo registrar el documento"})
	}
	return c.JSON(http.StatusCreated, map[string]string{"message": "Documento registrado"})
}

// DeleteDocument DELETE /users/:id/documents/:docId — sólo borra la fila de
// metadata; borrar el archivo del Storage es responsabilidad del frontend
// (mismo storage_path que ya conoce), consistente con cómo se maneja el
// borrado de imágenes de eventos.
func (h *UserDocumentsHandler) DeleteDocument(c echo.Context) error {
	q, err := validateTx(c)
	if err != nil {
		return err
	}
	userID := c.Param("id")
	if !canManageUserDocuments(c, userID) {
		return c.JSON(http.StatusForbidden, map[string]string{"error": "no tenés acceso a estos documentos"})
	}
	churchID, _ := c.Get("church_id").(string)
	docID := c.Param("docId")

	result, err := q.Exec(`DELETE FROM user_documents WHERE id = $1::uuid AND user_id = $2 AND church_id = $3`,
		docID, userID, churchID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "no se pudo eliminar el documento"})
	}
	if n, _ := result.RowsAffected(); n == 0 {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "documento no encontrado"})
	}
	return c.JSON(http.StatusOK, map[string]string{"message": "Documento eliminado"})
}

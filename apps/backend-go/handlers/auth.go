package handlers

import (
	"backend-sion/config"
	"backend-sion/models"
	"net/http"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/labstack/echo/v4"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct{}

type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=6"`
}

type LoginResponse struct {
	Token string      `json:"token"`
	User  models.User `json:"user"`
}

func NewAuthHandler() *AuthHandler {
	return &AuthHandler{}
}

// Login inicia la sesión de un usuario
func (h *AuthHandler) Login(c echo.Context) error {
	var req LoginRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid request body",
		})
	}

	db := config.GetDB()

	query := `SELECT id, first_name, last_name, email, phone, address, 
              id_number, role, baptized, baptism_date, whatsapp, 
              password_hash, created_at, updated_at FROM users WHERE email = $1`

	var user models.User
	var passwordHash string

	err := db.DB.QueryRow(query, req.Email).Scan(
		&user.ID, &user.FirstName, &user.LastName, &user.Email, &user.Phone, &user.Address,
		&user.IdNumber, &user.Role, &user.Baptized, &user.BaptismDate, &user.WhatsApp,
		&passwordHash, &user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error logging in",
		})
	}

	// validate password
	err = bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(req.Password))
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "Invalid email or password",
		})
	}

	// validate jwt

	token, err := generateJWT(user.ID, user.Email, user.Role)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Error generating JWT token",
		})
	}

	return c.JSON(http.StatusOK, LoginResponse{
		Token: token,
		User:  user,
	})
}

// Logout cierra la sesión de un usuario
func (h *AuthHandler) Logout(c echo.Context) error {
	return c.JSON(http.StatusOK, map[string]string{
		"message": "Logout successful",
	})
}

func generateJWT(userID, email, role string) (string, error) {
	claims := jwt.MapClaims{
		"sub":   userID,
		"email": email,
		"role":  role,
		"exp":   time.Now().Add(time.Hour * 24).Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	secret := os.Getenv("JWT_SECRET")

	return token.SignedString([]byte(secret))
}

// Register registra un nuevo usuario
func (h *AuthHandler) Register(c echo.Context) error {
	return c.JSON(http.StatusOK, map[string]string{
		"message": "Register successful",
	})
}

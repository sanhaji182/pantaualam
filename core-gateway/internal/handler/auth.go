package handler

/*
=============================================================================
HANDLER REST API: AUTENTIKASI & USER BOOKMARKS (Golang)
File: internal/handler/auth.go
Deskripsi:
Mengelola pendaftaran pengguna (bcrypt hashing), otentikasi (JWT Token issue),
serta manajemen kota favorit (bookmarks) pengguna yang terproteksi token.
=============================================================================
*/

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"pantaualam/core-gateway/internal/config"
	"pantaualam/core-gateway/internal/middleware"
	"pantaualam/core-gateway/internal/model"
)

// AuthHandler mengelola request registrasi, login, dan bookmark
type AuthHandler struct {
	db  *sql.DB
	cfg *config.Config
}

// NewAuthHandler membuat instance baru AuthHandler
func NewAuthHandler(db *sql.DB, cfg *config.Config) *AuthHandler {
	return &AuthHandler{db: db, cfg: cfg}
}

// Register mendaftarkan pengguna baru dengan password yang di-hash bcrypt
// Endpoint: POST /api/v1/auth/register
func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	var req model.RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(model.APIResponse{
			Status:  false,
			Message: "Format payload request JSON tidak valid.",
		})
		return
	}

	if req.Email == "" || req.Password == "" || req.NamaLengkap == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(model.APIResponse{
			Status:  false,
			Message: "Nama lengkap, email, dan password wajib diisi.",
		})
		return
	}

	// 1. Hash password menggunakan bcrypt dengan cost faktor standar (10)
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(model.APIResponse{
			Status:  false,
			Message: "Gagal memproses enkripsi password.",
		})
		return
	}

	// 2. Simpan user baru ke database PostgreSQL
	query := `
		INSERT INTO users (nama_lengkap, email, password_hash, role)
		VALUES ($1, $2, $3, 'USER')
		RETURNING id, nama_lengkap, email, role, created_at;
	`

	var u model.User
	err = h.db.QueryRow(query, req.NamaLengkap, req.Email, string(hashedPassword)).Scan(
		&u.ID, &u.Nama, &u.Email, &u.Role, &u.CreatedAt,
	)

	if err != nil {
		w.WriteHeader(http.StatusConflict)
		json.NewEncoder(w).Encode(model.APIResponse{
			Status:  false,
			Message: "Email tersebut sudah terdaftar di sistem. Gunakan email lain.",
		})
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(model.APIResponse{
		Status:  true,
		Message: "Registrasi pengguna berhasil. Silakan login.",
		Data:    u,
	})
}

// Login memverifikasi kredensial dan menerbitkan token JWT
// Endpoint: POST /api/v1/auth/login
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	var req model.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(model.APIResponse{
			Status:  false,
			Message: "Format payload request JSON tidak valid.",
		})
		return
	}

	// 1. Cari data user berdasarkan email
	query := `
		SELECT id, nama_lengkap, email, password_hash, role, created_at
		FROM users
		WHERE email = $1;
	`

	var u model.User
	var passwordHash string

	err := h.db.QueryRow(query, req.Email).Scan(
		&u.ID, &u.Nama, &u.Email, &passwordHash, &u.Role, &u.CreatedAt,
	)

	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(model.APIResponse{
			Status:  false,
			Message: "Email atau password yang Anda masukkan salah.",
		})
		return
	}

	// 2. Komparasi kecocokan password teks polos dengan hash bcrypt
	if err := bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(req.Password)); err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(model.APIResponse{
			Status:  false,
			Message: "Email atau password yang Anda masukkan salah.",
		})
		return
	}

	// 3. Terbitkan Token JWT yang berlaku selama 24 jam
	tokenExpiry := time.Now().Add(24 * time.Hour)
	claims := jwt.MapClaims{
		"user_id": u.ID,
		"email":   u.Email,
		"role":    u.Role,
		"exp":     tokenExpiry.Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(h.cfg.JWTSecret))
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(model.APIResponse{
			Status:  false,
			Message: "Gagal membuat token autentikasi.",
		})
		return
	}

	json.NewEncoder(w).Encode(model.APIResponse{
		Status:  true,
		Message: "Login berhasil.",
		Data: model.AuthResponse{
			Token: tokenString,
			User:  u,
		},
	})
}

// GetBookmarks mengambil daftar kota yang ditandai sebagai favorit oleh pengguna
// Endpoint: GET /api/v1/user/bookmarks (Terproteksi JWT)
func (h *AuthHandler) GetBookmarks(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	// Ekstrak user_id yang disisipkan oleh middleware JWTAuth
	userID, ok := r.Context().Value(middleware.UserIDContextKey).(string)
	if !ok || userID == "" {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(model.APIResponse{Status: false, Message: "Sesi tidak valid."})
		return
	}

	query := `
		SELECT k.id, k.nama, p.nama AS provinsi, k.latitude, k.longitude,
		       c.suhu_saat_ini, c.kondisi_cuaca, c.ikon_cuaca_url
		FROM user_bookmarks b
		JOIN wilayah_kota k ON b.kota_id = k.id
		JOIN wilayah_provinsi p ON k.provinsi_id = p.id
		LEFT JOIN data_cuaca c ON k.id = c.kota_id
		WHERE b.user_id = $1
		ORDER BY b.created_at DESC;
	`

	rows, err := h.db.Query(query, userID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(model.APIResponse{
			Status:  false,
			Message: "Gagal mengambil daftar bookmark: " + err.Error(),
		})
		return
	}
	defer rows.Close()

	list := make([]map[string]interface{}, 0)
	for rows.Next() {
		var kotaID, nama, provinsi, kondisi, ikon string
		var lat, lon float64
		var suhu sql.NullFloat64

		if err := rows.Scan(&kotaID, &nama, &provinsi, &lat, &lon, &suhu, &kondisi, &ikon); err == nil {
			item := map[string]interface{}{
				"kota_id":        kotaID,
				"nama":           nama,
				"provinsi":       provinsi,
				"latitude":       lat,
				"longitude":      lon,
				"suhu":           suhu.Float64,
				"kondisi":        kondisi,
				"ikon_cuaca_url": ikon,
			}
			list = append(list, item)
		}
	}

	json.NewEncoder(w).Encode(model.APIResponse{
		Status:  true,
		Message: "Daftar bookmark berhasil diambil.",
		Data:    list,
	})
}

// AddBookmark menambahkan kota ke daftar favorit pengguna
// Endpoint: POST /api/v1/user/bookmarks (Terproteksi JWT)
func (h *AuthHandler) AddBookmark(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	userID, _ := r.Context().Value(middleware.UserIDContextKey).(string)

	var req model.BookmarkRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.KotaID == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(model.APIResponse{Status: false, Message: "Parameter kota_id wajib diisi."})
		return
	}

	query := `
		INSERT INTO user_bookmarks (user_id, kota_id)
		VALUES ($1, $2)
		ON CONFLICT DO NOTHING;
	`

	if _, err := h.db.Exec(query, userID, req.KotaID); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(model.APIResponse{Status: false, Message: "Gagal menyimpan bookmark: " + err.Error()})
		return
	}

	json.NewEncoder(w).Encode(model.APIResponse{
		Status:  true,
		Message: "Kota berhasil ditambahkan ke daftar favorit.",
	})
}

package middleware

/*
=============================================================================
MODUL MIDDLEWARE (Golang)
File: internal/middleware/middleware.go
Deskripsi:
Menangani Cross-Origin Resource Sharing (CORS), pencatatan log request (logging),
serta proteksi rute berbasis JSON Web Token (JWT) untuk pengguna terautentikasi.
=============================================================================
*/

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"nusantara-weather/core-gateway/internal/config"
	"nusantara-weather/core-gateway/internal/model"
)

type contextKey string

const UserIDContextKey contextKey = "user_id"
const UserEmailContextKey contextKey = "user_email"

// CORS menambahkan header yang mengizinkan web browser / mobile app mengakses API
func CORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Mengizinkan origin web/mobile app mengakses API (konfigurasi CORS gateway)
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		// Jika request adalah pre-flight OPTIONS, langsung akhiri dengan status OK (200)
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// Logger mencatat durasi proses setiap request yang masuk ke konsol
func Logger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		log.Printf("[%s] %s | Durasi: %v", r.Method, r.URL.Path, time.Since(start))
	})
}

// JWTAuth memvalidasi token JWT pada header 'Authorization: Bearer <token>'
func JWTAuth(cfg *config.Config) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				sendUnauthorized(w, "Akses ditolak: Header Authorization tidak ditemukan.")
				return
			}

			// Format header harus: "Bearer <token>"
			parts := strings.Split(authHeader, " ")
			if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
				sendUnauthorized(w, "Format token tidak valid. Gunakan: Bearer <token>")
				return
			}

			tokenString := parts[1]

			// Parse dan verifikasi tanda tangan token dengan secret key
			token, err := jwt.Parse(tokenString, func(t *jwt.Token) (interface{}, error) {
				if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, jwt.ErrSignatureInvalid
				}
				return []byte(cfg.JWTSecret), nil
			})

			if err != nil || !token.Valid {
				sendUnauthorized(w, "Token tidak valid atau telah kedaluwarsa.")
				return
			}

			// Ekstrak klaim data (user_id & email) dari token
			claims, ok := token.Claims.(jwt.MapClaims)
			if !ok {
				sendUnauthorized(w, "Klaim token tidak dapat dibaca.")
				return
			}

			userID, _ := claims["user_id"].(string)
			email, _ := claims["email"].(string)

			// Simpan user_id ke dalam context request agar dapat dibaca di handler berikutnya
			ctx := context.WithValue(r.Context(), UserIDContextKey, userID)
			ctx = context.WithValue(ctx, UserEmailContextKey, email)

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// Helper untuk mengirim respon 401 Unauthorized dalam format JSON
func sendUnauthorized(w http.ResponseWriter, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusUnauthorized)
	json.NewEncoder(w).Encode(model.APIResponse{
		Status:  false,
		Message: msg,
	})
}

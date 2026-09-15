package config

/*
=============================================================================
MODUL KONFIGURASI GATEWAY (Golang)
File: internal/config/config.go
Deskripsi:
Membaca environment variables untuk konfigurasi port HTTP, koneksi database
PostgreSQL, serta kunci rahasia (secret key) untuk penandatanganan token JWT.
=============================================================================
*/

import (
	"os"
)

// Config menampung seluruh variabel konfigurasi aplikasi
type Config struct {
	Port        string // Port tempat HTTP Server berjalan (misal: "8080")
	DBHost      string // Host database PostgreSQL (misal: "localhost" atau "db")
	DBPort      string // Port database PostgreSQL (misal: "5432")
	DBUser      string // Username database
	DBPassword  string // Password database
	DBName      string // Nama database
	JWTSecret   string // Kunci rahasia untuk enkripsi token JWT
}

// LoadConfig membaca variabel lingkungan dari OS, jika tidak ada memakai nilai default
func LoadConfig() *Config {
	return &Config{
		Port:       getEnv("PORT", "8080"),
		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnv("DB_PORT", "5432"),
		DBUser:     getEnv("DB_USER", "postgres"),
		DBPassword: getEnv("DB_PASSWORD", "postgres123"),
		DBName:     getEnv("DB_NAME", "nusantara_weather"),
		JWTSecret:  getEnv("JWT_SECRET", "kunci_rahasia_jwt_nusantara_weather_prod_secure_key"),
	}
}

// getEnv adalah fungsi pembantu (helper) untuk mengambil nilai env atau fallback default
func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}

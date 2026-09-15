package db

/*
=============================================================================
MODUL KONEKSI DATABASE (Golang + PostgreSQL)
File: internal/db/postgres.go
Deskripsi:
Menginisialisasi connection pool ke database PostgreSQL menggunakan driver lib/pq.
Dilengkapi pengaturan batas koneksi (pooling) untuk performa tinggi & anti-crash.
=============================================================================
*/

import (
	"database/sql"
	"fmt"
	"log"
	"time"

	_ "github.com/lib/pq" // Driver PostgreSQL resmi untuk Go
	"nusantara-weather/core-gateway/internal/config"
)

// InitDB menginisialisasi koneksi ke PostgreSQL dan mengembalikan *sql.DB
func InitDB(cfg *config.Config) (*sql.DB, error) {
	// 1. Format Connection String (DSN) untuk PostgreSQL
	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPassword, cfg.DBName,
	)

	// 2. Membuka koneksi pool ke database
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, fmt.Errorf("gagal membuka koneksi database: %w", err)
	}

	// -------------------------------------------------------------------------
	// 3. Konfigurasi Connection Pool (Best Practice Kinerja Tinggi Produksi)
	// -------------------------------------------------------------------------
	// Batas maksimum koneksi terbuka secara bersamaan (mencegah over-connection)
	db.SetMaxOpenConns(25)
	
	// Jumlah koneksi standby (idle) yang siap digunakan tanpa perlu handshake ulang
	db.SetMaxIdleConns(10)
	
	// Durasi hidup maksimal sebuah koneksi sebelum di-recycle
	db.SetConnMaxLifetime(5 * time.Minute)

	// 4. Verifikasi apakah database benar-benar bisa di-ping
	if err := db.Ping(); err != nil {
		log.Printf("Peringatan: Gagal terhubung ke DB saat startup: %v", err)
		log.Printf("Koneksi akan dicoba ulang secara dinamis saat request pertama.")
	} else {
		log.Println("Koneksi PostgreSQL berhasil tersambung dan siap digunakan.")
	}

	return db, nil
}

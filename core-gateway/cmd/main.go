package main

/*
=============================================================================
ENTRY POINT UTAMA: CORE API GATEWAY (Golang)
File: cmd/main.go
Deskripsi:
Program server utama yang menghubungkan seluruh handler REST API, middleware,
koneksi database PostgreSQL, dan menyajikan port HTTP 8080 secara terpusat.
=============================================================================
*/

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"nusantara-weather/core-gateway/internal/config"
	"nusantara-weather/core-gateway/internal/db"
	"nusantara-weather/core-gateway/internal/handler"
	"nusantara-weather/core-gateway/internal/middleware"
	"nusantara-weather/core-gateway/internal/model"
)

func main() {
	log.Println("==========================================================")
	log.Println("MEMULAI PANTAUALAM DISASTER & CLIMATE MONITOR API GATEWAY")
	log.Println("Production Environment: High-Performance Distributed Gateway")
	log.Println("==========================================================")

	// 1. Memuat konfigurasi lingkungan
	cfg := config.LoadConfig()

	// 2. Membuka koneksi pool ke database PostgreSQL
	database, err := db.InitDB(cfg)
	if err != nil {
		log.Fatalf("Fatal: Inisialisasi database gagal: %v", err)
	}
	defer database.Close()

	// 3. Inisialisasi seluruh Handler REST API
	gempaH := handler.NewGempaHandler(database)
	cuacaH := handler.NewCuacaHandler(database)
	wilayahH := handler.NewWilayahHandler(database)
	authH := handler.NewAuthHandler(database, cfg)
	gunungH := handler.NewGunungHandler(database)

	// 4. Inisialisasi HTTP Router menggunakan ServeMux modern (Go 1.22+)
	// Fitur baru Go 1.22+ mendukung method matching (GET/POST) dan parameter {id}
	mux := http.NewServeMux()

	// -------------------------------------------------------------------------
	// RUTE 1: HEALTH CHECK & ROOT
	// -------------------------------------------------------------------------
	mux.HandleFunc("GET /", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"service":      "PantauAlam Core Gateway",
			"status":       "ONLINE",
			"version":      "1.0.0",
			"orchestrator": "Sanhaji",
			"license":      "MIT (Full Open Source)",
			"author":       "Sanhaji (System Orchestrator) & Open Source Community",
			"docs":         "/api/v1/...",
		})
	})

	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(model.APIResponse{
			Status:  true,
			Message: "Server Gateway dan Database berjalan normal.",
		})
	})

	// -------------------------------------------------------------------------
	// RUTE 2: DATA GEMPA BUMI (Publik)
	// -------------------------------------------------------------------------
	mux.HandleFunc("GET /api/v1/gempa/terkini", gempaH.GetGempaTerkini)
	mux.HandleFunc("GET /api/v1/gempa/riwayat", gempaH.GetGempaRiwayat)
	mux.HandleFunc("GET /api/v1/gempa/dirasakan", gempaH.GetGempaDirasakan)

	// -------------------------------------------------------------------------
	// RUTE 3: DATA CUACA WILAYAH & PERINGATAN DINI (Publik)
	// -------------------------------------------------------------------------
	mux.HandleFunc("GET /api/v1/cuaca", cuacaH.GetAllCuacaSummary)
	mux.HandleFunc("GET /api/v1/cuaca/peringatan-dini", cuacaH.GetPeringatanDini)
	mux.HandleFunc("GET /api/v1/cuaca/{id}", cuacaH.GetCuacaDetail)
	mux.HandleFunc("GET /api/v1/kualitas-udara", cuacaH.GetKualitasUdara)

	// -------------------------------------------------------------------------
	// RUTE 3B: PEMANTAUAN GUNUNG API & ERUPSI TERKINI (PVMBG / MAGMA ESDM)
	// -------------------------------------------------------------------------
	mux.HandleFunc("GET /api/v1/gunung-api", gunungH.GetGunungList)
	mux.HandleFunc("GET /api/v1/gunung-api/erupsi", gunungH.GetErupsiList)
	mux.HandleFunc("GET /api/v1/gunung-api/summary", gunungH.GetGunungSummary)

	// -------------------------------------------------------------------------
	// RUTE 4: DATA MASTER WILAYAH (Publik)
	// -------------------------------------------------------------------------
	mux.HandleFunc("GET /api/v1/wilayah/provinsi", wilayahH.GetProvinsi)
	mux.HandleFunc("GET /api/v1/wilayah/kota", wilayahH.GetKota)

	// -------------------------------------------------------------------------
	// RUTE 5: AUTENTIKASI PENGGUNA (Publik)
	// -------------------------------------------------------------------------
	mux.HandleFunc("POST /api/v1/auth/register", authH.Register)
	mux.HandleFunc("POST /api/v1/auth/login", authH.Login)

	// -------------------------------------------------------------------------
	// RUTE 6: FITUR USER BOOKMARKS (Terproteksi JWT)
	// -------------------------------------------------------------------------
	jwtProtected := middleware.JWTAuth(cfg)
	mux.Handle("GET /api/v1/user/bookmarks", jwtProtected(http.HandlerFunc(authH.GetBookmarks)))
	mux.Handle("POST /api/v1/user/bookmarks", jwtProtected(http.HandlerFunc(authH.AddBookmark)))

	// 5. Menerapkan Middleware Global: Logging & CORS
	handlerWithMiddleware := middleware.Logger(middleware.CORS(mux))

	// 6. Konfigurasi Server HTTP dengan Timeout Aman (Anti-Slowloris Attack)
	server := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      handlerWithMiddleware,
		ReadTimeout:  10 * time.Second, // Batas baca request
		WriteTimeout: 15 * time.Second, // Batas kirim respon
		IdleTimeout:  60 * time.Second, // Batas koneksi idle
	}

	// 7. Menjalankan Server dalam Goroutine (Asynchronous)
	go func() {
		log.Printf("Server Core Gateway aktif dan mendengarkan di http://localhost:%s\n", cfg.Port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Fatal: Gagal menjalankan server HTTP: %v", err)
		}
	}()

	// 8. Graceful Shutdown (Menutup server dengan aman saat sinyal OS diterima)
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit // Menunggu sinyal Ctrl+C atau terminasi Docker

	log.Println("Menerima sinyal mematikan server... Memulai Graceful Shutdown.")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Fatalf("Server dipaksa berhenti karena timeout: %v", err)
	}

	log.Println("Server Gateway berhasil dinonaktifkan dengan bersih.")
}

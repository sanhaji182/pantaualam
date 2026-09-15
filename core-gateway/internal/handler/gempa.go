package handler

/*
=============================================================================
HANDLER REST API: DATA GEMPA BUMI (Golang)
File: internal/handler/gempa.go
Deskripsi:
Menyajikan data gempa bumi terkini dan riwayat gempa.
Dilengkapi In-Memory Cache (RAM) selama 60 detik untuk kecepatan akses super tinggi (<5ms).
=============================================================================
*/

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"nusantara-weather/core-gateway/internal/model"
)

// In-Memory Cache untuk menghindari query berulang ke database dalam waktu berdekatan
type gempaCache struct {
	sync.RWMutex
	data      *model.Gempa
	expiredAt time.Time
}

var latestCache = &gempaCache{}

// GempaHandler mengelola request HTTP terkait gempa bumi
type GempaHandler struct {
	db *sql.DB
}

// NewGempaHandler membuat instance baru GempaHandler
func NewGempaHandler(db *sql.DB) *GempaHandler {
	return &GempaHandler{db: db}
}

// GetGempaTerkini mengambil 1 rekaman gempa bumi paling baru
// Endpoint: GET /api/v1/gempa/terkini
func (h *GempaHandler) GetGempaTerkini(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	// 1. Cek In-Memory Cache terlebih dahulu
	latestCache.RLock()
	if latestCache.data != nil && time.Now().Before(latestCache.expiredAt) {
		cachedData := latestCache.data
		latestCache.RUnlock()

		json.NewEncoder(w).Encode(model.APIResponse{
			Status:  true,
			Message: "Data gempa terkini diambil dari In-Memory Cache.",
			Data:    cachedData,
		})
		return
	}
	latestCache.RUnlock()

	// 2. Jika Cache kosong / expired, query ke PostgreSQL
	query := `
		SELECT id, gempa_id, tanggal_jam, datetime_utc, latitude, longitude,
		       magnitude, kedalaman, wilayah, potensi, dirasakan,
		       shakemap_image_url, tipe_gempa
		FROM gempa_terkini
		ORDER BY id DESC
		LIMIT 1;
	`

	var g model.Gempa
	var shakemap sql.NullString
	var dirasakan sql.NullString
	var potensi sql.NullString

	err := h.db.QueryRow(query).Scan(
		&g.ID, &g.GempaID, &g.TanggalJam, &g.DateTimeUTC, &g.Latitude, &g.Longitude,
		&g.Magnitude, &g.Kedalaman, &g.Wilayah, &potensi, &dirasakan,
		&shakemap, &g.TipeGempa,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			w.WriteHeader(http.StatusNotFound)
			json.NewEncoder(w).Encode(model.APIResponse{
				Status:  false,
				Message: "Belum ada data gempa yang tersimpan di database. Jalankan Ingestion Service terlebih dahulu.",
			})
			return
		}
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(model.APIResponse{
			Status:  false,
			Message: "Terjadi kesalahan internal server saat mengambil data gempa: " + err.Error(),
		})
		return
	}

	if shakemap.Valid {
		g.ShakemapImageURL = &shakemap.String
	}
	if dirasakan.Valid {
		g.Dirasakan = dirasakan.String
	}
	if potensi.Valid {
		g.Potensi = potensi.String
	}

	// 3. Simpan hasil ke In-Memory Cache selama 60 detik
	latestCache.Lock()
	latestCache.data = &g
	latestCache.expiredAt = time.Now().Add(60 * time.Second)
	latestCache.Unlock()

	json.NewEncoder(w).Encode(model.APIResponse{
		Status:  true,
		Message: "Data gempa terkini berhasil diambil dari database.",
		Data:    g,
	})
}

// GetGempaRiwayat mengambil 15 riwayat gempa terakhir
// Endpoint: GET /api/v1/gempa/riwayat
func (h *GempaHandler) GetGempaRiwayat(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	query := `
		SELECT id, gempa_id, tanggal_jam, datetime_utc, latitude, longitude,
		       magnitude, kedalaman, wilayah, potensi, dirasakan,
		       shakemap_image_url, tipe_gempa
		FROM gempa_terkini
		ORDER BY id DESC
		LIMIT 15;
	`

	rows, err := h.db.Query(query)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(model.APIResponse{
			Status:  false,
			Message: "Gagal mengambil riwayat gempa: " + err.Error(),
		})
		return
	}
	defer rows.Close()

	list := make([]model.Gempa, 0)
	for rows.Next() {
		var g model.Gempa
		var shakemap sql.NullString
		var dirasakan sql.NullString
		var potensi sql.NullString

		if err := rows.Scan(
			&g.ID, &g.GempaID, &g.TanggalJam, &g.DateTimeUTC, &g.Latitude, &g.Longitude,
			&g.Magnitude, &g.Kedalaman, &g.Wilayah, &potensi, &dirasakan,
			&shakemap, &g.TipeGempa,
		); err != nil {
			continue
		}

		if shakemap.Valid {
			g.ShakemapImageURL = &shakemap.String
		}
		if dirasakan.Valid {
			g.Dirasakan = dirasakan.String
		}
		if potensi.Valid {
			g.Potensi = potensi.String
		}

		list = append(list, g)
	}

	json.NewEncoder(w).Encode(model.APIResponse{
		Status:  true,
		Message: "Riwayat gempa berhasil diambil.",
		Data:    list,
	})
}

// GetGempaDirasakan mengambil daftar 15 gempa bumi yang dirasakan oleh masyarakat
// Endpoint: GET /api/v1/gempa/dirasakan
func (h *GempaHandler) GetGempaDirasakan(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	query := `
		SELECT id, gempa_id, tanggal_jam, datetime_utc, latitude, longitude,
		       magnitude, kedalaman, wilayah, potensi, dirasakan,
		       shakemap_image_url, tipe_gempa
		FROM gempa_terkini
		WHERE tipe_gempa = 'DIRASAKAN'
		ORDER BY id DESC
		LIMIT 15;
	`

	rows, err := h.db.Query(query)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(model.APIResponse{
			Status:  false,
			Message: "Gagal mengambil daftar gempa dirasakan: " + err.Error(),
		})
		return
	}
	defer rows.Close()

	list := make([]model.Gempa, 0)
	for rows.Next() {
		var g model.Gempa
		var shakemap sql.NullString
		var dirasakan sql.NullString
		var potensi sql.NullString

		if err := rows.Scan(
			&g.ID, &g.GempaID, &g.TanggalJam, &g.DateTimeUTC, &g.Latitude, &g.Longitude,
			&g.Magnitude, &g.Kedalaman, &g.Wilayah, &potensi, &dirasakan,
			&shakemap, &g.TipeGempa,
		); err != nil {
			continue
		}

		if shakemap.Valid {
			g.ShakemapImageURL = &shakemap.String
		}
		if dirasakan.Valid {
			g.Dirasakan = dirasakan.String
		}
		if potensi.Valid {
			g.Potensi = potensi.String
		}

		list = append(list, g)
	}

	json.NewEncoder(w).Encode(model.APIResponse{
		Status:  true,
		Message: "Daftar gempa dirasakan berhasil diambil.",
		Data:    list,
	})
}


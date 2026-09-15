package handler

/*
=============================================================================
HANDLER REST API: PRAKIRAAN CUACA (Golang)
File: internal/handler/cuaca.go
Deskripsi:
Menyajikan ringkasan cuaca seluruh kota dan rincian prakiraan cuaca 3 hari
dari database PostgreSQL, termasuk ekstraksi langsung dokumen NoSQL JSONB.
=============================================================================
*/

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"nusantara-weather/core-gateway/internal/model"
)

// CuacaHandler mengelola request HTTP terkait data cuaca
type CuacaHandler struct {
	db *sql.DB
}

// NewCuacaHandler membuat instance baru CuacaHandler
func NewCuacaHandler(db *sql.DB) *CuacaHandler {
	return &CuacaHandler{db: db}
}

// GetAllCuacaSummary mengambil ringkasan cuaca terkini dari seluruh kota
// Endpoint: GET /api/v1/cuaca
func (h *CuacaHandler) GetAllCuacaSummary(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	query := `
		SELECT k.id, k.nama, p.nama AS provinsi, k.latitude, k.longitude,
		       c.suhu_saat_ini, c.kelembapan_saat_ini, COALESCE(c.kondisi_cuaca, 'Belum Tersedia'),
		       COALESCE(c.ikon_cuaca_url, ''), c.kecepatan_angin, COALESCE(c.arah_angin, '-'),
		       COALESCE(c.updated_at, NOW())
		FROM wilayah_kota k
		JOIN wilayah_provinsi p ON k.provinsi_id = p.id
		LEFT JOIN data_cuaca c ON k.id = c.kota_id
		ORDER BY k.nama ASC;
	`

	rows, err := h.db.Query(query)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(model.APIResponse{
			Status:  false,
			Message: "Gagal mengambil daftar ringkasan cuaca: " + err.Error(),
		})
		return
	}
	defer rows.Close()

	list := make([]model.CuacaSummary, 0)
	for rows.Next() {
		var item model.CuacaSummary
		err := rows.Scan(
			&item.KotaID, &item.KotaNama, &item.ProvinsiNama, &item.Latitude, &item.Longitude,
			&item.SuhuSaatIni, &item.Kelembapan, &item.KondisiCuaca,
			&item.IkonCuacaURL, &item.KecepatanAngin, &item.ArahAngin,
			&item.UpdatedAt,
		)
		if err != nil {
			continue
		}
		list = append(list, item)
	}

	json.NewEncoder(w).Encode(model.APIResponse{
		Status:  true,
		Message: "Daftar cuaca seluruh kota berhasil diambil.",
		Data:    list,
	})
}

// GetCuacaDetail mengambil rincian cuaca kota spesifik beserta data JSONB 3 hari
// Endpoint: GET /api/v1/cuaca/{id}
func (h *CuacaHandler) GetCuacaDetail(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	// Di Go 1.22+, r.PathValue("id") mengambil parameter dinamis dari URL pattern /api/v1/cuaca/{id}
	kotaID := r.PathValue("id")
	if kotaID == "" {
		kotaID = r.URL.Query().Get("kota_id")
	}

	if kotaID == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(model.APIResponse{
			Status:  false,
			Message: "Parameter ID kota (adm4) wajib disertakan.",
		})
		return
	}

	query := `
		SELECT k.id, k.nama, p.nama AS provinsi, k.latitude, k.longitude,
		       c.suhu_saat_ini, c.kelembapan_saat_ini, COALESCE(c.kondisi_cuaca, 'Belum Tersedia'),
		       COALESCE(c.ikon_cuaca_url, ''), c.kecepatan_angin, COALESCE(c.arah_angin, '-'),
		       c.forecast_detail, COALESCE(c.updated_at, NOW())
		FROM wilayah_kota k
		JOIN wilayah_provinsi p ON k.provinsi_id = p.id
		LEFT JOIN data_cuaca c ON k.id = c.kota_id
		WHERE k.id = $1;
	`

	var item model.CuacaSummary
	var forecastJSON []byte

	err := h.db.QueryRow(query, kotaID).Scan(
		&item.KotaID, &item.KotaNama, &item.ProvinsiNama, &item.Latitude, &item.Longitude,
		&item.SuhuSaatIni, &item.Kelembapan, &item.KondisiCuaca,
		&item.IkonCuacaURL, &item.KecepatanAngin, &item.ArahAngin,
		&forecastJSON, &item.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			w.WriteHeader(http.StatusNotFound)
			json.NewEncoder(w).Encode(model.APIResponse{
				Status:  false,
				Message: "Data wilayah dengan ID tersebut tidak ditemukan.",
			})
			return
		}
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(model.APIResponse{
			Status:  false,
			Message: "Gagal mengambil data cuaca: " + err.Error(),
		})
		return
	}

	// Masukkan raw byte JSONB langsung ke model respon
	item.ForecastDetail = forecastJSON

	json.NewEncoder(w).Encode(model.APIResponse{
		Status:  true,
		Message: "Rincian prakiraan cuaca berhasil diambil.",
		Data:    item,
	})
}

// GetPeringatanDini mengambil daftar peringatan dini cuaca ekstrem resmi BMKG (CAP RSS)
// Endpoint: GET /api/v1/cuaca/peringatan-dini
func (h *CuacaHandler) GetPeringatanDini(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	query := `
		SELECT id, guid, judul, deskripsi, COALESCE(link, ''), COALESCE(pub_date, ''), created_at
		FROM peringatan_dini
		ORDER BY id DESC
		LIMIT 15;
	`

	rows, err := h.db.Query(query)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(model.APIResponse{
			Status:  false,
			Message: "Gagal mengambil daftar peringatan dini cuaca: " + err.Error(),
		})
		return
	}
	defer rows.Close()

	list := make([]model.PeringatanDini, 0)
	for rows.Next() {
		var p model.PeringatanDini
		if err := rows.Scan(&p.ID, &p.Guid, &p.Judul, &p.Deskripsi, &p.Link, &p.PubDate, &p.CreatedAt); err == nil {
			list = append(list, p)
		}
	}

	json.NewEncoder(w).Encode(model.APIResponse{
		Status:  true,
		Message: "Daftar peringatan dini cuaca ekstrem berhasil diambil.",
		Data:    list,
	})
}

// GetKualitasUdara mengambil data pemantauan kualitas udara partikulat PM2.5 dari stasiun BMKG
// Endpoint: GET /api/v1/kualitas-udara
func (h *CuacaHandler) GetKualitasUdara(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	query := `
		SELECT id, stasiun, pm25, kategori, COALESCE(latitude, ''), COALESCE(longitude, ''),
		       COALESCE(jam_pengamatan, 0), updated_at
		FROM kualitas_udara
		ORDER BY pm25 DESC;
	`

	rows, err := h.db.Query(query)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(model.APIResponse{
			Status:  false,
			Message: "Gagal mengambil data kualitas udara: " + err.Error(),
		})
		return
	}
	defer rows.Close()

	list := make([]model.KualitasUdara, 0)
	for rows.Next() {
		var k model.KualitasUdara
		if err := rows.Scan(
			&k.ID, &k.Stasiun, &k.PM25, &k.Kategori,
			&k.Latitude, &k.Longitude, &k.JamPengamatan, &k.UpdatedAt,
		); err == nil {
			list = append(list, k)
		}
	}

	json.NewEncoder(w).Encode(model.APIResponse{
		Status:  true,
		Message: "Daftar kualitas udara BMKG PM2.5 berhasil diambil.",
		Data:    list,
	})
}



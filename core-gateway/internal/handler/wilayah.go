package handler

/*
=============================================================================
HANDLER REST API: DATA MASTER WILAYAH (Golang)
File: internal/handler/wilayah.go
Deskripsi:
Menyediakan data daftar provinsi dan kota/kabupaten di Indonesia.
Digunakan oleh frontend dropdown filter pencarian cuaca.
=============================================================================
*/

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"nusantara-weather/core-gateway/internal/model"
)

// WilayahHandler mengelola request master wilayah
type WilayahHandler struct {
	db *sql.DB
}

// NewWilayahHandler membuat instance baru WilayahHandler
func NewWilayahHandler(db *sql.DB) *WilayahHandler {
	return &WilayahHandler{db: db}
}

// GetProvinsi mengambil daftar seluruh provinsi
// Endpoint: GET /api/v1/wilayah/provinsi
func (h *WilayahHandler) GetProvinsi(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	rows, err := h.db.Query("SELECT id, nama FROM wilayah_provinsi ORDER BY nama ASC;")
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(model.APIResponse{
			Status:  false,
			Message: "Gagal mengambil daftar provinsi: " + err.Error(),
		})
		return
	}
	defer rows.Close()

	list := make([]model.WilayahProvinsi, 0)
	for rows.Next() {
		var p model.WilayahProvinsi
		if err := rows.Scan(&p.ID, &p.Nama); err == nil {
			list = append(list, p)
		}
	}

	json.NewEncoder(w).Encode(model.APIResponse{
		Status:  true,
		Message: "Daftar provinsi berhasil diambil.",
		Data:    list,
	})
}

// GetKota mengambil daftar kota/kabupaten (bisa difilter via query ?provinsi_id=xx)
// Endpoint: GET /api/v1/wilayah/kota
func (h *WilayahHandler) GetKota(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	provinsiID := r.URL.Query().Get("provinsi_id")

	var rows *sql.Rows
	var err error

	if provinsiID != "" {
		rows, err = h.db.Query(`
			SELECT id, provinsi_id, nama, tipe, latitude, longitude
			FROM wilayah_kota
			WHERE provinsi_id = $1
			ORDER BY nama ASC;
		`, provinsiID)
	} else {
		rows, err = h.db.Query(`
			SELECT id, provinsi_id, nama, tipe, latitude, longitude
			FROM wilayah_kota
			ORDER BY nama ASC;
		`)
	}

	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(model.APIResponse{
			Status:  false,
			Message: "Gagal mengambil daftar kota: " + err.Error(),
		})
		return
	}
	defer rows.Close()

	list := make([]model.WilayahKota, 0)
	for rows.Next() {
		var k model.WilayahKota
		if err := rows.Scan(&k.ID, &k.ProvinsiID, &k.Nama, &k.Tipe, &k.Latitude, &k.Longitude); err == nil {
			list = append(list, k)
		}
	}

	json.NewEncoder(w).Encode(model.APIResponse{
		Status:  true,
		Message: "Daftar kota berhasil diambil.",
		Data:    list,
	})
}

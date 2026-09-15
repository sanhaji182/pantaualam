package handler

/*
=============================================================================
HANDLER REST API: PEMANTAUAN GUNUNG API & ERUPSI TERKINI (Golang)
File: internal/handler/gunung.go
Deskripsi:
Menyajikan status tingkat aktivitas gunung api Indonesia (Level I s/d IV)
dan riwayat letusan vulkanik terkini resmi PVMBG (MAGMA Indonesia).
=============================================================================
*/

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"nusantara-weather/core-gateway/internal/model"
)

// GunungHandler mengelola request HTTP terkait pemantauan aktivitas gunung api
type GunungHandler struct {
	db *sql.DB
}

// NewGunungHandler membuat instance baru GunungHandler
func NewGunungHandler(db *sql.DB) *GunungHandler {
	return &GunungHandler{db: db}
}

// GetGunungList menyajikan daftar status aktivitas seluruh gunung api di Indonesia
// Mendukung filter query: ?level=1|2|3|4 atau ?provinsi=...
// Endpoint: GET /api/v1/gunung-api
func (h *GunungHandler) GetGunungList(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	levelQuery := strings.TrimSpace(r.URL.Query().Get("level"))
	provinsiQuery := strings.TrimSpace(r.URL.Query().Get("provinsi"))

	baseQuery := `
		SELECT id, nama, provinsi, level_aktivitas, level_angka,
		       COALESCE(latitude, ''), COALESCE(longitude, ''),
		       COALESCE(tinggi_meter, 0), COALESCE(rekomendasi, ''), updated_at
		FROM gunung_api
	`
	var whereClauses []string
	var args []interface{}
	argIndex := 1

	if levelQuery != "" {
		if lvl, err := strconv.Atoi(levelQuery); err == nil {
			whereClauses = append(whereClauses, "level_angka = $"+strconv.Itoa(argIndex))
			args = append(args, lvl)
			argIndex++
		}
	}

	if provinsiQuery != "" {
		whereClauses = append(whereClauses, "provinsi ILIKE $"+strconv.Itoa(argIndex))
		args = append(args, "%"+provinsiQuery+"%")
		argIndex++
	}

	if len(whereClauses) > 0 {
		baseQuery += " WHERE " + strings.Join(whereClauses, " AND ")
	}

	baseQuery += " ORDER BY level_angka DESC, nama ASC;"

	rows, err := h.db.Query(baseQuery, args...)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(model.APIResponse{
			Status:  false,
			Message: "Gagal mengambil data status gunung api dari database.",
		})
		return
	}
	defer rows.Close()

	volcanoes := make([]model.GunungApi, 0)
	for rows.Next() {
		var g model.GunungApi
		if err := rows.Scan(
			&g.ID, &g.Nama, &g.Provinsi, &g.LevelAktivitas, &g.LevelAngka,
			&g.Latitude, &g.Longitude, &g.TinggiMeter, &g.Rekomendasi, &g.UpdatedAt,
		); err != nil {
			continue
		}
		volcanoes = append(volcanoes, g)
	}

	json.NewEncoder(w).Encode(model.APIResponse{
		Status:  true,
		Message: "Daftar tingkat aktivitas gunung api PVMBG berhasil diambil.",
		Data:    volcanoes,
	})
}

// GetErupsiList menyajikan daftar laporan letusan & erupsi gunung api terkini
// Endpoint: GET /api/v1/gunung-api/erupsi
func (h *GunungHandler) GetErupsiList(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	limitQuery := r.URL.Query().Get("limit")
	limit := 20
	if l, err := strconv.Atoi(limitQuery); err == nil && l > 0 && l <= 100 {
		limit = l
	}

	query := `
		SELECT id, gunung_nama, waktu_erupsi, COALESCE(tinggi_kolom_abu, ''),
		       COALESCE(arah_abu, ''), COALESCE(amplitudo_durasi, ''),
		       deskripsi, created_at
		FROM erupsi_terkini
		ORDER BY id DESC
		LIMIT $1;
	`

	rows, err := h.db.Query(query, limit)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(model.APIResponse{
			Status:  false,
			Message: "Gagal mengambil data erupsi terkini dari database.",
		})
		return
	}
	defer rows.Close()

	eruptions := make([]model.ErupsiTerkini, 0)
	for rows.Next() {
		var e model.ErupsiTerkini
		if err := rows.Scan(
			&e.ID, &e.GunungNama, &e.WaktuErupsi, &e.TinggiKolomAbu,
			&e.ArahAbu, &e.AmplitudoDurasi, &e.Deskripsi, &e.CreatedAt,
		); err != nil {
			continue
		}
		eruptions = append(eruptions, e)
	}

	json.NewEncoder(w).Encode(model.APIResponse{
		Status:  true,
		Message: "Daftar letusan dan erupsi gunung api terkini berhasil diambil.",
		Data:    eruptions,
	})
}

// GetGunungSummary menyajikan statistik agregasi jumlah gunung api berdasarkan tingkat aktivitas
// Endpoint: GET /api/v1/gunung-api/summary
func (h *GunungHandler) GetGunungSummary(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	summary := model.GunungSummary{}

	// 1. Hitung jumlah gunung per level
	countQuery := `
		SELECT 
			COUNT(*) AS total,
			COUNT(*) FILTER (WHERE level_angka = 4) AS level_iv,
			COUNT(*) FILTER (WHERE level_angka = 3) AS level_iii,
			COUNT(*) FILTER (WHERE level_angka = 2) AS level_ii,
			COUNT(*) FILTER (WHERE level_angka = 1) AS level_i
		FROM gunung_api;
	`
	err := h.db.QueryRow(countQuery).Scan(
		&summary.TotalGunung,
		&summary.LevelIVAwas,
		&summary.LevelIIISiaga,
		&summary.LevelIIWaspada,
		&summary.LevelINormal,
	)
	if err != nil && err != sql.ErrNoRows {
		// Log tapi jangan crash, defaultkan ke 0
		summary.TotalGunung = 0
	}

	// 2. Hitung jumlah laporan erupsi tersimpan
	var erupCount int
	if err := h.db.QueryRow(`SELECT COUNT(*) FROM erupsi_terkini;`).Scan(&erupCount); err == nil {
		summary.TotalErupsiAktif = erupCount
	}

	json.NewEncoder(w).Encode(model.APIResponse{
		Status:  true,
		Message: "Ringkasan statistik gunung api PVMBG berhasil diambil.",
		Data:    summary,
	})
}

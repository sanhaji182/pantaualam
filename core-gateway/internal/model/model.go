package model

/*
=============================================================================
MODUL MODEL DATA (Golang Structs)
File: internal/model/model.go
Deskripsi:
Mendefinisikan tipe data (struct) dan mapping JSON yang merepresentasikan
tabel database PostgreSQL, payload API BMKG, serta request/response API.
=============================================================================
*/

import (
	"encoding/json"
	"time"
)

// APIResponse adalah format standar pembungkus seluruh respon REST API
type APIResponse struct {
	Status  bool        `json:"status"`            // true jika berhasil, false jika gagal
	Message string      `json:"message"`           // Pesan informatif
	Data    interface{} `json:"data,omitempty"`    // Payload data (bisa objek atau array)
}

// Gempa merepresentasikan data rekaman gempa bumi
type Gempa struct {
	ID                int             `json:"id"`
	GempaID           string          `json:"gempa_id"`
	TanggalJam        string          `json:"tanggal_jam"`
	DateTimeUTC       *time.Time      `json:"datetime_utc,omitempty"`
	Latitude          string          `json:"latitude"`
	Longitude         string          `json:"longitude"`
	Magnitude         float64         `json:"magnitude"`
	Kedalaman         string          `json:"kedalaman"`
	Wilayah           string          `json:"wilayah"`
	Potensi           string          `json:"potensi"`
	Dirasakan         string          `json:"dirasakan"`
	ShakemapImageURL  *string         `json:"shakemap_image_url,omitempty"`
	TipeGempa         string          `json:"tipe_gempa"`
	RawPayload        json.RawMessage `json:"raw_payload,omitempty"` // Data JSONB mentah
}

// WilayahProvinsi merepresentasikan provinsi di Indonesia
type WilayahProvinsi struct {
	ID   string `json:"id"`
	Nama string `json:"nama"`
}

// WilayahKota merepresentasikan kota/kabupaten dengan koordinat peta
type WilayahKota struct {
	ID         string  `json:"id"`          // Kode adm4 BMKG
	ProvinsiID string  `json:"provinsi_id"`
	Nama       string  `json:"nama"`
	Tipe       string  `json:"tipe"`        // 'KOTA' atau 'KABUPATEN'
	Latitude   float64 `json:"latitude"`
	Longitude  float64 `json:"longitude"`
}

// CuacaSummary merepresentasikan ringkasan cuaca kota beserta jadwal per jam
type CuacaSummary struct {
	KotaID          string          `json:"kota_id"`
	KotaNama        string          `json:"kota_nama"`
	ProvinsiNama    string          `json:"provinsi_nama"`
	Latitude        float64         `json:"latitude"`
	Longitude       float64         `json:"longitude"`
	SuhuSaatIni     *float64        `json:"suhu_saat_ini"`
	Kelembapan      *float64        `json:"kelembapan_saat_ini"`
	KondisiCuaca    string          `json:"kondisi_cuaca"`
	IkonCuacaURL    string          `json:"ikon_cuaca_url"`
	KecepatanAngin  *float64        `json:"kecepatan_angin"`
	ArahAngin       string          `json:"arah_angin"`
	ForecastDetail  json.RawMessage `json:"forecast_detail,omitempty"` // Kolom NoSQL JSONB
	UpdatedAt       time.Time       `json:"updated_at"`
}

// User merepresentasikan entitas pengguna terdaftar
type User struct {
	ID        string    `json:"id"`
	Nama      string    `json:"nama_lengkap"`
	Email     string    `json:"email"`
	Role      string    `json:"role"`
	CreatedAt time.Time `json:"created_at"`
}

// RegisterRequest payload input saat registrasi akun baru
type RegisterRequest struct {
	NamaLengkap string `json:"nama_lengkap"`
	Email       string `json:"email"`
	Password    string `json:"password"`
}

// LoginRequest payload input saat login
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// AuthResponse payload respon sukses login dengan token JWT
type AuthResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

// BookmarkRequest payload untuk menambahkan kota favorit pengguna
type BookmarkRequest struct {
	KotaID string `json:"kota_id"`
}

// PeringatanDini merepresentasikan peringatan cuaca ekstrem BMKG (Nowcast CAP)
type PeringatanDini struct {
	ID        int       `json:"id"`
	Guid      string    `json:"guid"`
	Judul     string    `json:"judul"`
	Deskripsi string    `json:"deskripsi"`
	Link      string    `json:"link"`
	PubDate   string    `json:"pub_date"`
	CreatedAt time.Time `json:"created_at"`
}

// KualitasUdara merepresentasikan pemantauan polusi partikulat PM2.5 dari Stasiun BMKG
type KualitasUdara struct {
	ID            int       `json:"id"`
	Stasiun       string    `json:"stasiun"`
	PM25          float64   `json:"pm25"`
	Kategori      string    `json:"kategori"`
	Latitude      string    `json:"latitude"`
	Longitude     string    `json:"longitude"`
	JamPengamatan int       `json:"jam_pengamatan"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// GunungApi merepresentasikan status tingkat aktivitas gunung api Indonesia (PVMBG/MAGMA)
type GunungApi struct {
	ID             int       `json:"id"`
	Nama           string    `json:"nama"`
	Provinsi       string    `json:"provinsi"`
	LevelAktivitas string    `json:"level_aktivitas"`
	LevelAngka     int       `json:"level_angka"`
	Latitude       string    `json:"latitude"`
	Longitude      string    `json:"longitude"`
	TinggiMeter    int       `json:"tinggi_meter"`
	Rekomendasi    string    `json:"rekomendasi"`
	UpdatedAt      time.Time `json:"updated_at"`
}

// ErupsiTerkini merepresentasikan riwayat letusan & kolom abu vulkanik dari PVMBG
type ErupsiTerkini struct {
	ID              int       `json:"id"`
	GunungNama      string    `json:"gunung_nama"`
	WaktuErupsi     string    `json:"waktu_erupsi"`
	TinggiKolomAbu  string    `json:"tinggi_kolom_abu"`
	ArahAbu         string    `json:"arah_abu"`
	AmplitudoDurasi string    `json:"amplitudo_durasi"`
	Deskripsi       string    `json:"deskripsi"`
	CreatedAt       time.Time `json:"created_at"`
}

// GunungSummary merepresentasikan statistik ringkasan status gunung api di Indonesia
type GunungSummary struct {
	TotalGunung      int `json:"total_gunung"`
	LevelIVAwas      int `json:"level_iv_awas"`
	LevelIIISiaga    int `json:"level_iii_siaga"`
	LevelIIWaspada   int `json:"level_ii_waspada"`
	LevelINormal     int `json:"level_i_normal"`
	TotalErupsiAktif int `json:"total_erupsi_aktif"`
}



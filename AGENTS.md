# AGENTS.MD — PANTAUALAM DISASTER & CLIMATE MONITOR
> **Panduan & Standar Operasional untuk Developer & AI Coding Assistant**  
> Proyek: **PantauAlam** (Portal Cuaca, Gempa & Peringatan Bencana BMKG & PVMBG)  
> Status: **Enterprise-Grade Production Ready**  
> Orchestrator: **Sanhaji** (System Orchestrator)  
> Lisensi: **MIT License (Full Open Source)**  
> Basis Kode: Monorepo di folder `nusantara-weather/`

---

## 1. TUJUAN & RUANG LINGKUP PROYEK
Proyek ini adalah sistem pemantau cuaca dan peringatan bencana nasional yang mengambil data real-time dari API Terbuka BMKG Indonesia. Proyek ini mengintegrasikan arsitektur microservices end-to-end berstandar industri menjadi satu platform produksi yang siap di-deploy ke cloud.

### Karakteristik Utama:
- **Zero-Maintenance:** Data cuaca dan gempa ditarik otomatis dari server resmi BMKG tanpa perlu input manual harian.
- **Teknologi Backend:** Python (Data Ingestion/Worker) & Golang (High-Performance API Gateway).
- **Database:** PostgreSQL (Pendekatan Multi-Model: Relational Tables + JSONB NoSQL Document Store).
- **Frontend:** React JS (Web Dashboard) & React Native (Mobile App).
- **DevOps:** Docker Compose, Nginx Reverse Proxy, dan Linux Server Hardening (IPTables & SSH).

---

## 2. STRUKTUR DIREKTORI REPOSITORI
```text
nusantara-weather/
├── AGENTS.md                    # File ini (panduan instruksi developer & AI)
├── README.md                    # Dokumentasi utama & cara menjalankan
├── ALUR_DAN_ARSITEKTUR.md       # Dokumentasi detail alur data & diagram sistem
│
├── deploy/                      # Konfigurasi Deployment & DevOps
│   ├── database/
│   │   └── init.sql             # Skema DDL PostgreSQL (Tabel + JSONB + Index GIN)
│   ├── security/
│   │   └── hardening.sh         # Skrip otomasi keamanan server Linux (Modul 18)
│   ├── nginx/
│   │   └── default.conf         # Konfigurasi Reverse Proxy Nginx & SSL
│   └── docker-compose.yml       # Orkestrasi multi-container untuk lokal/VPS
│
├── ingestion-service/           # Worker Python (Modul 02–06)
│   ├── src/
│   │   ├── config.py            # Konfigurasi environment (DB, API URLs)
│   │   ├── db.py                # Helper koneksi & query PostgreSQL
│   │   ├── fetcher.py           # Logika ambil & parsing data BMKG
│   │   └── main.py              # Runner worker (one-off sync & scheduler)
│   ├── requirements.txt         # Dependensi Python (requests, psycopg2, dll)
│   └── Dockerfile               # Container image Python worker
│
├── core-gateway/                # API Gateway Golang (Modul 13 & 15)
│   ├── cmd/
│   │   └── main.go              # Entry point server HTTP port 8080
│   ├── internal/
│   │   ├── config/              # Pembaca variabel environment
│   │   ├── db/                  # Koneksi pool PostgreSQL (database/sql + lib/pq)
│   │   ├── model/               # Struct Golang data cuaca, gempa, user, dll
│   │   ├── middleware/          # CORS, JWT Authentication, Logging
│   │   └── handler/             # Controller REST API (/gempa, /cuaca, /auth)
│   ├── go.mod                   # Modul Go
│   └── Dockerfile               # Multi-stage build Go binary container
│
├── web-dashboard/               # Web App React JS (Modul 09 & 10)
│   ├── src/
│   │   ├── components/          # Peta Leaflet, Kartu Cuaca, Navbar
│   │   ├── pages/               # Dashboard, Detail Kota, Login
│   │   └── App.jsx
│   └── package.json
│
└── mobile-app/                  # Mobile App React Native Expo (Modul 11)
    ├── App.js
    └── package.json
```

---

## 3. ATURAN PENULISAN KODE (CODING CONVENTIONS)
Bagi semua agent dan developer yang berkontribusi pada repositori ini:

1. **Komentar Edukatif (Educational Comments):**
   - Setiap file, struct, fungsi, dan blok logika penting **WAJIB** memiliki komentar dalam bahasa Indonesia yang menjelaskan *tujuan* dan *cara kerjanya*, agar pemilik proyek dapat memahami dan menjelaskan saat ujian asesmen.
2. **Penanganan Error (Error Handling):**
   - Di Golang: Jangan abaikan error (`if err != nil`). Log pesan error dengan format yang jelas.
   - Di Python: Gunakan `try...except` dengan logging spesifik, jangan biarkan proses background berhenti saat jaringan BMKG gagal diakses (*resilience*).
3. **Pemisahan Database (SQL vs NoSQL Pattern):**
   - Jangan menambah engine MongoDB terpisah kecuali diminta secara eksplisit.
   - Manfaatkan kolom `JSONB` di PostgreSQL untuk data fleksibel (prakiraan cuaca per jam dan raw earthquake data).
4. **Keamanan API:**
   - Gunakan parameterized queries di SQL untuk mencegah SQL Injection.
   - Gunakan hashing password (bcrypt) pada tabel `users`.
   - Gunakan token JWT dengan *expiration time* untuk endpoint terproteksi.

---

## 4. DAFTAR API ENDPOINT BMKG YANG DIGUNAKAN
| Tipe Data | URL Endpoint BMKG | Format | Frekuensi Update |
| :--- | :--- | :--- | :--- |
| **Gempa Terkini (M 5.0+ / Dirasakan)** | `https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json` | JSON | Real-time |
| **15 Gempa Terakhir M 5.0+** | `https://data.bmkg.go.id/DataMKG/TEWS/gempaterkini.json` | JSON | Real-time |
| **15 Gempa Terakhir Dirasakan** | `https://data.bmkg.go.id/DataMKG/TEWS/gempadirasakan.json` | JSON | Real-time |
| **Prakiraan Cuaca Per Kecamatan** | `https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4={kode}` | JSON | Tiap jam / hari |
| **Peringatan Dini Cuaca Ekstrem** | `https://www.bmkg.go.id/alerts/nowcast/id` | XML (CAP RSS) | Real-time |
| **Kualitas Udara Partikulat PM2.5** | `https://www.bmkg.go.id/kualitas-udara/informasi-partikulat-pm25.bmkg` | HTML (Nuxt State) | Tiap jam (SPKU) |
| **Status Tingkat Aktivitas Gunung Api** | `https://magma.esdm.go.id/v1/gunung-api/tingkat-aktivitas` | HTML (Table PVMBG) | Real-time |
| **Informasi Letusan & Erupsi Terkini** | `https://magma.esdm.go.id/v1/gunung-api/informasi-letusan` | HTML (Buletin Letusan) | Real-time |

---

## 5. CARA MENJALANKAN SISTEM SECARA LOKAL
### Menggunakan Docker Compose (Direkomendasikan):
```bash
cd nusantara-weather/deploy
docker compose up --build -d
```
Sistem akan otomatis menjalankan:
- PostgreSQL pada port `5432`
- Ingestion Worker Python (menarik data awal dari BMKG)
- Core Gateway Golang pada port `8080`

### Menjalankan Secara Manual (Development Mode):
1. **Database:** Jalankan `deploy/database/init.sql` di PostgreSQL lokal.
2. **Ingestion Service:**
   ```bash
   cd nusantara-weather/ingestion-service
   pip install -r requirements.txt
   python3 src/main.py
   ```
3. **Core Gateway:**
   ```bash
   cd nusantara-weather/core-gateway
   go run cmd/main.go
   ```
4. **Web Dashboard:**
   ```bash
   cd nusantara-weather/web-dashboard
   npm install
   npm run dev
   ```

---

## 6. FAQ & PERTIMBANGAN TEKNIS REKAYASA SISTEM
- **Pertanyaan:** *"Kenapa backend-nya dipisah antara Python dan Golang?"*  
  **Jawaban:** *"Python sangat unggul untuk data scraping, parsing, dan transformasi data. Sedangkan Golang digunakan untuk API Gateway yang melayani ribuan request pengguna secara konkuren dengan latensi sangat rendah dan hemat memori."*
- **Pertanyaan:** *"Kenapa menggunakan PostgreSQL Hybrid JSONB bukan database NoSQL terpisah?"*  
  **Jawaban:** *"Kami menerapkan arsitektur modern Hybrid/Multi-Model Database menggunakan PostgreSQL JSONB dengan GIN Index. Ini memberikan keunggulan kecepatan NoSQL Document Store untuk data bersarang BMKG tanpa harus mengorbankan integritas data relasional ACID."*

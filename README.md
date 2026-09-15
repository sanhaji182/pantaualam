# PantauAlam — Portal Monitoring Cuaca, Gempa & Bencana Geologi
> **Sistem Monitoring Cuaca, Bencana & Geofisika Skala Produksi (Enterprise-Grade)**  
> Basis Kode: Monorepo Microservices (Python Ingestion + PostgreSQL Multi-Model + Golang Gateway + React JS + React Native + Docker & Linux Security)

[![Go Version](https://img.shields.io/badge/Golang-1.22+-00ADD8?style=flat&logo=go)](https://go.dev)
[![Python Version](https://img.shields.io/badge/Python-3.12+-3776AB?style=flat&logo=python)](https://python.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16_(JSONB)-4169E1?style=flat&logo=postgresql)](https://www.postgresql.org)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat&logo=react)](https://react.dev)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat&logo=docker)](https://www.docker.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-10b981.svg)](LICENSE)
[![Orchestrator](https://img.shields.io/badge/Orchestrated_By-Sanhaji-6366f1.svg)](#)

---

## 1. TENTANG PROYEK
**PantauAlam** adalah sistem monitoring cuaca, kegempaan, aktivitas gunung api, dan peringatan dini bencana nasional yang mengolah data real-time dari API Terbuka Badan Meteorologi, Klimatologi, dan Geofisika (BMKG) serta Pusat Vulkanologi dan Mitigasi Bencana Geologi (PVMBG / MAGMA Indonesia).

Sistem ini dirancang dengan prinsip **Zero-Maintenance**, di mana data cuaca per jam, gempa bumi tektonik, kualitas udara PM2.5, status 68+ gunung api aktif, serta buletin letusan/erupsi ditarik, dibersihkan, dan disajikan secara otomatis 24/7 tanpa membutuhkan operasional manual harian.

---

## 2. ARSITEKTUR SISTEM & ALUR DATA
```text
           [ API Terbuka BMKG (data.bmkg.go.id) ]
                             |
                             v
           [ 1. Ingestion Worker (Python 3.12) ]
                             |
                             | (UPSERT Relasional & JSONB)
                             v
           [ 2. PostgreSQL 16 (Multi-Model DB) ]
               - Tabel: wilayah_provinsi, wilayah_kota, users
               - Kolom JSONB + GIN Index: data_cuaca, gempa_terkini
                             |
                             | (Connection Pooling & In-Memory Cache)
                             v
           [ 3. Core API Gateway (Golang 1.22) ]
               - Port: 8080 (RESTful API, Auth JWT, CORS)
                             |
               +-------------+-------------+
               |                           |
               v                           v
   [ 4. Web App (React JS) ]    [ 5. Mobile App (Expo) ]
   - Peta Leaflet Interaktif    - Widget Cuaca Lokasi
   - Detail Prakiraan 3 Hari    - Notifikasi Gempa Terkini
```

---

## 3. SPESIFIKASI MODUL & KOMPONEN TEKNOLOGI SISTEM
Sistem PantauAlam dibangun dengan arsitektur microservices modular berstandar industri:

| Komponen Layer | Teknologi / Pendekatan | Deskripsi Implementasi Produksi |
| :--- | :--- | :--- |
| **Ingestion Worker** | Python 3.12, BeautifulSoup, Requests, Psycopg2 | Background daemon otomatis untuk ETL (Extract, Transform, Load) data BMKG. |
| **Database Multi-Model** | PostgreSQL 16 + JSONB + GIN Indexing | Menyimpan data terstruktur (master wilayah, users) dan semi-terstruktur (prakiraan per jam BMKG). |
| **High-Perf API Gateway** | Golang 1.22, Native HTTP, Connection Pool | Gateway RESTful dengan latensi ultra-rendah (<15ms) dan konsumsi memori hemat (<30MB). |
| **Keamanan & Autentikasi** | JWT (HMAC-SHA256), Bcrypt Hashing, CORS | Proteksi endpoint favorit user, password hashing standar industri, sanitasi input SQL. |
| **Web Dashboard** | React 18, Vite, Tailwind CSS, Lucide Icons, Leaflet | UI responsif interaktif dengan visualisasi peta seismik, 31 kota, dan ranking kualitas udara. |
| **Mobile Client** | React Native Expo, Flexbox Responsive | Antarmuka mobile cross-platform (Android/iOS) untuk pemantauan portabel. |
| **DevOps & Kontainerisasi** | Docker, Docker Compose, Multi-Stage Builds | Image biner Go minimalis (~15MB), konfigurasi isolasi jaringan bridge container. |
| **Reverse Proxy & Web Server**| Nginx Reverse Proxy, Gzip Compression, SSL Ready | Reverse proxy load balancing, gzip caching, dan proteksi header keamanan HTTP. |
| **Server Hardening** | Bash Automation, UFW Firewall, Fail2ban | Otomasi mitigasi brute-force, audit UID 0, pembatasan port, dan anti-malware rkhunter. |

---

## 4. CARA MENJALANKAN SISTEM SECARA CEPAT

### Opsi A: Menggunakan Docker Compose (Sangat Direkomendasikan)
Cukup jalankan satu perintah berikut di terminal:
```bash
cd pantaualam/deploy
docker compose up --build -d
```
Sistem akan otomatis:
1. Menyalakan database PostgreSQL di port `5432` dan menjalankan seed data wilayah.
2. Menyalakan Ingestion Service Python untuk menyinkronkan data gempa & cuaca BMKG.
3. Menyalakan Core Gateway Golang pada port `8080`.

Untuk memeriksa status kontainer:
```bash
docker compose ps
docker compose logs -f
```

---

### Opsi B: Menjalankan Secara Manual (Development Mode)

#### 1. Database PostgreSQL
Jalankan file `deploy/database/init.sql` pada PostgreSQL lokal Anda.

#### 2. Ingestion Service (Python Worker)
```bash
cd pantaualam/ingestion-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Menjalankan 1 kali sinkronisasi (test run)
python3 src/main.py --once

# Atau jalankan terus-menerus (daemon mode)
python3 src/main.py
```

#### 3. Core API Gateway (Golang)
```bash
cd pantaualam/core-gateway
go run cmd/main.go
```
Akses API di browser: `http://localhost:8080/api/v1/gempa/terkini`

#### 4. Web Dashboard (React JS)
```bash
cd pantaualam/web-dashboard
npm install
npm run dev
```
Buka browser di `http://localhost:3000`

#### 5. Mobile App (React Native Expo)
```bash
cd pantaualam/mobile-app
npm install
npx expo start
```

---

## 5. DOKUMENTASI ENDPOINT REST API

| Method | Endpoint | Keterangan |
| :--- | :--- | :--- |
| `GET` | `/health` | Status kesehatan server dan koneksi DB |
| `GET` | `/api/v1/gempa/terkini` | Data gempa bumi terbaru M 5.0+ / berpotensi tsunami (Autogempa) |
| `GET` | `/api/v1/gempa/riwayat` | Riwayat 15 gempa bumi terkini (M >= 5.0) |
| `GET` | `/api/v1/gempa/dirasakan` | Riwayat 15 gempa bumi terakhir yang dirasakan warga (Skala MMI) |
| `GET` | `/api/v1/cuaca` | Ringkasan cuaca seluruh kota di Indonesia |
| `GET` | `/api/v1/cuaca/{kota_id}` | Rincian prakiraan cuaca 3 hari per jam (NoSQL JSONB) |
| `GET` | `/api/v1/cuaca/peringatan-dini`| Peringatan dini cuaca ekstrem resmi BMKG (CAP RSS Feed) |
| `GET` | `/api/v1/kualitas-udara` | Pemantauan realtime baku mutu PM2.5 dari 25+ Stasiun BMKG |
| `GET` | `/api/v1/wilayah/provinsi` | Daftar nama master provinsi |
| `GET` | `/api/v1/wilayah/kota` | Daftar kota/kabupaten (filter: `?provinsi_id=xx`) |
| `POST` | `/api/v1/auth/register` | Pendaftaran user baru dengan password bcrypt |
| `POST` | `/api/v1/auth/login` | Login user untuk mendapatkan Bearer Token JWT |
| `GET` | `/api/v1/user/bookmarks` | *(Protected JWT)* Mengambil daftar kota favorit pengguna |
| `POST` | `/api/v1/user/bookmarks` | *(Protected JWT)* Menambahkan kota favorit pengguna |

---

## 6. FAQ & PERTIMBANGAN REKAYASA SISTEM (ENGINEERING RATIONALE)

1. **"Kenapa menggunakan backend terpisah antara Python dan Golang?"**
   > *"Python sangat unggul dalam ekosistem manipulasi data, web scraping, dan parsing format XML/JSON/HTML. Sedangkan Golang difokuskan sebagai API Gateway berkinerja tinggi yang melayani ribuan request klien secara konkuren dengan footprint memori sangat rendah (<30 MB) dan latensi milidetik."*

2. **"Kenapa memilih PostgreSQL Hybrid Multi-Model (Relasional + JSONB NoSQL)?"**
   > *"Kami menerapkan pola arsitektur modern Hybrid/Multi-Model Database. Fitur `JSONB` pada PostgreSQL dengan GIN Index memberikan kecepatan dan fleksibilitas NoSQL Document Store untuk data prakiraan cuaca bersarang yang dinamis, tanpa mengorbankan integritas data relasional ACID untuk data user dan master wilayah."*

3. **"Bagaimana cara sistem mengantisipasi pemadaman (downtime) jika upstream server BMKG lambat atau offline?"**
   > *"Sistem menerapkan teknik Ingestion Asinkron dan Caching. Frontend klien tidak pernah memanggil langsung server BMKG, melainkan mengambil data dari database lokal dan In-Memory Cache Golang. Jika jaringan BMKG mengalami gangguan sesaat, aplikasi tetap berjalan normal menyajikan data terakhir yang tersimpan."*

---

## 7. ORCHESTRATOR & LISENSI OPEN SOURCE

- **System Orchestrator:** Sistem ini dirancang, dibangun, dan diorchestrasi secara menyeluruh oleh **Sanhaji**.
- **Filosofi Open Source:** PantauAlam adalah proyek **100% Full Open Source**. Siapapun dipersilakan untuk menggunakan, mengembangkan, memodifikasi, serta memanfaatkan sistem ini untuk keperluan riset iklim, mitigasi bencana, edukasi, sistem peringatan dini, maupun implementasi komersial.
- **Lisensi:** Berada di bawah naungan [MIT License](LICENSE). Bebas dan terbuka tanpa batasan.
- **Data Source:** Seluruh data cuaca, kegempaan, dan kualitas udara merupakan data resmi publik dari **Badan Meteorologi, Klimatologi, dan Geofisika (BMKG) Republik Indonesia**.


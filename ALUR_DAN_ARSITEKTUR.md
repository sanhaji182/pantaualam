# ALUR KERJA DAN ARSITEKTUR SISTEM
## NUSANTARA WEATHER & DISASTER MONITOR

Dokumen ini menjelaskan secara rinci bagaimana seluruh bagian aplikasi bekerja sama, mulai dari pengambilan data mentah dari satelit BMKG, penyimpanan di database PostgreSQL, pemrosesan di backend Golang, hingga disajikan ke pengguna di Web dan Mobile.

---

## 1. DIAGRAM ALUR BESAR SISTEM (END-TO-END FLOW)

```
       [ SATELIT, RADAR & STASIUN SPKU BMKG ]
                         |
                         v
           [ REST API & Data Terbuka BMKG ]
  (data.bmkg.go.id, api.bmkg.go.id, & bmkg.go.id/kualitas-udara)
                         |
                         | (1. Ingestion berkala tiap 15 menit)
                         v
+-------------------------------------------------------------+
|               SERVICE 1: PYTHON INGESTION WORKER            |
| - Scheduler berjalan di latar belakang (background)         |
| - Mengambil Autogempa, 15 Gempa Terkini, 15 Gempa Dirasakan |
| - Mengambil Peringatan Dini Cuaca Ekstrem (CAP RSS Nowcast) |
| - Mengambil Cuaca Wilayah 3 Hari per Kecamatan/Kota         |
| - Mengambil Baku Mutu Kualitas Udara PM2.5 (25+ Stasiun)    |
+------------------------------+------------------------------+
                               |
                               | (2. UPSERT SQL & JSONB)
                               v
+-------------------------------------------------------------+
|                  DATABASE UTAMA: POSTGRESQL                 |
|                                                             |
|  [Tabel Relasional]:               [Kolom NoSQL JSONB]:     |
|  - wilayah_provinsi                - data_cuaca.forecast    |
|  - wilayah_kota                    - gempa_terkini.raw_data |
|  - peringatan_dini (CAP RSS)                                |
|  - kualitas_udara (PM2.5 SPKU)                              |
|  - users & user_bookmarks                                   |
|                                                             |
|  * Dilengkapi GIN Index untuk pencarian JSON super cepat    |
+------------------------------+------------------------------+
                               ^
                               | (3. Query SQL dengan Connection Pool)
                               v
+-------------------------------------------------------------+
|             SERVICE 2: GOLANG HIGH-SPEED GATEWAY            |
|                                                             |
|  - Menyediakan endpoint REST API di port 8080               |
|  - In-Memory Cache (sync.Map): Cache data gempa selama 60dtk|
|    sehingga respon API secepat kilat (<30ms)                |
|  - Endpoint /api/v1/kualitas-udara, /cuaca, /gempa, /auth   |
|  - JWT Middleware untuk endpoint terproteksi (Bookmark Kota)|
|  - CORS Handler agar Web & Mobile bisa akses tanpa kendala  |
+------------------------------+------------------------------+
                               |
             +------------------+------------------+
             | (4. REST API HTTP/JSON)             |
             v                                     v
+-----------------------+             +-----------------------+
|  FRONTEND WEB (REACT) |             |  MOBILE APP (EXPO)    |
|                       |             |                       |
| - Peta Seismologi MMI |             | - Widget Cuaca Lokasi |
| - Prakiraan Cuaca     |             | - Kartu Gempa Terkini |
| - Kualitas Udara PM2.5|             | - Kualitas Udara PM2.5|
| - Alert Bar Cuaca     |             | - Alert Bar Cuaca     |
+-----------------------+             +-----------------------+
```

---

## 2. PENJELASAN TAHAPAN ALUR DATA

### Tahap 1: Pengambilan Data Otomatis (Data Ingestion)
1. Script Python (`main.py`) dijalankan sebagai daemon/worker di latar belakang.
2. Setiap interval waktu yang ditentukan (misalnya 15 menit), worker memanggil:
   * Endpoint Gempa: `https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json`
   * Endpoint 15 Gempa Terakhir: `https://data.bmkg.go.id/DataMKG/TEWS/gempaterkini.json`
   * Endpoint Cuaca Kota-Kota Utama: `https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4={kode}`
3. Data yang didapat berupa format JSON. Python memfilter nilai-nilai penting (magnitudo, kedalaman, status tsunami, suhu, kelembaban, ikon cuaca).
4. Data disimpan ke PostgreSQL menggunakan teknik **`ON CONFLICT DO UPDATE` (UPSERT)**, sehingga jika data sudah ada, database hanya memperbarui data terakhir tanpa terjadi duplikasi.

### Tahap 2: Penyimpanan PostgreSQL (Multi-Model SQL + JSONB)
1. **Data Terstruktur:**
   * Nama kota, provinsi, dan koordinat disimpan dalam kolom standar (`VARCHAR`, `FLOAT`) agar relasinya rapi.
2. **Data Dinamis (NoSQL Pattern):**
   * Jadwal cuaca per 3 jam untuk 3 hari ke depan disimpan dalam satu kolom `forecast_detail` bertipe **`JSONB`**.
   * Dibuatkan indeks GIN (*Generalized Inverted Index*). Dengan indeks ini, kita bisa mencari *"kota mana yang besok jam 12:00 hujan"* langsung dari dalam kolom JSONB tanpa perlu membuat puluhan tabel relasi yang rumit.

### Tahap 3: Pemrosesan di Golang API Gateway
1. Klien (Web Browser atau Mobile) mengirim request HTTP GET ke endpoint misalnya `/api/v1/gempa/terkini`.
2. Golang memeriksa **In-Memory Cache**:
   * Jika data baru saja diambil kurang dari 60 detik lalu, Golang langsung mengembalikan data dari RAM (latensi hanya 1–5 milidetik).
   * Jika cache kosong atau expired, Golang query ke PostgreSQL, menyimpan hasilnya ke cache, lalu mengembalikannya ke klien.
3. Untuk fitur penyimpanan kota favorit (bookmarks), request melewati middleware JWT:
   * Golang memverifikasi header `Authorization: Bearer <token>`.
   * Jika valid, sistem mengekstrak `user_id` dan memproses bookmark.

### Tahap 4: Presentasi di Frontend
1. **React JS (Web):**
   * Menggunakan pustaka peta **Leaflet** untuk merender peta Indonesia. Titik koordinat gempa dari BMKG di-plot sebagai marker lingkaran merah dengan radius sesuai besar magnitudo gempa.
   * Komponen kartu cuaca menampilkan suhu, kelembapan, arah angin, dan ikon SVG cuaca resmi BMKG.
2. **React Native (Mobile):**
   * Menggunakan Flexbox untuk antarmuka yang responsif di berbagai ukuran layar smartphone.
   * Dilengkapi tombol *Pull to Refresh* untuk memperbarui status gempa bumi terbaru secara instan.

---

## 3. ARSITEKTUR INFRASTRUKTUR & KEAMANAN (DEVOPS)

Saat di-deploy ke VPS Linux Ubuntu:
1. **Docker Compose:** Mengorkestrasi 3 kontainer utama dalam satu private network:
   * Kontainer `db`: PostgreSQL 16
   * Kontainer `ingestion`: Python 3.12 worker
   * Kontainer `gateway`: Golang 1.22 REST API
2. **Nginx Reverse Proxy:** Menghubungkan dunia luar (port 80 & 443 HTTPS) ke kontainer Golang Gateway (port 8080) dan menyajikan file statis React.
3. **Hardening Server (Keamanan & Audit):**
   * Firewall `UFW/IPTables` hanya membuka port 80 (HTTP), 443 (HTTPS), dan port SSH kustom.
   * Database PostgreSQL port 5432 **tidak dibuka ke publik**, hanya bisa diakses kontainer di jaringan internal Docker.
   * Menonaktifkan login user `root` melalui SSH dan mewajibkan otentikasi SSH Key.

---

## 4. ORCHESTRATOR & LISENSI OPEN SOURCE
* **System Orchestrator:** Sistem ini diarsiteki dan diorchestrasi oleh **Sanhaji**.
* **Lisensi:** Proyek ini berstatus **100% Full Open Source** di bawah naungan **MIT License**.
* **Pemanfaatan:** Bebas digunakan, dipelajari, dan dikembangkan oleh siapapun untuk kemaslahatan publik, mitigasi bencana nasional, dan riset geospasial.


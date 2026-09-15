-- ====================================================================
-- INISIALISASI DATABASE NUSANTARA WEATHER & DISASTER MONITOR
-- Database: PostgreSQL 16
-- Karakteristik: Hybrid Multi-Model (Relational Tables + NoSQL JSONB)
-- ====================================================================

-- 1. Mengaktifkan ekstensi untuk pembuatan UUID otomatis
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ====================================================================
-- TABEL 1: MASTER PROVINSI (Relasional)
-- Penjelasan: Menyimpan daftar nama provinsi di Indonesia.
-- Menggunakan relasi standar (1 provinsi memiliki banyak kota).
-- ====================================================================
CREATE TABLE IF NOT EXISTS wilayah_provinsi (
    id VARCHAR(10) PRIMARY KEY,                 -- Kode resmi BPS / BMKG (contoh: '31' untuk DKI Jakarta)
    nama VARCHAR(100) NOT NULL,                 -- Nama provinsi
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE wilayah_provinsi IS 'Menyimpan data master provinsi di Indonesia';
COMMENT ON COLUMN wilayah_provinsi.id IS 'Kode identitas unik provinsi standar kemendagri/BMKG';

-- ====================================================================
-- TABEL 2: MASTER KOTA / KABUPATEN (Relasional + Koordinat Geografis)
-- Penjelasan: Menyimpan data kabupaten/kota beserta kode adm4 BMKG.
-- Kode adm4 ini dipakai langsung untuk memanggil API prakiraan cuaca BMKG.
-- ====================================================================
CREATE TABLE IF NOT EXISTS wilayah_kota (
    id VARCHAR(20) PRIMARY KEY,                 -- Kode adm4 BMKG (contoh: '31.71.01.1001')
    provinsi_id VARCHAR(10) NOT NULL REFERENCES wilayah_provinsi(id) ON DELETE CASCADE,
    nama VARCHAR(150) NOT NULL,                 -- Nama kota/kabupaten
    tipe VARCHAR(20) DEFAULT 'KOTA',            -- KOTA atau KABUPATEN
    latitude DOUBLE PRECISION NOT NULL,         -- Titik koordinat Lintang (untuk peta)
    longitude DOUBLE PRECISION NOT NULL,        -- Titik koordinat Bujur (untuk peta)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE wilayah_kota IS 'Menyimpan daftar kota/kabupaten beserta koordinat dan kode adm4 BMKG';

-- ====================================================================
-- TABEL 3: DATA CUACA (Pendekatan Hybrid: Relasional + Kolom NoSQL JSONB)
-- Penjelasan:
-- Data prakiraan cuaca dari BMKG berupa array nested per jam untuk 3 hari ke depan.
-- Daripada membuat tabel anak berbaris-baris (overkill), kita simpan payload
-- terstruktur di dalam kolom forecast_detail bertipe JSONB.
-- ====================================================================
CREATE TABLE IF NOT EXISTS data_cuaca (
    id SERIAL PRIMARY KEY,
    kota_id VARCHAR(20) NOT NULL UNIQUE REFERENCES wilayah_kota(id) ON DELETE CASCADE,
    suhu_saat_ini NUMERIC(4,1),                  -- Suhu aktual derajat Celcius
    kelembapan_saat_ini NUMERIC(4,1),            -- Kelembapan udara (%)
    kondisi_cuaca VARCHAR(100),                  -- Contoh: 'Cerah', 'Hujan Lebat'
    ikon_cuaca_url TEXT,                         -- URL ikon SVG dari BMKG
    kecepatan_angin NUMERIC(5,2),                -- Kecepatan angin (km/jam)
    arah_angin VARCHAR(20),                      -- Contoh: 'Utara', 'Barat Daya'
    forecast_detail JSONB NOT NULL,              -- Array ramalan per 3 jam untuk 3 hari (NoSQL)
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Membuat Index GIN (Generalized Inverted Index) pada kolom JSONB
-- Tujuannya: Query pencarian isi atribut JSON di dalam PostgreSQL menjadi secepat kilat
CREATE INDEX IF NOT EXISTS idx_cuaca_forecast_gin ON data_cuaca USING GIN (forecast_detail);

COMMENT ON COLUMN data_cuaca.forecast_detail IS 'Dokumen JSON bersarang berisi jadwal prakiraan cuaca per 3 jam dari BMKG';

-- ====================================================================
-- TABEL 4: GEMPA TERKINI & RIWAYAT GEMPA (NoSQL Pattern)
-- Penjelasan: Menyimpan parameter gempa bumi M 5.0+ dan gempa dirasakan
-- dari sensor TEWS (Tsunami Early Warning System) BMKG.
-- ====================================================================
CREATE TABLE IF NOT EXISTS gempa_terkini (
    id SERIAL PRIMARY KEY,
    gempa_id VARCHAR(50) UNIQUE,                -- Identifier unik kombinasi tanggal+jam
    tanggal_jam VARCHAR(50) NOT NULL,           -- Contoh: '15 Sep 2026, 09:27:41 WIB'
    datetime_utc TIMESTAMP WITH TIME ZONE,      -- Waktu format standar ISO/UTC
    latitude VARCHAR(20) NOT NULL,              -- Lintang (contoh: '-8.26 LS')
    longitude VARCHAR(20) NOT NULL,             -- Bujur (contoh: '120.57 BT')
    magnitude NUMERIC(3,1) NOT NULL,            -- Skala Richter / Magnitudo
    kedalaman VARCHAR(30) NOT NULL,             -- Kedalaman gempa (contoh: '10 km')
    wilayah TEXT NOT NULL,                      -- Keterangan lokasi pusat gempa
    potensi TEXT,                               -- Contoh: 'Tidak berpotensi tsunami'
    dirasakan TEXT,                             -- Skala MMI di wilayah sekitar
    shakemap_image_url TEXT,                    -- URL gambar peta guncangan dari BMKG
    tipe_gempa VARCHAR(30) DEFAULT 'TERKINI',   -- 'TERKINI', 'M5', atau 'DIRASAKAN'
    raw_payload JSONB,                          -- Arsip data mentah asli respons BMKG
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pada kolom magnitude dan datetime agar urutan gempa cepat ditampilkan
CREATE INDEX IF NOT EXISTS idx_gempa_datetime ON gempa_terkini (datetime_utc DESC);
CREATE INDEX IF NOT EXISTS idx_gempa_magnitude ON gempa_terkini (magnitude DESC);

-- ====================================================================
-- TABEL 4B: PERINGATAN DINI CUACA EKSTREM (NOWCAST CAP RSS BMKG)
-- Penjelasan: Menyimpan peringatan dini cuaca ekstrem resmi BMKG
-- (hujan lebat, kilat/petir, angin kencang) dari feed nowcast nasional.
-- ====================================================================
CREATE TABLE IF NOT EXISTS peringatan_dini (
    id SERIAL PRIMARY KEY,
    guid VARCHAR(100) UNIQUE NOT NULL,          -- Identifier unik peringatan BMKG
    judul VARCHAR(255) NOT NULL,                -- Contoh: 'Hujan Lebat disertai Petir di Jambi'
    deskripsi TEXT NOT NULL,                    -- Wilayah kecamatan terdampak & himbauan
    link TEXT,                                  -- Link detail dokumen XML CAP BMKG
    pub_date VARCHAR(100),                      -- Waktu publikasi
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_peringatan_pubdate ON peringatan_dini (created_at DESC);

-- ====================================================================
-- TABEL 4C: KUALITAS UDARA (KONSENTRASI PARTIKULAT PM2.5 BMKG)
-- Penjelasan: Menyimpan data baku mutu polusi udara dari Stasiun
-- Pemantau Kualitas Udara (SPKU) otomatis BMKG di seluruh Indonesia.
-- Parameter: PM2.5 (µg/m³) dan Kategori Kesehatan (Baik/Sedang/Tidak Sehat)
-- ====================================================================
CREATE TABLE IF NOT EXISTS kualitas_udara (
    id SERIAL PRIMARY KEY,
    stasiun VARCHAR(100) UNIQUE NOT NULL,      -- Nama stasiun / kota (Kemayoran, Semarang, Medan, dll)
    pm25 NUMERIC(6,1) NOT NULL,               -- Konsentrasi PM2.5 dalam satuan µg/m³
    kategori VARCHAR(50) NOT NULL,            -- 'Baik', 'Sedang', 'Tidak Sehat', 'Sangat Tidak Sehat', 'Berbahaya'
    latitude VARCHAR(20),
    longitude VARCHAR(20),
    jam_pengamatan INTEGER,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kualitas_pm25 ON kualitas_udara (pm25 DESC);


-- ====================================================================
-- TABEL 5: PENGGUNA (Otentikasi & Autorisasi JWT)
-- Penjelasan: Mendukung fitur user login/register untuk menyimpan
-- preferensi notifikasi dan bookmark kota favorit.
-- ====================================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_lengkap VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,        -- Password di-hash menggunakan bcrypt
    role VARCHAR(20) DEFAULT 'USER',            -- 'USER' atau 'ADMIN'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ====================================================================
-- TABEL 6: BOOKMARK KOTA FAVORIT PENGGUNA
-- Penjelasan: Relasi Many-to-Many antara pengguna dan kota yang dipantau.
-- ====================================================================
CREATE TABLE IF NOT EXISTS user_bookmarks (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    kota_id VARCHAR(20) REFERENCES wilayah_kota(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, kota_id)
);

-- ====================================================================
-- SEED DATA: WILAYAH KOTA UTAMA DI INDONESIA BESERTA KODE ADM4 BMKG
-- Kode adm4 ini diambil dari standarisasi sistem BMKG Open API
-- ====================================================================

-- 1. Insert Provinsi Utama di Indonesia
INSERT INTO wilayah_provinsi (id, nama) VALUES
('11', 'Aceh'),
('12', 'Sumatera Utara'),
('13', 'Sumatera Barat'),
('14', 'Riau'),
('16', 'Sumatera Selatan'),
('18', 'Lampung'),
('31', 'DKI Jakarta'),
('32', 'Jawa Barat'),
('33', 'Jawa Tengah'),
('34', 'D.I. Yogyakarta'),
('35', 'Jawa Timur'),
('36', 'Banten'),
('51', 'Bali'),
('52', 'Nusa Tenggara Barat'),
('53', 'Nusa Tenggara Timur'),
('61', 'Kalimantan Barat'),
('63', 'Kalimantan Selatan'),
('64', 'Kalimantan Timur'),
('71', 'Sulawesi Utara'),
('72', 'Sulawesi Tengah'),
('73', 'Sulawesi Selatan'),
('74', 'Sulawesi Tenggara'),
('81', 'Maluku'),
('91', 'Papua')
ON CONFLICT (id) DO NOTHING;

-- 2. Insert 31 Kota Populer Beserta Koordinat & Kode adm4 Resmi BMKG
INSERT INTO wilayah_kota (id, provinsi_id, nama, tipe, latitude, longitude) VALUES
('31.71.01.1001', '31', 'Jakarta Pusat', 'KOTA', -6.1805, 106.8284),
('31.74.01.1001', '31', 'Jakarta Selatan', 'KOTA', -6.2615, 106.8106),
('32.71.01.1001', '32', 'Kota Bogor', 'KOTA', -6.5971, 106.8060),
('32.73.01.1001', '32', 'Kota Bandung', 'KOTA', -6.9175, 107.6191),
('32.75.01.1001', '32', 'Kota Bekasi', 'KOTA', -6.2383, 106.9756),
('32.76.03.1001', '32', 'Kota Depok', 'KOTA', -6.4025, 106.7942),
('36.71.01.1001', '36', 'Kota Tangerang', 'KOTA', -6.1783, 106.6319),
('33.74.01.1001', '33', 'Kota Semarang', 'KOTA', -6.9932, 110.4203),
('33.72.01.1001', '33', 'Kota Surakarta (Solo)', 'KOTA', -7.5755, 110.8243),
('34.71.01.1001', '34', 'Kota Yogyakarta', 'KOTA', -7.7956, 110.3695),
('35.78.01.1001', '35', 'Kota Surabaya', 'KOTA', -7.2575, 112.7521),
('35.73.01.1001', '35', 'Kota Malang', 'KOTA', -7.9666, 112.6326),
('51.71.01.1001', '51', 'Kota Denpasar', 'KOTA', -8.6705, 115.2126),
('52.71.02.1001', '52', 'Kota Mataram', 'KOTA', -8.5833, 116.1167),
('53.71.01.1001', '53', 'Kota Kupang', 'KOTA', -10.1772, 123.6070),
('11.71.01.2001', '11', 'Kota Banda Aceh', 'KOTA', 5.5483, 95.3238),
('12.71.01.1001', '12', 'Kota Medan', 'KOTA', 3.5952, 98.6722),
('13.71.01.1001', '13', 'Kota Padang', 'KOTA', -0.9471, 100.4172),
('14.71.02.1001', '14', 'Kota Pekanbaru', 'KOTA', 0.5071, 101.4478),
('16.71.01.1001', '16', 'Kota Palembang', 'KOTA', -2.9761, 104.7754),
('18.71.03.1001', '18', 'Kota Bandar Lampung', 'KOTA', -5.4500, 105.2667),
('61.71.02.1001', '61', 'Kota Pontianak', 'KOTA', -0.0263, 109.3425),
('63.71.01.1001', '63', 'Kota Banjarmasin', 'KOTA', -3.3194, 114.5908),
('64.71.01.1001', '64', 'Kota Balikpapan', 'KOTA', -1.2379, 116.8289),
('64.72.01.1001', '64', 'Kota Samarinda', 'KOTA', -0.5022, 117.1536),
('71.71.01.1001', '71', 'Kota Manado', 'KOTA', 1.4748, 124.8428),
('72.71.03.1001', '72', 'Kota Palu', 'KOTA', -0.8917, 119.8707),
('73.71.01.1001', '73', 'Kota Makassar', 'KOTA', -5.1477, 119.4327),
('74.71.03.1001', '74', 'Kota Kendari', 'KOTA', -3.9985, 122.5126),
('81.71.01.2001', '81', 'Kota Ambon', 'KOTA', -3.6547, 128.1906),
('91.71.01.1001', '91', 'Kota Jayapura', 'KOTA', -2.5337, 140.7181)
ON CONFLICT (id) DO NOTHING;

-- 3. Akun Pengguna Contoh (Password: "Rahasia123!" yang sudah di-hash dengan bcrypt)
INSERT INTO users (id, nama_lengkap, email, password_hash, role) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Admin BMKG Monitor', 'admin@nusantaraweather.id', '$2a$10$7Z8VfXw8vS0QoW9oR8jSmeE0D.e1tHjD2NlVwU2XpG1q9k9vR1bWe', 'ADMIN')
ON CONFLICT (email) DO NOTHING;

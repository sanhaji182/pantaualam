"""
=============================================================================
MODUL KONFIGURASI INGESTION SERVICE (Python)
File: src/config.py
Deskripsi:
Membaca variabel lingkungan (environment variables) dari file .env atau sistem,
seperti koneksi database PostgreSQL dan URL resmi API Terbuka BMKG.
=============================================================================
"""

import os
from dotenv import load_dotenv

# Memuat file .env jika tersedia di root folder service
load_dotenv()

class Config:
    # -------------------------------------------------------------------------
    # 1. Konfigurasi Koneksi Database PostgreSQL
    # Nilai default diarahkan ke container lokal / docker-compose
    # -------------------------------------------------------------------------
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = int(os.getenv("DB_PORT", "5432"))
    DB_USER = os.getenv("DB_USER", "postgres")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres123")
    DB_NAME = os.getenv("DB_NAME", "nusantara_weather")

    # -------------------------------------------------------------------------
    # 2. Daftar Endpoint Resmi API Terbuka BMKG
    # Catatan: Endpoint ini berstatus publik dan tidak memerlukan API Key
    # -------------------------------------------------------------------------
    # Endpoint gempa bumi terbaru (M 5.0+ / Dirasakan)
    BMKG_AUTOGEMPA_URL = "https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json"
    
    # Endpoint 15 daftar gempa terkini dengan magnitudo >= 5.0
    BMKG_GEMPA_TERKINI_URL = "https://data.bmkg.go.id/DataMKG/TEWS/gempaterkini.json"
    
    # Endpoint 15 daftar gempa terakhir yang dirasakan oleh masyarakat
    BMKG_GEMPA_DIRASAKAN_URL = "https://data.bmkg.go.id/DataMKG/TEWS/gempadirasakan.json"

    # Base URL gambar shakemap (peta guncangan) dari BMKG
    BMKG_SHAKEMAP_BASE_URL = "https://data.bmkg.go.id/DataMKG/TEWS/"

    # Endpoint cuaca berbasis kode adm4 (kecamatan/kelurahan)
    BMKG_CUACA_URL = "https://api.bmkg.go.id/publik/prakiraan-cuaca"

    # Endpoint peringatan dini cuaca ekstrem resmi BMKG (CAP RSS Feed)
    BMKG_NOWCAST_URL = "https://www.bmkg.go.id/alerts/nowcast/id"

    # Endpoint informasi kualitas udara partikulat PM2.5 dari Stasiun Pemantau BMKG
    BMKG_AIR_QUALITY_URL = "https://www.bmkg.go.id/kualitas-udara/informasi-partikulat-pm25.bmkg"

    # Endpoint pemantauan gunung api resmi PVMBG / MAGMA ESDM Indonesia
    MAGMA_VOLCANO_STATUS_URL = "https://magma.esdm.go.id/v1/gunung-api/tingkat-aktivitas"
    MAGMA_VOLCANO_ERUPTION_URL = "https://magma.esdm.go.id/v1/gunung-api/informasi-letusan"

    # -------------------------------------------------------------------------
    # 3. Parameter Operasional Worker
    # -------------------------------------------------------------------------
    # Interval waktu penarikan data berkala dalam satuan detik (default: 15 menit)
    SYNC_INTERVAL_SECONDS = int(os.getenv("SYNC_INTERVAL_SECONDS", "900"))
    
    # Timeout request HTTP ke BMKG (dalam detik) untuk mencegah proses hang
    HTTP_TIMEOUT = int(os.getenv("HTTP_TIMEOUT", "15"))

"""
=============================================================================
MODUL DATABASE (Python + PostgreSQL)
File: src/db.py
Deskripsi:
Mengelola koneksi ke PostgreSQL dan menjalankan operasi SQL (UPSERT),
termasuk penyimpanan dokumen semi-terstruktur JSONB.
=============================================================================
"""

import json
import logging
import psycopg2
from psycopg2.extras import RealDictCursor
from src.config import Config

# Konfigurasi logger untuk mencatat aktivitas database
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

def get_db_connection():
    """
    Membuka koneksi baru ke database PostgreSQL.
    Menggunakan konfigurasi yang telah didefinisikan di src/config.py.
    """
    try:
        conn = psycopg2.connect(
            host=Config.DB_HOST,
            port=Config.DB_PORT,
            user=Config.DB_USER,
            password=Config.DB_PASSWORD,
            dbname=Config.DB_NAME,
            cursor_factory=RealDictCursor
        )
        return conn
    except Exception as e:
        logger.error(f"Gagal terhubung ke database PostgreSQL: {e}")
        raise

def get_registered_cities():
    """
    Mengambil daftar seluruh kota/kabupaten yang terdaftar di tabel wilayah_kota.
    Data ini digunakan untuk loop pemanggilan API cuaca per wilayah.
    """
    query = """
        SELECT id, nama, tipe, latitude, longitude 
        FROM wilayah_kota 
        ORDER BY nama ASC;
    """
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(query)
            cities = cur.fetchall()
            return cities
    finally:
        conn.close()

def upsert_earthquake_data(gempa_dict, tipe="TERKINI"):
    """
    Menyimpan atau memperbarui (UPSERT) data gempa bumi dari BMKG ke PostgreSQL.
    
    Logika Penanganan Konflik (ON CONFLICT DO UPDATE):
    Jika data gempa dengan tanggal & jam yang sama sudah ada,
    sistem akan mengupdate informasinya agar tidak terjadi duplikasi data.
    """
    # 1. Membuat ID unik berbasis DateTime atau Tanggal+Jam
    gempa_id = gempa_dict.get("DateTime") or f"{gempa_dict.get('Tanggal')}-{gempa_dict.get('Jam')}"
    
    # 2. Parsing koordinat lintang & bujur
    coordinates = gempa_dict.get("Coordinates", "").split(",")
    lat = gempa_dict.get("Lintang", coordinates[0] if len(coordinates) > 0 else "")
    lon = gempa_dict.get("Bujur", coordinates[1] if len(coordinates) > 1 else "")
    
    # 3. Membersihkan nilai numerik magnitude
    try:
        magnitude = float(gempa_dict.get("Magnitude", 0.0))
    except (ValueError, TypeError):
        magnitude = 0.0
        
    # 4. Memeriksa potensi tsunami
    potensi = gempa_dict.get("Potensi", "")
    potensi_tsunami = "tsunami" in potensi.lower() and "tidak" not in potensi.lower()

    # 5. Format shakemap URL (jika ada gambar peta guncangan)
    shakemap_filename = gempa_dict.get("Shakemap", "")
    shakemap_url = f"{Config.BMKG_SHAKEMAP_BASE_URL}{shakemap_filename}" if shakemap_filename else None

    query = """
        INSERT INTO gempa_terkini (
            gempa_id, tanggal_jam, datetime_utc, latitude, longitude,
            magnitude, kedalaman, wilayah, potensi, dirasakan,
            shakemap_image_url, tipe_gempa, raw_payload
        ) VALUES (
            %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s,
            %s, %s, %s
        )
        ON CONFLICT (gempa_id) DO UPDATE SET
            potensi = EXCLUDED.potensi,
            dirasakan = EXCLUDED.dirasakan,
            shakemap_image_url = EXCLUDED.shakemap_image_url,
            raw_payload = EXCLUDED.raw_payload;
    """

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(query, (
                gempa_id,
                f"{gempa_dict.get('Tanggal', '')} {gempa_dict.get('Jam', '')}".strip(),
                gempa_dict.get("DateTime"),
                lat,
                lon,
                magnitude,
                gempa_dict.get("Kedalaman", ""),
                gempa_dict.get("Wilayah", ""),
                potensi,
                gempa_dict.get("Dirasakan", "-"),
                shakemap_url,
                tipe,
                json.dumps(gempa_dict) # Disimpan sebagai JSONB
            ))
        conn.commit()
        logger.info(f"Berhasil menyimpan data gempa: {gempa_id} ({gempa_dict.get('Wilayah')})")
    except Exception as e:
        conn.rollback()
        logger.error(f"Gagal menyimpan data gempa ke DB: {e}")
    finally:
        conn.close()

def upsert_weather_data(kota_id, summary_data, raw_forecast_list):
    """
    Menyimpan atau memperbarui data cuaca kota ke tabel data_cuaca.
    
    Karakteristik NoSQL (JSONB):
    Rincian forecast 3 hari (jadwal cuaca per 3 jam) disimpan utuh
    sebagai JSONB di kolom forecast_detail untuk query cepat.
    """
    query = """
        INSERT INTO data_cuaca (
            kota_id, suhu_saat_ini, kelembapan_saat_ini, kondisi_cuaca,
            ikon_cuaca_url, kecepatan_angin, arah_angin, forecast_detail, updated_at
        ) VALUES (
            %s, %s, %s, %s,
            %s, %s, %s, %s, NOW()
        )
        ON CONFLICT (kota_id) DO UPDATE SET
            suhu_saat_ini = EXCLUDED.suhu_saat_ini,
            kelembapan_saat_ini = EXCLUDED.kelembapan_saat_ini,
            kondisi_cuaca = EXCLUDED.kondisi_cuaca,
            ikon_cuaca_url = EXCLUDED.ikon_cuaca_url,
            kecepatan_angin = EXCLUDED.kecepatan_angin,
            arah_angin = EXCLUDED.arah_angin,
            forecast_detail = EXCLUDED.forecast_detail,
            updated_at = NOW();
    """

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(query, (
                kota_id,
                summary_data.get("suhu"),
                summary_data.get("kelembapan"),
                summary_data.get("kondisi"),
                summary_data.get("ikon_url"),
                summary_data.get("kecepatan_angin"),
                summary_data.get("arah_angin"),
                json.dumps(raw_forecast_list) # Disimpan ke kolom JSONB
            ))
        conn.commit()
        logger.info(f"Berhasil memperbarui data cuaca untuk kota_id: {kota_id}")
    except Exception as e:
        conn.rollback()
        logger.error(f"Gagal menyimpan data cuaca ke DB: {e}")
    finally:
        conn.close()

def upsert_weather_alert(alert_dict):
    """
    Menyimpan atau memperbarui data peringatan cuaca ekstrem BMKG ke tabel peringatan_dini.
    """
    query = """
        INSERT INTO peringatan_dini (
            guid, judul, deskripsi, link, pub_date, created_at
        ) VALUES (
            %s, %s, %s, %s, %s, NOW()
        )
        ON CONFLICT (guid) DO UPDATE SET
            judul = EXCLUDED.judul,
            deskripsi = EXCLUDED.deskripsi,
            link = EXCLUDED.link,
            pub_date = EXCLUDED.pub_date,
            created_at = NOW();
    """

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(query, (
                alert_dict.get("guid"),
                alert_dict.get("judul"),
                alert_dict.get("deskripsi"),
                alert_dict.get("link"),
                alert_dict.get("pub_date")
            ))
        conn.commit()
    except Exception as e:
        conn.rollback()
        logger.error(f"Gagal menyimpan peringatan cuaca ke DB: {e}")
    finally:
        conn.close()

def upsert_air_quality(station_dict):
    """
    Menyimpan atau memperbarui data konsentrasi PM2.5 stasiun ke tabel kualitas_udara.
    
    Logika Penanganan Konflik (ON CONFLICT (stasiun) DO UPDATE):
    Jika stasiun sudah tercatat di database, nilai PM2.5, kategori, dan waktu pengamatan
    akan diperbarui secara realtime.
    """
    query = """
        INSERT INTO kualitas_udara (
            stasiun, pm25, kategori, latitude, longitude, jam_pengamatan, updated_at
        ) VALUES (
            %s, %s, %s, %s, %s, %s, NOW()
        )
        ON CONFLICT (stasiun) DO UPDATE SET
            pm25 = EXCLUDED.pm25,
            kategori = EXCLUDED.kategori,
            latitude = EXCLUDED.latitude,
            longitude = EXCLUDED.longitude,
            jam_pengamatan = EXCLUDED.jam_pengamatan,
            updated_at = NOW();
    """

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(query, (
                station_dict.get("stasiun"),
                station_dict.get("pm25"),
                station_dict.get("kategori"),
                station_dict.get("latitude"),
                station_dict.get("longitude"),
                station_dict.get("jam_pengamatan")
            ))
        conn.commit()
    except Exception as e:
        conn.rollback()
        logger.error(f"Gagal menyimpan kualitas udara stasiun [{station_dict.get('stasiun')}] ke DB: {e}")
    finally:
        conn.close()



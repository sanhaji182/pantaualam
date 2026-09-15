"""
=============================================================================
ENTRY POINT INGESTION SERVICE (Python Worker)
File: src/main.py
Deskripsi:
Program utama yang menjalankan siklus penarikan data secara berkala (scheduler).
Dapat dijalankan sekali saja (mode --once) atau terus-menerus (daemon mode).
=============================================================================
"""

import sys
import time
import logging
from src.config import Config
from src.db import (
    get_registered_cities,
    upsert_earthquake_data,
    upsert_weather_data,
    upsert_weather_alert,
    upsert_air_quality,
    init_volcano_tables,
    upsert_volcano_data,
    insert_eruption_report
)
from src.fetcher import (
    fetch_latest_earthquake,
    fetch_recent_earthquakes,
    fetch_felt_earthquakes,
    fetch_extreme_weather_alerts,
    fetch_weather_forecast,
    fetch_air_quality,
    fetch_volcano_activity,
    fetch_recent_eruptions
)

# Konfigurasi format logging di konsol
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [IngestionWorker] %(message)s"
)
logger = logging.getLogger(__name__)

def sync_all_data():
    """
    Menjalankan 1 siklus sinkronisasi data lengkap:
    1. Ambil data gempa terbaru (autogempa M 5.0+ / Potensi Tsunami)
    2. Ambil data 15 gempa terkini M 5.0+
    3. Ambil data 15 gempa dirasakan oleh masyarakat
    4. Ambil feed peringatan dini cuaca ekstrem resmi BMKG (CAP RSS Nowcast)
    5. Ambil data cuaca wilayah untuk seluruh kota terdaftar di PostgreSQL
    """
    logger.info(">>> MEMULAI SIKLUS SINKRONISASI DATA LENGKAP BMKG <<<")

    # -------------------------------------------------------------------------
    # LANGKAH 1: SINKRONISASI GEMPA BUMI TERBARU (AUTOGEMPA)
    # -------------------------------------------------------------------------
    latest_quake = fetch_latest_earthquake()
    if latest_quake:
        upsert_earthquake_data(latest_quake, tipe="TERKINI")
    else:
        logger.warning("Lewati update gempa terbaru karena data gagal diambil.")

    # -------------------------------------------------------------------------
    # LANGKAH 2A: SINKRONISASI 15 GEMPA TERKINI M 5.0+
    # -------------------------------------------------------------------------
    recent_quakes = fetch_recent_earthquakes()
    for quake in recent_quakes:
        upsert_earthquake_data(quake, tipe="M5")

    # -------------------------------------------------------------------------
    # LANGKAH 2B: SINKRONISASI 15 GEMPA DIRASAKAN MASYARAKAT
    # -------------------------------------------------------------------------
    felt_quakes = fetch_felt_earthquakes()
    for quake in felt_quakes:
        upsert_earthquake_data(quake, tipe="DIRASAKAN")

    # -------------------------------------------------------------------------
    # LANGKAH 3: SINKRONISASI PERINGATAN DINI CUACA EKSTREM (NOWCAST CAP)
    # -------------------------------------------------------------------------
    alerts = fetch_extreme_weather_alerts()
    for alert in alerts:
        upsert_weather_alert(alert)

    # -------------------------------------------------------------------------
    # LANGKAH 4: SINKRONISASI PRAKIRAAN CUACA WILAYAH KOTA
    # -------------------------------------------------------------------------

    try:
        cities = get_registered_cities()
        logger.info(f"Ditemukan {len(cities)} kota terdaftar di database untuk disinkronisasi.")

        for city in cities:
            kota_id = city["id"]
            kota_nama = city["nama"]
            
            logger.info(f"Sinkronisasi cuaca: {kota_nama} (ID: {kota_id})")
            summary, forecast_list = fetch_weather_forecast(kota_id)
            
            if summary and forecast_list:
                upsert_weather_data(kota_id, summary, forecast_list)
            else:
                logger.warning(f"Data cuaca untuk {kota_nama} tidak tersedia saat ini.")
            
            # Beri jeda 500ms antar request untuk mematuhi rate limit server BMKG
            time.sleep(0.5)

    except Exception as e:
        logger.error(f"Terjadi kesalahan saat memproses data cuaca kota: {e}")

    # -------------------------------------------------------------------------
    # LANGKAH 5: SINKRONISASI KUALITAS UDARA (PM2.5) DARI STASIUN BMKG
    # -------------------------------------------------------------------------
    try:
        logger.info("Memulai sinkronisasi data kualitas udara PM2.5...")
        air_records = fetch_air_quality()
        for record in air_records:
            upsert_air_quality(record)
        logger.info(f"Berhasil memperbarui {len(air_records)} data stasiun kualitas udara.")
    except Exception as e:
        logger.error(f"Terjadi kesalahan saat memproses data kualitas udara: {e}")

    # -------------------------------------------------------------------------
    # LANGKAH 6: SINKRONISASI STATUS GUNUNG API & ERUPSI TERKINI (PVMBG/MAGMA)
    # -------------------------------------------------------------------------
    try:
        logger.info("Memulai inisialisasi tabel dan sinkronisasi data gunung api...")
        init_volcano_tables()

        # 6A. Update tingkat aktivitas seluruh gunung api aktif
        volcanoes = fetch_volcano_activity()
        for v in volcanoes:
            upsert_volcano_data(v)
        logger.info(f"Berhasil memperbarui {len(volcanoes)} status aktivitas gunung api.")

        # 6B. Update riwayat letusan dan erupsi terkini
        eruptions = fetch_recent_eruptions()
        for erup in eruptions:
            insert_eruption_report(erup)
        logger.info(f"Berhasil memproses {len(eruptions)} laporan letusan/erupsi terkini.")
    except Exception as e:
        logger.error(f"Terjadi kesalahan saat memproses data gunung api: {e}")

    logger.info(">>> SIKLUS SINKRONISASI SELESAI DENGAN SUKSES <<<\n")

def main():
    """
    Fungsi utama:
    - Jika argumen '--once' diberikan, jalankan 1 kali lalu exit (cocok untuk cron job/test).
    - Jika tanpa argumen, jalankan sebagai background service yang tidur per interval waktu.
    """
    logger.info("Service Ingestion Data PantauAlam Berhasil Dimulai!")
    logger.info(f"Interval penarikan data: {Config.SYNC_INTERVAL_SECONDS} detik.")

    is_once = "--once" in sys.argv

    if is_once:
        logger.info("Mode sekali jalan (--once) terdeteksi. Menjalankan 1 kali...")
        sync_all_data()
        logger.info("Eksekusi mode --once selesai. Keluar dari program.")
        sys.exit(0)

    # Mode Loop Terus Menerus (Daemon Service)
    while True:
        try:
            sync_all_data()
            logger.info(f"Worker tidur selama {Config.SYNC_INTERVAL_SECONDS} detik hingga siklus berikutnya...")
            time.sleep(Config.SYNC_INTERVAL_SECONDS)
        except KeyboardInterrupt:
            logger.info("Service dihentikan oleh pengguna (KeyboardInterrupt).")
            break
        except Exception as e:
            logger.error(f"Error tak terduga dalam loop sinkronisasi: {e}")
            logger.info("Mencoba kembali dalam 60 detik...")
            time.sleep(60)

if __name__ == "__main__":
    main()

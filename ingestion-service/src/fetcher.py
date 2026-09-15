"""
=============================================================================
MODUL FETCHER API BMKG (Python)
File: src/fetcher.py
Deskripsi:
Mengambil data JSON dari endpoint resmi BMKG (gempa bumi dan prakiraan cuaca),
melakukan validasi struktur data, dan mengekstrak informasi penting.
=============================================================================
"""

import json
import logging
import re
import requests
from src.config import Config

logger = logging.getLogger(__name__)

def fetch_latest_earthquake():
    """
    Mengambil data gempa bumi terbaru (M 5.0+ atau dirasakan terkini) dari BMKG.
    URL: https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json
    """
    try:
        logger.info(f"Mengambil data gempa terbaru dari: {Config.BMKG_AUTOGEMPA_URL}")
        resp = requests.get(Config.BMKG_AUTOGEMPA_URL, timeout=Config.HTTP_TIMEOUT)
        resp.raise_for_status()
        data = resp.json()
        
        # Ekstrak objek gempa dari respons BMKG
        gempa = data.get("Infogempa", {}).get("gempa")
        if not gempa:
            logger.warning("Data gempa tidak ditemukan dalam payload BMKG autogempa.")
            return None
        return gempa
    except requests.exceptions.RequestException as e:
        logger.error(f"Gagal mengambil data gempa autogempa dari BMKG: {e}")
        return None

def fetch_recent_earthquakes():
    """
    Mengambil 15 daftar gempa terkini M 5.0+ dari BMKG.
    URL: https://data.bmkg.go.id/DataMKG/TEWS/gempaterkini.json
    """
    try:
        logger.info(f"Mengambil riwayat 15 gempa dari: {Config.BMKG_GEMPA_TERKINI_URL}")
        resp = requests.get(Config.BMKG_GEMPA_TERKINI_URL, timeout=Config.HTTP_TIMEOUT)
        resp.raise_for_status()
        data = resp.json()
        
        daftar_gempa = data.get("Infogempa", {}).get("gempa", [])
        return daftar_gempa
    except requests.exceptions.RequestException as e:
        logger.error(f"Gagal mengambil riwayat gempa dari BMKG: {e}")
        return []

def fetch_weather_forecast(adm4_code):
    """
    Mengambil prakiraan cuaca 3 hari untuk wilayah tertentu berdasarkan kode adm4.
    URL: https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4={adm4_code}
    
    Format Output BMKG:
    - 'lokasi': metadata wilayah (provinsi, kota, kecamatan, koordinat)
    - 'cuaca': array berisi 3 list (hari ke-1, hari ke-2, hari ke-3)
               yang masing-masing memuat ramalan per jam.
    """
    try:
        url = f"{Config.BMKG_CUACA_URL}?adm4={adm4_code}"
        logger.info(f"Mengambil data cuaca untuk adm4 [{adm4_code}]...")
        resp = requests.get(url, timeout=Config.HTTP_TIMEOUT)
        resp.raise_for_status()
        data = resp.json()

        cuaca_groups = data.get("data", [{}])[0].get("cuaca", [])
        if not cuaca_groups:
            logger.warning(f"Data cuaca kosong untuk kode adm4: {adm4_code}")
            return None, None

        # Rincian data cuaca pertama (kondisi cuaca saat ini / jam terdekat)
        current_forecast = cuaca_groups[0][0] if len(cuaca_groups) > 0 and len(cuaca_groups[0]) > 0 else {}

        summary = {
            "suhu": current_forecast.get("t"),                 # Suhu dalam Celcius
            "kelembapan": current_forecast.get("hu"),          # Kelembaban udara (%)
            "kondisi": current_forecast.get("weather_desc"),   # Contoh: 'Cerah Berawan'
            "ikon_url": current_forecast.get("image"),         # URL SVG ikon cuaca
            "kecepatan_angin": current_forecast.get("ws"),     # Kecepatan angin (km/h)
            "arah_angin": current_forecast.get("wd")           # Arah angin (N, S, SE, dll)
        }

        return summary, cuaca_groups
    except requests.exceptions.RequestException as e:
        logger.error(f"Gagal mengambil data cuaca untuk adm4 [{adm4_code}]: {e}")
        return None, None

def fetch_felt_earthquakes():
    """
    Mengambil 15 daftar gempa bumi terakhir yang dirasakan oleh masyarakat dari BMKG.
    URL: https://data.bmkg.go.id/DataMKG/TEWS/gempadirasakan.json
    """
    try:
        logger.info(f"Mengambil 15 gempa dirasakan dari: {Config.BMKG_GEMPA_DIRASAKAN_URL}")
        resp = requests.get(Config.BMKG_GEMPA_DIRASAKAN_URL, timeout=Config.HTTP_TIMEOUT)
        resp.raise_for_status()
        data = resp.json()
        
        daftar_gempa = data.get("Infogempa", {}).get("gempa", [])
        return daftar_gempa
    except requests.exceptions.RequestException as e:
        logger.error(f"Gagal mengambil data gempa dirasakan dari BMKG: {e}")
        return []

def fetch_extreme_weather_alerts():
    """
    Mengambil peringatan dini cuaca ekstrem resmi BMKG (Common Alerting Protocol / CAP RSS).
    URL: https://www.bmkg.go.id/alerts/nowcast/id
    
    Mengekstrak informasi: judul peringatan, deskripsi wilayah terdampak, dan waktu berlaku.
    """
    import xml.etree.ElementTree as ET
    try:
        logger.info(f"Mengambil feed peringatan dini cuaca ekstrem dari: {Config.BMKG_NOWCAST_URL}")
        resp = requests.get(Config.BMKG_NOWCAST_URL, timeout=Config.HTTP_TIMEOUT)
        resp.raise_for_status()

        # Parse dokumen XML RSS
        root = ET.fromstring(resp.content)
        channel = root.find("channel")
        if channel is None:
            return []

        alerts = []
        for item in channel.findall("item"):
            guid = item.findtext("guid", "").strip()
            title = item.findtext("title", "").strip()
            desc = item.findtext("description", "").strip()
            link = item.findtext("link", "").strip()
            pub_date = item.findtext("pubDate", "").strip()

            if title:
                alerts.append({
                    "guid": guid or link or title,
                    "judul": title,
                    "deskripsi": desc,
                    "link": link,
                    "pub_date": pub_date
                })

        logger.info(f"Berhasil memproses {len(alerts)} peringatan cuaca ekstrem BMKG.")
        return alerts
    except Exception as e:
        logger.error(f"Gagal mengambil/memproses peringatan dini cuaca ekstrem: {e}")
        return []

def fetch_air_quality():
    """
    Mengambil data pemantauan kualitas udara partikulat PM2.5 dari Stasiun BMKG seluruh Indonesia.
    URL: https://www.bmkg.go.id/kualitas-udara/informasi-partikulat-pm25.bmkg
    
    BMKG menyematkan data realtime SPKU (Stasiun Pemantau Kualitas Udara) di dalam
    state hydration payload script id '__NUXT_DATA__'.
    Fungsi ini mengekstrak daftar stasiun, nilai konsentrasi PM2.5 (µg/m³), kategori
    kesehatan (Baik, Sedang, Tidak Sehat, Sangat Tidak Sehat, Berbahaya), dan koordinat.
    """
    headers = {
        "User-Agent": "curl/8.7.1",
        "Accept": "*/*"
    }
    try:
        logger.info(f"Mengambil data kualitas udara BMKG PM2.5 dari: {Config.BMKG_AIR_QUALITY_URL}")
        resp = requests.get(Config.BMKG_AIR_QUALITY_URL, headers=headers, timeout=Config.HTTP_TIMEOUT)
        resp.raise_for_status()

        match = re.search(r'<script[^>]*id=["\']__NUXT_DATA__["\'][^>]*>(.*?)</script>', resp.text, re.DOTALL)
        if not match:
            logger.warning("Tag __NUXT_DATA__ tidak ditemukan di halaman kualitas udara BMKG.")
            return []

        nuxt_data = json.loads(match.group(1))

        # Helper untuk resolve referensi pointer indeks Nuxt array
        def resolve_ref(val):
            if isinstance(val, int) and 0 <= val < len(nuxt_data):
                return nuxt_data[val]
            return val

        station_records = []
        for item in nuxt_data:
            if isinstance(item, dict) and "LOKASI" in item and "PM25" in item:
                stasiun_nama = resolve_ref(item["LOKASI"])
                raw_pm25 = resolve_ref(item["PM25"])
                kondisi = resolve_ref(item.get("KONDISI", "Tidak Diketahui"))
                lat = resolve_ref(item.get("LAT", ""))
                lon = resolve_ref(item.get("LON", ""))
                jam = resolve_ref(item.get("JAM", 0))

                try:
                    pm25_val = float(raw_pm25)
                except (ValueError, TypeError):
                    pm25_val = 0.0

                try:
                    jam_val = int(jam)
                except (ValueError, TypeError):
                    jam_val = 0

                station_records.append({
                    "stasiun": str(stasiun_nama),
                    "pm25": pm25_val,
                    "kategori": str(kondisi),
                    "latitude": str(lat) if lat is not None else "",
                    "longitude": str(lon) if lon is not None else "",
                    "jam_pengamatan": jam_val
                })

        logger.info(f"Berhasil mengekstrak {len(station_records)} stasiun kualitas udara BMKG PM2.5.")
        return station_records
    except Exception as e:
        logger.error(f"Gagal mengambil/memproses data kualitas udara BMKG: {e}")
        return []



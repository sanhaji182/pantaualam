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

# =============================================================================
# DATA REFERENSI KOORDINAT & KETINGGIAN GUNUNG API INDONESIA (PVMBG)
# =============================================================================
VOLCANO_COORDINATES = {
    "merapi": (-7.540, 110.446, 2968),
    "semeru": (-8.108, 112.922, 3676),
    "anak krakatau": (-6.102, 105.423, 157),
    "lewotobi laki-laki": (-8.538, 122.768, 1584),
    "lewotobi laki - laki": (-8.538, 122.768, 1584),
    "lewotobi perempuan": (-8.555, 122.780, 1703),
    "ibu": (1.488, 127.630, 1325),
    "ili lewotolok": (-8.272, 123.505, 1423),
    "sinabung": (3.170, 98.392, 2460),
    "marapi": (-0.381, 100.473, 2891),
    "ruang": (2.303, 125.367, 725),
    "dukono": (1.693, 127.894, 1335),
    "bromo": (-7.942, 112.950, 2329),
    "kerinci": (-1.697, 101.264, 3805),
    "kelud": (-7.930, 112.308, 1731),
    "raung": (-8.125, 114.042, 3332),
    "slamet": (-7.242, 109.208, 3432),
    "tangkuban parahu": (-6.770, 107.600, 2084),
    "gede": (-6.790, 106.980, 2958),
    "papandayan": (-7.320, 107.730, 2665),
    "salak": (-6.720, 106.730, 2211),
    "agung": (-8.343, 115.508, 3142),
    "batur": (-8.242, 115.375, 1717),
    "rinjani": (-8.420, 116.470, 3726),
    "tambora": (-8.250, 118.000, 2850),
    "awu": (3.670, 125.450, 1320),
    "lokon": (1.358, 124.792, 1580),
    "soputan": (1.108, 124.737, 1785),
    "karangetang": (2.780, 125.400, 1784),
    "gamalama": (0.800, 127.325, 1715),
    "gamkonora": (1.380, 127.530, 1635),
    "banda api": (-4.525, 129.871, 640),
    "anak ranakah": (-8.620, 120.520, 2140),
    "bur ni telong": (4.770, 96.820, 2600),
    "dempo": (-4.030, 103.130, 3173),
    "talang": (-0.978, 100.679, 2597),
    "tandikat": (-0.433, 100.317, 2438),
    "kaba": (-3.520, 102.620, 1952),
    "suoh": (-5.250, 104.270, 1000),
    "guntur": (-7.143, 107.840, 2249),
    "ciremai": (-6.892, 108.400, 3078),
    "dieng": (-7.200, 109.900, 2565),
    "sumbing": (-7.384, 110.070, 3371),
    "sindoro": (-7.300, 109.992, 3136),
    "lawu": (-7.625, 111.192, 3265),
    "arjuno welirang": (-7.732, 112.580, 3339),
    "lamongan": (-7.979, 113.342, 1651),
    "ijen": (-8.058, 114.242, 2769),
    "sangeang api": (-8.200, 119.070, 1949),
    "inielika": (-8.730, 120.980, 1559),
    "ebulobo": (-8.820, 121.200, 2124),
    "kelimutu": (-8.770, 121.820, 1639),
    "rokatenda": (-8.320, 121.700, 875),
    "egon": (-8.670, 122.450, 1703),
    "sirung": (-8.508, 124.130, 862),
    "ambang": (0.750, 124.420, 1795),
    "mahawu": (1.350, 124.870, 1324),
    "tongkoko": (1.520, 125.200, 1149),
    "kie besi": (0.320, 127.400, 1357),
    "colo": (-0.170, 121.610, 507),
    "peuet sague": (4.914, 96.329, 2801),
    "seulawah agam": (5.448, 95.658, 1810),
    "sorikmarapi": (0.686, 99.622, 2145),
}

PROVINCE_COORDINATES = {
    "aceh": (4.695, 96.749),
    "sumatera utara": (2.115, 99.545),
    "sumatera barat": (-0.739, 100.800),
    "jambi": (-1.485, 102.438),
    "bengkulu": (-3.577, 102.346),
    "sumatera selatan": (-3.319, 104.914),
    "lampung": (-4.558, 105.406),
    "jawa barat": (-6.920, 107.604),
    "jawa tengah": (-7.150, 110.140),
    "daerah istimewa yogyakarta": (-7.795, 110.369),
    "daerah istimewa yogyakarta dan jawa tengah": (-7.540, 110.446),
    "jawa timur": (-7.536, 112.238),
    "banten": (-6.405, 106.064),
    "bali": (-8.409, 115.188),
    "nusa tenggara barat": (-8.652, 117.361),
    "nusa tenggara timur": (-8.657, 121.079),
    "sulawesi utara": (0.624, 123.975),
    "sulawesi tengah": (-1.430, 121.445),
    "maluku utara": (1.570, 127.808),
    "maluku": (-3.238, 130.145),
    "papua": (-4.269, 138.080)
}

def fetch_volcano_activity():
    """
    Mengambil data status tingkat aktivitas gunung api resmi PVMBG (MAGMA Indonesia).
    URL: https://magma.esdm.go.id/v1/gunung-api/tingkat-aktivitas
    
    Tingkat status:
    - Level IV (Awas) - level_angka: 4
    - Level III (Siaga) - level_angka: 3
    - Level II (Waspada) - level_angka: 2
    - Level I (Normal) - level_angka: 1
    
    Mengembalikan list objek gunung api berisi:
    nama, provinsi, level_aktivitas, level_angka, latitude, longitude, tinggi_meter, rekomendasi.
    """
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    }
    try:
        logger.info(f"Mengambil data tingkat aktivitas gunung api dari: {Config.MAGMA_VOLCANO_STATUS_URL}")
        resp = requests.get(Config.MAGMA_VOLCANO_STATUS_URL, headers=headers, timeout=Config.HTTP_TIMEOUT)
        resp.raise_for_status()

        table_idx = resp.text.find("Daftar Tingkat Aktivitas Gunung Api")
        table_text = resp.text[table_idx:] if table_idx != -1 else resp.text

        level_blocks = re.split(r'<a href="" class="[^"]*">(Level (IV|III|II|I) \(([^)]+)\))</a>', table_text)

        level_map = {
            "IV": (4, "Level IV (Awas)"),
            "III": (3, "Level III (Siaga)"),
            "II": (2, "Level II (Waspada)"),
            "I": (1, "Level I (Normal)")
        }

        volcanoes = []
        for i in range(1, len(level_blocks), 4):
            roman = level_blocks[i+1]
            level_name = level_blocks[i+2]
            content = level_blocks[i+3]

            num_lvl, formal_name = level_map.get(roman, (1, f"Level {roman} ({level_name})"))

            # Ekstrak rekomendasi atau penjelasan PVMBG untuk tingkat level ini
            desc_match = re.search(r'<span class="tx-11 d-block">(.*?)</span>', content)
            rekomendasi = desc_match.group(1).strip() if desc_match else ""

            # Ekstrak teks nama gunung dan provinsi sebelum tag anchor laporan
            entries = re.findall(r'<td>\s*([^<]+?)\s*<a\s+href="([^"]+)"', content)
            for full_text, link in entries:
                full_text = full_text.strip()
                if "Tidak ada gunung api" in full_text:
                    continue

                if " - " in full_text:
                    parts = full_text.rsplit(" - ", 1)
                    nama = parts[0].strip().replace(" - ", "-")
                    prov = parts[1].strip()
                else:
                    nama = full_text
                    prov = "Indonesia"

                # Normalisasi nama untuk pencocokan koordinat
                clean_nama = nama.lower().replace("gunung ", "").strip()
                coord_info = VOLCANO_COORDINATES.get(clean_nama)

                if coord_info:
                    lat = str(coord_info[0])
                    lon = str(coord_info[1])
                    tinggi = coord_info[2]
                else:
                    # Fallback ke koordinat centroid provinsi
                    prov_coord = PROVINCE_COORDINATES.get(prov.lower(), (-2.5, 118.0))
                    lat = str(prov_coord[0])
                    lon = str(prov_coord[1])
                    tinggi = 1500

                volcanoes.append({
                    "nama": nama,
                    "provinsi": prov,
                    "level_aktivitas": formal_name,
                    "level_angka": num_lvl,
                    "latitude": lat,
                    "longitude": lon,
                    "tinggi_meter": tinggi,
                    "rekomendasi": rekomendasi
                })

        logger.info(f"Berhasil mengekstrak {len(volcanoes)} data aktivitas gunung api dari PVMBG/MAGMA.")
        return volcanoes
    except Exception as e:
        logger.error(f"Gagal mengambil data aktivitas gunung api: {e}")
        return []

def fetch_recent_eruptions():
    """
    Mengambil data riwayat letusan & erupsi gunung api terkini resmi PVMBG (MAGMA Indonesia).
    URL: https://magma.esdm.go.id/v1/gunung-api/informasi-letusan
    
    Mengekstrak:
    - gunung_nama: Nama gunung api
    - waktu_erupsi: Waktu kejadian letusan (WIB/WITA/WIT)
    - tinggi_kolom_abu: Estimasi tinggi kolom abu vulkanik
    - arah_abu: Arah condong sebaran abu
    - amplitudo_durasi: Data perekaman seismograf
    - deskripsi: Catatan naratif lengkap dari pos pengamatan PVMBG
    """
    import html
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    }
    try:
        logger.info(f"Mengambil informasi letusan & erupsi terkini dari: {Config.MAGMA_VOLCANO_ERUPTION_URL}")
        resp = requests.get(Config.MAGMA_VOLCANO_ERUPTION_URL, headers=headers, timeout=Config.HTTP_TIMEOUT)
        resp.raise_for_status()

        raw_matches = re.findall(r"(Terjadi erupsi G\..*?)(?=<hr|<div class=\"mg-t|<\/div>)", resp.text, re.DOTALL)
        eruptions = []

        for raw_item in raw_matches:
            clean_text = re.sub(r'<[^>]+>', ' ', raw_item)
            clean_text = html.unescape(clean_text)
            clean_text = re.sub(r'\s+', ' ', clean_text).strip()

            if not clean_text:
                continue

            # 1. Ekstrak nama gunung
            g_match = re.search(r"Terjadi erupsi G\.\s+([A-Za-z0-9\s\-]+?)\s+pada hari", clean_text)
            gunung_nama = g_match.group(1).strip() if g_match else "Gunung Api"

            # 2. Ekstrak waktu erupsi
            w_match = re.search(r"pada hari\s+([A-Za-z0-9\s\:\,\.]+?)\s+dengan tinggi kolom", clean_text)
            waktu_erupsi = w_match.group(1).strip() if w_match else "Waktu tidak dicatat"

            # 3. Ekstrak tinggi kolom abu
            t_match = re.search(r"tinggi kolom abu teramati\s*([^\.]+?\.)", clean_text)
            tinggi_kolom = t_match.group(1).strip() if t_match else "Kolom abu tidak teramati"

            # 4. Ekstrak arah sebaran abu
            a_match = re.search(r"condong ke arah\s*([^\.]+?\.)", clean_text)
            arah_abu = a_match.group(1).strip() if a_match else "Arah abu beragam"

            # 5. Ekstrak rekaman seismograf
            s_match = re.search(r"(?:Seismograf|seismograf)[^\.]*amplitudo\s*maksimum\s*([^\.]+?\.)", clean_text)
            amplitudo = s_match.group(1).strip() if s_match else "Amplitudo terekam di seismograf"

            eruptions.append({
                "gunung_nama": gunung_nama,
                "waktu_erupsi": waktu_erupsi,
                "tinggi_kolom_abu": tinggi_kolom,
                "arah_abu": arah_abu,
                "amplitudo_durasi": amplitudo,
                "deskripsi": clean_text
            })

        logger.info(f"Berhasil mengekstrak {len(eruptions)} laporan letusan/erupsi terkini dari PVMBG.")
        return eruptions
    except Exception as e:
        logger.error(f"Gagal mengambil informasi letusan gunung api: {e}")
        return []



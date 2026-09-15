import React, { useState, useEffect } from 'react';
import { 
  MapPin, Wind, Droplets, Compass, Activity, 
  Calendar, AlertTriangle, ShieldCheck, ChevronRight, Search 
} from 'lucide-react';
import { calculateDistanceKm, findNearestAirStation } from '../utils/geo';
import { getCategoryBadge } from './AirQualitySection';

/**
 * =============================================================================
 * KOMPONEN: REGION SELECTOR & HERO SPOTLIGHT WILAYAH TERPILIH
 * File: src/components/RegionSelector.jsx
 * Deskripsi:
 * Memungkinkan pengguna memilih provinsi dan kota/kabupaten pantauan utama.
 * Menghitung stasiun kualitas udara (SPKU PM2.5) terdekat dan jarak ke episentrum
 * gempa terkini secara dinamis berbasis rumus Haversine.
 * =============================================================================
 */
export default function RegionSelector({ 
  weatherList = [], 
  airQualityData = [], 
  latestQuake = null, 
  weatherAlerts = [],
  onOpenWeatherModal 
}) {
  const [selectedProvince, setSelectedProvince] = useState('ALL');
  const [selectedCityId, setSelectedCityId] = useState(() => {
    return localStorage.getItem('nw_selected_city') || '';
  });

  // Ekstrak daftar unik nama provinsi
  const provinces = ['ALL', ...new Set(weatherList.map((item) => item.provinsi_nama).filter(Boolean))];

  // Filter daftar kota sesuai provinsi yang dipilih
  const availableCities = selectedProvince === 'ALL'
    ? weatherList
    : weatherList.filter((c) => c.provinsi_nama === selectedProvince);

  // Jika selectedCityId belum ada atau tidak valid, pilih kota pertama
  useEffect(() => {
    if (weatherList.length > 0) {
      const exists = weatherList.some((c) => c.kota_id === selectedCityId);
      if (!exists) {
        const defaultCity = weatherList.find((c) => c.kota_nama.includes('Jakarta Pusat')) || weatherList[0];
        if (defaultCity) {
          setSelectedCityId(defaultCity.kota_id);
          localStorage.setItem('nw_selected_city', defaultCity.kota_id);
        }
      }
    }
  }, [weatherList, selectedCityId]);

  // Handler ubah kota terpilih
  const handleCityChange = (kotaId) => {
    setSelectedCityId(kotaId);
    localStorage.setItem('nw_selected_city', kotaId);
  };

  // Data kota yang sedang aktif dipilih
  const currentCity = weatherList.find((c) => c.kota_id === selectedCityId) || weatherList[0];

  if (!currentCity) return null;

  // 1. Cari stasiun kualitas udara SPKU terdekat
  const nearestAirStation = findNearestAirStation(
    currentCity.latitude,
    currentCity.longitude,
    airQualityData
  );
  const airBadge = nearestAirStation 
    ? getCategoryBadge(nearestAirStation.kategori, nearestAirStation.pm25) 
    : null;

  // 2. Hitung jarak ke episentrum gempa terkini (jika ada)
  const distanceToQuake = latestQuake 
    ? calculateDistanceKm(
        currentCity.latitude,
        currentCity.longitude,
        latestQuake.latitude,
        latestQuake.longitude
      )
    : null;

  // 3. Periksa apakah ada peringatan cuaca ekstrem BMKG untuk provinsi ini
  const provinceAlert = weatherAlerts.find((alt) => {
    const text = (alt.judul + ' ' + alt.deskripsi).toLowerCase();
    return text.includes(currentCity.provinsi_nama.toLowerCase());
  });

  // Shortcut Kota-Kota Populer
  const popularCities = [
    { nama: 'Jakarta Pusat', id: '31.71.01.1001' },
    { nama: 'Kota Bandung', id: '32.73.01.1001' },
    { nama: 'Kota Surabaya', id: '35.78.01.1001' },
    { nama: 'Kota Yogyakarta', id: '34.71.01.1001' },
    { nama: 'Kota Semarang', id: '33.74.01.1001' },
    { nama: 'Kota Medan', id: '12.71.01.1001' },
    { nama: 'Kota Denpasar', id: '51.71.01.1001' },
    { nama: 'Kota Makassar', id: '73.71.01.1001' },
    { nama: 'Kota Balikpapan', id: '64.71.01.1001' },
  ];

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
      
      {/* 1. Baris Pemilihan Wilayah (Provinsi & Kota) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg tracking-tight">
                Pilih Wilayah Pantauan Utama Anda
              </h3>
              <p className="text-xs text-slate-500">
                Pilih dari 31 kota dan 24 provinsi se-Indonesia untuk mendapatkan analisis cuaca &amp; bencana lokal.
              </p>
            </div>
          </div>
        </div>

        {/* Dropdown Filter Provinsi & Pilihan Kota */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Dropdown Provinsi */}
          <select
            value={selectedProvince}
            onChange={(e) => setSelectedProvince(e.target.value)}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700 cursor-pointer"
          >
            {provinces.map((prov) => (
              <option key={prov} value={prov}>
                {prov === 'ALL' ? 'Semua Provinsi' : prov}
              </option>
            ))}
          </select>

          {/* Dropdown Kota / Kabupaten */}
          <select
            value={selectedCityId}
            onChange={(e) => handleCityChange(e.target.value)}
            className="px-3 py-2 text-xs font-bold rounded-xl border border-blue-200 bg-blue-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-blue-900 cursor-pointer"
          >
            {availableCities.map((city) => (
              <option key={city.kota_id} value={city.kota_id}>
                {city.kota_nama} ({city.provinsi_nama})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Chips Kota-Kota Populer Cepat */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
          Pilihan Cepat:
        </span>
        {popularCities.map((c) => {
          const isSelected = selectedCityId === c.id;
          return (
            <button
              key={c.id}
              onClick={() => handleCityChange(c.id)}
              className={`px-3 py-1 rounded-xl font-semibold transition-all whitespace-nowrap ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {c.nama}
            </button>
          );
        })}
      </div>

      {/* 2. KARTU HERO SPOTLIGHT WILAYAH TERPILIH */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl border border-blue-500/20 relative overflow-hidden">
        
        {/* Glow Accent Background */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          
          {/* Kolom 1: Informasi Cuaca Kota Terpilih (5 Kolom) */}
          <div className="lg:col-span-5 space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black tracking-widest uppercase px-2.5 py-0.5 rounded-full bg-blue-500/20 text-cyan-300 border border-blue-400/30">
                  {currentCity.provinsi_nama}
                </span>
                <span className="text-[11px] text-slate-300 font-mono">
                  {currentCity.latitude}&deg;, {currentCity.longitude}&deg;
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white mt-1 tracking-tight flex items-center gap-2">
                <MapPin className="w-6 h-6 text-cyan-400" />
                {currentCity.kota_nama}
              </h2>
            </div>

            {/* Suhu & Ikon BMKG */}
            <div className="flex items-center gap-4">
              {currentCity.ikon_cuaca_url ? (
                <img
                  src={currentCity.ikon_cuaca_url}
                  alt={currentCity.kondisi_cuaca}
                  className="w-20 h-20 object-contain drop-shadow-md"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center font-bold">
                  -
                </div>
              )}

              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl sm:text-5xl font-black tracking-tight text-white">
                    {currentCity.suhu_saat_ini !== null ? Math.round(currentCity.suhu_saat_ini) : '--'}
                  </span>
                  <span className="text-xl font-bold text-cyan-300">&deg;C</span>
                </div>
                <p className="text-sm font-semibold text-slate-200 mt-0.5">
                  {currentCity.kondisi_cuaca || 'Belum Ada Data'}
                </p>
              </div>
            </div>

            {/* Parameter Kelembapan & Angin */}
            <div className="flex items-center gap-4 text-xs text-slate-300 pt-2 border-t border-white/10">
              <div className="flex items-center gap-1.5">
                <Droplets className="w-4 h-4 text-cyan-400" />
                <span>Kelembapan: <strong className="text-white">{currentCity.kelembapan_saat_ini ?? '--'}%</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <Wind className="w-4 h-4 text-emerald-400" />
                <span>Angin: <strong className="text-white">{currentCity.kecepatan_angin ?? '--'} km/h</strong></span>
              </div>
              {currentCity.arah_angin && (
                <div className="flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-amber-400" />
                  <span>Arah: <strong className="text-white">{currentCity.arah_angin}</strong></span>
                </div>
              )}
            </div>
          </div>

          {/* Kolom 2: Analisis Kontekstual Geospasial Wilayah (7 Kolom) */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            {/* Box 1: Stasiun Kualitas Udara Terdekat */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2 backdrop-blur-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
                  <Wind className="w-3.5 h-3.5 text-cyan-400" />
                  Kualitas Udara Terdekat
                </span>
                {airBadge && (
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${airBadge.badgeBg}`}>
                    {airBadge.label}
                  </span>
                )}
              </div>

              {nearestAirStation ? (
                <div>
                  <h4 className="font-bold text-white text-sm truncate">
                    SPKU {nearestAirStation.stasiun}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Jarak garis lurus: <strong className="text-cyan-300">~{nearestAirStation.distanceKm} km</strong>
                  </p>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-white">{nearestAirStation.pm25}</span>
                    <span className="text-[11px] text-slate-300">&mu;g/m&sup3; PM2.5</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400">Data SPKU terdekat belum tersedia.</p>
              )}
            </div>

            {/* Box 2: Jarak ke Episentrum Gempa Terkini */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2 backdrop-blur-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5 text-red-400" />
                  Jarak ke Episentrum Gempa
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-white/10 text-slate-300">
                  {latestQuake ? `${latestQuake.magnitude} SR` : '-'}
                </span>
              </div>

              {latestQuake && distanceToQuake !== null ? (
                <div>
                  <h4 className="font-bold text-white text-sm">
                    ~{distanceToQuake} km
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 truncate" title={latestQuake.wilayah}>
                    Dari {latestQuake.wilayah}
                  </p>
                  <div className="mt-2">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      distanceToQuake < 200 
                        ? 'bg-red-500/20 text-red-300 border border-red-500/30' 
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}>
                      <ShieldCheck className="w-3 h-3" />
                      {distanceToQuake < 200 ? 'Dekat dengan Episentrum' : 'Jarak Aman & Kondusif'}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400">Menghitung jarak koordinat...</p>
              )}
            </div>

            {/* Box 3: Status Peringatan Cuaca Ekstrem Provinsi Ini */}
            <div className="sm:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  provinceAlert ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-emerald-500/20 text-emerald-300'
                }`}>
                  {provinceAlert ? <AlertTriangle className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                </div>
                <div>
                  <h5 className="font-bold text-xs text-white">
                    {provinceAlert 
                      ? `Peringatan Dini Cuaca Aktif di ${currentCity.provinsi_nama}` 
                      : `Kondisi Cuaca ${currentCity.provinsi_nama} Terpantau Kondusif`}
                  </h5>
                  <p className="text-[11px] text-slate-400 truncate max-w-md mt-0.5">
                    {provinceAlert ? provinceAlert.judul : 'Tidak ada ancaman cuaca ekstrem langsung saat ini.'}
                  </p>
                </div>
              </div>

              {/* Tombol Lihat Detail Prakiraan 3 Hari (NoSQL JSONB) */}
              <button
                onClick={() => onOpenWeatherModal(currentCity.kota_id)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-md shadow-blue-600/30 shrink-0 flex items-center gap-1.5"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Prakiraan 3 Hari</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}

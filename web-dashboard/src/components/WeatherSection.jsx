import React, { useState, useEffect } from 'react';
import { 
  Search, Wind, Droplets, Calendar, MapPin, 
  ChevronRight, Compass, Sun, CloudRain, Cloud, 
  Star, ArrowUpDown, GitCompare, X, Sparkles, Check 
} from 'lucide-react';
import { playSound } from '../utils/audio';

/**
 * =============================================================================
 * KOMPONEN: SEKSI PRAKIRAAN CUACA WILAYAH KOTA (Interactive Comparison & Favorites)
 * File: src/components/WeatherSection.jsx
 * Deskripsi:
 * Menampilkan kartu cuaca 31 kota dengan fitur:
 * 1. Filter kondisi (Cerah/Berawan/Hujan) & dropdown provinsi.
 * 2. Sistem Bookmark Kota Favorit (localStorage).
 * 3. Modal Komparasi Cuaca 2 Kota secara berdampingan (Dual-City Compare).
 * 4. Pengurutan suhu tertinggi / terendah / nama.
 * =============================================================================
 */
export default function WeatherSection({ weatherList = [], onSelectCity }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProvince, setSelectedProvince] = useState('ALL');
  const [conditionFilter, setConditionFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('DEFAULT'); // 'DEFAULT', 'HOTTEST', 'COLDEST', 'NAME'

  // Fitur Bookmark / Favorit (localStorage)
  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('nw_fav_cities')) || [];
    } catch {
      return [];
    }
  });

  // Fitur Modal Komparasi 2 Kota
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [compareCityAId, setCompareCityAId] = useState('');
  const [compareCityBId, setCompareCityBId] = useState('');

  // Default kota komparasi awal
  useEffect(() => {
    if (weatherList.length >= 2 && !compareCityAId) {
      setCompareCityAId(weatherList[0].kota_id);
      setCompareCityBId(weatherList[1].kota_id);
    }
  }, [weatherList, compareCityAId]);

  const toggleFavorite = (kotaId, e) => {
    e.stopPropagation();
    playSound('click');
    setFavorites(prev => {
      let updated;
      if (prev.includes(kotaId)) {
        updated = prev.filter(id => id !== kotaId);
      } else {
        updated = [...prev, kotaId];
      }
      localStorage.setItem('nw_fav_cities', JSON.stringify(updated));
      return updated;
    });
  };

  // Ekstrak nama provinsi unik
  const provinces = ['ALL', ...new Set(weatherList.map(item => item.provinsi_nama).filter(Boolean))];

  // Algoritma filter & sort
  let processedList = weatherList.filter(item => {
    const matchesSearch = item.kota_nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.provinsi_nama.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProvince = selectedProvince === 'ALL' || item.provinsi_nama === selectedProvince;
    
    let matchesCondition = true;
    const desc = (item.kondisi_cuaca || '').toLowerCase();
    if (conditionFilter === 'HUJAN') {
      matchesCondition = desc.includes('hujan') || desc.includes('petir') || desc.includes('gerimis');
    } else if (conditionFilter === 'CERAH') {
      matchesCondition = desc.includes('cerah') && !desc.includes('hujan');
    } else if (conditionFilter === 'BERAWAN') {
      matchesCondition = desc.includes('berawan') || desc.includes('kabut') || desc.includes('asap');
    }

    return matchesSearch && matchesProvince && matchesCondition;
  });

  // Sorting
  if (sortBy === 'HOTTEST') {
    processedList.sort((a, b) => (b.suhu_saat_ini || 0) - (a.suhu_saat_ini || 0));
  } else if (sortBy === 'COLDEST') {
    processedList.sort((a, b) => (a.suhu_saat_ini || 0) - (b.suhu_saat_ini || 0));
  } else if (sortBy === 'NAME') {
    processedList.sort((a, b) => a.kota_nama.localeCompare(b.kota_nama));
  }

  // Kota Komparasi A & B
  const cityA = weatherList.find(c => c.kota_id === compareCityAId);
  const cityB = weatherList.find(c => c.kota_id === compareCityBId);

  return (
    <section id="cuaca" className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
      
      {/* Header & Filter Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700">
              <Sun className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg tracking-tight">
                Prakiraan Cuaca Kota &amp; Kabupaten Seluruh Indonesia
              </h3>
              <p className="text-xs text-slate-500">
                Data resmi BMKG berbasis kode adm4 kecamatan dengan jadwal per jam selama 3 hari ke depan.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons: Bandingkan 2 Kota & Filter Kondisi */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Tombol Buka Mode Bandingkan Kota */}
          <button
            onClick={() => { setIsCompareOpen(true); playSound('chime'); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition-all shadow-2xs"
          >
            <GitCompare className="w-3.5 h-3.5 text-indigo-600" />
            <span>Bandingkan 2 Kota</span>
          </button>

          {/* Filter Kondisi Cepat (Chips) */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl text-xs font-bold">
            <button
              onClick={() => { setConditionFilter('ALL'); playSound('click'); }}
              className={`px-2.5 py-1 rounded-xl transition-all ${
                conditionFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Semua ({weatherList.length})
            </button>
            <button
              onClick={() => { setConditionFilter('CERAH'); playSound('click'); }}
              className={`px-2.5 py-1 rounded-xl transition-all flex items-center gap-1 ${
                conditionFilter === 'CERAH' ? 'bg-white text-amber-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Sun className="w-3 h-3 text-amber-500" />
              <span>Cerah</span>
            </button>
            <button
              onClick={() => { setConditionFilter('BERAWAN'); playSound('click'); }}
              className={`px-2.5 py-1 rounded-xl transition-all flex items-center gap-1 ${
                conditionFilter === 'BERAWAN' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Cloud className="w-3 h-3 text-blue-500" />
              <span>Berawan</span>
            </button>
            <button
              onClick={() => { setConditionFilter('HUJAN'); playSound('click'); }}
              className={`px-2.5 py-1 rounded-xl transition-all flex items-center gap-1 ${
                conditionFilter === 'HUJAN' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <CloudRain className="w-3 h-3 text-indigo-500" />
              <span>Hujan</span>
            </button>
          </div>

        </div>
      </div>

      {/* Baris Strip Kota Favorit (Jika Ada) */}
      {favorites.length > 0 && (
        <div className="p-3 bg-amber-50/60 rounded-2xl border border-amber-200/80 flex items-center gap-2 overflow-x-auto text-xs">
          <span className="font-bold text-amber-800 flex items-center gap-1 shrink-0">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
            Kota Favorit:
          </span>
          <div className="flex items-center gap-1.5 flex-1">
            {favorites.map(favId => {
              const city = weatherList.find(c => c.kota_id === favId);
              if (!city) return null;
              return (
                <button
                  key={favId}
                  onClick={() => { onSelectCity(favId); playSound('click'); }}
                  className="px-3 py-1 rounded-xl bg-white border border-amber-300 text-slate-800 hover:bg-amber-100/50 font-bold transition-all flex items-center gap-1.5 shrink-0 shadow-2xs"
                >
                  <span>{city.kota_nama}</span>
                  <span className="text-amber-700 font-black">{Math.round(city.suhu_saat_ini || 28)}°C</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Baris Kontrol Input: Search, Dropdown Provinsi, dan Sorting */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        
        {/* Search Input */}
        <div className="sm:col-span-5 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari nama kota, kabupaten, atau provinsi..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 rounded-2xl text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 placeholder-slate-400 transition-all"
          />
        </div>

        {/* Dropdown Provinsi */}
        <div className="sm:col-span-4">
          <select
            value={selectedProvince}
            onChange={(e) => { setSelectedProvince(e.target.value); playSound('click'); }}
            className="w-full px-3.5 py-2.5 bg-slate-50 rounded-2xl text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-semibold cursor-pointer"
          >
            {provinces.map(prov => (
              <option key={prov} value={prov}>
                {prov === 'ALL' ? 'Semua Provinsi Indonesia' : prov}
              </option>
            ))}
          </select>
        </div>

        {/* Sort Dropdown */}
        <div className="sm:col-span-3">
          <select
            value={sortBy}
            onChange={(e) => { setSortBy(e.target.value); playSound('click'); }}
            className="w-full px-3.5 py-2.5 bg-slate-50 rounded-2xl text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-semibold cursor-pointer"
          >
            <option value="DEFAULT">Urutkan: Default</option>
            <option value="HOTTEST">Suhu Tertinggi (Panas)</option>
            <option value="COLDEST">Suhu Terendah (Sejuk)</option>
            <option value="NAME">Nama Kota (A-Z)</option>
          </select>
        </div>

      </div>

      {/* Grid Kartu Cuaca Interaktif */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {processedList.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs">
            Tidak ditemukan kota yang cocok dengan filter atau pencarian Anda.
          </div>
        ) : (
          processedList.map((city) => {
            const isFav = favorites.includes(city.kota_id);
            const temp = Math.round(city.suhu_saat_ini || 28);
            const isRain = (city.kondisi_cuaca || '').toLowerCase().includes('hujan');

            return (
              <div
                key={city.kota_id}
                onClick={() => { onSelectCity(city.kota_id); playSound('click'); }}
                className="bg-slate-50/70 hover:bg-white rounded-3xl p-5 border border-slate-200/80 hover:border-blue-400 hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between relative overflow-hidden"
              >
                {/* Tombol Bookmark Bintang */}
                <button
                  onClick={(e) => toggleFavorite(city.kota_id, e)}
                  className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 transition-colors z-10"
                  title={isFav ? "Hapus dari Favorit" : "Simpan ke Kota Favorit"}
                >
                  <Star className={`w-4 h-4 transition-all ${
                    isFav ? 'fill-amber-400 text-amber-500 scale-110' : 'text-slate-300 hover:text-amber-400'
                  }`} />
                </button>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate max-w-[170px]">
                    {city.provinsi_nama}
                  </span>
                  <h4 className="font-extrabold text-slate-900 text-base mt-0.5 truncate max-w-[180px] group-hover:text-blue-600 transition-colors">
                    {city.kota_nama}
                  </h4>

                  {/* Baris Suhu & Kondisi */}
                  <div className="mt-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-slate-900 tracking-tight">
                          {temp}°
                        </span>
                        <span className="text-xs font-bold text-slate-400">C</span>
                      </div>
                      <span className={`text-xs font-bold mt-0.5 block ${
                        isRain ? 'text-indigo-600' : 'text-slate-600'
                      }`}>
                        {city.kondisi_cuaca || 'Cerah Berawan'}
                      </span>
                    </div>

                    {/* Ikon Cuaca Visual */}
                    <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200/80 flex items-center justify-center text-blue-600 shadow-xs group-hover:scale-110 transition-transform">
                      {isRain ? (
                        <CloudRain className="w-6 h-6 text-indigo-500" />
                      ) : (
                        <Sun className="w-6 h-6 text-amber-500" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Parameter Cuaca Bawah */}
                <div className="mt-4 pt-3.5 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                  <span className="flex items-center gap-1">
                    <Droplets className="w-3.5 h-3.5 text-blue-500" />
                    {city.kelembapan_saat_ini || 75}%
                  </span>
                  <span className="flex items-center gap-1">
                    <Wind className="w-3.5 h-3.5 text-cyan-500" />
                    {city.kecepatan_angin || 10} km/h
                  </span>
                  <span className="text-blue-600 font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                    Rincian <ChevronRight className="w-3 h-3" />
                  </span>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* ===================================================================== */}
      {/* MODAL KOMPARASI 2 KOTA BERDAMPINGAN (DUAL-CITY COMPARISON)            */}
      {/* ===================================================================== */}
      {isCompareOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-6">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <GitCompare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Komparasi Cuaca Dua Kota Indonesia
                  </h3>
                  <p className="text-xs text-slate-500">
                    Bandingkan parameter suhu, kelembapan, dan angin langsung dari data BMKG.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCompareOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Selector 2 Kota */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Kota A:</label>
                <select
                  value={compareCityAId}
                  onChange={(e) => setCompareCityAId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 rounded-xl text-xs font-bold border border-slate-200"
                >
                  {weatherList.map(c => (
                    <option key={c.kota_id} value={c.kota_id}>{c.kota_nama} ({c.provinsi_nama})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Kota B:</label>
                <select
                  value={compareCityBId}
                  onChange={(e) => setCompareCityBId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 rounded-xl text-xs font-bold border border-slate-200"
                >
                  {weatherList.map(c => (
                    <option key={c.kota_id} value={c.kota_id}>{c.kota_nama} ({c.provinsi_nama})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Perbandingan Berdampingan */}
            {cityA && cityB && (
              <div className="grid grid-cols-2 gap-4 pt-2">
                {/* Kolom Kota A */}
                <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-blue-600">{cityA.provinsi_nama}</span>
                    <h4 className="text-lg font-black text-slate-900">{cityA.kota_nama}</h4>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-blue-700">{Math.round(cityA.suhu_saat_ini || 28)}°C</span>
                    <span className="text-xs font-semibold text-slate-500">({cityA.kondisi_cuaca})</span>
                  </div>
                  <div className="space-y-1.5 text-xs text-slate-600 border-t border-blue-200/60 pt-2.5">
                    <div>Kelembapan: <strong>{cityA.kelembapan_saat_ini}%</strong></div>
                    <div>Kecepatan Angin: <strong>{cityA.kecepatan_angin} km/h</strong></div>
                    <div>Arah Angin: <strong>{cityA.arah_angin}</strong></div>
                  </div>
                </div>

                {/* Kolom Kota B */}
                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-600">{cityB.provinsi_nama}</span>
                    <h4 className="text-lg font-black text-slate-900">{cityB.kota_nama}</h4>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-emerald-700">{Math.round(cityB.suhu_saat_ini || 28)}°C</span>
                    <span className="text-xs font-semibold text-slate-500">({cityB.kondisi_cuaca})</span>
                  </div>
                  <div className="space-y-1.5 text-xs text-slate-600 border-t border-emerald-200/60 pt-2.5">
                    <div>Kelembapan: <strong>{cityB.kelembapan_saat_ini}%</strong></div>
                    <div>Kecepatan Angin: <strong>{cityB.kecepatan_angin} km/h</strong></div>
                    <div>Arah Angin: <strong>{cityB.arah_angin}</strong></div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsCompareOpen(false)}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs"
              >
                Selesai
              </button>
            </div>

          </div>
        </div>
      )}

    </section>
  );
}

import React, { useState } from 'react';
import { 
  Search, Wind, Droplets, Calendar, MapPin, 
  ChevronRight, Compass, Sun, CloudRain, Cloud
} from 'lucide-react';

/**
 * =============================================================================
 * KOMPONEN: SEKSI PRAKIRAAN CUACA WILAYAH KOTA (Informatif & Multi-Filter)
 * File: src/components/WeatherSection.jsx
 * Deskripsi:
 * Menampilkan kartu-kartu cuaca kota dengan filter tipe kondisi (Cerah/Berawan/Hujan),
 * pencarian real-time, filter provinsi, parameter angin komprehensif, dan
 * pemicu modal eksplorasi dokumen NoSQL JSONB 3 hari.
 * =============================================================================
 */
export default function WeatherSection({ weatherList = [], onSelectCity }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProvince, setSelectedProvince] = useState('ALL');
  const [conditionFilter, setConditionFilter] = useState('ALL'); // 'ALL', 'CERAH', 'BERAWAN', 'HUJAN'

  // Ekstrak daftar unik nama provinsi untuk filter dropdown
  const provinces = ['ALL', ...new Set(weatherList.map(item => item.provinsi_nama).filter(Boolean))];

  // Algoritma pencarian dan penyaringan data (Modul 09 JS Algorithm)
  const filteredList = weatherList.filter(item => {
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

        {/* Filter Kondisi Cepat (Chips) */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl text-xs font-bold self-start lg:self-auto">
          <button
            onClick={() => setConditionFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              conditionFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Semua ({weatherList.length})
          </button>
          <button
            onClick={() => setConditionFilter('CERAH')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 ${
              conditionFilter === 'CERAH' ? 'bg-white text-amber-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sun className="w-3 h-3 text-amber-500" />
            Cerah
          </button>
          <button
            onClick={() => setConditionFilter('BERAWAN')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 ${
              conditionFilter === 'BERAWAN' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Cloud className="w-3 h-3 text-blue-500" />
            Berawan
          </button>
          <button
            onClick={() => setConditionFilter('HUJAN')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 ${
              conditionFilter === 'HUJAN' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <CloudRain className="w-3 h-3 text-indigo-500" />
            Hujan
          </button>
        </div>
      </div>

      {/* Input Pencarian & Dropdown Provinsi */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama kota atau provinsi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <select
          value={selectedProvince}
          onChange={(e) => setSelectedProvince(e.target.value)}
          className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700 cursor-pointer"
        >
          {provinces.map(prov => (
            <option key={prov} value={prov}>
              {prov === 'ALL' ? 'Semua Wilayah Provinsi' : prov}
            </option>
          ))}
        </select>
      </div>

      {/* Grid Kartu Cuaca */}
      {filteredList.length === 0 ? (
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
          <p className="text-xs font-medium">Tidak ada wilayah yang cocok dengan pencarian atau filter Anda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredList.map((city) => (
            <div
              key={city.kota_id}
              className="bg-slate-50/70 hover:bg-white rounded-2xl border border-slate-200/80 hover:border-blue-300 p-5 shadow-xs hover:shadow-md transition-all group flex flex-col justify-between"
            >
              <div>
                {/* Header Kota & Provinsi */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[9px] font-black tracking-widest uppercase text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-md">
                      {city.provinsi_nama}
                    </span>
                    <h4 className="font-extrabold text-slate-900 text-base mt-1.5 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{city.kota_nama}</span>
                    </h4>
                  </div>

                  {/* Ikon Cuaca BMKG */}
                  {city.ikon_cuaca_url ? (
                    <img
                      src={city.ikon_cuaca_url}
                      alt={city.kondisi_cuaca}
                      className="w-12 h-12 object-contain drop-shadow-sm group-hover:scale-110 transition-transform shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-xs text-slate-400">
                      -
                    </div>
                  )}
                </div>

                {/* Suhu & Kondisi */}
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900 tracking-tight">
                    {city.suhu_saat_ini !== null ? Math.round(city.suhu_saat_ini) : '--'}°C
                  </span>
                  <span className="text-xs font-bold text-slate-600 truncate" title={city.kondisi_cuaca}>
                    {city.kondisi_cuaca || 'Belum Ada Data'}
                  </span>
                </div>

                {/* Detail Parameter Iklim */}
                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-200/70 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <Droplets className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>Lembap: <strong>{city.kelembapan_saat_ini ?? '--'}%</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Wind className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="truncate">Angin: <strong>{city.kecepatan_angin ?? '--'} km/h</strong></span>
                  </div>
                </div>

                {city.arah_angin && (
                  <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
                    <Compass className="w-3 h-3 text-slate-400" />
                    <span>Arah Angin: <strong>{city.arah_angin}</strong></span>
                  </div>
                )}
              </div>

              {/* Tombol Aksi Detail Prakiraan 3 Hari (NoSQL JSONB) */}
              <button
                onClick={() => onSelectCity(city.kota_id)}
                className="mt-4 w-full py-2.5 px-3 rounded-xl bg-white hover:bg-blue-600 text-slate-700 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all border border-slate-200 shadow-xs hover:shadow-sm"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Prakiraan Jam 3 Hari</span>
                <ChevronRight className="w-3.5 h-3.5 ml-auto" />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

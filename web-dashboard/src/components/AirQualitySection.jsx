import React, { useState } from 'react';
import { 
  Wind, Search, BarChart3, LayoutGrid, ArrowUpDown, 
  ShieldAlert, HeartHandshake, AlertTriangle, Sparkles, Filter, 
  UserCheck, Baby, HeartPulse, Dumbbell, MapPin, Compass
} from 'lucide-react';
import { playSound } from '../utils/audio';
import { getCategoryBadge } from '../utils/airQuality';
import AirQualityMap from './AirQualityMap';

// Re-export helper penentuan kategori baku mutu PM2.5 BMKG & Permen LHK No. P.14/2020
export { getCategoryBadge } from '../utils/airQuality';

/**
 * =============================================================================
 * KOMPONEN: AIR QUALITY SECTION (Interactive Radial Gauge, Map & Health Personas)
 * File: src/components/AirQualitySection.jsx
 * Deskripsi:
 * Menyajikan pemantauan baku mutu PM2.5 BMKG dari 27+ stasiun SPKU dengan:
 * 1. Peta Geospasial Zonasi Area Polusi Udara (radius sebaran 50-85 km per daerah).
 * 2. Speedometer / Radial Gauge interaktif untuk stasiun terpilih.
 * 3. Tab persona kesehatan (Umum, Lansia/Anak, Penderita Asma, Olahraga).
 * 4. Filter pulau/region (Jawa, Sumatera, Kalimantan, Timur).
 * 5. Mode Grid Kartu & Visual Ranking Bar Chart.
 * =============================================================================
 */

export default function AirQualitySection({ 
  airQualityData = [], 
  loading = false,
  onFocusStation = null 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedRegion, setSelectedRegion] = useState('ALL'); // 'ALL', 'JAWA', 'SUMATERA', 'KALIMANTAN', 'TIMUR'
  const [viewMode, setViewMode] = useState('GRID');
  const [sortBy, setSortBy] = useState('HIGHEST');
  const [activePersona, setActivePersona] = useState('umum'); // 'umum', 'anak', 'asma', 'olahraga'
  const [selectedStationName, setSelectedStationName] = useState(null);

  // Sorting
  let sortedData = [...airQualityData];
  if (sortBy === 'HIGHEST') {
    sortedData.sort((a, b) => (b.pm25 || 0) - (a.pm25 || 0));
  } else if (sortBy === 'LOWEST') {
    sortedData.sort((a, b) => (a.pm25 || 0) - (b.pm25 || 0));
  } else if (sortBy === 'NAME') {
    sortedData.sort((a, b) => a.stasiun.localeCompare(b.stasiun));
  }

  // Filter pencarian, kategori, dan pulau
  const filteredStations = sortedData.filter((item) => {
    const sName = item.stasiun.toLowerCase();
    const matchesSearch = sName.includes(searchTerm.toLowerCase());
    const badge = getCategoryBadge(item.kategori, item.pm25);

    let matchesCat = true;
    if (selectedCategory !== 'ALL') {
      matchesCat = badge.label.toLowerCase() === selectedCategory.toLowerCase();
    }

    let matchesReg = true;
    if (selectedRegion === 'JAWA') {
      matchesReg = sName.includes('jakarta') || sName.includes('kemayoran') || sName.includes('ancol') || sName.includes('serang') || sName.includes('bandung') || sName.includes('semarang') || sName.includes('surabaya');
    } else if (selectedRegion === 'SUMATERA') {
      matchesReg = sName.includes('medan') || sName.includes('padang') || sName.includes('pekanbaru') || sName.includes('jambi') || sName.includes('palembang') || sName.includes('lampung');
    } else if (selectedRegion === 'KALIMANTAN') {
      matchesReg = sName.includes('pontianak') || sName.includes('banjarmasin') || sName.includes('samarinda') || sName.includes('palangkaraya') || sName.includes('kubu raya') || sName.includes('mempawah');
    } else if (selectedRegion === 'TIMUR') {
      matchesReg = sName.includes('denpasar') || sName.includes('mataram') || sName.includes('kupang') || sName.includes('makassar') || sName.includes('manado') || sName.includes('ambon') || sName.includes('jayapura');
    }

    return matchesSearch && matchesCat && matchesReg;
  });

  const spotlightStation = (selectedStationName 
    ? airQualityData.find((s) => s.stasiun === selectedStationName) 
    : null) || filteredStations[0] || airQualityData[0] || null;
  const spotlightBadge = spotlightStation ? getCategoryBadge(spotlightStation.kategori, spotlightStation.pm25) : null;

  return (
    <section id="kualitas-udara" className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
      
      {/* Header Modul */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <Wind className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg tracking-tight">
                Indeks Standar Pencemar Udara (ISPU / PM2.5)
              </h3>
              <p className="text-xs text-slate-500">
                Pemantauan partikulat mikron PM2.5 dari stasiun SPKU otomatis BMKG di kota-kota strategis.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls: Switcher Tampilan Grid / Bar & Sorting */}
        <div className="flex items-center gap-2">
          {/* Switcher Tampilan */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl text-xs font-semibold">
            <button
              onClick={() => { setViewMode('GRID'); playSound('click'); }}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                viewMode === 'GRID' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Grid Kartu</span>
            </button>
            <button
              onClick={() => { setViewMode('BAR'); playSound('click'); }}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                viewMode === 'BAR' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Ranking Bar</span>
            </button>
          </div>

          {/* Selector Sorting */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value); playSound('click'); }}
              className="bg-slate-100 text-slate-700 text-xs font-bold rounded-2xl px-3 py-2 border-0 focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="HIGHEST">Polusi Tertinggi</option>
              <option value="LOWEST">Paling Bersih</option>
              <option value="NAME">Abjad Stasiun</option>
            </select>
          </div>
        </div>
      </div>

      {/* Peta Geospasial Interaktif Pemetaan Zonasi Kualitas Udara Per Daerah (Radius 50-85 km) */}
      <AirQualityMap
        airQualityData={airQualityData}
        spotlightStation={spotlightStation}
        onSelectStation={(station) => {
          setSelectedStationName(station.stasiun);
        }}
      />

      {/* Hero Spotlight: Stasiun Terpilih + Radial Meter + Persona Medis */}
      {spotlightStation && spotlightBadge && (
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 text-white grid grid-cols-1 lg:grid-cols-12 gap-6 items-center shadow-lg">
          
          {/* Sisi Kiri: Gauge Radial Meter (5 Kolom) */}
          <div className="lg:col-span-5 flex flex-col sm:flex-row items-center gap-5">
            <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
              {/* Ring Progress SVG */}
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-700"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className={spotlightBadge.label === 'Baik' ? 'text-emerald-500' : spotlightBadge.label === 'Sedang' ? 'text-blue-500' : spotlightBadge.label === 'Tidak Sehat' ? 'text-amber-500' : 'text-red-500'}
                  strokeDasharray={`${Math.min(spotlightStation.pm25 / 2.5, 100)}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-black text-white">{spotlightStation.pm25}</span>
                <span className="text-[9px] text-slate-300 uppercase tracking-widest font-mono">µg/m³</span>
              </div>
            </div>

            <div className="space-y-1.5 text-center sm:text-left">
              <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full inline-block ${spotlightBadge.badgeBg}`}>
                {spotlightBadge.label}
              </span>
              <h4 className="text-base font-extrabold text-white line-clamp-1" title={spotlightStation.stasiun}>
                {spotlightStation.stasiun}
              </h4>
              <p className="text-xs text-slate-300">
                Pembaruan: {spotlightStation.waktu_pantau || 'Real-time SPKU'}
              </p>
              <button
                onClick={() => {
                  setSelectedStationName(spotlightStation.stasiun);
                  const el = document.getElementById('air-quality-map');
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  } else if (onFocusStation) {
                    onFocusStation(spotlightStation);
                  }
                }}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs shadow-sm transition-all cursor-pointer"
                title="Pusatkan kamera peta ke stasiun ini"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Lihat Lokasi di Peta</span>
              </button>
            </div>
          </div>

          {/* Sisi Kanan: Panduan Medis Berbasis Persona Interaktif (7 Kolom) */}
          <div className="lg:col-span-7 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 space-y-3">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-white/10">
              <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                <HeartHandshake className="w-4 h-4" />
                Rekomendasi Medis Sesuai Kategori Anda
              </span>
              <span className="text-[10px] text-slate-300 font-mono">Standar WHO &amp; BMKG</span>
            </div>

            {/* Persona Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {[
                { id: 'umum', label: 'Umum', icon: UserCheck },
                { id: 'anak', label: 'Anak / Lansia', icon: Baby },
                { id: 'asma', label: 'Sensitif / Asma', icon: HeartPulse },
                { id: 'olahraga', label: 'Olahraga Luar', icon: Dumbbell },
              ].map((p) => {
                const Icon = p.icon;
                const isActive = activePersona === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => { setActivePersona(p.id); playSound('click'); }}
                    className={`px-2 py-1.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-all ${
                      isActive
                        ? 'bg-cyan-400 text-slate-950 shadow-sm'
                        : 'bg-white/5 hover:bg-white/10 text-slate-300'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    <span>{p.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Kotak Teks Saran Medis */}
            <p className="text-xs text-slate-200 leading-relaxed pt-1 font-medium">
              {spotlightBadge.healthTips[activePersona]}
            </p>
          </div>

        </div>
      )}

      {/* Filter Kontrol & Pencarian Stasiun */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        
        {/* Input Cari */}
        <div className="sm:col-span-5 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari stasiun SPKU atau kota..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 rounded-2xl text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 placeholder-slate-400"
          />
        </div>

        {/* Filter Kategori Baku Mutu */}
        <div className="sm:col-span-4">
          <select
            value={selectedCategory}
            onChange={(e) => { setSelectedCategory(e.target.value); playSound('click'); }}
            className="w-full px-3 py-2 bg-slate-50 rounded-2xl text-xs border border-slate-200 font-semibold text-slate-700 cursor-pointer"
          >
            <option value="ALL">Semua Kategori Baku Mutu</option>
            <option value="baik">Kategori Baik (&le; 15.5)</option>
            <option value="sedang">Kategori Sedang (15.6 - 55.4)</option>
            <option value="tidak sehat">Kategori Tidak Sehat (55.5 - 150.4)</option>
            <option value="sangat tidak sehat">Sangat Tidak Sehat (150.5 - 250.4)</option>
          </select>
        </div>

        {/* Filter Pulau / Regional */}
        <div className="sm:col-span-3">
          <select
            value={selectedRegion}
            onChange={(e) => { setSelectedRegion(e.target.value); playSound('click'); }}
            className="w-full px-3 py-2 bg-slate-50 rounded-2xl text-xs border border-slate-200 font-semibold text-slate-700 cursor-pointer"
          >
            <option value="ALL">Seluruh Indonesia</option>
            <option value="JAWA">DKI &amp; Pulau Jawa</option>
            <option value="SUMATERA">Pulau Sumatera</option>
            <option value="KALIMANTAN">Pulau Kalimantan</option>
            <option value="TIMUR">Sulawesi, Bali &amp; Timur</option>
          </select>
        </div>

      </div>

      {/* Konten Grid Kartu atau Ranking Bar Chart */}
      {viewMode === 'GRID' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredStations.map((station, idx) => {
            const badge = getCategoryBadge(station.kategori, station.pm25);
            const isSpotlight = spotlightStation?.stasiun === station.stasiun;

            return (
              <div
                key={idx}
                onClick={() => { setSelectedStationName(station.stasiun); playSound('click'); }}
                className={`p-4 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSpotlight
                    ? 'bg-blue-50/80 border-blue-500 shadow-md ring-2 ring-blue-400/20'
                    : 'bg-slate-50/70 hover:bg-white hover:border-slate-300 border-slate-200/80'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${badge.badgeBg}`}>
                      {badge.label}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400 font-mono">
                        {station.waktu_pantau ? station.waktu_pantau.split(' ')[0] : 'SPKU'}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedStationName(station.stasiun);
                          playSound('click');
                          const el = document.getElementById('air-quality-map');
                          if (el) {
                            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          } else if (onFocusStation) {
                            onFocusStation(station);
                          }
                        }}
                        className="p-1 rounded-lg bg-white border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 text-slate-400 transition-all cursor-pointer shadow-xs"
                        title="Pusatkan peta ke stasiun ini"
                      >
                        <MapPin className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <h5 className="font-bold text-slate-900 text-xs line-clamp-1" title={station.stasiun}>
                    {station.stasiun}
                  </h5>

                  <div className="mt-3 flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-slate-900">{station.pm25}</span>
                    <span className="text-[11px] font-bold text-slate-400">µg/m³</span>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-200/60 text-[10px] text-slate-500 truncate" title={badge.rec}>
                  {badge.rec}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Mode Ranking Bar Chart */
        <div className="space-y-3 bg-slate-50/70 p-5 rounded-3xl border border-slate-200/80">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider pb-2 border-b border-slate-200">
            <span>Stasiun &amp; Wilayah</span>
            <span>Konsentrasi PM2.5 (µg/m³)</span>
          </div>

          <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-2">
            {filteredStations.map((station, idx) => {
              const badge = getCategoryBadge(station.kategori, station.pm25);
              const maxVal = Math.max(...filteredStations.map(s => s.pm25 || 100), 100);
              const barPercent = Math.min(((station.pm25 || 0) / maxVal) * 100, 100);

              return (
                <div
                  key={idx}
                  onClick={() => { setSelectedStationName(station.stasiun); playSound('click'); }}
                  className="p-3 bg-white rounded-2xl border border-slate-200/70 hover:border-blue-400 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="w-full sm:w-1/3">
                    <span className="text-xs font-bold text-slate-800 block truncate" title={station.stasiun}>
                      {station.stasiun}
                    </span>
                    <span className="text-[10px] text-slate-400">{badge.label}</span>
                  </div>

                  <div className="flex-1 w-full flex items-center gap-3">
                    <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${badge.barColor} transition-all duration-700 rounded-full`}
                        style={{ width: `${barPercent}%` }}
                      ></div>
                    </div>
                    <span className="text-xs font-black text-slate-900 w-12 text-right shrink-0">
                      {station.pm25}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedStationName(station.stasiun);
                        playSound('click');
                        const el = document.getElementById('air-quality-map');
                        if (el) {
                          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        } else if (onFocusStation) {
                          onFocusStation(station);
                        }
                      }}
                      className="p-1.5 rounded-xl bg-slate-50 border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 text-slate-400 transition-all cursor-pointer shadow-2xs"
                      title="Pusatkan peta ke stasiun ini"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </section>
  );
}

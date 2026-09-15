import React, { useState } from 'react';
import { 
  Wind, Search, BarChart3, LayoutGrid, ArrowUpDown, 
  ShieldAlert, HeartHandshake, AlertTriangle, Sparkles, Filter, 
  UserCheck, Baby, HeartPulse, Dumbbell, MapPin 
} from 'lucide-react';
import { playSound } from '../utils/audio';

/**
 * =============================================================================
 * KOMPONEN: AIR QUALITY SECTION (Interactive Radial Gauge & Health Personas)
 * File: src/components/AirQualitySection.jsx
 * Deskripsi:
 * Menyajikan pemantauan baku mutu PM2.5 BMKG dari 26+ stasiun SPKU dengan:
 * 1. Speedometer / Radial Gauge interaktif untuk stasiun terpilih.
 * 2. Tab persona kesehatan (Umum, Lansia/Anak, Penderita Asma, Olahraga).
 * 3. Filter pulau/region (Jawa, Sumatera, Kalimantan, Timur).
 * 4. Mode Grid Kartu & Visual Ranking Bar Chart.
 * =============================================================================
 */

// Helper Penentuan Kategori Baku Mutu PM2.5 BMKG & Permen LHK No. P.14/2020
export function getCategoryBadge(kategori, pm25) {
  const kat = (kategori || '').toLowerCase();

  if (kat.includes('berbahaya') || pm25 > 250.4) {
    return {
      label: 'Berbahaya',
      bg: 'bg-red-50 text-red-900 border-red-200',
      badgeBg: 'bg-red-600 text-white',
      barColor: 'bg-red-600',
      dot: 'bg-red-500',
      rec: 'Hindari seluruh aktivitas luar ruangan! Wajib gunakan respirator N95 jika terpaksa bepergian.',
      healthTips: {
        umum: 'Tutup seluruh ventilasi jendela dan aktifkan air purifier.',
        anak: 'Sangat berbahaya bagi sistem pernapasan balita dan lansia. Jangan keluar rumah!',
        asma: 'Gunakan nebulizer/inhaler sesuai anjuran dokter dan hindari paparan udara.',
        olahraga: 'DILARANG berolahraga di luar ruangan! Ganti dengan peregangan indoor.'
      }
    };
  }
  if (kat.includes('sangat tidak sehat') || pm25 > 150.4) {
    return {
      label: 'Sangat Tidak Sehat',
      bg: 'bg-rose-50 text-rose-900 border-rose-200',
      badgeBg: 'bg-rose-600 text-white',
      barColor: 'bg-rose-500',
      dot: 'bg-rose-500',
      rec: 'Kelompok sensitif harus tetap di dalam ruangan. Nyalakan pembersih udara.',
      healthTips: {
        umum: 'Gunakan masker anti-polusi N95 atau KF94 saat keluar ruangan.',
        anak: 'Batasi jam bermain anak di luar rumah, pantau gejala batuk/sesak.',
        asma: 'Siapkan obat pelega pernapasan, hindari jalan raya bertrafik padat.',
        olahraga: 'Tunda lari atau bersepeda luar ruangan sampai indeks membaik.'
      }
    };
  }
  if (kat.includes('tidak sehat') || pm25 > 55.4) {
    return {
      label: 'Tidak Sehat',
      bg: 'bg-amber-50 text-amber-900 border-amber-200',
      badgeBg: 'bg-amber-500 text-slate-950 font-black',
      barColor: 'bg-amber-500',
      dot: 'bg-amber-500',
      rec: 'Gunakan masker medis saat bepergian. Kelompok rentan kurangi aktivitas outdoor.',
      healthTips: {
        umum: 'Kenakan masker medis ganda atau KN95 saat beraktivitas di jalan raya.',
        anak: 'Kurangi kegiatan fisik berat anak di halaman sekolah/taman.',
        asma: 'Minum air putih hangat lebih sering dan hindari asap kendaraan.',
        olahraga: 'Kurangi durasi dan intensitas latihan kardio di luar ruangan.'
      }
    };
  }
  if (kat.includes('sedang') || pm25 > 15.4) {
    return {
      label: 'Sedang',
      bg: 'bg-blue-50 text-blue-900 border-blue-200',
      badgeBg: 'bg-blue-600 text-white',
      barColor: 'bg-blue-500',
      dot: 'bg-blue-500',
      rec: 'Kualitas udara dapat diterima untuk masyarakat umum.',
      healthTips: {
        umum: 'Udara cukup baik untuk aktivitas harian normal.',
        anak: 'Anak-anak dan lansia dapat beraktivitas seperti biasa.',
        asma: 'Kelompok hipersensitif disarankan tetap waspada jika ada gejala batuk.',
        olahraga: 'Aman untuk jogging dan olahraga pagi di area taman terbuka.'
      }
    };
  }
  return {
    label: 'Baik',
    bg: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    badgeBg: 'bg-emerald-600 text-white',
    barColor: 'bg-emerald-500',
    dot: 'bg-emerald-500',
    rec: 'Kualitas udara sangat bersih dan segar! Sangat ideal untuk berolahraga.',
    healthTips: {
      umum: 'Buka ventilasi rumah untuk sirkulasi udara alami yang segar.',
      anak: 'Sangat aman dan menyehatkan bagi anak-anak bermain di luar.',
      asma: 'Kondisi paru-paru optimal, risiko iritasi sangat minimal.',
      olahraga: 'Waktu terbaik untuk maraton, bersepeda, dan aktivitas kardio outdoor!'
    }
  };
}

export default function AirQualitySection({ airQualityData = [], loading = false }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedRegion, setSelectedRegion] = useState('ALL'); // 'ALL', 'JAWA', 'SUMATERA', 'KALIMANTAN', 'TIMUR'
  const [viewMode, setViewMode] = useState('GRID');
  const [sortBy, setSortBy] = useState('HIGHEST');
  const [activePersona, setActivePersona] = useState('umum'); // 'umum', 'anak', 'asma', 'olahraga'
  const [spotlightIndex, setSpotlightIndex] = useState(0);

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

    let matchesRegion = true;
    if (selectedRegion === 'JAWA') {
      matchesRegion = sName.includes('dki') || sName.includes('jakarta') || sName.includes('kemayoran') || sName.includes('banten') || sName.includes('jawa') || sName.includes('cibeureum') || sName.includes('guwosari') || sName.includes('surabaya');
    } else if (selectedRegion === 'SUMATERA') {
      matchesRegion = sName.includes('sumatera') || sName.includes('medan') || sName.includes('pekanbaru') || sName.includes('jambi') || sName.includes('palembang') || sName.includes('padang') || sName.includes('aceh');
    } else if (selectedRegion === 'KALIMANTAN') {
      matchesRegion = sName.includes('kalimantan') || sName.includes('pontianak') || sName.includes('palangkaraya') || sName.includes('banjarbaru') || sName.includes('samarinda') || sName.includes('ikn');
    } else if (selectedRegion === 'TIMUR') {
      matchesRegion = sName.includes('bali') || sName.includes('denpasar') || sName.includes('ntb') || sName.includes('ntt') || sName.includes('sulawesi') || sName.includes('makassar') || sName.includes('manado') || sName.includes('maluku') || sName.includes('papua');
    }

    return matchesSearch && matchesCat && matchesRegion;
  });

  const spotlightStation = filteredStations[spotlightIndex] || airQualityData[0];
  const spotlightBadge = spotlightStation ? getCategoryBadge(spotlightStation.kategori, spotlightStation.pm25) : null;

  return (
    <section id="kualitas-udara" className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
      
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center">
              <Wind className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg tracking-tight">
                Indeks Kualitas Udara Partikulat PM2.5 (SPKU BMKG)
              </h3>
              <p className="text-xs text-slate-500">
                Pemantauan konsentrasi partikel mikroskopis (&le; 2.5 mikrometer) dari 26+ stasiun otomatis seluruh Indonesia.
              </p>
            </div>
          </div>
        </div>

        {/* Mode Switcher: Grid vs Ranking */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl text-xs font-bold self-start lg:self-auto">
          <button
            onClick={() => { setViewMode('GRID'); playSound('click'); }}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
              viewMode === 'GRID' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Kartu Stasiun</span>
          </button>
          <button
            onClick={() => { setViewMode('RANKING'); playSound('click'); }}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
              viewMode === 'RANKING' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Ranking Bar Chart</span>
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* SPOTLIGHT GAUGE CARD & INTERACTIVE HEALTH ADVISORY                   */}
      {/* ===================================================================== */}
      {spotlightStation && spotlightBadge && (
        <div className="p-5 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white shadow-lg border border-slate-700/80 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          
          {/* Sisi Kiri: Speedometer / Radial Arc Visualizer (5 Kolom) */}
          <div className="lg:col-span-5 flex flex-col sm:flex-row items-center gap-4">
            <div className="relative w-32 h-32 shrink-0 flex items-center justify-center">
              {/* SVG Radial Gauge */}
              <svg viewBox="0 0 100 100" className="w-32 h-32 -rotate-90">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#334155"
                  strokeWidth="8"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke={
                    spotlightStation.pm25 > 150 ? '#ef4444' :
                    spotlightStation.pm25 > 55 ? '#f59e0b' :
                    spotlightStation.pm25 > 15 ? '#3b82f6' : '#10b981'
                  }
                  strokeWidth="8"
                  strokeDasharray={`${Math.min((spotlightStation.pm25 / 150) * 251, 251)} 251`}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
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
                onClick={() => { setSpotlightIndex(idx); playSound('click'); }}
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
                    <span className="text-[10px] text-slate-400 font-mono">
                      {station.waktu_pantau ? station.waktu_pantau.split(' ')[0] : 'SPKU'}
                    </span>
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
                  onClick={() => { setSpotlightIndex(idx); playSound('click'); }}
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

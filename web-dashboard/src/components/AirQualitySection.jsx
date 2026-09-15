import React, { useState } from 'react';
import { 
  Wind, Search, BarChart3, LayoutGrid, ArrowUpDown, 
  ShieldAlert, HeartHandshake, AlertTriangle, Sparkles, Filter 
} from 'lucide-react';

/**
 * =============================================================================
 * KOMPONEN: AIR QUALITY SECTION (Indeks Kualitas Udara PM2.5 & Analisis Komparatif)
 * File: src/components/AirQualitySection.jsx
 * Deskripsi:
 * Menyajikan pemantauan konsentrasi partikulat PM2.5 dari 25+ Stasiun BMKG
 * dengan dua mode tampilan: Kartu Grid Interaktif & Visual Ranking Bar Chart.
 * Dilengkapi dengan skala baku mutu resmi, sorting, dan panduan medis.
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
      rec: 'Hindari seluruh aktivitas di luar ruangan! Tutup ventilasi rumah dan kenakan masker respirator N95 jika terpaksa bepergian.'
    };
  }
  if (kat.includes('sangat tidak sehat') || pm25 > 150.4) {
    return {
      label: 'Sangat Tidak Sehat',
      bg: 'bg-rose-50 text-rose-900 border-rose-200',
      badgeBg: 'bg-rose-600 text-white',
      barColor: 'bg-rose-500',
      dot: 'bg-rose-500',
      rec: 'Kelompok sensitif (anak-anak, lansia, penderita asma) harus tetap di dalam ruangan. Nyalakan pembersih udara (Air Purifier).'
    };
  }
  if (kat.includes('tidak sehat') || pm25 > 55.4) {
    return {
      label: 'Tidak Sehat',
      bg: 'bg-amber-50 text-amber-900 border-amber-200',
      badgeBg: 'bg-amber-500 text-slate-950 font-black',
      barColor: 'bg-amber-500',
      dot: 'bg-amber-500',
      rec: 'Gunakan masker anti-polusi saat bepergian. Kelompok rentan batasi aktivitas fisik di luar ruangan.'
    };
  }
  if (kat.includes('sedang') || pm25 > 15.4) {
    return {
      label: 'Sedang',
      bg: 'bg-blue-50 text-blue-900 border-blue-200',
      badgeBg: 'bg-blue-600 text-white',
      barColor: 'bg-blue-500',
      dot: 'bg-blue-500',
      rec: 'Kualitas udara dapat diterima untuk masyarakat umum. Orang dengan sensitivitas luar biasa disarankan membatasi paparan lama.'
    };
  }
  return {
    label: 'Baik',
    bg: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    badgeBg: 'bg-emerald-600 text-white',
    barColor: 'bg-emerald-500',
    dot: 'bg-emerald-500',
    rec: 'Kualitas udara sangat baik dan menyegarkan! Sangat ideal untuk berolahraga dan aktivitas luar ruangan.'
  };
}

export default function AirQualitySection({ airQualityData = [], loading = false }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [viewMode, setViewMode] = useState('GRID'); // 'GRID' atau 'RANKING'
  const [sortBy, setSortBy] = useState('HIGHEST'); // 'HIGHEST', 'LOWEST', 'NAME'

  // Pengurutan data
  let sortedData = [...airQualityData];
  if (sortBy === 'HIGHEST') {
    sortedData.sort((a, b) => (b.pm25 || 0) - (a.pm25 || 0));
  } else if (sortBy === 'LOWEST') {
    sortedData.sort((a, b) => (a.pm25 || 0) - (b.pm25 || 0));
  } else if (sortBy === 'NAME') {
    sortedData.sort((a, b) => a.stasiun.localeCompare(b.stasiun));
  }

  // Filter pencarian dan kategori
  const filteredStations = sortedData.filter((item) => {
    const matchesSearch = item.stasiun.toLowerCase().includes(searchTerm.toLowerCase());
    const badge = getCategoryBadge(item.kategori, item.pm25);

    if (selectedCategory === 'ALL') return matchesSearch;
    return matchesSearch && badge.label.toLowerCase() === selectedCategory.toLowerCase();
  });

  const maxPM25Value = airQualityData.length > 0 
    ? Math.max(...airQualityData.map(d => d.pm25 || 0)) 
    : 100;

  return (
    <section id="kualitas-udara" className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
      
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-100 flex items-center justify-center text-cyan-700">
              <Wind className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg tracking-tight">
                Indeks Pemantauan Kualitas Udara (PM2.5) BMKG
              </h3>
              <p className="text-xs text-slate-500">
                Konsentrasi partikulat halus mikro (&le; 2.5 &mu;m) dari Stasiun Pemantau Kualitas Udara (SPKU) se-Indonesia.
              </p>
            </div>
          </div>
        </div>

        {/* Mode Tampilan Switcher (Grid vs Ranking Bar) */}
        <div className="flex items-center gap-2 self-start lg:self-auto">
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl text-xs font-bold">
            <button
              onClick={() => setViewMode('GRID')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                viewMode === 'GRID' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Kartu Stasiun
            </button>
            <button
              onClick={() => setViewMode('RANKING')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                viewMode === 'RANKING' ? 'bg-white text-cyan-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Visual Ranking
            </button>
          </div>
        </div>
      </div>

      {/* Skala Baku Mutu Visual Bar (Standar BMKG & KLHK) */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-700">Skala Rentang Baku Mutu Udara PM2.5 (&mu;g/m&sup3;):</span>
          <span className="text-[11px] text-slate-400">Permen LHK No. P.14/2020 &amp; BMKG</span>
        </div>
        
        {/* Spectrum Color Bar */}
        <div className="grid grid-cols-5 gap-1.5 text-center text-[10px] font-bold text-white pt-1">
          <div className="bg-emerald-600 py-1.5 rounded-lg shadow-xs">Baik<br/><span className="text-[9px] font-normal opacity-90">0 - 15.4</span></div>
          <div className="bg-blue-600 py-1.5 rounded-lg shadow-xs">Sedang<br/><span className="text-[9px] font-normal opacity-90">15.5 - 55.4</span></div>
          <div className="bg-amber-500 py-1.5 rounded-lg shadow-xs text-slate-950 font-black">Tidak Sehat<br/><span className="text-[9px] font-medium opacity-90">55.5 - 150.4</span></div>
          <div className="bg-rose-600 py-1.5 rounded-lg shadow-xs">Sangat Tidak Sehat<br/><span className="text-[9px] font-normal opacity-90">150.5 - 250.4</span></div>
          <div className="bg-red-900 py-1.5 rounded-lg shadow-xs">Berbahaya<br/><span className="text-[9px] font-normal opacity-90">&gt; 250.4</span></div>
        </div>
      </div>

      {/* Filter, Search & Sort Control Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        
        {/* Input Pencarian */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari stasiun atau kota SPKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
          />
        </div>

        {/* Filter Kategori & Urutan */}
        <div className="flex items-center gap-2 flex-wrap">
          
          {/* Dropdown Kategori */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            {['ALL', 'Berbahaya', 'Sangat Tidak Sehat', 'Tidak Sehat', 'Sedang', 'Baik'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  selectedCategory === cat ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {cat === 'ALL' ? 'Semua' : cat === 'Sangat Tidak Sehat' ? 'Sgt Tdk Sehat' : cat}
              </button>
            ))}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-xl text-xs text-slate-600">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent text-xs font-semibold focus:outline-none cursor-pointer"
            >
              <option value="HIGHEST">Polusi Tertinggi</option>
              <option value="LOWEST">Polusi Terendah</option>
              <option value="NAME">Nama Stasiun (A-Z)</option>
            </select>
          </div>

        </div>

      </div>

      {/* Konten Kualitas Udara */}
      {loading ? (
        <div className="py-16 text-center text-slate-400">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500 mb-2"></div>
          <p className="text-xs font-medium">Memuat data sensor SPKU BMKG...</p>
        </div>
      ) : filteredStations.length === 0 ? (
        <div className="py-12 text-center text-slate-500 bg-slate-50 rounded-2xl border border-slate-200">
          Tidak ada stasiun yang cocok dengan kriteria filter Anda.
        </div>
      ) : viewMode === 'GRID' ? (
        
        /* 1. TAMPILAN KARTU GRID */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredStations.map((st) => {
            const badge = getCategoryBadge(st.kategori, st.pm25);
            return (
              <div
                key={st.id || st.stasiun}
                className={`rounded-2xl border p-4 transition-all hover:shadow-md flex flex-col justify-between ${badge.bg}`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm">{st.stasiun}</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5 font-medium">
                        Pengamatan Pkl {st.jam_pengamatan ? `${st.jam_pengamatan}:00 WIB` : 'Realtime'}
                      </p>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide shrink-0 ${badge.badgeBg}`}>
                      {badge.label}
                    </span>
                  </div>

                  {/* Angka PM2.5 */}
                  <div className="mt-3 flex items-baseline gap-1.5">
                    <span className="text-3xl font-black text-slate-900 tracking-tight">{st.pm25}</span>
                    <span className="text-xs font-bold text-slate-500">&mu;g/m&sup3; PM2.5</span>
                  </div>
                </div>

                {/* Rekomendasi Kesehatan */}
                <div className="mt-3 pt-3 border-t border-slate-200/60 text-[11px] text-slate-600 leading-snug">
                  <p><strong className="text-slate-900">Rekomendasi:</strong> {badge.rec}</p>
                </div>
              </div>
            );
          })}
        </div>

      ) : (

        /* 2. TAMPILAN VISUAL RANKING BAR CHART */
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-slate-200 font-semibold">
            <span>Stasiun SPKU BMKG</span>
            <span>Konsentrasi PM2.5 (&mu;g/m&sup3;) &amp; Kategori</span>
          </div>

          <div className="space-y-2.5">
            {filteredStations.map((st, index) => {
              const badge = getCategoryBadge(st.kategori, st.pm25);
              const percentage = Math.min(Math.round((st.pm25 / maxPM25Value) * 100), 100);

              return (
                <div key={st.id || st.stasiun} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-5 text-[11px] font-bold text-slate-400">#{index + 1}</span>
                      <strong className="text-slate-800 font-bold">{st.stasiun}</strong>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900">{st.pm25} &mu;g/m&sup3;</span>
                      <span className={`px-2 py-0.2 rounded-full text-[9px] font-black ${badge.badgeBg}`}>
                        {badge.label}
                      </span>
                    </div>
                  </div>

                  {/* Horizontal Bar */}
                  <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${badge.barColor}`}
                      style={{ width: `${Math.max(percentage, 4)}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      )}

      {/* 4 Kartu Panduan Kesehatan Partikulat Mikro PM2.5 */}
      <div className="pt-2 border-t border-slate-100">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
          <HeartHandshake className="w-4 h-4 text-rose-500" />
          Panduan Medis Perlindungan Terhadap Partikulat PM2.5 (Kemenkes &amp; WHO)
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <strong className="text-slate-800 block mb-1">Masker N95 / KN95</strong>
            Partikel PM2.5 sangat mikro (&le;2.5 &mu;m) dan dapat menembus masker kain biasa. Gunakan masker bersertifikasi respirator saat polusi tinggi.
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <strong className="text-slate-800 block mb-1">Pembersih Udara (HEPA)</strong>
            Nyalakan Air Purifier berfilter HEPA di dalam ruangan tertutup guna memfiltrasi partikel debu dan asap pembakaran hutan.
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <strong className="text-slate-800 block mb-1">Waktu Olahraga Luar Ruang</strong>
            Hindari jogging di pagi hari jika status stasiun setempat berada pada kategori Tidak Sehat atau Berbahaya.
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <strong className="text-slate-800 block mb-1">Perlindungan Kelompok Rentan</strong>
            Balita, lansia, wanita hamil, dan penderita ISPA/asma wajib membatasi aktivitas fisik di luar ruangan saat polusi pekat.
          </div>
        </div>
      </div>

    </section>
  );
}

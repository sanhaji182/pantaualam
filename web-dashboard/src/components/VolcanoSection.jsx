import React, { useState } from 'react';
import { 
  Flame, Mountain, AlertTriangle, ShieldAlert, 
  CheckCircle2, Search, Filter, Compass, 
  Radio, Clock, MapPin, Eye, ExternalLink, Sparkles, ChevronRight, Info
} from 'lucide-react';
import { playSound } from '../utils/audio';

/**
 * =============================================================================
 * KOMPONEN: VOLCANO SECTION (Pemantauan Gunung Api & Erupsi Terkini)
 * File: src/components/VolcanoSection.jsx
 * Sumber Data: PVMBG / MAGMA Indonesia (Kementerian ESDM)
 * Deskripsi:
 * Menampilkan status tingkat aktivitas gunung api (Level I s/d IV),
 * buletin laporan letusan/kolom abu vulkanik real-time, rekomendasi zona bahaya,
 * serta tombol interaktif untuk memfokuskan kamera peta geospasial.
 * =============================================================================
 */

// Helper styling berdasarkan level aktivitas PVMBG
export function getVolcanoLevelConfig(levelAngka, levelAktivitas = '') {
  const lvl = parseInt(levelAngka, 10) || 1;
  const name = levelAktivitas.toLowerCase();

  if (lvl === 4 || name.includes('awas') || name.includes('iv')) {
    return {
      level: 4,
      label: 'Level IV (Awas)',
      badgeBg: 'bg-red-600 text-white shadow-xs shadow-red-500/50',
      cardBorder: 'border-red-400/80 hover:border-red-500',
      headerBg: 'bg-gradient-to-r from-red-600 to-rose-700 text-white',
      accentText: 'text-red-600',
      lightBg: 'bg-red-50/80 border-red-200 text-red-900',
      dotColor: 'bg-red-500',
      radiusInfo: 'Zona bahaya mutlak: radius 5–7 km dari kawah aktif.',
      actionColor: 'bg-red-600 hover:bg-red-700 text-white',
    };
  }
  if (lvl === 3 || name.includes('siaga') || name.includes('iii')) {
    return {
      level: 3,
      label: 'Level III (Siaga)',
      badgeBg: 'bg-orange-500 text-white shadow-xs shadow-orange-500/40',
      cardBorder: 'border-orange-300 hover:border-orange-400',
      headerBg: 'bg-gradient-to-r from-orange-500 to-amber-600 text-white',
      accentText: 'text-orange-600',
      lightBg: 'bg-orange-50/80 border-orange-200 text-orange-950',
      dotColor: 'bg-orange-500',
      radiusInfo: 'Dilarang beraktivitas dalam radius 3–5 km dari pusat erupsi.',
      actionColor: 'bg-orange-600 hover:bg-orange-700 text-white',
    };
  }
  if (lvl === 2 || name.includes('waspada') || name.includes('ii')) {
    return {
      level: 2,
      label: 'Level II (Waspada)',
      badgeBg: 'bg-amber-500 text-slate-900 font-bold shadow-xs shadow-amber-500/30',
      cardBorder: 'border-amber-200 hover:border-amber-300',
      headerBg: 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950',
      accentText: 'text-amber-700',
      lightBg: 'bg-amber-50/70 border-amber-200 text-amber-950',
      dotColor: 'bg-amber-500',
      radiusInfo: 'Waspada peningkatan aktivitas dalam radius 1–2 km dari kawah.',
      actionColor: 'bg-amber-600 hover:bg-amber-700 text-white',
    };
  }
  // Level I (Normal)
  return {
    level: 1,
    label: 'Level I (Normal)',
    badgeBg: 'bg-emerald-600 text-white shadow-xs shadow-emerald-500/30',
    cardBorder: 'border-slate-200 hover:border-emerald-300',
    headerBg: 'bg-slate-100 text-slate-800',
    accentText: 'text-emerald-700',
    lightBg: 'bg-emerald-50/60 border-emerald-200 text-emerald-950',
    dotColor: 'bg-emerald-500',
    radiusInfo: 'Aktivitas dasar normal. Patuhi jalur dan arahan pos jaga taman nasional.',
    actionColor: 'bg-slate-800 hover:bg-slate-900 text-white',
  };
}

export default function VolcanoSection({ 
  volcanoes = [], 
  eruptions = [], 
  summary = null,
  onFocusVolcano = () => {} 
}) {
  const [levelFilter, setLevelFilter] = useState('ALL'); // 'ALL', '4', '3', '2', '1'
  const [regionFilter, setRegionFilter] = useState('ALL'); // 'ALL', 'JAWA', 'NTT', 'MALUKU', 'SUMATERA', 'SULAWESI'
  const [searchQuery, setSearchQuery] = useState('');
  const [showEducation, setShowEducation] = useState(false);
  const [selectedEruption, setSelectedEruption] = useState(null);

  // Filter logika
  const filteredVolcanoes = volcanoes.filter((v) => {
    // 1. Filter Level
    if (levelFilter !== 'ALL' && String(v.level_angka) !== levelFilter) {
      return false;
    }

    // 2. Filter Region
    if (regionFilter !== 'ALL') {
      const prov = (v.provinsi || '').toLowerCase();
      if (regionFilter === 'JAWA' && !prov.includes('jawa') && !prov.includes('yogyakarta') && !prov.includes('banten')) return false;
      if (regionFilter === 'NTT' && !prov.includes('nusa tenggara') && !prov.includes('bali')) return false;
      if (regionFilter === 'MALUKU' && !prov.includes('maluku') && !prov.includes('papua')) return false;
      if (regionFilter === 'SUMATERA' && !prov.includes('sumatera') && !prov.includes('aceh') && !prov.includes('lampung')) return false;
      if (regionFilter === 'SULAWESI' && !prov.includes('sulawesi')) return false;
    }

    // 3. Search Query
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchName = (v.nama || '').toLowerCase().includes(q);
      const matchProv = (v.provinsi || '').toLowerCase().includes(q);
      const matchLvl = (v.level_aktivitas || '').toLowerCase().includes(q);
      if (!matchName && !matchProv && !matchLvl) return false;
    }

    return true;
  });

  // Hitung angka statistik ringkasan
  const countLvl4 = summary?.level_iv_awas ?? volcanoes.filter(v => v.level_angka === 4).length;
  const countLvl3 = summary?.level_iii_siaga ?? volcanoes.filter(v => v.level_angka === 3).length;
  const countLvl2 = summary?.level_ii_waspada ?? volcanoes.filter(v => v.level_angka === 2).length;
  const countLvl1 = summary?.level_i_normal ?? volcanoes.filter(v => v.level_angka === 1).length;

  return (
    <section className="space-y-6 pt-2" id="volcano-section">
      
      {/* 1. HEADER SECTION & STATUS BAR */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-7 shadow-xs relative overflow-hidden">
        {/* Glow Ambient Effect */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-orange-400/10 via-red-500/5 to-transparent rounded-full pointer-events-none -mr-20 -mt-20"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-orange-100 text-orange-800 border border-orange-200/80">
                <Flame className="w-3.5 h-3.5 text-orange-600 animate-pulse" />
                PVMBG / MAGMA Indonesia
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Pusat Vulkanologi dan Mitigasi Bencana Geologi
              </span>
            </div>
            
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Mountain className="w-6 h-6 text-orange-600" />
              Pemantauan Status Gunung Api &amp; Erupsi Terkini
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
              Memantau status aktivitas 68 gunung api aktif di seluruh Indonesia secara real-time. Dilengkapi dengan laporan letusan, kolom abu vulkanik, dan rekomendasi radius aman bagi masyarakat.
            </p>
          </div>

          {/* Quick Toggle Panduan PVMBG */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                setShowEducation(!showEducation);
                playSound('click');
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                showEducation
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <Info className="w-3.5 h-3.5 text-orange-500" />
              <span>{showEducation ? 'Tutup Panduan Tingkat Level' : 'Panduan Tingkat Level PVMBG'}</span>
            </button>
          </div>
        </div>

        {/* 2. STAT COUNTERS PILL BAR */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-5 border-t border-slate-100">
          {/* Level IV (Awas) */}
          <button
            onClick={() => { setLevelFilter(levelFilter === '4' ? 'ALL' : '4'); playSound('click'); }}
            className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden group ${
              levelFilter === '4'
                ? 'bg-red-600 text-white border-red-600 shadow-sm'
                : 'bg-red-50/70 hover:bg-red-50 text-red-950 border-red-200/80'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-[11px] font-extrabold uppercase tracking-wide ${levelFilter === '4' ? 'text-red-100' : 'text-red-700'}`}>
                Level IV &bull; Awas
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
            </div>
            <div className="mt-2 text-2xl font-black">{countLvl4}</div>
            <div className={`text-[10px] mt-0.5 font-medium ${levelFilter === '4' ? 'text-red-100' : 'text-red-600'}`}>
              Zona Bahaya Mutlak
            </div>
          </button>

          {/* Level III (Siaga) */}
          <button
            onClick={() => { setLevelFilter(levelFilter === '3' ? 'ALL' : '3'); playSound('click'); }}
            className={`p-3 rounded-2xl border text-left transition-all group ${
              levelFilter === '3'
                ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                : 'bg-orange-50/70 hover:bg-orange-50 text-orange-950 border-orange-200/80'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-[11px] font-extrabold uppercase tracking-wide ${levelFilter === '3' ? 'text-orange-100' : 'text-orange-700'}`}>
                Level III &bull; Siaga
              </span>
              <span className="w-2 h-2 rounded-full bg-orange-500"></span>
            </div>
            <div className="mt-2 text-2xl font-black">{countLvl3}</div>
            <div className={`text-[10px] mt-0.5 font-medium ${levelFilter === '3' ? 'text-orange-100' : 'text-orange-700'}`}>
              Erupsi Nyata &amp; Seismik Tinggi
            </div>
          </button>

          {/* Level II (Waspada) */}
          <button
            onClick={() => { setLevelFilter(levelFilter === '2' ? 'ALL' : '2'); playSound('click'); }}
            className={`p-3 rounded-2xl border text-left transition-all group ${
              levelFilter === '2'
                ? 'bg-amber-500 text-slate-900 border-amber-500 shadow-sm'
                : 'bg-amber-50/70 hover:bg-amber-50 text-amber-950 border-amber-200/80'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-[11px] font-extrabold uppercase tracking-wide ${levelFilter === '2' ? 'text-slate-900' : 'text-amber-800'}`}>
                Level II &bull; Waspada
              </span>
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            </div>
            <div className="mt-2 text-2xl font-black">{countLvl2}</div>
            <div className={`text-[10px] mt-0.5 font-medium ${levelFilter === '2' ? 'text-slate-800' : 'text-amber-700'}`}>
              Aktivitas di Atas Normal
            </div>
          </button>

          {/* Level I (Normal) */}
          <button
            onClick={() => { setLevelFilter(levelFilter === '1' ? 'ALL' : '1'); playSound('click'); }}
            className={`p-3 rounded-2xl border text-left transition-all group ${
              levelFilter === '1'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                : 'bg-emerald-50/70 hover:bg-emerald-50 text-emerald-950 border-emerald-200/80'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-[11px] font-extrabold uppercase tracking-wide ${levelFilter === '1' ? 'text-emerald-100' : 'text-emerald-700'}`}>
                Level I &bull; Normal
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            </div>
            <div className="mt-2 text-2xl font-black">{countLvl1}</div>
            <div className={`text-[10px] mt-0.5 font-medium ${levelFilter === '1' ? 'text-emerald-100' : 'text-emerald-700'}`}>
              Aktivitas Dasar Tenang
            </div>
          </button>

          {/* Erupsi Terkini Aktif */}
          <div className="p-3 rounded-2xl border border-rose-200 bg-rose-50/70 text-rose-950 flex flex-col justify-between col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wide text-rose-700 flex items-center gap-1">
                <Flame className="w-3 h-3 text-rose-600" />
                Laporan Erupsi
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-200 text-rose-800">
                LIVE
              </span>
            </div>
            <div className="mt-2 text-2xl font-black">{eruptions.length}</div>
            <div className="text-[10px] text-rose-700 font-medium truncate">
              Buletin Letusan Terkini
            </div>
          </div>
        </div>

        {/* 3. PANDUAN EDUKASI TINGKAT LEVEL (COLLAPSIBLE) */}
        {showEducation && (
          <div className="mt-5 p-5 bg-slate-50 rounded-2xl border border-slate-200/90 text-xs space-y-3 transition-all animate-fadeIn">
            <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-orange-600" />
              Standar 4 Tingkat Aktivitas Gunung Api PVMBG (Permen ESDM)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2">
              <div className="bg-white p-3.5 rounded-xl border border-red-200">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span>
                  <strong className="text-red-700 font-bold">Level IV (Awas)</strong>
                </div>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  Erupsi utama sedang terjadi atau akan segera terjadi. Bahaya erupsi meluas ke pemukiman penduduk. Masyarakat dalam zona bahaya mutlak wajib dievakuasi keluar radius 5–7 km.
                </p>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-orange-200">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
                  <strong className="text-orange-700 font-bold">Level III (Siaga)</strong>
                </div>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  Peningkatan kegiatan seismik nyata atau erupsi skala sedang. Ancaman bahaya berpotensi meluas ke luar kawah. Rekomendasi larangan aktivitas radius 3–5 km.
                </p>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-amber-200">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  <strong className="text-amber-800 font-bold">Level II (Waspada)</strong>
                </div>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  Aktivitas seismik, kegempaan vulkanik, atau visual fumarola mulai di atas normal. Ancaman terbatas di sekitar puncak kawah (radius 1–2 km).
                </p>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-emerald-200">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                  <strong className="text-emerald-800 font-bold">Level I (Normal)</strong>
                </div>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  Hasil pengamatan visual dan instrumental tidak memperlihatkan gejala peningkatan aktivitas. Kondisi dasar aman dengan mematuhi batas pendakian.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. BULETIN ERUPSI TERKINI (LIVE ERUPTION NOTICES) */}
      {eruptions && eruptions.length > 0 && (
        <div className="bg-white rounded-3xl border border-rose-200/80 p-5 sm:p-6 shadow-xs relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600">
                <Flame className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  Laporan Erupsi &amp; Letusan Terkini
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-600 text-white">
                    {eruptions.length} Catatan Letusan
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Data seismograf dan ketinggian semburan kolom abu vulkanik resmi MAGMA ESDM
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {eruptions.slice(0, 6).map((erup, idx) => (
              <div 
                key={erup.id || idx}
                className="bg-slate-50/80 hover:bg-white p-4 rounded-2xl border border-slate-200/80 hover:border-rose-300 hover:shadow-xs transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                      <strong className="text-sm font-bold text-slate-900">
                        Gunung {erup.gunung_nama}
                      </strong>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 shrink-0">
                      {erup.waktu_erupsi?.split('pukul')?.[1] || erup.waktu_erupsi}
                    </span>
                  </div>

                  <div className="mt-2.5 space-y-1 text-xs text-slate-600">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-slate-400 text-[11px]">Waktu:</span>
                      <span className="font-medium text-slate-800">{erup.waktu_erupsi}</span>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-slate-400 text-[11px]">Kolom Abu:</span>
                      <span className="font-semibold text-rose-600">{erup.tinggi_kolom_abu || 'Abu vulkanik teramati'}</span>
                    </div>
                    {erup.arah_abu && erup.arah_abu !== 'Arah abu beragam' && (
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-slate-400 text-[11px]">Arah Sebaran:</span>
                        <span className="font-medium text-slate-700">{erup.arah_abu}</span>
                      </div>
                    )}
                    {erup.amplitudo_durasi && (
                      <div className="flex items-baseline gap-1.5 text-[11px] text-slate-500 font-mono">
                        <span>Seismik:</span>
                        <span className="truncate">{erup.amplitudo_durasi}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 text-[10px]">Pos Pengamatan PVMBG</span>
                  <button
                    onClick={() => {
                      // Temukan gunung api terkait di list lalu fokus
                      const matchV = volcanoes.find(v => v.nama.toLowerCase().includes(erup.gunung_nama.toLowerCase()));
                      if (matchV) {
                        onFocusVolcano(matchV);
                      }
                    }}
                    className="text-orange-600 hover:text-orange-700 font-bold flex items-center gap-1"
                  >
                    <span>Peta</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. FILTER CONTROLS & SEARCH BAR */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Left: Region Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 md:pb-0">
          <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
            <Compass className="w-3.5 h-3.5" />
            Wilayah:
          </span>
          {[
            { id: 'ALL', label: 'Semua Pulau' },
            { id: 'JAWA', label: 'Jawa' },
            { id: 'NTT', label: 'Bali & Nusa Tenggara' },
            { id: 'MALUKU', label: 'Maluku & Papua' },
            { id: 'SUMATERA', label: 'Sumatera' },
            { id: 'SULAWESI', label: 'Sulawesi' },
          ].map((reg) => (
            <button
              key={reg.id}
              onClick={() => { setRegionFilter(reg.id); playSound('click'); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                regionFilter === reg.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {reg.label}
            </button>
          ))}
        </div>

        {/* Right: Search Box */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari gunung (cth: Merapi, Ibu, Semeru)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              &times;
            </button>
          )}
        </div>
      </div>

      {/* 6. GRID KARTU STATUS GUNUNG API */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVolcanoes.length === 0 ? (
          <div className="col-span-full bg-white rounded-3xl border border-slate-200 p-12 text-center">
            <Mountain className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h4 className="text-base font-bold text-slate-800">Tidak ada gunung api yang cocok</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Cobalah mengubah filter tingkat aktivitas, pilihan wilayah, atau kata kunci pencarian Anda.
            </p>
            <button
              onClick={() => { setLevelFilter('ALL'); setRegionFilter('ALL'); setSearchQuery(''); }}
              className="mt-4 px-4 py-2 rounded-xl bg-orange-50 text-orange-700 font-bold text-xs hover:bg-orange-100 transition-colors"
            >
              Reset Seluruh Filter
            </button>
          </div>
        ) : (
          filteredVolcanoes.map((v) => {
            const cfg = getVolcanoLevelConfig(v.level_angka, v.level_aktivitas);

            return (
              <div
                key={v.id || v.nama}
                className={`bg-white rounded-2xl border ${cfg.cardBorder} p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group relative overflow-hidden`}
              >
                <div>
                  {/* Top Bar: Level Badge & Elevation */}
                  <div className="flex items-center justify-between gap-2">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-extrabold uppercase tracking-wide ${cfg.badgeBg}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotColor} ${v.level_angka >= 3 ? 'animate-ping' : ''}`}></span>
                      {v.level_aktivitas || cfg.label}
                    </span>

                    <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                      {v.tinggi_meter ? `${v.tinggi_meter} mdpl` : 'Aktif'}
                    </span>
                  </div>

                  {/* Volcano Name & Province */}
                  <div className="mt-3.5">
                    <h3 className="text-lg font-black text-slate-900 group-hover:text-orange-600 transition-colors flex items-center gap-1.5">
                      <span>Gunung {v.nama}</span>
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-medium truncate">{v.provinsi}</span>
                    </div>
                  </div>

                  {/* Recommendation / Advisory Note */}
                  <div className={`mt-3.5 p-3 rounded-xl border text-xs ${cfg.lightBg}`}>
                    <div className="flex items-center gap-1.5 font-bold mb-1 text-[11px]">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Rekomendasi PVMBG:</span>
                    </div>
                    <p className="text-[11px] leading-relaxed line-clamp-3">
                      {v.rekomendasi || cfg.radiusInfo}
                    </p>
                  </div>
                </div>

                {/* Bottom Actions: Fokus di Peta */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] font-mono text-slate-400">
                    {v.latitude && v.longitude ? `${parseFloat(v.latitude).toFixed(2)}°, ${parseFloat(v.longitude).toFixed(2)}°` : 'Indonesia'}
                  </span>

                  <button
                    onClick={() => {
                      playSound('click');
                      onFocusVolcano(v);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${cfg.actionColor}`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Fokus di Peta</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

    </section>
  );
}

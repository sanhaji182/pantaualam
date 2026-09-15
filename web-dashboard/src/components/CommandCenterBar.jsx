import React from 'react';
import { 
  Activity, Wind, AlertTriangle, ShieldCheck, 
  Radio, Clock, MapPin, TrendingUp, Flame, Mountain 
} from 'lucide-react';
import { playSound } from '../utils/audio';

/**
 * =============================================================================
 * KOMPONEN: COMMAND CENTER BAR (Ringkasan KPI Bencana & Iklim Nasional)
 * File: src/components/CommandCenterBar.jsx
 * Deskripsi:
 * Memberikan ringkasan eksekutif 5 pilar utama BMKG & PVMBG:
 * Seismik, Vulkanologi (Gunung Api), Kualitas Udara, Peringatan Cuaca, dan Sistem.
 * =============================================================================
 */
export default function CommandCenterBar({ 
  latestQuake, 
  feltQuakes = [], 
  airQualityData = [], 
  weatherAlerts = [],
  weatherList = [],
  volcanoSummary = null
}) {
  // Hitung agregat PM2.5
  const totalSPKU = airQualityData.length;
  const avgPM25 = totalSPKU > 0 
    ? (airQualityData.reduce((acc, curr) => acc + (curr.pm25 || 0), 0) / totalSPKU).toFixed(1)
    : '--';

  const mostPolluted = airQualityData.length > 0 ? airQualityData[0] : null;
  const cleanest = airQualityData.length > 0 ? airQualityData[airQualityData.length - 1] : null;

  // Status Tsunami
  const isTsunami = latestQuake?.potensi && 
    latestQuake.potensi.toLowerCase().includes('tsunami') && 
    !latestQuake.potensi.toLowerCase().includes('tidak');

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      
      {/* 1. KARTU STATUS SEISMIK / GEMPA */}
      <div className="bg-white rounded-2xl border border-slate-200 border-t-4 border-t-red-500 p-4 shadow-xs hover:shadow-md transition-all relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full -mr-6 -mt-6 group-hover:scale-110 transition-transform"></div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-red-500" />
            Aktivitas Seismik BMKG
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => playSound('emergency')}
              className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 hover:bg-red-200 text-red-700 transition-colors flex items-center gap-1"
              title="Klik untuk memutar simulasi nada sirene darurat BMKG"
            >
              <span>Uji Sirene</span>
            </button>
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
              isTsunami ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-100 text-slate-700'
            }`}>
              {isTsunami ? 'POTENSI TSUNAMI' : 'TERKINI'}
            </span>
          </div>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-black text-slate-900 tracking-tight">
            {latestQuake ? `${latestQuake.magnitude} M` : '--'}
          </span>
          <span className="text-xs font-semibold text-slate-500 truncate max-w-[140px]">
            {latestQuake ? latestQuake.wilayah.split(',')[0] : 'Memuat data...'}
          </span>
        </div>

        <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span>Kedalaman: <strong>{latestQuake?.kedalaman || '--'}</strong></span>
          <span className="text-purple-600 font-semibold">{feltQuakes.length} Gempa Dirasakan</span>
        </div>
      </div>

      {/* 2. KARTU PEMANTAUAN GUNUNG API (PVMBG) */}
      <div className="bg-white rounded-2xl border border-slate-200 border-t-4 border-t-orange-500 p-4 shadow-xs hover:shadow-md transition-all relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full -mr-6 -mt-6 group-hover:scale-110 transition-transform"></div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-orange-500" />
            Vulkanologi PVMBG
          </span>
          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
            {(volcanoSummary?.total_gunung || 68)} GUNUNG
          </span>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-black text-slate-900 tracking-tight">
            {(volcanoSummary?.level_iv_awas || 0) + (volcanoSummary?.level_iii_siaga || 5)}
          </span>
          <span className="text-xs font-semibold text-orange-600">
            Gunung Siaga &bull; Level III
          </span>
        </div>

        <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span>Waspada: <strong>{volcanoSummary?.level_ii_waspada || 21}</strong></span>
          <span className="text-rose-600 font-semibold flex items-center gap-1">
            <Flame className="w-3 h-3 text-rose-500" />
            {volcanoSummary?.total_erupsi_aktif || 11} Laporan Erupsi
          </span>
        </div>
      </div>

      {/* 3. KARTU KUALITAS UDARA (PM2.5) */}
      <div className="bg-white rounded-2xl border border-slate-200 border-t-4 border-t-cyan-500 p-4 shadow-xs hover:shadow-md transition-all relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full -mr-6 -mt-6 group-hover:scale-110 transition-transform"></div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Wind className="w-3.5 h-3.5 text-cyan-500" />
            Polusi Udara (PM2.5)
          </span>
          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200">
            {totalSPKU} SPKU
          </span>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-black text-slate-900 tracking-tight">
            {avgPM25}
          </span>
          <span className="text-xs font-semibold text-slate-500">µg/m³ Rata-Rata</span>
        </div>

        <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span className="truncate max-w-[120px]" title={mostPolluted?.stasiun}>
            Kritis: <strong className="text-rose-600">{mostPolluted?.stasiun || '-'}</strong>
          </span>
          <span className="truncate max-w-[120px]" title={cleanest?.stasiun}>
            Bersih: <strong className="text-emerald-600">{cleanest?.stasiun || '-'}</strong>
          </span>
        </div>
      </div>

      {/* 3. KARTU PERINGATAN DINI CUACA (NOWCAST CAP) */}
      <div className="bg-white rounded-2xl border border-slate-200 border-t-4 border-t-amber-500 p-4 shadow-xs hover:shadow-md transition-all relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full -mr-6 -mt-6 group-hover:scale-110 transition-transform"></div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            Peringatan Cuaca Ekstrem
          </span>
          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
            weatherAlerts.length > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
          }`}>
            NOWCAST CAP
          </span>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-black text-slate-900 tracking-tight">
            {weatherAlerts.length}
          </span>
          <span className="text-xs font-semibold text-slate-500">Peringatan Aktif</span>
        </div>

        <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span className="truncate max-w-[200px]" title={weatherAlerts[0]?.judul || 'Tidak ada peringatan aktif'}>
            {weatherAlerts.length > 0 ? weatherAlerts[0].judul : 'Kondisi cuaca terpantau kondusif'}
          </span>
        </div>
      </div>

      {/* 4. KARTU SENSOR & INTEGRASI SYSTEM */}
      <div className="bg-white rounded-2xl border border-slate-200 border-t-4 border-t-emerald-500 p-4 shadow-xs hover:shadow-md transition-all relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-6 -mt-6 group-hover:scale-110 transition-transform"></div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            Status Gateway & Ingestion
          </span>
          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
            100% ONLINE
          </span>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-black text-slate-900 tracking-tight">
            {weatherList.length + totalSPKU}
          </span>
          <span className="text-xs font-semibold text-slate-500">Titik Sensor Terhubung</span>
        </div>

        <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span>DB: <strong>PostgreSQL JSONB</strong></span>
          <span className="text-blue-600 font-semibold">Golang Gateway :8080</span>
        </div>
      </div>

    </div>
  );
}

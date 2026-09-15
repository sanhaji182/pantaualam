import React, { useState } from 'react';
import { 
  Activity, AlertTriangle, Compass, Waves, 
  MapPin, Clock, ShieldAlert, ChevronDown, ChevronUp, Image as ImageIcon 
} from 'lucide-react';

/**
 * =============================================================================
 * KOMPONEN: BANNER PERINGATAN GEMPA TERKINI (Informatif & Tanggap Bencana)
 * File: src/components/EarthquakeBanner.jsx
 * Deskripsi:
 * Menampilkan detail gempa bumi terbaru dari BMKG dengan parameter geofisika
 * lengkap, status potensi tsunami, peta guncangan (shakemap), dan panduan
 * evakuasi mandiri kebencanaan.
 * =============================================================================
 */
export default function EarthquakeBanner({ quake, onOpenShakemap }) {
  const [showEvacuationTips, setShowEvacuationTips] = useState(false);

  if (!quake) {
    return (
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
        <div className="h-10 bg-slate-100 rounded w-2/3"></div>
      </div>
    );
  }

  const isTsunami = quake.potensi && 
    quake.potensi.toLowerCase().includes('tsunami') && 
    !quake.potensi.toLowerCase().includes('tidak');
  
  const magnitude = parseFloat(quake.magnitude) || 0;

  // Penentuan tingkat resiko
  let riskColor = 'bg-slate-900 border-slate-700';
  let badgeColor = 'bg-slate-700 text-white';
  if (isTsunami || magnitude >= 6.5) {
    riskColor = 'bg-gradient-to-br from-red-950 via-rose-900 to-slate-950 border-red-500/50 text-white';
    badgeColor = 'bg-red-500 text-white';
  } else if (magnitude >= 5.0) {
    riskColor = 'bg-gradient-to-br from-amber-950/80 via-slate-900 to-slate-950 border-amber-500/40 text-white';
    badgeColor = 'bg-amber-500 text-slate-950';
  } else {
    riskColor = 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 border-slate-700 text-white';
    badgeColor = 'bg-blue-500 text-white';
  }

  return (
    <div id="seismik" className={`relative overflow-hidden rounded-3xl border p-6 shadow-xl transition-all ${riskColor}`}>
      
      {/* Background Decorative Rings */}
      <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full border border-white/5 pointer-events-none"></div>
      <div className="absolute -right-8 -top-8 w-48 h-48 rounded-full border border-white/5 pointer-events-none"></div>

      <div className="relative z-10 space-y-5">
        
        {/* Header Baris Pertama */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
            </span>
            <span className="text-xs font-black tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-white/10 text-white border border-white/15">
              AUTOGEMPA BMKG TERKINI
            </span>
            <span className="text-xs text-slate-300 font-medium flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              {quake.tanggal_jam}
            </span>
          </div>

          {/* Status Potensi Tsunami Badge */}
          <div>
            {isTsunami ? (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-black bg-red-600 text-white animate-bounce shadow-lg shadow-red-600/40">
                <AlertTriangle className="w-4 h-4" />
                POTENSI TSUNAMI — SEGERA EVAKUASI KE DATARAN TINGGI
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
                <Waves className="w-3.5 h-3.5 text-emerald-400" />
                {quake.potensi || 'Tidak berpotensi tsunami (Aman)'}
              </span>
            )}
          </div>
        </div>

        {/* Konten Utama Gempa */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          
          {/* Kolom 1: Magnitudo Besar */}
          <div className="lg:col-span-3 flex items-center gap-4">
            <div className={`w-24 h-24 rounded-3xl flex flex-col items-center justify-center font-black shadow-2xl shrink-0 ${badgeColor}`}>
              <span className="text-4xl leading-none tracking-tight">{quake.magnitude}</span>
              <span className="text-[10px] tracking-widest uppercase opacity-85 mt-1 font-bold">MAGNITUDO</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block font-medium">Tingkat Guncangan:</span>
              <p className="text-base font-bold text-white leading-tight">
                {magnitude >= 6.0 ? 'Gempa Signifikan Kuat' : magnitude >= 5.0 ? 'Gempa Sedang Dirasakan' : 'Gempa Skala Ringan'}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Kedalaman: <strong className="text-white">{quake.kedalaman}</strong>
              </p>
            </div>
          </div>

          {/* Kolom 2: Lokasi Episentrum & Koordinat */}
          <div className="lg:col-span-6 space-y-2">
            <div className="flex items-start gap-2">
              <MapPin className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs text-slate-400 font-semibold block">Pusat Episentrum:</span>
                <h3 className="text-lg font-black text-white leading-snug tracking-tight">
                  {quake.wilayah}
                </h3>
              </div>
            </div>

            {/* Parameter Geofisika Tambahan */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-1">
              <span className="bg-white/5 px-2.5 py-1 rounded-lg border border-white/10 font-mono">
                Lat: {quake.latitude} | Lon: {quake.longitude}
              </span>
              {quake.dirasakan && (
                <span className="bg-purple-950/70 text-purple-200 border border-purple-500/40 px-2.5 py-1 rounded-lg font-medium">
                  Dirasakan: <strong>{quake.dirasakan}</strong>
                </span>
              )}
            </div>
          </div>

          {/* Kolom 3: Tombol Aksi (Shakemap & Tips) */}
          <div className="lg:col-span-3 flex flex-row lg:flex-col gap-2 justify-end">
            {quake.shakemap_image_url && (
              <button
                onClick={() => onOpenShakemap(quake.shakemap_image_url)}
                className="flex-1 lg:flex-none px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-md shadow-blue-600/30 flex items-center justify-center gap-2"
              >
                <ImageIcon className="w-4 h-4" />
                Peta Shakemap MMI
              </button>
            )}

            <button
              onClick={() => setShowEvacuationTips(!showEvacuationTips)}
              className="flex-1 lg:flex-none px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-slate-200 transition-all border border-white/10 flex items-center justify-center gap-1.5"
            >
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Panduan Keselamatan</span>
              {showEvacuationTips ? <ChevronUp className="w-3.5 h-3.5 ml-auto" /> : <ChevronDown className="w-3.5 h-3.5 ml-auto" />}
            </button>
          </div>

        </div>

        {/* Dropdown Panduan Evakuasi Kebencanaan (BNPB & BMKG) */}
        {showEvacuationTips && (
          <div className="mt-4 p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-slate-300 space-y-2 animate-fadeIn">
            <h4 className="font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              Protokol Siaga Bencana Gempa Bumi (Standar BNPB & BMKG):
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-[11px]">
              <div className="p-2.5 rounded-xl bg-black/30 border border-white/5">
                <strong className="text-amber-300 block mb-1">1. Saat Guncangan (Drop & Cover)</strong>
                Jangan panik! Segera merunduk, lindungi kepala di bawah meja kokoh, dan jauhi perabotan kaca atau lemari tinggi.
              </div>
              <div className="p-2.5 rounded-xl bg-black/30 border border-white/5">
                <strong className="text-amber-300 block mb-1">2. Hindari Lift & Eskalator</strong>
                Gunakan tangga darurat. Matikan kompor gas dan saklar listrik utama sebelum meninggalkan bangunan.
              </div>
              <div className="p-2.5 rounded-xl bg-black/30 border border-white/5">
                <strong className="text-amber-300 block mb-1">3. Menuju Titik Kumpul (Assembly Point)</strong>
                Pergi ke lapangan terbuka yang jauh dari tiang listrik, baliho, dan lereng rawan longsor. Waspadai gempa susulan (*aftershocks*).
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

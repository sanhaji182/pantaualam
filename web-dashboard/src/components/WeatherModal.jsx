import React, { useState } from 'react';
import { 
  X, Calendar, Clock, Wind, Droplets, MapPin, 
  Database, Sparkles, Compass, TrendingUp, Sun, CloudRain, ShieldCheck 
} from 'lucide-react';
import { playSound } from '../utils/audio';

/**
 * =============================================================================
 * KOMPONEN: MODAL DETAIL PRAKIRAAN CUACA 3 HARI (Interactive SVG Curve & JSONB)
 * File: src/components/WeatherModal.jsx
 * Deskripsi:
 * Mengurai kolom 'forecast_detail' (JSONB) dari database PostgreSQL, lalu
 * menyajikannya dengan grafik kurva fluktuasi suhu interaktif (SVG Sparkline),
 * metrik ringkasan harian (suhu min/max), dan timeline per jam.
 * =============================================================================
 */
export default function WeatherModal({ cityDetail, onClose }) {
  if (!cityDetail) return null;

  const [activeDayTab, setActiveDayTab] = useState(0);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState(0);

  const forecastDays = cityDetail.forecast_detail || [];
  const currentDaySlots = forecastDays[activeDayTab] || [];

  // Hitung statistik suhu harian (Min, Max, Rata-rata)
  const temps = currentDaySlots.map(s => parseFloat(s.temperature)).filter(t => !isNaN(t));
  const maxTemp = temps.length > 0 ? Math.max(...temps) : 32;
  const minTemp = temps.length > 0 ? Math.min(...temps) : 24;
  const avgTemp = temps.length > 0 ? (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1) : 28;

  // Slot yang sedang disorot/dipilih
  const activeSlot = currentDaySlots[selectedSlotIndex] || currentDaySlots[0];

  // Helper membuat jalur grafik kurva SVG interaktif
  const generateSvgPath = () => {
    if (temps.length < 2) return { path: '', area: '', points: [] };
    const width = 500;
    const height = 90;
    const padding = 20;

    const range = Math.max(maxTemp - minTemp, 4);
    const points = currentDaySlots.map((slot, idx) => {
      const temp = parseFloat(slot.temperature) || minTemp;
      const x = padding + (idx / (currentDaySlots.length - 1)) * (width - 2 * padding);
      const y = height - padding - ((temp - minTemp) / range) * (height - 2 * padding);
      return { x, y, temp, time: slot.local_datetime ? slot.local_datetime.split(' ')[1] : slot.datetime, desc: slot.weather_desc };
    });

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cx = (prev.x + curr.x) / 2;
      path += ` C ${cx} ${prev.y}, ${cx} ${curr.y}, ${curr.x} ${curr.y}`;
    }

    const area = `${path} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;
    return { path, area, points };
  };

  const { path: curvePath, area: areaPath, points: chartPoints } = generateSvgPath();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-hidden shadow-2xl border border-slate-200 flex flex-col">
        
        {/* Header Modal Modern */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-700 via-indigo-600 to-cyan-600 text-white relative overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full -mr-16 -mt-16 pointer-events-none"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-white/20 text-white border border-white/25">
                BMKG ADM4 KECAMATAN
              </span>
              <span className="text-xs text-blue-100 font-medium">{cityDetail.provinsi_nama}</span>
            </div>
            <h3 className="text-2xl font-black text-white mt-1.5 flex items-center gap-2 tracking-tight">
              <MapPin className="w-5 h-5 text-cyan-300" />
              {cityDetail.kota_nama}
            </h3>
          </div>

          <button
            onClick={() => { playSound('click'); onClose(); }}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors border border-white/20 relative z-10"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Pilihan Hari & Banner NoSQL JSONB */}
        <div className="px-6 pt-3 pb-2 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex gap-2">
            {['Hari Ke-1 (Hari Ini)', 'Hari Ke-2 (Besok)', 'Hari Ke-3 (Lusa)'].map((label, idx) => (
              <button
                key={label}
                onClick={() => { setActiveDayTab(idx); setSelectedSlotIndex(0); playSound('click'); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeDayTab === idx
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>{label.split(' ')[0]} {label.split(' ')[1]}</span>
              </button>
            ))}
          </div>

          {/* Badge Spesifikasi PostgreSQL JSONB */}
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 bg-white px-3 py-1 rounded-xl border border-slate-200">
            <Database className="w-3.5 h-3.5 text-blue-600" />
            <span>PostgreSQL 16 Multi-Model JSONB</span>
          </div>
        </div>

        {/* Konten Scrollable */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* Ringkasan Metrik Harian */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200">
              <span className="text-[10px] uppercase font-bold text-amber-700 block">Suhu Maksimum</span>
              <span className="text-2xl font-black text-amber-900">{maxTemp}°C</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200">
              <span className="text-[10px] uppercase font-bold text-blue-700 block">Suhu Minimum</span>
              <span className="text-2xl font-black text-blue-900">{minTemp}°C</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200">
              <span className="text-[10px] uppercase font-bold text-indigo-700 block">Suhu Rata-rata</span>
              <span className="text-2xl font-black text-indigo-900">{avgTemp}°C</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200">
              <span className="text-[10px] uppercase font-bold text-emerald-700 block">Total Jadwal</span>
              <span className="text-2xl font-black text-emerald-900">{currentDaySlots.length} Jam</span>
            </div>
          </div>

          {/* Visual Kurva Tren Suhu Interaktif (SVG Sparkline) */}
          {chartPoints.length > 1 && (
            <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-2 border border-slate-800 shadow-md">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold flex items-center gap-1.5 text-blue-400">
                  <TrendingUp className="w-4 h-4" />
                  Kurva Fluktuasi Suhu 24 Jam (BMKG Forecast)
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Klik titik untuk detail jam</span>
              </div>

              <div className="relative overflow-x-auto">
                <svg viewBox="0 0 500 90" className="w-full h-24 overflow-visible">
                  <defs>
                    <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.45" />
                      <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Area Fill */}
                  <path d={areaPath} fill="url(#tempGrad)" />

                  {/* Curve Stroke */}
                  <path d={curvePath} fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />

                  {/* Interactive Points */}
                  {chartPoints.map((pt, i) => {
                    const isSelected = selectedSlotIndex === i;
                    return (
                      <g 
                        key={i} 
                        onClick={() => { setSelectedSlotIndex(i); playSound('click'); }}
                        className="cursor-pointer group"
                      >
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={isSelected ? 6 : 4}
                          className={isSelected ? "fill-amber-400 stroke-white stroke-2" : "fill-cyan-400 hover:fill-amber-300 transition-colors"}
                        />
                        <text
                          x={pt.x}
                          y={pt.y - 10}
                          textAnchor="middle"
                          fontSize="9"
                          fontWeight="bold"
                          fill={isSelected ? "#f59e0b" : "#cbd5e1"}
                        >
                          {Math.round(pt.temp)}°
                        </text>
                        <text
                          x={pt.x}
                          y={85}
                          textAnchor="middle"
                          fontSize="8"
                          fill="#64748b"
                          fontFamily="monospace"
                        >
                          {pt.time}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
          )}

          {/* Spotlight Jam Terpilih */}
          {activeSlot && (
            <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex flex-col items-center justify-center font-bold shadow-sm shrink-0">
                  <span className="text-[9px] uppercase tracking-wider opacity-80">JAM</span>
                  <span className="text-sm font-black">
                    {activeSlot.local_datetime ? activeSlot.local_datetime.split(' ')[1] : activeSlot.datetime}
                  </span>
                </div>
                <div>
                  <h4 className="text-base font-extrabold text-slate-900">
                    {activeSlot.weather_desc || 'Cerah Berawan'}
                  </h4>
                  <p className="text-xs text-slate-500">
                    Suhu terasa seperti {Math.round(parseFloat(activeSlot.temperature) || 30)}°C dengan tutupan awan BMKG.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs font-semibold text-slate-700">
                <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                  <Droplets className="w-4 h-4 text-blue-500" />
                  <span>{activeSlot.humidity || '--'}% Lembap</span>
                </div>
                <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                  <Wind className="w-4 h-4 text-cyan-500" />
                  <span>{activeSlot.wind_speed || '--'} km/h {activeSlot.wind_direction}</span>
                </div>
              </div>
            </div>
          )}

          {/* Daftar Seluruh Slot Per Jam */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
              Timeline Rincian Jam Hari Terpilih:
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {currentDaySlots.map((slot, idx) => {
                const isSelected = selectedSlotIndex === idx;
                const timeString = slot.local_datetime ? slot.local_datetime.split(' ')[1] : slot.datetime;
                const tempVal = parseFloat(slot.temperature) || 0;

                return (
                  <div
                    key={idx}
                    onClick={() => { setSelectedSlotIndex(idx); playSound('click'); }}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-blue-50/90 border-blue-500 shadow-sm ring-2 ring-blue-400/20'
                        : 'bg-slate-50/60 hover:bg-white border-slate-200/80 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-bold text-xs text-blue-700 shrink-0 font-mono">
                        {timeString || '--'}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-800 block truncate max-w-[130px]">
                          {slot.weather_desc || 'Berawan'}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {slot.humidity}% lembap &bull; {slot.wind_speed} km/h
                        </span>
                      </div>
                    </div>

                    <span className="text-base font-black text-slate-900 shrink-0">
                      {Math.round(tempVal)}°C
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Footer Info */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>BMKG Open Data Protocol &bull; NoSQL Document Model</span>
          <button
            onClick={() => { playSound('click'); onClose(); }}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition-all text-xs"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
}

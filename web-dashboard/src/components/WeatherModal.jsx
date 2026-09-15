import React, { useState } from 'react';
import { X, Calendar, Clock, Wind, Droplets, MapPin, Database, Sparkles, Compass } from 'lucide-react';

/**
 * =============================================================================
 * KOMPONEN: MODAL DETAIL PRAKIRAAN CUACA 3 HARI (Eksplorasi Dokumen NoSQL JSONB)
 * File: src/components/WeatherModal.jsx
 * Deskripsi:
 * Mengurai kolom 'forecast_detail' (JSONB) dari database PostgreSQL, lalu
 * menyajikannya dalam bentuk visual timeline per 3 jam untuk 3 hari ke depan.
 * =============================================================================
 */
export default function WeatherModal({ cityDetail, onClose }) {
  if (!cityDetail) return null;

  const [activeDayTab, setActiveDayTab] = useState(0);

  // forecast_detail berisi array 3 grup cuaca harian dari BMKG
  const forecastDays = cityDetail.forecast_detail || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-slate-200 flex flex-col">
        
        {/* Header Modal */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-white/20 text-white border border-white/25">
                BMKG ADM4 DETAIL
              </span>
              <span className="text-xs text-blue-100 font-medium">{cityDetail.provinsi_nama}</span>
            </div>
            <h3 className="text-2xl font-black text-white mt-1.5 flex items-center gap-2 tracking-tight">
              <MapPin className="w-5 h-5 text-cyan-300" />
              {cityDetail.kota_nama}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors border border-white/20"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Banner Spesifikasi Arsitektur NoSQL JSONB */}
        <div className="px-6 py-2.5 bg-blue-50/80 border-b border-blue-100 flex items-center gap-2 text-xs text-blue-900">
          <Database className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            <strong>Data NoSQL JSONB:</strong> Rincian per jam ini diekstrak langsung dari kolom JSONB terindeks GIN di PostgreSQL tanpa query join tabel.
          </span>
        </div>

        {/* Tab Pilihan Hari */}
        <div className="px-6 pt-4 pb-2 border-b border-slate-100 flex gap-2 bg-slate-50">
          {['Hari Ke-1 (Hari Ini)', 'Hari Ke-2 (Besok)', 'Hari Ke-3 (Lusa)'].map((label, idx) => (
            <button
              key={label}
              onClick={() => setActiveDayTab(idx)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeDayTab === idx
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Konten Timeline Per Jam */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          {(!forecastDays[activeDayTab] || forecastDays[activeDayTab].length === 0) ? (
            <div className="text-center py-16 text-slate-400 text-xs">
              Data rincian prakiraan untuk hari ini belum tersedia di database.
            </div>
          ) : (
            <div className="space-y-2.5">
              {forecastDays[activeDayTab].map((slot, index) => {
                const timeString = slot.local_datetime ? slot.local_datetime.split(' ')[1] : slot.datetime;
                
                return (
                  <div
                    key={index}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border border-slate-200/80 bg-slate-50/60 hover:bg-white hover:border-blue-300 transition-all shadow-xs gap-3"
                  >
                    {/* Waktu & Kondisi */}
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex flex-col items-center justify-center font-bold text-slate-700 shrink-0">
                        <span className="text-[10px] text-slate-400 font-medium">JAM</span>
                        <span className="text-xs font-black text-blue-700">{timeString || '--'}</span>
                      </div>

                      <div>
                        <h5 className="text-sm font-bold text-slate-800">
                          {slot.weather_desc || 'Kondisi Berawan'}
                        </h5>
                        <p className="text-[11px] text-slate-500">
                          Waktu Lokal Indonesia (WIB/WITA/WIT)
                        </p>
                      </div>
                    </div>

                    {/* Ikon Cuaca BMKG, Suhu & Parameter */}
                    <div className="flex items-center justify-between sm:justify-end gap-6 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200">
                      
                      {slot.image && (
                        <img 
                          src={slot.image} 
                          alt={slot.weather_desc} 
                          className="w-10 h-10 object-contain drop-shadow-xs" 
                        />
                      )}
                      
                      {/* Suhu Celcius */}
                      <div className="text-right">
                        <span className="text-2xl font-black text-slate-900 tracking-tight">
                          {slot.t}°C
                        </span>
                      </div>

                      {/* Kelembapan & Angin */}
                      <div className="flex items-center gap-4 text-xs text-slate-500 border-l border-slate-200 pl-4">
                        <div className="flex items-center gap-1.5" title="Kelembapan Udara">
                          <Droplets className="w-3.5 h-3.5 text-blue-500" />
                          <span><strong>{slot.hu}%</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5" title="Kecepatan Angin">
                          <Wind className="w-3.5 h-3.5 text-emerald-500" />
                          <span><strong>{slot.ws}</strong> km/h</span>
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>BMKG Sistem Informasi Prakiraan Cuaca Publik</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-semibold transition-colors"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
}

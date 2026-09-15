import React, { useState } from 'react';
import { AlertTriangle, ChevronRight, X, ShieldAlert, CloudRain, BellRing } from 'lucide-react';

/**
 * =============================================================================
 * KOMPONEN: TICKER PERINGATAN DINI CUACA EKSTREM (BMKG NOWCAST CAP)
 * File: src/components/WeatherAlertBar.jsx
 * Deskripsi:
 * Menampilkan baris peringatan mendesak saat BMKG menerbitkan peringatan
 * cuaca ekstrem (hujan lebat, petir, angin kencang, puting beliung).
 * =============================================================================
 */
export default function WeatherAlertBar({ alerts = [] }) {
  const [activeModalAlert, setActiveModalAlert] = useState(null);

  if (!alerts || alerts.length === 0) return null;

  // Ambil peringatan pertama yang paling baru untuk ticker
  const latestAlert = alerts[0];

  return (
    <>
      {/* Banner Peringatan Dini Atas */}
      <div className="bg-gradient-to-r from-red-700 via-rose-600 to-amber-600 text-white px-5 py-3 rounded-2xl shadow-md shadow-red-500/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 overflow-hidden">
          <span className="p-1.5 rounded-xl bg-white/20 text-white shrink-0 animate-pulse flex items-center justify-center">
            <BellRing className="w-4 h-4" />
          </span>
          <div className="truncate text-xs font-medium">
            <span className="font-black uppercase tracking-wider bg-black/25 px-2.5 py-0.5 rounded-full text-[10px] mr-2">
              NOWCAST BMKG ({alerts.length} AKTIF)
            </span>
            <span className="font-bold">{latestAlert.judul}</span> — {latestAlert.deskripsi.slice(0, 90)}...
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          <span className="text-[10px] opacity-80 hidden lg:inline">{latestAlert.pub_date}</span>
          <button
            onClick={() => setActiveModalAlert(latestAlert)}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white text-red-700 hover:bg-slate-100 transition-all shadow-xs flex items-center gap-1"
          >
            <span>Baca Detail Peringatan</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Modal Detail Peringatan Ekstrem */}
      {activeModalAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl border border-slate-200">
            
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-red-50/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-600 flex items-center justify-center text-white shadow-md shadow-red-600/30">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-black tracking-wider text-red-700">
                    Peringatan Dini Cuaca Ekstrem BMKG
                  </span>
                  <h4 className="font-bold text-slate-900 text-sm leading-tight">{activeModalAlert.judul}</h4>
                </div>
              </div>

              <button
                onClick={() => setActiveModalAlert(null)}
                className="w-8 h-8 rounded-full bg-white hover:bg-slate-200 border border-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-xs text-slate-700 leading-relaxed">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block font-medium text-[10px]">Waktu Publikasi BMKG:</span>
                  <strong className="text-slate-800 text-xs">{activeModalAlert.pub_date || 'Terkini'}</strong>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-red-100 text-red-700 font-bold text-[10px]">
                  STATUS WASPADA
                </span>
              </div>

              <div>
                <strong className="text-slate-900 font-bold block mb-1.5 text-xs">
                  Rincian Wilayah Terdampak &amp; Potensi Bahaya:
                </strong>
                <div className="whitespace-pre-line text-slate-700 bg-amber-50/60 p-4 rounded-2xl border border-amber-200/70 text-xs leading-relaxed">
                  {activeModalAlert.deskripsi}
                </div>
              </div>

              {/* Daftar Peringatan Lainnya */}
              {alerts.length > 1 && (
                <div className="pt-2">
                  <span className="font-bold text-slate-800 block mb-2 text-xs">Peringatan Aktif Lainnya:</span>
                  <div className="space-y-1.5">
                    {alerts.slice(1, 4).map((alt, idx) => (
                      <div 
                        key={idx}
                        onClick={() => setActiveModalAlert(alt)}
                        className="p-2.5 rounded-xl bg-slate-50 hover:bg-red-50 border border-slate-200 cursor-pointer transition-colors flex items-center justify-between"
                      >
                        <span className="truncate font-semibold text-slate-700 pr-2">{alt.judul}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeModalAlert.link && (
                <div className="pt-1">
                  <a
                    href={activeModalAlert.link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline font-semibold block text-xs"
                  >
                    Dokumen Resmi XML CAP BMKG &rarr;
                  </a>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 text-center text-[11px] text-slate-500">
              Direktorat Meteorologi Publik &mdash; Deputi Bidang Meteorologi BMKG
            </div>

          </div>
        </div>
      )}
    </>
  );
}

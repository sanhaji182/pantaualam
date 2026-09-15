import React, { useEffect, useRef, useState } from 'react';
import { Layers, Activity, MapPin, Eye, Radio, Info } from 'lucide-react';

/**
 * =============================================================================
 * KOMPONEN: PETA INTERAKTIF SEISMOLOGI DENGAN LIVE FEED SPLIT VIEW (Leaflet)
 * File: src/components/EarthquakeMap.jsx
 * Deskripsi:
 * Menggabungkan visualisasi geospatial titik episentrum gempa bumi di peta
 * interaktif Leaflet dengan panel Feed Gempa Terbaru di sisi kanan yang dapat
 * diklik untuk memusatkan kamera peta secara langsung (panTo coordinate).
 * =============================================================================
 */
export default function EarthquakeMap({ latestQuake, recentQuakes = [], feltQuakes = [] }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [activeLayer, setActiveLayer] = useState('ALL'); // 'ALL', 'M5', 'DIRASAKAN'
  const [selectedQuakeFocus, setSelectedQuakeFocus] = useState(null);

  // Inisialisasi Peta Leaflet
  useEffect(() => {
    if (!window.L || !mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = window.L.map(mapContainerRef.current, {
        center: [-2.5, 118.0],
        zoom: 5,
        minZoom: 4,
        maxZoom: 12,
        scrollWheelZoom: false,
      });

      window.L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Bersihkan layer marker lama
    map.eachLayer((layer) => {
      if (layer instanceof window.L.CircleMarker || layer instanceof window.L.Marker) {
        map.removeLayer(layer);
      }
    });

    // 1. Plot 15 Gempa M 5.0+ (Warna Oranye)
    if (activeLayer === 'ALL' || activeLayer === 'M5') {
      recentQuakes.forEach((q) => {
        const lat = parseFloat(q.latitude);
        const lon = parseFloat(q.longitude);
        if (!isNaN(lat) && !isNaN(lon)) {
          const mag = parseFloat(q.magnitude) || 4.0;
          const circle = window.L.circleMarker([lat, lon], {
            radius: Math.max(mag * 2.2, 7),
            fillColor: '#f97316',
            color: '#ffffff',
            weight: 1.5,
            opacity: 0.9,
            fillOpacity: 0.7,
          }).addTo(map);

          circle.bindPopup(`
            <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4; padding: 2px;">
              <span style="background: #ea580c; color: #fff; padding: 1px 6px; border-radius: 4px; font-weight: bold; font-size: 9px;">GEMPA M 5.0+</span><br/>
              <strong style="color: #0f172a; margin-top: 3px; display: block; font-size: 13px;">${q.wilayah}</strong>
              <div style="margin-top: 4px;">Magnitudo: <b style="color: #ea580c; font-size: 14px;">${q.magnitude} M</b></div>
              <div>Kedalaman: <b>${q.kedalaman}</b></div>
              <div style="color: #64748b; font-size: 11px; margin-top: 2px;">Waktu: ${q.tanggal_jam}</div>
            </div>
          `);
        }
      });
    }

    // 2. Plot 15 Gempa Dirasakan (Warna Ungu Violet)
    if (activeLayer === 'ALL' || activeLayer === 'DIRASAKAN') {
      feltQuakes.forEach((q) => {
        const lat = parseFloat(q.latitude);
        const lon = parseFloat(q.longitude);
        if (!isNaN(lat) && !isNaN(lon)) {
          const mag = parseFloat(q.magnitude) || 3.5;
          const circle = window.L.circleMarker([lat, lon], {
            radius: Math.max(mag * 2, 6),
            fillColor: '#8b5cf6',
            color: '#ffffff',
            weight: 1.5,
            opacity: 0.9,
            fillOpacity: 0.7,
          }).addTo(map);

          circle.bindPopup(`
            <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4; padding: 2px;">
              <span style="background: #7c3aed; color: #fff; padding: 1px 6px; border-radius: 4px; font-weight: bold; font-size: 9px;">DIRASAKAN WARGA</span><br/>
              <strong style="color: #0f172a; margin-top: 3px; display: block; font-size: 13px;">${q.wilayah}</strong>
              <div style="margin-top: 4px;">Magnitudo: <b style="color: #7c3aed; font-size: 14px;">${q.magnitude} M</b></div>
              <div>Skala MMI: <b style="color: #7c3aed;">${q.dirasakan || '-'}</b></div>
              <div>Kedalaman: ${q.kedalaman}</div>
              <div style="color: #64748b; font-size: 11px; margin-top: 2px;">Waktu: ${q.tanggal_jam}</div>
            </div>
          `);
        }
      });
    }

    // 3. Plot Gempa Terkini Utama (Lingkaran Episentrum Berdenyut)
    if (latestQuake) {
      const lat = parseFloat(latestQuake.latitude);
      const lon = parseFloat(latestQuake.longitude);
      if (!isNaN(lat) && !isNaN(lon)) {
        const mag = parseFloat(latestQuake.magnitude) || 5.0;

        // Radius Gelombang Seismik
        window.L.circleMarker([lat, lon], {
          radius: mag * 6,
          fillColor: '#ef4444',
          color: '#dc2626',
          weight: 2,
          opacity: 0.4,
          fillOpacity: 0.15,
        }).addTo(map);

        // Inti Episentrum
        const mainMarker = window.L.circleMarker([lat, lon], {
          radius: mag * 3.5,
          fillColor: '#b91c1c',
          color: '#ffffff',
          weight: 3,
          opacity: 1,
          fillOpacity: 0.9,
        }).addTo(map);

        mainMarker.bindPopup(`
          <div style="font-family: sans-serif; font-size: 13px; line-height: 1.4; padding: 2px;">
            <span style="background: #dc2626; color: #fff; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px;">GEMPA TERKINI BMKG</span><br/>
            <strong style="color: #0f172a; font-size: 14px; margin-top: 3px; display: block;">${latestQuake.wilayah}</strong>
            <div style="margin-top: 4px;">Magnitudo: <b style="color: #dc2626; font-size: 16px;">${latestQuake.magnitude} SR</b></div>
            <div>Kedalaman: <b>${latestQuake.kedalaman}</b></div>
            <div style="color: #64748b; font-size: 11px;">Waktu: ${latestQuake.tanggal_jam}</div>
            <div style="color: #16a34a; font-weight: bold; margin-top: 3px;">${latestQuake.potensi || 'Tidak berpotensi tsunami'}</div>
          </div>
        `).openPopup();
      }
    }

  }, [latestQuake, recentQuakes, feltQuakes, activeLayer]);

  // Fungsi memusatkan kamera peta saat pengguna mengklik item di Feed Gempa
  const handleFocusQuake = (quake) => {
    const lat = parseFloat(quake.latitude);
    const lon = parseFloat(quake.longitude);
    if (!isNaN(lat) && !isNaN(lon) && mapInstanceRef.current) {
      setSelectedQuakeFocus(quake.gempa_id || quake.tanggal_jam);
      mapInstanceRef.current.flyTo([lat, lon], 8, {
        duration: 1.2
      });
    }
  };

  // Gabungan feed gempa untuk daftar interaktif di sisi kanan
  const combinedFeed = activeLayer === 'M5' 
    ? recentQuakes 
    : activeLayer === 'DIRASAKAN' 
      ? feltQuakes 
      : [...recentQuakes.slice(0, 7), ...feltQuakes.slice(0, 7)];

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
      
      {/* Header & Filter Layer Tab */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-red-500" />
            <h3 className="font-extrabold text-slate-900 text-lg tracking-tight">
              Peta Seismologi Nasional &amp; Live Feed Sensor BMKG
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Visualisasi geospasial titik episentrum gempa bumi utama, gempa M 5.0+, dan gempa yang dirasakan warga.
          </p>
        </div>

        {/* Tab Switcher Layer */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl text-xs font-bold self-start sm:self-auto">
          <button
            onClick={() => setActiveLayer('ALL')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              activeLayer === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Semua ({recentQuakes.length + feltQuakes.length})
          </button>
          <button
            onClick={() => setActiveLayer('M5')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
              activeLayer === 'M5' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
            M 5.0+ ({recentQuakes.length})
          </button>
          <button
            onClick={() => setActiveLayer('DIRASAKAN')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
              activeLayer === 'DIRASAKAN' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span>
            Dirasakan ({feltQuakes.length})
          </button>
        </div>
      </div>

      {/* Grid Split View: Peta (Kiri) & Live Feed (Kanan) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Kolom Peta Leaflet (8 Kolom) */}
        <div className="lg:col-span-8 relative">
          <div 
            ref={mapContainerRef} 
            className="w-full h-[460px] rounded-2xl overflow-hidden border border-slate-200/80 shadow-inner z-10"
          ></div>

          {/* Legenda Peta Terapung di Pojok Bawah */}
          <div className="absolute bottom-4 right-4 z-20 bg-white/95 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-slate-200 shadow-lg text-[11px] font-semibold text-slate-700 space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Legenda Peta</span>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-600 border border-white shadow-xs"></span>
              <span>Episentrum Utama Terkini</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500 border border-white shadow-xs"></span>
              <span>Gempa Signifikan M 5.0+</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-600 border border-white shadow-xs"></span>
              <span>Gempa Dirasakan Warga (MMI)</span>
            </div>
          </div>
        </div>

        {/* Kolom Live Earthquake Feed (4 Kolom) */}
        <div className="lg:col-span-4 flex flex-col h-[460px]">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-blue-600" />
              Daftar Rekaman Seismik
            </span>
            <span className="text-[10px] text-slate-400 font-medium">Klik untuk pusatkan peta</span>
          </div>

          <div className="overflow-y-auto space-y-2 flex-1 pr-1">
            {combinedFeed.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Tidak ada data rekaman gempa.
              </div>
            ) : (
              combinedFeed.map((q, idx) => {
                const isSelected = selectedQuakeFocus === (q.gempa_id || q.tanggal_jam);
                const isFelt = !!q.dirasakan;

                return (
                  <div
                    key={idx}
                    onClick={() => handleFocusQuake(q)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                      isSelected
                        ? 'bg-blue-50/80 border-blue-400 shadow-sm'
                        : 'bg-slate-50/70 hover:bg-white hover:border-slate-300 border-slate-200/70'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                          isFelt 
                            ? 'bg-purple-100 text-purple-800' 
                            : 'bg-orange-100 text-orange-800'
                        }`}>
                          {isFelt ? 'Dirasakan' : 'M 5.0+'}
                        </span>
                        <span className="text-[10px] text-slate-400 truncate">{q.tanggal_jam}</span>
                      </div>

                      <h5 className="font-bold text-slate-800 text-xs truncate" title={q.wilayah}>
                        {q.wilayah}
                      </h5>

                      <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-1">
                        <span>Kedalaman: <strong>{q.kedalaman}</strong></span>
                        {q.dirasakan && (
                          <span className="text-purple-700 font-semibold truncate max-w-[120px]">
                            MMI: {q.dirasakan}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Magnitudo Badge */}
                    <div className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center font-black text-white shrink-0 ${
                      isFelt ? 'bg-purple-600' : 'bg-orange-500'
                    }`}>
                      <span className="text-sm leading-none">{q.magnitude}</span>
                      <span className="text-[8px] opacity-80 mt-0.5">SR</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-400 text-center">
            Sensor Seismik BMKG Indonesia &mdash; Koordinat Otomatis TEWS
          </div>
        </div>

      </div>

    </div>
  );
}

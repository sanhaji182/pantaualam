import React, { useEffect, useRef, useState } from 'react';
import { 
  Layers, Activity, MapPin, Eye, Radio, Info, Search, 
  Filter, Moon, Sun, Mountain, Volume2, Sparkles, Navigation, Globe 
} from 'lucide-react';
import { playSound } from '../utils/audio';

/**
 * =============================================================================
 * KOMPONEN: PETA INTERAKTIF SEISMOLOGI DENGAN LIVE FEED SPLIT VIEW (Leaflet)
 * File: src/components/EarthquakeMap.jsx
 * Deskripsi:
 * Menggabungkan visualisasi geospatial titik episentrum gempa bumi di peta
 * interaktif Leaflet dengan panel Feed Gempa Terbaru di sisi kanan.
 * Dilengkapi dengan 4 Mode Peta (Terang Voyager / Radar Gelap / Topografi Relief / Citra Satelit),
 * filter magnitudo, pencarian wilayah, dan auto-flyTo kamera dengan popup aktif.
 * =============================================================================
 */
export default function EarthquakeMap({ latestQuake, recentQuakes = [], feltQuakes = [] }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const markersRef = useRef({});

  const [mapStyle, setMapStyle] = useState('VOYAGER'); // 'VOYAGER', 'DARK', 'TOPO', 'SATELLITE'
  const [activeLayer, setActiveLayer] = useState('ALL'); // 'ALL', 'M5', 'DIRASAKAN'
  const [magFilter, setMagFilter] = useState('ALL'); // 'ALL', 'M4', 'M5', 'M6'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedQuakeFocus, setSelectedQuakeFocus] = useState(null);

  // Ambil API key CARTO opsional dari environment (jika diset, watermark otomatis hilang)
  const cartoApiKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_CARTO_API_KEY)
    ? `?key=${import.meta.env.VITE_CARTO_API_KEY}`
    : '';

  // Konfigurasi basemap presisi dengan garis pantai dan batas wilayah yang rapi
  const TILE_CONFIGS = {
    VOYAGER: {
      url: `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png${cartoApiKey}`,
      attrib: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
      maxZoom: 19,
      subdomains: 'abcd'
    },
    DARK: {
      url: `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png${cartoApiKey}`,
      attrib: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
      maxZoom: 19,
      subdomains: 'abcd'
    },
    TOPO: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
      attrib: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
      maxZoom: 17,
      subdomains: ''
    },
    SATELLITE: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attrib: 'Tiles &copy; Esri &mdash; Earthstar Geographics',
      maxZoom: 18,
      subdomains: ''
    }
  };

  // 1. Inisialisasi Peta Leaflet & Tile Layer
  useEffect(() => {
    if (!window.L || !mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = window.L.map(mapContainerRef.current, {
        center: [-2.5, 118.0],
        zoom: 5,
        minZoom: 3,
        maxZoom: 13,
        scrollWheelZoom: false,
      });

      const initialCfg = TILE_CONFIGS[mapStyle];
      const initialLayer = window.L.tileLayer(initialCfg.url, {
        attribution: initialCfg.attrib,
        subdomains: initialCfg.subdomains || 'abcd',
        maxZoom: initialCfg.maxZoom || 19
      }).addTo(map);

      tileLayerRef.current = initialLayer;
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Bersihkan marker lama
    map.eachLayer((layer) => {
      if (layer instanceof window.L.CircleMarker || layer instanceof window.L.Marker) {
        map.removeLayer(layer);
      }
    });
    markersRef.current = {};

    // 1. Plot 15 Gempa M 5.0+ (Warna Oranye)
    if (activeLayer === 'ALL' || activeLayer === 'M5') {
      recentQuakes.forEach((q) => {
        const lat = parseFloat(q.latitude);
        const lon = parseFloat(q.longitude);
        const mag = parseFloat(q.magnitude) || 4.0;

        if (!isNaN(lat) && !isNaN(lon)) {
          const circle = window.L.circleMarker([lat, lon], {
            radius: Math.max(mag * 2.5, 7),
            fillColor: '#f97316',
            color: '#ffffff',
            weight: 2,
            opacity: 0.95,
            fillOpacity: 0.75,
          }).addTo(map);

          const popupContent = `
            <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4; padding: 4px; min-width: 180px;">
              <span style="background: #ea580c; color: #fff; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 9px;">GEMPA M 5.0+</span>
              <strong style="color: #0f172a; margin-top: 4px; display: block; font-size: 13px;">${q.wilayah}</strong>
              <div style="margin-top: 5px; font-size: 12px;">Magnitudo: <b style="color: #ea580c; font-size: 15px;">${q.magnitude} M</b></div>
              <div style="color: #334155;">Kedalaman: <b>${q.kedalaman}</b></div>
              <div style="color: #64748b; font-size: 11px; margin-top: 2px;">Waktu: ${q.tanggal_jam}</div>
              <div style="margin-top: 4px; color: #0284c7; font-weight: 600; font-size: 10px;">Koordinat: ${lat.toFixed(2)}°, ${lon.toFixed(2)}°</div>
            </div>
          `;
          circle.bindPopup(popupContent);

          const key = q.gempa_id || q.tanggal_jam;
          markersRef.current[key] = circle;
        }
      });
    }

    // 2. Plot 15 Gempa Dirasakan (Warna Ungu Violet)
    if (activeLayer === 'ALL' || activeLayer === 'DIRASAKAN') {
      feltQuakes.forEach((q) => {
        const lat = parseFloat(q.latitude);
        const lon = parseFloat(q.longitude);
        const mag = parseFloat(q.magnitude) || 3.5;

        if (!isNaN(lat) && !isNaN(lon)) {
          const circle = window.L.circleMarker([lat, lon], {
            radius: Math.max(mag * 2.2, 6),
            fillColor: '#8b5cf6',
            color: '#ffffff',
            weight: 2,
            opacity: 0.95,
            fillOpacity: 0.75,
          }).addTo(map);

          const popupContent = `
            <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4; padding: 4px; min-width: 180px;">
              <span style="background: #7c3aed; color: #fff; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 9px;">DIRASAKAN WARGA</span>
              <strong style="color: #0f172a; margin-top: 4px; display: block; font-size: 13px;">${q.wilayah}</strong>
              <div style="margin-top: 5px; font-size: 12px;">Magnitudo: <b style="color: #7c3aed; font-size: 15px;">${q.magnitude} M</b></div>
              <div style="color: #7c3aed; font-weight: bold;">Skala MMI: ${q.dirasakan || '-'}</div>
              <div style="color: #334155;">Kedalaman: ${q.kedalaman}</div>
              <div style="color: #64748b; font-size: 11px; margin-top: 2px;">Waktu: ${q.tanggal_jam}</div>
            </div>
          `;
          circle.bindPopup(popupContent);

          const key = q.gempa_id || q.tanggal_jam;
          markersRef.current[key] = circle;
        }
      });
    }

    // 3. Plot Gempa Terkini Utama (Episentrum Berdenyut Merah)
    if (latestQuake) {
      const lat = parseFloat(latestQuake.latitude);
      const lon = parseFloat(latestQuake.longitude);
      if (!isNaN(lat) && !isNaN(lon)) {
        const mag = parseFloat(latestQuake.magnitude) || 5.0;

        // Radius Gelombang Seismik Luar
        window.L.circleMarker([lat, lon], {
          radius: mag * 7,
          fillColor: '#ef4444',
          color: '#dc2626',
          weight: 2,
          opacity: 0.35,
          fillOpacity: 0.15,
        }).addTo(map);

        // Inti Episentrum
        const mainMarker = window.L.circleMarker([lat, lon], {
          radius: mag * 3.8,
          fillColor: '#b91c1c',
          color: '#ffffff',
          weight: 3.5,
          opacity: 1,
          fillOpacity: 0.95,
        }).addTo(map);

        mainMarker.bindPopup(`
          <div style="font-family: sans-serif; font-size: 13px; line-height: 1.4; padding: 4px; min-width: 200px;">
            <span style="background: #dc2626; color: #fff; padding: 2px 7px; border-radius: 4px; font-weight: bold; font-size: 10px;">GEMPA TERKINI BMKG</span>
            <strong style="color: #0f172a; font-size: 14px; margin-top: 4px; display: block;">${latestQuake.wilayah}</strong>
            <div style="margin-top: 5px;">Magnitudo: <b style="color: #dc2626; font-size: 17px;">${latestQuake.magnitude} SR</b></div>
            <div>Kedalaman: <b>${latestQuake.kedalaman}</b></div>
            <div style="color: #64748b; font-size: 11px;">Waktu: ${latestQuake.tanggal_jam}</div>
            <div style="color: #16a34a; font-weight: bold; margin-top: 4px; font-size: 12px;">${latestQuake.potensi || 'Tidak berpotensi tsunami'}</div>
          </div>
        `).openPopup();

        markersRef.current['MAIN'] = mainMarker;
      }
    }

  }, [latestQuake, recentQuakes, feltQuakes, activeLayer]);

  // Efek ganti basemap style (VOYAGER / DARK / TOPO)
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return;
    const map = mapInstanceRef.current;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const cfg = TILE_CONFIGS[mapStyle];
    tileLayerRef.current = window.L.tileLayer(cfg.url, {
      attribution: cfg.attrib,
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(map);

  }, [mapStyle]);

  // Handler klik gempa untuk flyTo kamera peta & buka popup
  const handleFocusQuake = (quake) => {
    playSound('click');
    const lat = parseFloat(quake.latitude);
    const lon = parseFloat(quake.longitude);
    const key = quake.gempa_id || quake.tanggal_jam;

    setSelectedQuakeFocus(key);

    if (!isNaN(lat) && !isNaN(lon) && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([lat, lon], 8, {
        duration: 1.1,
        easeLinearity: 0.25
      });

      // Buka popup marker terkait jika ada
      const marker = markersRef.current[key];
      if (marker) {
        setTimeout(() => {
          marker.openPopup();
        }, 1150);
      }
    }
  };

  // Filter daftar gempa berdasarkan magnitudo & pencarian wilayah
  const baseFeed = activeLayer === 'M5' 
    ? recentQuakes 
    : activeLayer === 'DIRASAKAN' 
      ? feltQuakes 
      : [...recentQuakes, ...feltQuakes];

  const filteredFeed = baseFeed.filter((q) => {
    const matchesSearch = (q.wilayah || '').toLowerCase().includes(searchQuery.toLowerCase());
    const mag = parseFloat(q.magnitude) || 0;

    let matchesMag = true;
    if (magFilter === 'M4') matchesMag = mag >= 4.0;
    else if (magFilter === 'M5') matchesMag = mag >= 5.0;
    else if (magFilter === 'M6') matchesMag = mag >= 6.0;

    return matchesSearch && matchesMag;
  });

  return (
    <div id="seismik" className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
      
      {/* Header & Filter Layer Tab */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg tracking-tight">
                Peta Seismologi Geospasial &amp; Live Radar Sensor BMKG
              </h3>
              <p className="text-xs text-slate-500">
                Visualisasi titik episentrum gempa utama, gempa M 5.0+, dan gempa dirasakan skala MMI.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls: Layer Filter & Basemap Switcher */}
        <div className="flex flex-wrap items-center gap-2.5">
          
          {/* Basemap Style Switcher (Terang / Gelap Radar / Topo / Satelit) */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl text-xs font-semibold">
            <button
              onClick={() => { setMapStyle('VOYAGER'); playSound('click'); }}
              className={`px-2.5 py-1 rounded-xl transition-all flex items-center gap-1 ${
                mapStyle === 'VOYAGER' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Tampilan Peta Terang Bersih (CARTO Voyager)"
            >
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline">Terang</span>
            </button>
            <button
              onClick={() => { setMapStyle('DARK'); playSound('click'); }}
              className={`px-2.5 py-1 rounded-xl transition-all flex items-center gap-1 ${
                mapStyle === 'DARK' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Tampilan Peta Radar Seismologi Malam (CARTO Dark Matter)"
            >
              <Moon className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Radar</span>
            </button>
            <button
              onClick={() => { setMapStyle('TOPO'); playSound('click'); }}
              className={`px-2.5 py-1 rounded-xl transition-all flex items-center gap-1 ${
                mapStyle === 'TOPO' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Peta Relief Topografi &amp; Palung Laut (Esri Topo)"
            >
              <Mountain className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Relief</span>
            </button>
            <button
              onClick={() => { setMapStyle('SATELLITE'); playSound('click'); }}
              className={`px-2.5 py-1 rounded-xl transition-all flex items-center gap-1 ${
                mapStyle === 'SATELLITE' ? 'bg-white text-blue-800 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Peta Citra Satelit Seismik Asli (Esri World Imagery)"
            >
              <Globe className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">Satelit</span>
            </button>
          </div>

          {/* Layer Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl text-xs font-bold">
            <button
              onClick={() => { setActiveLayer('ALL'); playSound('click'); }}
              className={`px-3 py-1 rounded-xl transition-all ${
                activeLayer === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Semua ({recentQuakes.length + feltQuakes.length})
            </button>
            <button
              onClick={() => { setActiveLayer('M5'); playSound('click'); }}
              className={`px-3 py-1 rounded-xl transition-all flex items-center gap-1.5 ${
                activeLayer === 'M5' ? 'bg-white text-orange-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-orange-500"></span>
              M 5.0+ ({recentQuakes.length})
            </button>
            <button
              onClick={() => { setActiveLayer('DIRASAKAN'); playSound('click'); }}
              className={`px-3 py-1 rounded-xl transition-all flex items-center gap-1.5 ${
                activeLayer === 'DIRASAKAN' ? 'bg-white text-purple-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-purple-600"></span>
              Dirasakan ({feltQuakes.length})
            </button>
          </div>

        </div>
      </div>

      {/* Grid Split View: Peta (Kiri) & Live Feed (Kanan) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Kolom Peta Leaflet (8 Kolom) */}
        <div className="lg:col-span-8 relative">
          <div 
            ref={mapContainerRef} 
            className="w-full h-[490px] rounded-2xl overflow-hidden border border-slate-200 shadow-inner z-10"
          ></div>

          {/* Legenda Peta Terapung di Pojok Kiri Bawah */}
          <div className="absolute bottom-4 left-4 z-20 bg-white/95 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-slate-200/90 shadow-lg text-[11px] font-semibold text-slate-700 space-y-1.5 max-w-xs">
            <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Legenda Seismik</span>
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
              <span>Gempa Dirasakan Warga (Skala MMI)</span>
            </div>
          </div>

          {/* Badge Mode Aktif di Pojok Kanan Atas */}
          <div className="absolute top-4 right-4 z-20 bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-mono px-3 py-1 rounded-xl border border-white/20 shadow-md">
            Mode Peta: {mapStyle}
          </div>
        </div>

        {/* Kolom Live Earthquake Feed (4 Kolom) */}
        <div className="lg:col-span-4 flex flex-col h-[490px] bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80">
          
          {/* Header Feed + Search Box */}
          <div className="space-y-2 pb-2.5 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-blue-600" />
                Feed Rekaman Seismik
              </span>
              <span className="text-[10px] font-medium text-slate-400">
                {filteredFeed.length} Terdeteksi
              </span>
            </div>

            {/* Input Pencarian Wilayah Gempa */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari pulau atau wilayah gempa..."
                className="w-full pl-9 pr-3 py-1.5 bg-white rounded-xl text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 placeholder-slate-400"
              />
            </div>

            {/* Filter Cepat Magnitudo */}
            <div className="flex items-center gap-1 text-[11px] font-semibold pt-1">
              <span className="text-[10px] text-slate-400 mr-1">Mag:</span>
              {[
                { id: 'ALL', label: 'Semua' },
                { id: 'M4', label: '≥ 4.0' },
                { id: 'M5', label: '≥ 5.0' },
                { id: 'M6', label: '≥ 6.0' }
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => { setMagFilter(m.id); playSound('click'); }}
                  className={`px-2 py-0.5 rounded-lg transition-all ${
                    magFilter === m.id
                      ? 'bg-slate-800 text-white font-bold'
                      : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Daftar Feed Gempa Interaktif */}
          <div className="overflow-y-auto space-y-2 flex-1 pr-1 pt-2">
            {filteredFeed.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-xs text-slate-400 p-4 text-center">
                <Info className="w-6 h-6 text-slate-300 mb-1" />
                <span>Tidak ada rekaman seismik sesuai kriteria pencarian.</span>
              </div>
            ) : (
              filteredFeed.map((q, idx) => {
                const key = q.gempa_id || q.tanggal_jam;
                const isSelected = selectedQuakeFocus === key;
                const isFelt = !!q.dirasakan;

                return (
                  <div
                    key={idx}
                    onClick={() => handleFocusQuake(q)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                      isSelected
                        ? 'bg-blue-50/90 border-blue-500 shadow-md ring-2 ring-blue-400/20'
                        : 'bg-white hover:border-slate-300 border-slate-200/80 hover:shadow-xs'
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
                          <span className="text-purple-700 font-semibold truncate max-w-[110px]">
                            MMI: {q.dirasakan}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Magnitudo Badge */}
                    <div className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center font-black text-white shrink-0 shadow-xs ${
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

          <div className="pt-2.5 border-t border-slate-200 text-[10px] text-slate-400 text-center flex items-center justify-center gap-1.5">
            <Navigation className="w-3 h-3 text-blue-500" />
            <span>Klik kartu untuk memusatkan kamera peta secara otomatis</span>
          </div>

        </div>

      </div>

    </div>
  );
}

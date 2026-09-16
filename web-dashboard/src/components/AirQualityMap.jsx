import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { 
  Wind, MapPin, Layers, Sun, Moon, Mountain, Globe, 
  Search, ShieldAlert, Sparkles, Navigation, Info, ArrowUpRight, Compass
} from 'lucide-react';
import { playSound } from '../utils/audio';
import { getCategoryBadge } from '../utils/airQuality';

/**
 * =============================================================================
 * KOMPONEN: PETA GEOSPASIAL ZONASI KUALITAS UDARA (AIR QUALITY AREA MAPPING)
 * File: src/components/AirQualityMap.jsx
 * Deskripsi:
 * Visualisasi geospasial sebaran area polusi udara partikulat PM2.5 dari 27+
 * stasiun SPKU otomatis BMKG di seluruh Indonesia.
 * 
 * Karakteristik Utama:
 * 1. Pemetaan Area Sebaran (Area Dispersion Zones):
 *    Setiap daerah digambarkan dengan lingkaran radius cakupan polusi (50 - 85 km)
 *    berwarna transparan sesuai baku mutu resmi Permen LHK / BMKG.
 * 2. Navigasi Cepat Antar Pulau (Sumatera, Jawa, Kalimantan, Sulawesi & Papua).
 * 3. Mode Peta 4 Pilihan Basemap Esri (Terang, Radar Gelap, Citra Satelit, Topografi).
 * 4. Filter Kategori Polusi & Pencarian Kota/Stasiun.
 * 5. Indikator Statistik Eksekutif (Daerah Paling Kritis vs Paling Bersih).
 * =============================================================================
 */
export default function AirQualityMap({ 
  airQualityData = [], 
  spotlightStation = null, 
  onSelectStation = null 
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const markersRef = useRef({});

  const [mapStyle, setMapStyle] = useState('STREET'); // 'STREET', 'DARK', 'SATELLITE', 'TOPO'
  const [selectedIsland, setSelectedIsland] = useState('ALL'); // 'ALL', 'SUMATERA', 'JAWA', 'KALIMANTAN', 'TIMUR'
  const [selectedCatFilter, setSelectedCatFilter] = useState('ALL'); // 'ALL', 'DANGER', 'UNHEALTHY', 'MODERATE', 'GOOD'
  const [showRadiusZones, setShowRadiusZones] = useState(true); // Toggle area zonasi
  const [searchQuery, setSearchQuery] = useState('');

  // Konfigurasi basemap 100% Gratis (Esri ArcGIS Basemaps)
  const TILE_CONFIGS = {
    STREET: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
      attrib: '&copy; Esri &mdash; World Street Map',
      maxZoom: 19
    },
    DARK: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      attrib: '&copy; Esri &mdash; Dark Canvas',
      maxZoom: 16
    },
    SATELLITE: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attrib: '&copy; Esri &mdash; World Imagery',
      maxZoom: 18
    },
    TOPO: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
      attrib: '&copy; Esri &mdash; World Topo Relief',
      maxZoom: 18
    }
  };

  // Koordinat preset pulau untuk navigasi cepat kamera
  const ISLAND_PRESETS = {
    ALL: { center: [-2.5, 118.0], zoom: 5, label: 'Seluruh Indonesia' },
    SUMATERA: { center: [-0.8, 102.5], zoom: 6, label: 'Pulau Sumatera' },
    JAWA: { center: [-7.3, 110.2], zoom: 7, label: 'Jawa & Bali' },
    KALIMANTAN: { center: [-0.6, 113.8], zoom: 6, label: 'Pulau Kalimantan' },
    TIMUR: { center: [-2.8, 126.5], zoom: 5, label: 'Sulawesi & Timur' },
  };

  // Inisialisasi peta Leaflet
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      if (mapContainerRef.current._leaflet_id) {
        mapContainerRef.current._leaflet_id = null;
      }

      const map = L.map(mapContainerRef.current, {
        center: [-2.5, 118.0],
        zoom: 5,
        minZoom: 4,
        maxZoom: 14,
        scrollWheelZoom: false,
      });

      const initialCfg = TILE_CONFIGS[mapStyle];
      const initialLayer = L.tileLayer(initialCfg.url, {
        attribution: initialCfg.attrib,
        maxZoom: initialCfg.maxZoom || 19
      }).addTo(map);

      tileLayerRef.current = initialLayer;
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Bersihkan objek lama di peta
    map.eachLayer((layer) => {
      if (layer instanceof L.CircleMarker || layer instanceof L.Marker || layer instanceof L.Circle) {
        map.removeLayer(layer);
      }
    });
    markersRef.current = {};

    // Filter stasiun yang akan dirender berdasarkan pencarian & kategori
    const visibleStations = airQualityData.filter((s) => {
      const sName = (s.stasiun || '').toLowerCase();
      const matchesSearch = sName.includes(searchQuery.toLowerCase());
      const pm25 = parseFloat(s.pm25) || 0;
      const kat = (s.kategori || '').toLowerCase();

      let matchesCategory = true;
      if (selectedCatFilter === 'DANGER') {
        matchesCategory = kat.includes('sangat tidak') || kat.includes('berbahaya') || pm25 > 150.4;
      } else if (selectedCatFilter === 'UNHEALTHY') {
        matchesCategory = (kat.includes('tidak sehat') && !kat.includes('sangat')) || (pm25 > 55.4 && pm25 <= 150.4);
      } else if (selectedCatFilter === 'MODERATE') {
        matchesCategory = kat.includes('sedang') || (pm25 > 15.4 && pm25 <= 55.4);
      } else if (selectedCatFilter === 'GOOD') {
        matchesCategory = kat.includes('baik') || pm25 <= 15.4;
      }

      return matchesSearch && matchesCategory;
    });

    // Plotting Area Mapping & Markers
    visibleStations.forEach((station) => {
      const lat = parseFloat(station.latitude);
      const lon = parseFloat(station.longitude);
      const pm25 = parseFloat(station.pm25) || 0;

      if (!isNaN(lat) && !isNaN(lon)) {
        const badge = getCategoryBadge(station.kategori, pm25);

        let color = '#059669'; // Baik
        let textColor = '#ffffff';
        let bgLight = '#ecfdf5';
        let border = '#10b981';

        if (pm25 > 250.4 || (station.kategori || '').toLowerCase().includes('berbahaya')) {
          color = '#881337'; // Berbahaya (Maroon pekat)
          textColor = '#ffffff';
          bgLight = '#fff1f2';
          border = '#be123c';
        } else if (pm25 > 150.4 || (station.kategori || '').toLowerCase().includes('sangat tidak')) {
          color = '#dc2626'; // Sangat Tidak Sehat (Merah)
          textColor = '#ffffff';
          bgLight = '#fef2f2';
          border = '#ef4444';
        } else if (pm25 > 55.4 || (station.kategori || '').toLowerCase().includes('tidak sehat')) {
          color = '#d97706'; // Tidak Sehat (Oranye/Amber)
          textColor = '#1c1917';
          bgLight = '#fffbeb';
          border = '#f59e0b';
        } else if (pm25 > 15.4 || (station.kategori || '').toLowerCase().includes('sedang')) {
          color = '#2563eb'; // Sedang (Biru)
          textColor = '#ffffff';
          bgLight = '#eff6ff';
          border = '#3b82f6';
        }

        const isAlert = pm25 > 55.4;
        const areaRadius = isAlert ? 65000 : 45000; // Radius cakupan polusi wilayah dalam meter

        // 1. Pemetaan Lingkaran Area Cakupan Polusi (Zonasi Wilayah)
        if (showRadiusZones) {
          // Halo luar atmosfer transparan
          L.circle([lat, lon], {
            radius: areaRadius * 1.5,
            fillColor: color,
            fillOpacity: isAlert ? 0.14 : 0.07,
            color: border,
            weight: 1,
            dashArray: '4, 4'
          }).addTo(map);

          // Zonasi Utama Area Polusi Daerah
          const zoneArea = L.circle([lat, lon], {
            radius: areaRadius,
            fillColor: color,
            fillOpacity: isAlert ? 0.38 : 0.24,
            color: border,
            weight: 2,
          }).addTo(map);

          zoneArea.bindTooltip(
            `<div style="font-size: 11px;"><b>Zona Wilayah: ${station.stasiun}</b><br><span style="color: ${color}; font-weight: bold;">PM2.5: ${pm25} µg/m³ (${badge.label})</span></div>`,
            { sticky: true, opacity: 0.95 }
          );

          zoneArea.on('click', () => {
            if (onSelectStation) onSelectStation(station);
            playSound('click');
          });
        }

        // 2. Custom Pill Badge Marker di Titik Tengah
        const iconHtml = `
          <div style="position: relative; display: flex; align-items: center; justify-content: center; cursor: pointer;">
            ${isAlert ? `
              <div style="position: absolute; inset: -4px; border-radius: 9999px; background: ${color}; opacity: 0.4; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            ` : ''}
            <div style="
              position: relative;
              background: ${color};
              color: ${textColor};
              padding: 3px 8px;
              border-radius: 9999px;
              font-weight: 800;
              font-size: 11px;
              border: 2px solid #ffffff;
              box-shadow: 0 3px 8px rgba(0,0,0,0.35);
              display: flex;
              align-items: center;
              gap: 4px;
              white-space: nowrap;
            ">
              <span style="font-size: 10px;">💨</span>
              <span>${station.stasiun}: <b>${pm25}</b></span>
            </div>
          </div>
        `;

        const customMarker = L.divIcon({
          className: 'custom-air-zone-marker',
          html: iconHtml,
          iconSize: [120, 26],
          iconAnchor: [60, 13],
          popupAnchor: [0, -13]
        });

        const marker = L.marker([lat, lon], { icon: customMarker }).addTo(map);

        // Konten Popup Informatif
        const popupHtml = `
          <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4; padding: 4px; min-width: 230px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 5px;">
              <span style="background: ${color}; color: ${textColor}; padding: 2px 7px; border-radius: 4px; font-weight: bold; font-size: 9px; text-transform: uppercase;">
                ${badge.label}
              </span>
              <span style="font-size: 10px; font-weight: bold; color: #64748b; background: #f1f5f9; padding: 1px 5px; border-radius: 4px;">
                Jam ${station.jam_pengamatan || 9}:00 WIB
              </span>
            </div>
            <strong style="color: #0f172a; font-size: 14px; display: block;">SPKU ${station.stasiun}</strong>
            <div style="display: flex; align-items: baseline; gap: 5px; margin-top: 6px;">
              <span style="font-size: 24px; font-weight: 900; color: ${color};">${pm25}</span>
              <span style="font-size: 11px; font-weight: 600; color: #64748b;">µg/m³ (Partikulat PM2.5)</span>
            </div>
            <div style="margin-top: 6px; padding: 6px; background: ${bgLight}; border: 1px solid ${border}40; border-radius: 6px; font-size: 11px; color: #334155;">
              <strong style="color: ${color}; font-size: 10px; text-transform: uppercase;">Panduan Kesehatan:</strong><br>
              ${badge.rec}
            </div>
            <div style="margin-top: 6px; font-size: 10px; color: #94a3b8; display: flex; justify-content: space-between;">
              <span>📍 ${lat.toFixed(2)}°, ${lon.toFixed(2)}°</span>
              <span>Radius Zonasi: ~${areaRadius / 1000} km</span>
            </div>
          </div>
        `;
        marker.bindPopup(popupHtml);

        marker.on('click', () => {
          if (onSelectStation) onSelectStation(station);
          playSound('click');
        });

        const key = `AIR_${station.id || station.stasiun}`;
        markersRef.current[key] = marker;
      }
    });

    // Pastikan container Leaflet menghitung dimensi kanvas secara presisi
    setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 200);

  }, [airQualityData, selectedCatFilter, showRadiusZones, searchQuery]);

  // Cleanup Leaflet instance saat komponen unmount untuk menghindari duplikasi map container
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Efek ganti basemap
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const cfg = TILE_CONFIGS[mapStyle];
    tileLayerRef.current = L.tileLayer(cfg.url, {
      attribution: cfg.attrib,
      maxZoom: cfg.maxZoom || 19
    }).addTo(map);

  }, [mapStyle]);

  // Efek zoom cepat antar pulau
  const handleIslandChange = (islandKey) => {
    setSelectedIsland(islandKey);
    playSound('click');
    const target = ISLAND_PRESETS[islandKey];
    if (target && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(target.center, target.zoom, {
        duration: 1.2,
        easeLinearity: 0.25
      });
    }
  };

  // Efek ketika spotlightStation berubah dari luar komponen
  useEffect(() => {
    if (!spotlightStation || !mapInstanceRef.current) return;
    const lat = parseFloat(spotlightStation.latitude);
    const lon = parseFloat(spotlightStation.longitude);
    if (!isNaN(lat) && !isNaN(lon)) {
      mapInstanceRef.current.flyTo([lat, lon], 8, {
        duration: 1.1,
        easeLinearity: 0.25
      });

      const key = `AIR_${spotlightStation.id || spotlightStation.stasiun}`;
      const marker = markersRef.current[key];
      if (marker) {
        setTimeout(() => {
          marker.openPopup();
        }, 1150);
      }
    }
  }, [spotlightStation]);

  // Kalkulasi statistik cepat
  const sortedByPollution = [...airQualityData].sort((a, b) => (b.pm25 || 0) - (a.pm25 || 0));
  const mostPolluted = sortedByPollution[0];
  const cleanest = sortedByPollution[sortedByPollution.length - 1];
  const avgPm25 = airQualityData.length > 0 
    ? (airQualityData.reduce((acc, curr) => acc + (parseFloat(curr.pm25) || 0), 0) / airQualityData.length).toFixed(1)
    : '0';

  return (
    <div id="air-quality-map" className="bg-slate-900 rounded-3xl p-5 text-white border border-slate-800 shadow-xl space-y-4">
      
      {/* Header Bar Peta Kualitas Udara */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Wind className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-white text-base tracking-tight">
                  Peta Pemetaan Zonasi Kualitas Udara &amp; Partikulat PM2.5
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                  {airQualityData.length} Stasiun SPKU
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Visualisasi spasial zonasi area cakupan polusi udara (radius 50&ndash;85 km) berdasarkan stasiun otomatis BMKG.
              </p>
            </div>
          </div>
        </div>

        {/* Kontrol Pilihan Basemap */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Toggle Zonasi Radius Area */}
          <button
            onClick={() => { setShowRadiusZones(!showRadiusZones); playSound('click'); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
              showRadiusZones 
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm' 
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
            title="Tampilkan atau sembunyikan lingkaran radius zonasi wilayah"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{showRadiusZones ? 'Zonasi Area: AKTIF' : 'Zonasi Area: NONAKTIF'}</span>
          </button>

          {/* Basemap Switcher */}
          <div className="flex items-center gap-1 bg-slate-800/90 p-1 rounded-2xl border border-slate-700 text-xs font-semibold">
            <button
              onClick={() => { setMapStyle('STREET'); playSound('click'); }}
              className={`px-2.5 py-1 rounded-xl transition-all flex items-center gap-1 ${
                mapStyle === 'STREET' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
              title="Peta Terang Esri World Street"
            >
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline">Terang</span>
            </button>
            <button
              onClick={() => { setMapStyle('DARK'); playSound('click'); }}
              className={`px-2.5 py-1 rounded-xl transition-all flex items-center gap-1 ${
                mapStyle === 'DARK' ? 'bg-slate-950 text-white font-bold border border-slate-600 shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
              title="Peta Radar Gelap Esri Dark Canvas"
            >
              <Moon className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Radar</span>
            </button>
            <button
              onClick={() => { setMapStyle('SATELLITE'); playSound('click'); }}
              className={`px-2.5 py-1 rounded-xl transition-all flex items-center gap-1 ${
                mapStyle === 'SATELLITE' ? 'bg-blue-600 text-white font-bold shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
              title="Peta Citra Satelit Esri World Imagery"
            >
              <Globe className="w-3.5 h-3.5 text-cyan-300" />
              <span className="hidden sm:inline">Satelit</span>
            </button>
            <button
              onClick={() => { setMapStyle('TOPO'); playSound('click'); }}
              className={`px-2.5 py-1 rounded-xl transition-all flex items-center gap-1 ${
                mapStyle === 'TOPO' ? 'bg-emerald-700 text-white font-bold shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
              title="Peta Relief Topografi"
            >
              <Mountain className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Relief</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigasi Cepat Antar Pulau & Filter Kategori */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-800/50 p-2 rounded-2xl border border-slate-800">
        
        {/* Preset Pulau */}
        <div className="flex flex-wrap items-center gap-1 text-xs font-bold">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider mr-1 hidden sm:inline">Fokus Pulau:</span>
          {[
            { id: 'ALL', label: 'Seluruh RI' },
            { id: 'SUMATERA', label: 'Sumatera' },
            { id: 'JAWA', label: 'Jawa & Bali' },
            { id: 'KALIMANTAN', label: 'Kalimantan' },
            { id: 'TIMUR', label: 'Sulawesi & Timur' },
          ].map((isl) => (
            <button
              key={isl.id}
              onClick={() => handleIslandChange(isl.id)}
              className={`px-2.5 py-1 rounded-xl text-xs transition-all ${
                selectedIsland === isl.id
                  ? 'bg-emerald-600 text-white font-bold shadow-xs'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {isl.label}
            </button>
          ))}
        </div>

        {/* Filter Kategori Bahaya */}
        <div className="flex items-center gap-1 text-xs">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider mr-1 hidden sm:inline">Status:</span>
          {[
            { id: 'ALL', label: 'Semua' },
            { id: 'DANGER', label: 'Waspada/Bahaya', color: 'text-red-400' },
            { id: 'UNHEALTHY', label: 'Tdk Sehat', color: 'text-amber-400' },
            { id: 'MODERATE', label: 'Sedang', color: 'text-blue-400' },
            { id: 'GOOD', label: 'Baik', color: 'text-emerald-400' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => { setSelectedCatFilter(cat.id); playSound('click'); }}
              className={`px-2 py-1 rounded-xl text-xs transition-all ${
                selectedCatFilter === cat.id
                  ? 'bg-white text-slate-950 font-black shadow-xs'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <span className={cat.color}>{cat.label}</span>
            </button>
          ))}
        </div>

      </div>

      {/* Kontainer Peta Leaflet & Legenda */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-700 shadow-inner">
        <div 
          ref={mapContainerRef} 
          className="w-full h-[480px] z-10"
          style={{ height: '480px', width: '100%' }}
        ></div>

        {/* Legenda Zonasi Area Berwarna di Kiri Bawah */}
        <div className="absolute bottom-4 left-4 z-20 bg-slate-900/90 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-slate-700/80 shadow-2xl text-[11px] font-semibold text-slate-200 space-y-1.5 max-w-xs">
          <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">
            Legenda Zonasi Area Polusi (PM2.5)
          </span>
          <div className="grid grid-cols-1 gap-1 text-[10px]">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-950 border border-red-500 shadow-xs"></span>
              <span><strong>Berbahaya</strong> (&gt; 250 µg/m³)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-600 border border-white shadow-xs"></span>
              <span><strong>Sangat Tidak Sehat</strong> (150&ndash;250)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500 border border-white shadow-xs"></span>
              <span><strong>Tidak Sehat</strong> (55&ndash;150)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-600 border border-white shadow-xs"></span>
              <span><strong>Sedang</strong> (15&ndash;55)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-600 border border-white shadow-xs"></span>
              <span><strong>Baik &amp; Segar</strong> (&le; 15)</span>
            </div>
          </div>
        </div>

        {/* Executive Quick Stats Banner di Kanan Atas Peta */}
        <div className="absolute top-4 right-4 z-20 hidden md:flex flex-col gap-2 max-w-xs">
          {mostPolluted && (
            <div 
              onClick={() => {
                if (onSelectStation) onSelectStation(mostPolluted);
                playSound('click');
              }}
              className="bg-red-950/85 backdrop-blur-md border border-red-500/40 p-2.5 rounded-2xl cursor-pointer hover:bg-red-900/90 transition-all shadow-lg"
            >
              <div className="flex items-center justify-between text-[10px] text-red-300 font-bold uppercase tracking-wider mb-1">
                <span>Zona Paling Kritis</span>
                <span className="bg-red-600 text-white px-1.5 py-0.2 rounded font-mono">BERBAHAYA</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-black text-white">{mostPolluted.stasiun}</span>
                <span className="text-sm font-black text-red-400 font-mono">{mostPolluted.pm25} µg/m³</span>
              </div>
            </div>
          )}

          {cleanest && (
            <div 
              onClick={() => {
                if (onSelectStation) onSelectStation(cleanest);
                playSound('click');
              }}
              className="bg-emerald-950/85 backdrop-blur-md border border-emerald-500/40 p-2.5 rounded-2xl cursor-pointer hover:bg-emerald-900/90 transition-all shadow-lg"
            >
              <div className="flex items-center justify-between text-[10px] text-emerald-300 font-bold uppercase tracking-wider mb-1">
                <span>Zona Paling Bersih</span>
                <span className="bg-emerald-600 text-white px-1.5 py-0.2 rounded font-mono">BAIK</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-black text-white">{cleanest.stasiun}</span>
                <span className="text-sm font-black text-emerald-400 font-mono">{cleanest.pm25} µg/m³</span>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Footer Peta: Tips & Rata-Rata */}
      <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 pt-1 gap-2">
        <div className="flex items-center gap-1.5">
          <Navigation className="w-3.5 h-3.5 text-emerald-400" />
          <span>Klik salah satu lingkaran zonasi daerah untuk membuka rekomendasi kesehatan dan memusatkan radar.</span>
        </div>
        <div className="font-mono text-slate-300 bg-slate-800 px-3 py-1 rounded-xl border border-slate-700">
          Rata-rata Nasional: <strong className="text-emerald-400">{avgPm25} µg/m³</strong>
        </div>
      </div>

    </div>
  );
}

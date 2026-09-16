import React, { useEffect, useRef, useState } from 'react';
import { 
  Layers, Activity, MapPin, Eye, Radio, Info, Search, 
  Filter, Moon, Sun, Mountain, Volume2, Sparkles, Navigation, Globe, Flame, Wind 
} from 'lucide-react';
import { playSound } from '../utils/audio';
import { getCategoryBadge } from './AirQualitySection';

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
export default function EarthquakeMap({ 
  latestQuake, 
  recentQuakes = [], 
  feltQuakes = [], 
  volcanoes = [], 
  focusedVolcano = null,
  airQualityData = [],
  focusedAirStation = null
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const markersRef = useRef({});

  const [mapStyle, setMapStyle] = useState('STREET'); // 'STREET', 'DARK', 'TOPO', 'SATELLITE'
  const [activeLayer, setActiveLayer] = useState('ALL'); // 'ALL', 'M5', 'DIRASAKAN'
  const [showVolcanoLayer, setShowVolcanoLayer] = useState(true); // Toggle layer gunung api PVMBG
  const [showAirQualityLayer, setShowAirQualityLayer] = useState(true); // Toggle layer kualitas udara SPKU PM2.5 BMKG
  const [feedTab, setFeedTab] = useState('QUAKE'); // 'QUAKE' atau 'AIR'
  const [magFilter, setMagFilter] = useState('ALL'); // 'ALL', 'M4', 'M5', 'M6'
  const [airCategoryFilter, setAirCategoryFilter] = useState('ALL'); // 'ALL', 'BAIK', 'SEDANG', 'TIDAK_SEHAT', 'BERBAHAYA'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedQuakeFocus, setSelectedQuakeFocus] = useState(null);
  const [selectedAirStationFocus, setSelectedAirStationFocus] = useState(null);

  // Konfigurasi basemap 100% GRATIS & Bebas API Key / Tanpa Watermark (Esri ArcGIS Suite)
  const TILE_CONFIGS = {
    STREET: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
      attrib: '&copy; <a href="https://www.esri.com/">Esri</a> &mdash; World Street Map',
      maxZoom: 19,
      subdomains: ''
    },
    DARK: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      attrib: '&copy; <a href="https://www.esri.com/">Esri</a> &mdash; Dark Canvas',
      maxZoom: 16,
      subdomains: ''
    },
    TOPO: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
      attrib: '&copy; <a href="https://www.esri.com/">Esri</a> &mdash; World Topo Relief',
      maxZoom: 18,
      subdomains: ''
    },
    SATELLITE: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attrib: '&copy; <a href="https://www.esri.com/">Esri</a> &mdash; World Imagery',
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

    // 4. Plot Titik Gunung Api Aktif (PVMBG / MAGMA ESDM)
    if (showVolcanoLayer && volcanoes && volcanoes.length > 0) {
      volcanoes.forEach((v) => {
        const lat = parseFloat(v.latitude);
        const lon = parseFloat(v.longitude);
        if (!isNaN(lat) && !isNaN(lon)) {
          const lvl = parseInt(v.level_angka, 10) || 1;
          const color = lvl === 4 ? '#dc2626' : lvl === 3 ? '#ea580c' : lvl === 2 ? '#d97706' : '#059669';
          const bgLight = lvl === 4 ? '#fef2f2' : lvl === 3 ? '#fff7ed' : lvl === 2 ? '#fffbeb' : '#ecfdf5';
          const border = lvl === 4 ? '#ef4444' : lvl === 3 ? '#f97316' : lvl === 2 ? '#f59e0b' : '#10b981';

          // Custom DivIcon marker dengan emoji gunung & indikator denyut
          const iconHtml = `
            <div style="position: relative; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
              <div style="position: absolute; inset: 0; border-radius: 50%; background: ${color}; opacity: ${lvl >= 3 ? 0.4 : 0.18}; ${lvl >= 3 ? 'animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;' : ''}"></div>
              <div style="position: relative; width: 24px; height: 24px; border-radius: 50%; background: ${color}; border: 2px solid #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 12px;">
                🌋
              </div>
            </div>
          `;

          const customIcon = window.L.divIcon({
            className: 'custom-volcano-marker',
            html: iconHtml,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
            popupAnchor: [0, -14],
          });

          const vMarker = window.L.marker([lat, lon], { icon: customIcon }).addTo(map);

          const popupHtml = `
            <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4; padding: 4px; min-width: 210px;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
                <span style="background: ${color}; color: #ffffff; padding: 2px 7px; border-radius: 4px; font-weight: bold; font-size: 9px; text-transform: uppercase;">
                  ${v.level_aktivitas || 'LEVEL ' + lvl}
                </span>
                <span style="font-size: 11px; font-weight: bold; color: #475569; background: #f1f5f9; padding: 1px 5px; border-radius: 4px;">
                  ${v.tinggi_meter ? v.tinggi_meter + ' mdpl' : 'Aktif'}
                </span>
              </div>
              <strong style="color: #0f172a; font-size: 14px; display: block;">Gunung ${v.nama}</strong>
              <div style="color: #64748b; font-size: 11px; margin-top: 2px;">📍 ${v.provinsi}</div>
              <div style="margin-top: 6px; padding: 6px; background: ${bgLight}; border: 1px solid ${border}40; border-radius: 6px; font-size: 11px; color: #334155;">
                <strong style="color: ${color}; font-size: 10px; text-transform: uppercase;">Rekomendasi PVMBG:</strong><br>
                ${v.rekomendasi || 'Tetap waspada dan patuhi batas jarak aman kawah aktif.'}
              </div>
              <div style="margin-top: 5px; font-size: 10px; color: #94a3b8;">
                Koordinat: ${lat.toFixed(2)}°, ${lon.toFixed(2)}°
              </div>
            </div>
          `;
          vMarker.bindPopup(popupHtml);

          const key = `VOLCANO_${v.id || v.nama}`;
          markersRef.current[key] = vMarker;
        }
      });
    }

    // 5. Plot Stasiun Kualitas Udara SPKU BMKG (Partikulat PM2.5)
    if (showAirQualityLayer && airQualityData && airQualityData.length > 0) {
      airQualityData.forEach((station) => {
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

          const isHighPollution = pm25 > 55.4;

          // Custom DivIcon marker dengan nilai PM2.5 dan icon angin
          const iconHtml = `
            <div style="position: relative; display: flex; align-items: center; justify-content: center; cursor: pointer;">
              ${isHighPollution ? `
                <div style="position: absolute; inset: -4px; border-radius: 9999px; background: ${color}; opacity: 0.35; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
              ` : ''}
              <div style="
                position: relative;
                background: ${color};
                color: ${textColor};
                padding: 2px 7px;
                border-radius: 9999px;
                font-weight: 800;
                font-size: 11px;
                border: 2px solid #ffffff;
                box-shadow: 0 3px 8px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                gap: 3px;
                white-space: nowrap;
              ">
                <span style="font-size: 10px;">💨</span>
                <span>${pm25}</span>
              </div>
            </div>
          `;

          const airIcon = window.L.divIcon({
            className: 'custom-air-marker',
            html: iconHtml,
            iconSize: [60, 24],
            iconAnchor: [30, 12],
            popupAnchor: [0, -12],
          });

          const airMarker = window.L.marker([lat, lon], { icon: airIcon }).addTo(map);

          const popupHtml = `
            <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4; padding: 4px; min-width: 220px;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
                <span style="background: ${color}; color: ${textColor}; padding: 2px 7px; border-radius: 4px; font-weight: bold; font-size: 9px; text-transform: uppercase;">
                  ${badge.label}
                </span>
                <span style="font-size: 10px; font-weight: bold; color: #64748b; background: #f1f5f9; padding: 1px 5px; border-radius: 4px;">
                  Jam ${station.jam_pengamatan || 9}:00 WIB
                </span>
              </div>
              <strong style="color: #0f172a; font-size: 14px; display: block;">SPKU ${station.stasiun}</strong>
              <div style="display: flex; align-items: baseline; gap: 5px; margin-top: 6px;">
                <span style="font-size: 22px; font-weight: 900; color: ${color};">${pm25}</span>
                <span style="font-size: 11px; font-weight: 600; color: #64748b;">µg/m³ (PM2.5)</span>
              </div>
              <div style="margin-top: 6px; padding: 6px; background: ${bgLight}; border: 1px solid ${border}40; border-radius: 6px; font-size: 11px; color: #334155;">
                <strong style="color: ${color}; font-size: 10px; text-transform: uppercase;">Saran Kesehatan:</strong><br>
                ${badge.rec}
              </div>
              <div style="margin-top: 5px; font-size: 10px; color: #94a3b8; display: flex; justify-content: space-between;">
                <span>📍 ${lat.toFixed(2)}°, ${lon.toFixed(2)}°</span>
                <span>BMKG SPKU</span>
              </div>
            </div>
          `;
          airMarker.bindPopup(popupHtml);

          const key = `AIR_${station.id || station.stasiun}`;
          markersRef.current[key] = airMarker;
        }
      });
    }

  }, [latestQuake, recentQuakes, feltQuakes, activeLayer, showVolcanoLayer, volcanoes, showAirQualityLayer, airQualityData]);

  // Efek flyTo kamera saat stasiun kualitas udara dipilih dari section atau feed
  useEffect(() => {
    if (!focusedAirStation || !mapInstanceRef.current || !window.L) return;
    const lat = parseFloat(focusedAirStation.latitude);
    const lon = parseFloat(focusedAirStation.longitude);
    if (!isNaN(lat) && !isNaN(lon)) {
      setFeedTab('AIR');
      setShowAirQualityLayer(true);
      mapInstanceRef.current.flyTo([lat, lon], 9, {
        duration: 1.2,
        easeLinearity: 0.25
      });

      const key = `AIR_${focusedAirStation.id || focusedAirStation.stasiun}`;
      setSelectedAirStationFocus(key);
      const marker = markersRef.current[key];
      if (marker) {
        setTimeout(() => {
          marker.openPopup();
        }, 1250);
      }
    }
  }, [focusedAirStation]);

  // Efek flyTo kamera saat gunung api dipilih dari section atau kartu
  useEffect(() => {
    if (!focusedVolcano || !mapInstanceRef.current || !window.L) return;
    const lat = parseFloat(focusedVolcano.latitude);
    const lon = parseFloat(focusedVolcano.longitude);
    if (!isNaN(lat) && !isNaN(lon)) {
      mapInstanceRef.current.flyTo([lat, lon], 9, {
        duration: 1.2,
        easeLinearity: 0.25
      });

      const key = `VOLCANO_${focusedVolcano.id || focusedVolcano.nama}`;
      const marker = markersRef.current[key];
      if (marker) {
        setTimeout(() => {
          marker.openPopup();
        }, 1250);
      }
    }
  }, [focusedVolcano]);

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

  // Handler klik stasiun kualitas udara untuk flyTo kamera peta & buka popup
  const handleFocusAirStation = (station) => {
    playSound('click');
    const lat = parseFloat(station.latitude);
    const lon = parseFloat(station.longitude);
    const key = `AIR_${station.id || station.stasiun}`;

    setSelectedAirStationFocus(key);

    if (!isNaN(lat) && !isNaN(lon) && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([lat, lon], 9, {
        duration: 1.1,
        easeLinearity: 0.25
      });

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

  // Filter daftar stasiun kualitas udara berdasarkan pencarian & kategori
  const filteredAirFeed = (airQualityData || []).filter((s) => {
    const matchesSearch = (s.stasiun || '').toLowerCase().includes(searchQuery.toLowerCase());
    const kat = (s.kategori || '').toLowerCase();
    const pm25 = parseFloat(s.pm25) || 0;

    let matchesCategory = true;
    if (airCategoryFilter === 'BAIK') {
      matchesCategory = kat.includes('baik') || pm25 <= 15.4;
    } else if (airCategoryFilter === 'SEDANG') {
      matchesCategory = kat.includes('sedang') || (pm25 > 15.4 && pm25 <= 55.4);
    } else if (airCategoryFilter === 'TIDAK_SEHAT') {
      matchesCategory = (kat.includes('tidak sehat') && !kat.includes('sangat')) || (pm25 > 55.4 && pm25 <= 150.4);
    } else if (airCategoryFilter === 'BERBAHAYA') {
      matchesCategory = kat.includes('sangat tidak') || kat.includes('berbahaya') || pm25 > 150.4;
    }

    return matchesSearch && matchesCategory;
  }).sort((a, b) => (parseFloat(b.pm25) || 0) - (parseFloat(a.pm25) || 0));

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
                Peta Geospasial Multi-Sensor: Seismik, Vulkanik &amp; Kualitas Udara
              </h3>
              <p className="text-xs text-slate-500">
                Visualisasi terpadu titik gempa bumi BMKG, 68+ gunung api PVMBG, dan 26+ stasiun SPKU pemantau PM2.5.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls: Layer Filter & Basemap Switcher */}
        <div className="flex flex-wrap items-center gap-2.5">
          
          {/* Basemap Style Switcher (Terang / Gelap Radar / Topo / Satelit) */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl text-xs font-semibold">
            <button
              onClick={() => { setMapStyle('STREET'); playSound('click'); }}
              className={`px-2.5 py-1 rounded-xl transition-all flex items-center gap-1 ${
                mapStyle === 'STREET' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Tampilan Peta Terang Bersih Bebas Watermark (Esri World Street Map)"
            >
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline">Terang</span>
            </button>
            <button
              onClick={() => { setMapStyle('DARK'); playSound('click'); }}
              className={`px-2.5 py-1 rounded-xl transition-all flex items-center gap-1 ${
                mapStyle === 'DARK' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Tampilan Peta Radar Seismologi Malam Bebas Watermark (Esri Dark Canvas)"
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
          <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-2xl text-xs font-bold">
            <button
              onClick={() => { setActiveLayer('ALL'); playSound('click'); }}
              className={`px-3 py-1 rounded-xl transition-all ${
                activeLayer === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Semua Gempa ({recentQuakes.length + feltQuakes.length})
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

            {volcanoes && volcanoes.length > 0 && (
              <button
                onClick={() => { setShowVolcanoLayer(!showVolcanoLayer); playSound('click'); }}
                className={`px-3 py-1 rounded-xl transition-all flex items-center gap-1.5 ${
                  showVolcanoLayer
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Tampilkan / Sembunyikan titik Gunung Api aktif PVMBG"
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Gunung Api ({volcanoes.length})</span>
              </button>
            )}

            {airQualityData && airQualityData.length > 0 && (
              <button
                onClick={() => { setShowAirQualityLayer(!showAirQualityLayer); playSound('click'); }}
                className={`px-3 py-1 rounded-xl transition-all flex items-center gap-1.5 ${
                  showAirQualityLayer
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Tampilkan / Sembunyikan pemetaan Kualitas Udara SPKU BMKG"
              >
                <Wind className="w-3.5 h-3.5" />
                <span>Udara PM2.5 ({airQualityData.length})</span>
              </button>
            )}
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
            <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Legenda Multi-Sensor</span>
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
              <span>Dirasakan oleh Warga</span>
            </div>
            {showVolcanoLayer && (
              <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60 text-orange-950 font-bold">
                <span className="text-[12px]">🌋</span>
                <span>Gunung Api Aktif PVMBG</span>
              </div>
            )}
            {showAirQualityLayer && (
              <div className="pt-1.5 border-t border-slate-200/60 space-y-1">
                <span className="text-[9px] font-bold text-emerald-800 block uppercase tracking-wider flex items-center gap-1">
                  <Wind className="w-3 h-3 text-emerald-600" /> Kualitas Udara PM2.5
                </span>
                <div className="flex flex-wrap items-center gap-1 text-[9px] font-mono">
                  <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white font-bold">&le;15 Baik</span>
                  <span className="px-1.5 py-0.5 rounded bg-blue-600 text-white font-bold">15-55 Sedang</span>
                  <span className="px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-bold">55-150 Tdk Sehat</span>
                  <span className="px-1.5 py-0.5 rounded bg-red-600 text-white font-bold">150-250 Sangat</span>
                  <span className="px-1.5 py-0.5 rounded bg-rose-950 text-white font-bold">&gt;250 Bahaya</span>
                </div>
              </div>
            )}
          </div>

          {/* Badge Mode Aktif di Pojok Kanan Atas */}
          <div className="absolute top-4 right-4 z-20 bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-mono px-3 py-1 rounded-xl border border-white/20 shadow-md">
            Mode Peta: {mapStyle}
          </div>
        </div>

        {/* Kolom Live Multi-Sensor Feed (4 Kolom) */}
        <div className="lg:col-span-4 flex flex-col h-[490px] bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80">
          
          {/* Feed Mode Switcher Tab */}
          <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-xl text-xs font-bold mb-2.5">
            <button
              onClick={() => { setFeedTab('QUAKE'); playSound('click'); }}
              className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                feedTab === 'QUAKE' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Radio className="w-3.5 h-3.5 text-blue-600" />
              <span>Gempa ({filteredFeed.length})</span>
            </button>
            <button
              onClick={() => { setFeedTab('AIR'); playSound('click'); }}
              className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                feedTab === 'AIR' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Wind className="w-3.5 h-3.5" />
              <span>Udara PM2.5 ({filteredAirFeed.length})</span>
            </button>
          </div>

          {/* Header Feed + Search Box */}
          <div className="space-y-2 pb-2.5 border-b border-slate-200">
            {/* Input Pencarian */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={feedTab === 'QUAKE' ? "Cari pulau atau wilayah gempa..." : "Cari stasiun SPKU atau kota..."}
                className="w-full pl-9 pr-3 py-1.5 bg-white rounded-xl text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 placeholder-slate-400"
              />
            </div>

            {/* Filter Cepat Sesuai Tab */}
            {feedTab === 'QUAKE' ? (
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
            ) : (
              <div className="flex items-center gap-1 text-[11px] font-semibold pt-1 overflow-x-auto no-scrollbar">
                <span className="text-[10px] text-slate-400 mr-1">Baku Mutu:</span>
                {[
                  { id: 'ALL', label: 'Semua' },
                  { id: 'BAIK', label: 'Baik' },
                  { id: 'SEDANG', label: 'Sedang' },
                  { id: 'TIDAK_SEHAT', label: 'Tdk Sehat' },
                  { id: 'BERBAHAYA', label: 'Waspada' }
                ].map((c) => (
                  <button
                    key={c.id}
                    onClick={() => { setAirCategoryFilter(c.id); playSound('click'); }}
                    className={`px-2 py-0.5 rounded-lg transition-all whitespace-nowrap text-[10px] ${
                      airCategoryFilter === c.id
                        ? 'bg-emerald-700 text-white font-bold'
                        : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Daftar Feed Sesuai Tab Aktif */}
          <div className="overflow-y-auto space-y-2 flex-1 pr-1 pt-2">
            {feedTab === 'QUAKE' ? (
              filteredFeed.length === 0 ? (
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
              )
            ) : (
              /* Feed Udara SPKU PM2.5 */
              filteredAirFeed.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-xs text-slate-400 p-4 text-center">
                  <Info className="w-6 h-6 text-slate-300 mb-1" />
                  <span>Tidak ada stasiun SPKU sesuai kriteria pencarian.</span>
                </div>
              ) : (
                filteredAirFeed.map((s, idx) => {
                  const key = `AIR_${s.id || s.stasiun}`;
                  const isSelected = selectedAirStationFocus === key;
                  const pm25 = parseFloat(s.pm25) || 0;
                  const badge = getCategoryBadge(s.kategori, pm25);

                  return (
                    <div
                      key={idx}
                      onClick={() => handleFocusAirStation(s)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                        isSelected
                          ? 'bg-emerald-50/90 border-emerald-500 shadow-md ring-2 ring-emerald-400/20'
                          : 'bg-white hover:border-slate-300 border-slate-200/80 hover:shadow-xs'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${badge.badgeBg}`}>
                            {badge.label}
                          </span>
                          <span className="text-[10px] text-slate-400">Jam {s.jam_pengamatan || 9}:00 WIB</span>
                        </div>

                        <h5 className="font-bold text-slate-800 text-xs truncate" title={s.stasiun}>
                          SPKU {s.stasiun}
                        </h5>

                        <div className="text-[10px] text-slate-500 mt-1 truncate" title={badge.rec}>
                          {badge.rec}
                        </div>
                      </div>

                      {/* PM2.5 Value Badge */}
                      <div className="flex flex-col items-end justify-center shrink-0">
                        <span className="text-base font-black text-slate-900 leading-none">{pm25}</span>
                        <span className="text-[9px] font-bold text-slate-400 mt-0.5">µg/m³</span>
                      </div>
                    </div>
                  );
                })
              )
            )}
          </div>

          <div className="pt-2.5 border-t border-slate-200 text-[10px] text-slate-400 text-center flex items-center justify-center gap-1.5">
            <Navigation className="w-3 h-3 text-blue-500" />
            <span>Klik stasiun atau gempa untuk memusatkan kamera peta secara otomatis</span>
          </div>

        </div>

      </div>

    </div>
  );
}

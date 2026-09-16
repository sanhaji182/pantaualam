import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import CommandCenterBar from './components/CommandCenterBar';
import EarthquakeBanner from './components/EarthquakeBanner';
import EarthquakeMap from './components/EarthquakeMap';
import WeatherSection from './components/WeatherSection';
import WeatherModal from './components/WeatherModal';
import WeatherAlertBar from './components/WeatherAlertBar';
import AirQualitySection from './components/AirQualitySection';
import ArchitectureModal from './components/ArchitectureModal';
import RegionSelector from './components/RegionSelector';
import VolcanoSection from './components/VolcanoSection';
import { 
  getLatestEarthquake, 
  getRecentEarthquakes, 
  getFeltEarthquakes, 
  getAllWeatherSummary, 
  getWeatherDetail, 
  getExtremeWeatherAlerts, 
  getAirQualityData,
  getVolcanoList,
  getRecentEruptions,
  getVolcanoSummary
} from './services/api';
import { 
  RefreshCw, X, ShieldCheck, Database, Server, Cpu, 
  Globe, Code2, GitBranch, Heart, LayoutDashboard, 
  Activity, Wind, Sun, Layers, Flame 
} from 'lucide-react';
import { playSound } from './utils/audio';

/**
 * =============================================================================
 * KOMPONEN UTAMA: APP (React JS)
 * File: src/App.jsx
 * Deskripsi:
 * Dashboard pusat kendali bencana dan iklim nasional PantauAlam.
 * Mengintegrasikan seluruh sensor BMKG:
 * 1. Peringatan Dini Cuaca Ekstrem (CAP RSS Nowcast)
 * 2. Command Center KPI Bar (4 Pilar Iklim & Seismik)
 * 3. Gempa Terkini Utama & Protokol Keselamatan
 * 4. Peta Geospasial Seismologi & Feed Terkini Interaktif
 * 5. Indeks Kualitas Udara Real-Time (PM2.5) dengan Visual Ranking
 * 6. Prakiraan Cuaca 3 Hari Kota Indonesia (NoSQL JSONB)
 * 7. Modal Spesifikasi Arsitektur Sistem Produksi
 * =============================================================================
 */
export default function App() {
  const [latestQuake, setLatestQuake] = useState(null);
  const [recentQuakes, setRecentQuakes] = useState([]);
  const [feltQuakes, setFeltQuakes] = useState([]);
  const [weatherAlerts, setWeatherAlerts] = useState([]);
  const [weatherList, setWeatherList] = useState([]);
  const [airQualityList, setAirQualityList] = useState([]);
  const [volcanoes, setVolcanoes] = useState([]);
  const [eruptions, setEruptions] = useState([]);
  const [volcanoSummary, setVolcanoSummary] = useState(null);
  const [focusedVolcano, setFocusedVolcano] = useState(null);
  const [focusedAirStation, setFocusedAirStation] = useState(null);
  const [selectedCityDetail, setSelectedCityDetail] = useState(null);
  const [shakemapModalUrl, setShakemapModalUrl] = useState(null);
  const [isArchitectureOpen, setIsArchitectureOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [lastSyncTime, setLastSyncTime] = useState(new Date());
  const [activeSectionTab, setActiveSectionTab] = useState('ALL'); // 'ALL', 'SEISMIC', 'VOLCANO', 'AIR', 'WEATHER'

  // Fungsi memuat seluruh data dari Core API Gateway Golang
  const loadDashboardData = async () => {
    try {
      const [quake, quakes, felts, alerts, weather, air, volcanoList, eruptionList, vSummary] = await Promise.all([
        getLatestEarthquake(),
        getRecentEarthquakes(),
        getFeltEarthquakes(),
        getExtremeWeatherAlerts(),
        getAllWeatherSummary(),
        getAirQualityData(),
        getVolcanoList(),
        getRecentEruptions(),
        getVolcanoSummary()
      ]);

      setLatestQuake(quake);
      setRecentQuakes(quakes);
      setFeltQuakes(felts);
      setWeatherAlerts(alerts);
      setWeatherList(weather);
      setAirQualityList(air);
      setVolcanoes(volcanoList);
      setEruptions(eruptionList);
      setVolcanoSummary(vSummary);
      setLastSyncTime(new Date());
    } catch (error) {
      console.error('Kesalahan saat memuat data dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Handler fokus kamera peta ke lokasi gunung api tertentu
  const handleFocusVolcano = (volcano) => {
    setFocusedVolcano(volcano);
    playSound('click');
    const mapElement = document.getElementById('seismik');
    if (mapElement) {
      mapElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Handler fokus kamera peta ke lokasi stasiun kualitas udara tertentu
  const handleFocusAirStation = (station) => {
    setFocusedAirStation(station);
    playSound('click');
    const mapElement = document.getElementById('seismik');
    if (mapElement) {
      mapElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Panggil data saat komponen pertama kali dimuat & polling otomatis tiap 60 detik
  useEffect(() => {
    loadDashboardData();

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          loadDashboardData();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Handler tombol segarkan manual
  const handleManualRefresh = () => {
    setRefreshing(true);
    setCountdown(60);
    loadDashboardData();
  };

  // Handler membuka rincian cuaca per kota
  const handleSelectCity = async (kotaId) => {
    const detail = await getWeatherDetail(kotaId);
    if (detail) {
      setSelectedCityDetail(detail);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-100/70 text-slate-900 antialiased font-sans">
      
      {/* 1. Navbar Atas */}
      <Navbar onOpenArchitecture={() => setIsArchitectureOpen(true)} />

      {/* 2. Area Konten Utama */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-7">
        
        {/* Header Judul Halaman & Status */}
        <div className="pt-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs shadow-emerald-500/50"></span>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  PantauAlam &bull; Pusat Kendali Bencana &amp; Iklim
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
                Data real-time BMKG &amp; PVMBG Indonesia &bull; Diorchestrasi oleh <strong className="text-slate-800 font-bold">Sanhaji</strong> &bull; Lisensi MIT (Full Open Source)
              </p>
            </div>
          </div>
        </div>

        {/* Sticky Control Bar: Navigation Hub & Auto-Sync Controls */}
        <div className="sticky top-16 z-30 bg-slate-100/95 backdrop-blur-md py-2.5 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 border-y border-slate-200/80 shadow-xs transition-all">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
            
            {/* View Mode Switcher */}
            <div className="flex items-center gap-1.5 p-1 bg-white/95 border border-slate-200 rounded-2xl shadow-xs overflow-x-auto no-scrollbar">
              <button
                onClick={() => { setActiveSectionTab('ALL'); playSound('CLICK'); }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  activeSectionTab === 'ALL'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                <span>Semua Modul</span>
              </button>

              <button
                onClick={() => { setActiveSectionTab('SEISMIC'); playSound('CLICK'); }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  activeSectionTab === 'SEISMIC'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                <Activity className="w-3.5 h-3.5 text-rose-300" />
                <span>Seismologi &amp; Gempa</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                  activeSectionTab === 'SEISMIC' ? 'bg-rose-700 text-rose-100' : 'bg-slate-100 text-slate-500'
                }`}>
                  15+
                </span>
              </button>

              <button
                onClick={() => { setActiveSectionTab('VOLCANO'); playSound('CLICK'); }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  activeSectionTab === 'VOLCANO'
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                <Flame className="w-3.5 h-3.5 text-orange-300" />
                <span>Gunung Api &amp; Erupsi</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                  activeSectionTab === 'VOLCANO' ? 'bg-orange-700 text-orange-100' : 'bg-slate-100 text-slate-500'
                }`}>
                  {volcanoes?.length || 68}
                </span>
              </button>

              <button
                onClick={() => { setActiveSectionTab('AIR'); playSound('CLICK'); }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  activeSectionTab === 'AIR'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                <Wind className="w-3.5 h-3.5 text-emerald-300" />
                <span>Kualitas Udara PM2.5</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                  activeSectionTab === 'AIR' ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-100 text-slate-500'
                }`}>
                  {airQualityList?.length || 0} SPKU
                </span>
              </button>

              <button
                onClick={() => { setActiveSectionTab('WEATHER'); playSound('CLICK'); }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  activeSectionTab === 'WEATHER'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                <Sun className="w-3.5 h-3.5 text-amber-300" />
                <span>Prakiraan Cuaca Kota</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                  activeSectionTab === 'WEATHER' ? 'bg-amber-700 text-amber-100' : 'bg-slate-100 text-slate-500'
                }`}>
                  {weatherList?.length || 0} Kota
                </span>
              </button>
            </div>

            {/* Auto-Sync & Refresh Action Pill */}
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-xl border border-slate-200 text-xs font-mono text-slate-600 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Auto-sync: <strong className="text-slate-900 font-semibold">{countdown}s</strong></span>
                <span className="text-slate-300">|</span>
                <span className="text-[11px] text-slate-400">{lastSyncTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>

              <button
                onClick={handleManualRefresh}
                disabled={refreshing}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 shadow-xs hover:shadow-sm transition-all disabled:opacity-70"
                title="Sinkronkan data terbaru dari API BMKG & PVMBG"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${refreshing ? 'animate-spin' : ''}`} />
                <span>{refreshing ? 'Sinkron...' : 'Segarkan'}</span>
              </button>
            </div>

          </div>
        </div>

        {/* Ticker Peringatan Dini Cuaca Ekstrem (BMKG Nowcast CAP) */}
        <WeatherAlertBar alerts={weatherAlerts} />

        {/* Command Center Bar (5 Metrik Eksekutif) */}
        <CommandCenterBar
          latestQuake={latestQuake}
          feltQuakes={feltQuakes}
          airQualityData={airQualityList}
          weatherAlerts={weatherAlerts}
          weatherList={weatherList}
          volcanoSummary={volcanoSummary}
          onSelectTab={(tab) => { setActiveSectionTab(tab); playSound('CLICK'); }}
        />

        {/* 6. Pemilihan Wilayah & Hero Spotlight Pantauan Lokal (Hanya ditampilkan pada Semua Modul & Tab Cuaca) */}
        {(activeSectionTab === 'ALL' || activeSectionTab === 'WEATHER') && (
          <RegionSelector
            weatherList={weatherList}
            airQualityData={airQualityList}
            latestQuake={latestQuake}
            weatherAlerts={weatherAlerts}
            onOpenWeatherModal={handleSelectCity}
          />
        )}

        {/* 7. MODUL 01: Seismologi & Gempa Bumi Nasional */}
        {(activeSectionTab === 'ALL' || activeSectionTab === 'SEISMIC') && (
          <section className="space-y-4 pt-2 animate-fadeIn">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shadow-xs">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md border border-rose-200">
                      MODUL 01 &bull; SEISMOLOGI
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">Sensors: BMKG TEWS</span>
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-900 leading-snug">
                    Pemantauan Gempa Bumi &amp; Potensi Tsunami
                  </h3>
                </div>
              </div>
              {activeSectionTab === 'ALL' ? (
                <button
                  onClick={() => { setActiveSectionTab('SEISMIC'); playSound('CLICK'); }}
                  className="text-xs font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-rose-50 hover:border-rose-200 transition-all shadow-xs"
                >
                  <span>Fokus Modul Gempa</span>
                  <span>&rarr;</span>
                </button>
              ) : (
                <button
                  onClick={() => { setActiveSectionTab('ALL'); playSound('CLICK'); }}
                  className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition-all shadow-xs"
                >
                  <span>&larr; Tampilkan Semua Modul</span>
                </button>
              )}
            </div>

            <EarthquakeBanner
              quake={latestQuake}
              onOpenShakemap={(url) => setShakemapModalUrl(url)}
            />

            <EarthquakeMap
              latestQuake={latestQuake}
              recentQuakes={recentQuakes}
              feltQuakes={feltQuakes}
              volcanoes={volcanoes}
              focusedVolcano={focusedVolcano}
              airQualityData={airQualityList}
              focusedAirStation={focusedAirStation}
            />
          </section>
        )}

        {/* 7B. MODUL 01B: Aktivitas Gunung Api & Erupsi Terkini (PVMBG) */}
        {(activeSectionTab === 'ALL' || activeSectionTab === 'VOLCANO') && (
          <section className="space-y-4 pt-4 animate-fadeIn" id="volcano">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600 shadow-xs">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-orange-700 bg-orange-100 px-2 py-0.5 rounded-md border border-orange-200">
                      MODUL 01B &bull; VULKANOLOGI
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">Sensors: PVMBG / MAGMA ESDM</span>
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-900 leading-snug">
                    Tingkat Aktivitas Gunung Api &amp; Buletin Letusan Terkini
                  </h3>
                </div>
              </div>
              {activeSectionTab === 'ALL' ? (
                <button
                  onClick={() => { setActiveSectionTab('VOLCANO'); playSound('CLICK'); }}
                  className="text-xs font-bold text-orange-600 hover:text-orange-800 flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-orange-50 hover:border-orange-200 transition-all shadow-xs"
                >
                  <span>Fokus Modul Gunung Api</span>
                  <span>&rarr;</span>
                </button>
              ) : (
                <button
                  onClick={() => { setActiveSectionTab('ALL'); playSound('CLICK'); }}
                  className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition-all shadow-xs"
                >
                  <span>&larr; Tampilkan Semua Modul</span>
                </button>
              )}
            </div>

            <VolcanoSection
              volcanoes={volcanoes}
              eruptions={eruptions}
              summary={volcanoSummary}
              onFocusVolcano={handleFocusVolcano}
            />
          </section>
        )}

        {/* 8. MODUL 02: Kualitas Udara Partikulat PM2.5 */}
        {(activeSectionTab === 'ALL' || activeSectionTab === 'AIR') && (
          <section className="space-y-4 pt-4 animate-fadeIn">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-xs">
                  <Wind className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200">
                      MODUL 02 &bull; POLUSI UDARA
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">Sensors: SPKU Otomatis BMKG</span>
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-900 leading-snug">
                    Indeks Konsentrasi Partikulat PM2.5 Real-Time
                  </h3>
                </div>
              </div>
              {activeSectionTab === 'ALL' ? (
                <button
                  onClick={() => { setActiveSectionTab('AIR'); playSound('CLICK'); }}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-800 flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-emerald-50 hover:border-emerald-200 transition-all shadow-xs"
                >
                  <span>Fokus Modul Udara</span>
                  <span>&rarr;</span>
                </button>
              ) : (
                <button
                  onClick={() => { setActiveSectionTab('ALL'); playSound('CLICK'); }}
                  className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition-all shadow-xs"
                >
                  <span>&larr; Tampilkan Semua Modul</span>
                </button>
              )}
            </div>

            <AirQualitySection
              airQualityData={airQualityList}
              loading={loading}
              onFocusStation={handleFocusAirStation}
            />
          </section>
        )}

        {/* 9. MODUL 03: Prakiraan Cuaca Wilayah & Analisis NoSQL JSONB */}
        {(activeSectionTab === 'ALL' || activeSectionTab === 'WEATHER') && (
          <section className="space-y-4 pt-4 animate-fadeIn">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-xs">
                  <Sun className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200">
                      MODUL 03 &bull; METEOROLOGI
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">31+ Kota / Ibukota Provinsi</span>
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-900 leading-snug">
                    Prakiraan Cuaca Multi-Hari &amp; Analisis JSONB
                  </h3>
                </div>
              </div>
              {activeSectionTab === 'ALL' ? (
                <button
                  onClick={() => { setActiveSectionTab('WEATHER'); playSound('CLICK'); }}
                  className="text-xs font-bold text-amber-600 hover:text-amber-800 flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-amber-50 hover:border-amber-200 transition-all shadow-xs"
                >
                  <span>Fokus Modul Cuaca</span>
                  <span>&rarr;</span>
                </button>
              ) : (
                <button
                  onClick={() => { setActiveSectionTab('ALL'); playSound('CLICK'); }}
                  className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition-all shadow-xs"
                >
                  <span>&larr; Tampilkan Semua Modul</span>
                </button>
              )}
            </div>

            <WeatherSection
              weatherList={weatherList}
              onSelectCity={handleSelectCity}
            />
          </section>
        )}

      </main>

      {/* 9. Modal Detail Prakiraan Cuaca 3 Hari (NoSQL JSONB Explorer) */}
      {selectedCityDetail && (
        <WeatherModal
          cityDetail={selectedCityDetail}
          onClose={() => setSelectedCityDetail(null)}
        />
      )}

      {/* 10. Modal Tampilan Gambar Shakemap MMI BMKG */}
      {shakemapModalUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl border border-slate-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-blue-600">Peta Seismologi BMKG</span>
                <h4 className="font-bold text-sm text-slate-800">Shakemap Tingkat Guncangan Tanah (MMI)</h4>
              </div>
              <button
                onClick={() => setShakemapModalUrl(null)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 flex justify-center bg-slate-950">
              <img
                src={shakemapModalUrl}
                alt="Shakemap BMKG"
                className="max-h-[70vh] rounded-xl object-contain shadow-lg"
              />
            </div>
          </div>
        </div>
      )}

      {/* 11. Modal Ringkasan Arsitektur & Rekayasa Sistem */}
      <ArchitectureModal
        isOpen={isArchitectureOpen}
        onClose={() => setIsArchitectureOpen(false)}
      />

      {/* 12. Footer Command Center */}
      <footer className="mt-16 bg-white border-t border-slate-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-extrabold text-base text-slate-900 tracking-tight">
                  Pantau<span className="text-emerald-600">Alam</span> &mdash; Portal Iklim &amp; Bencana Nasional
                </h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  FULL OPEN SOURCE
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-xl">
                Sistem Pemantau Cuaca, Geofisika &amp; Kualitas Udara Terpadu Indonesia. Dibuat dan diorchestrasi oleh <strong className="text-slate-800 font-semibold">Sanhaji</strong> sebagai System Orchestrator. Terbuka penuh untuk digunakan, dipelajari, dan dikembangkan oleh siapa saja untuk kemaslahatan publik.
              </p>
            </div>

            {/* Badges Stack */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 font-semibold flex items-center gap-1">
                <Server className="w-3 h-3" /> Golang 1.22
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold flex items-center gap-1">
                <Database className="w-3 h-3" /> Postgres JSONB
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 font-semibold flex items-center gap-1">
                <Cpu className="w-3 h-3" /> Python 3.12
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-cyan-50 text-cyan-700 border border-cyan-200 font-semibold flex items-center gap-1">
                <Globe className="w-3 h-3" /> React JS + Leaflet
              </span>
            </div>
          </div>

          {/* Orchestrator & Open Source Banner Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl shadow-indigo-950/20 border border-slate-800">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-300 shrink-0">
                <Code2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-white tracking-tight">Dibuat &amp; Diorchestrasi oleh Sanhaji</span>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 font-semibold uppercase tracking-wider">
                    System Orchestrator
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  100% Full Open Source (Lisensi MIT). Bebas digunakan, dimodifikasi, dan didistribusikan oleh siapapun tanpa batasan.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 text-xs shrink-0">
              <span className="px-3 py-1.5 rounded-xl bg-white/10 text-white font-medium border border-white/10 flex items-center gap-1.5 backdrop-blur-xs">
                <GitBranch className="w-3.5 h-3.5 text-emerald-400" /> MIT License
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-white/10 text-white font-medium border border-white/10 flex items-center gap-1.5 backdrop-blur-xs">
                <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400" /> Public Good
              </span>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
            <p>&copy; 2026 PantauAlam. Data resmi terbuka dari BMKG &amp; PVMBG Indonesia.</p>
            <p className="font-medium text-slate-500">PantauAlam Enterprise Edition v1.0.0 &bull; Open Source by Sanhaji</p>
          </div>
        </div>
      </footer>

    </div>
  );
}

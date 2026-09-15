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
import { 
  getLatestEarthquake, 
  getRecentEarthquakes, 
  getFeltEarthquakes, 
  getAllWeatherSummary, 
  getWeatherDetail, 
  getExtremeWeatherAlerts, 
  getAirQualityData 
} from './services/api';
import { RefreshCw, X, ShieldCheck, Database, Server, Cpu, Globe, Code2, GitBranch, Heart } from 'lucide-react';

/**
 * =============================================================================
 * KOMPONEN UTAMA: APP (React JS)
 * File: src/App.jsx
 * Deskripsi:
 * Dashboard pusat kendali bencana dan iklim nasional NusantaraWeather.
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
  const [selectedCityDetail, setSelectedCityDetail] = useState(null);
  const [shakemapModalUrl, setShakemapModalUrl] = useState(null);
  const [isArchitectureOpen, setIsArchitectureOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fungsi memuat seluruh data dari Core API Gateway Golang
  const loadDashboardData = async () => {
    try {
      const [quake, quakes, felts, alerts, weather, air] = await Promise.all([
        getLatestEarthquake(),
        getRecentEarthquakes(),
        getFeltEarthquakes(),
        getExtremeWeatherAlerts(),
        getAllWeatherSummary(),
        getAirQualityData()
      ]);

      setLatestQuake(quake);
      setRecentQuakes(quakes);
      setFeltQuakes(felts);
      setWeatherAlerts(alerts);
      setWeatherList(weather);
      setAirQualityList(air);
    } catch (error) {
      console.error('Kesalahan saat memuat data dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Panggil data saat komponen pertama kali dimuat (Mounting)
  useEffect(() => {
    loadDashboardData();
  }, []);

  // Handler tombol segarkan manual
  const handleManualRefresh = () => {
    setRefreshing(true);
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
        
        {/* Baris Tombol Refresh & Keterangan Waktu */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                Pusat Kendali Bencana &amp; Iklim Nasional
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Data terintegrasi 100% dari jaringan sensor satelit, seismograf &amp; SPKU BMKG Indonesia secara otomatis.
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-2.5">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                <Code2 className="w-3 h-3 text-blue-600" />
                Orchestrated by Sanhaji
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <GitBranch className="w-3 h-3 text-emerald-600" />
                100% Full Open Source (MIT)
              </span>
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                &bull; Bebas digunakan &amp; dikembangkan oleh siapapun
              </span>
            </div>
          </div>

          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="self-start sm:self-auto flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-xs hover:shadow-sm transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Menyinkronkan...' : 'Segarkan Data BMKG'}</span>
          </button>
        </div>

        {/* 3. Ticker Peringatan Dini Cuaca Ekstrem (BMKG Nowcast CAP) */}
        <WeatherAlertBar alerts={weatherAlerts} />

        {/* 4. Command Center Bar (4 Metrik Eksekutif) */}
        <CommandCenterBar
          latestQuake={latestQuake}
          feltQuakes={feltQuakes}
          airQualityData={airQualityList}
          weatherAlerts={weatherAlerts}
          weatherList={weatherList}
        />

        {/* 5. Pemilihan Wilayah & Hero Spotlight Pantauan Lokal */}
        <RegionSelector
          weatherList={weatherList}
          airQualityData={airQualityList}
          latestQuake={latestQuake}
          weatherAlerts={weatherAlerts}
          onOpenWeatherModal={handleSelectCity}
        />

        {/* 6. Banner Peringatan Gempa Terkini Utama */}
        <EarthquakeBanner
          quake={latestQuake}
          onOpenShakemap={(url) => setShakemapModalUrl(url)}
        />

        {/* 6. Peta Interaktif Seismologi Leaflet & Live Feed Seismik */}
        <EarthquakeMap
          latestQuake={latestQuake}
          recentQuakes={recentQuakes}
          feltQuakes={feltQuakes}
        />

        {/* 7. Seksi Pemantauan Kualitas Udara (PM2.5) BMKG */}
        <AirQualitySection
          airQualityData={airQualityList}
          loading={loading}
        />

        {/* 8. Seksi Prakiraan Cuaca Kota-Kota Indonesia */}
        <WeatherSection
          weatherList={weatherList}
          onSelectCity={handleSelectCity}
        />

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
                  Nusantara<span className="text-blue-600">Weather</span> &mdash; Portal Iklim &amp; Bencana Nasional
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
            <p>&copy; 2026 NusantaraWeather. Data resmi terbuka dari BMKG Indonesia.</p>
            <p className="font-medium text-slate-500">NusantaraWeather Enterprise Edition v1.0.0 &bull; Open Source by Sanhaji</p>
          </div>
        </div>
      </footer>

    </div>
  );
}

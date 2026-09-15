import React, { useState } from 'react';
import { 
  X, Database, Server, Cpu, Shield, 
  CheckCircle2, Layers, Terminal, BookOpen, ExternalLink 
} from 'lucide-react';

/**
 * =============================================================================
 * KOMPONEN: MODAL ARSITEKTUR & SPESIFIKASI TEKNIS SISTEM
 * File: src/components/ArchitectureModal.jsx
 * Deskripsi:
 * Memberikan ringkasan interaktif arsitektur teknis dan spesifikasi rekayasa
 * sistem terdistribusi, database multi-model, dan ingestion pipeline produksi.
 * =============================================================================
 */
export default function ArchitectureModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState('DATABASE');

  const tabs = [
    { id: 'DATABASE', label: '1. Multi-Model PostgreSQL (JSONB)', icon: Database },
    { id: 'GATEWAY', label: '2. Golang API Gateway', icon: Server },
    { id: 'INGESTION', label: '3. Python Ingestion Worker', icon: Cpu },
    { id: 'DEVOPS', label: '4. DevOps & Security Hardening', icon: Shield },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-slate-200 flex flex-col">
        
        {/* Header Modal */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 to-slate-800 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold">Spesifikasi Arsitektur &amp; Rekayasa Sistem</h3>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[10px] font-bold">
                  Production Grade
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Dokumentasi arsitektur rekayasa sistem terdistribusi, database multi-model, dan pipeline data otomatis.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigasi */}
        <div className="px-6 pt-4 pb-2 border-b border-slate-100 flex gap-2 overflow-x-auto bg-slate-50">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Isi Konten Tab */}
        <div className="p-6 overflow-y-auto flex-1 text-slate-700 text-xs leading-relaxed space-y-4">
          
          {/* TAB 1: Multi-Model DB */}
          {activeTab === 'DATABASE' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200">
                <h4 className="font-bold text-sm text-blue-900 mb-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  Pola Multi-Model Database (Relational + JSONB NoSQL)
                </h4>
                <p className="text-blue-900/80">
                  Menggabungkan integritas ACID database relasional untuk data wilayah, user, dan bookmark, sekaligus memanfaatkan kecepatan Document Store NoSQL untuk data bersarang (prakiraan cuaca per jam dan raw payload BMKG).
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                  <span className="font-bold text-slate-900 text-xs uppercase tracking-wide block">
                    1. Relational Tables (ACID Strict)
                  </span>
                  <ul className="list-disc list-inside text-slate-600 space-y-1">
                    <li><code>wilayah_provinsi</code> & <code>wilayah_kota</code>: Relasi 1-to-N dengan foreign key.</li>
                    <li><code>users</code>: Password di-hash aman dengan <strong>bcrypt (cost 10)</strong>.</li>
                    <li><code>user_bookmarks</code>: Relasi Many-to-Many cascade on delete.</li>
                    <li><code>kualitas_udara</code>: Pemantauan baku mutu SPKU PM2.5.</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                  <span className="font-bold text-slate-900 text-xs uppercase tracking-wide block">
                    2. Kolom JSONB + GIN Index
                  </span>
                  <ul className="list-disc list-inside text-slate-600 space-y-1">
                    <li><code>data_cuaca.forecast_detail</code>: Menyimpan struktur prakiraan 3 hari bertingkat langsung dari BMKG.</li>
                    <li>Menggunakan <strong>GIN Index</strong> (Generalized Inverted Index) untuk pencarian cepat dokumen internal JSON tanpa perlu normalisasi puluhan tabel anak.</li>
                  </ul>
                </div>
              </div>

              <div className="p-3 bg-slate-900 text-emerald-400 rounded-xl font-mono text-[11px] overflow-x-auto">
                <p className="text-slate-400">// Contoh Indeks GIN PostgreSQL di deploy/database/init.sql:</p>
                <p>CREATE INDEX idx_cuaca_forecast_gin ON data_cuaca USING GIN (forecast_detail);</p>
              </div>
            </div>
          )}

          {/* TAB 2: Golang Gateway */}
          {activeTab === 'GATEWAY' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200">
                <h4 className="font-bold text-sm text-emerald-900 mb-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Kinerja Tinggi Golang 1.22+ & Concurrency
                </h4>
                <p className="text-emerald-900/80">
                  API Gateway ditulis dengan Go murni tanpa framework bloated. Menghasilkan single binary statis yang sangat ringan (&lt;25 MB) dengan konsumsi memori hemat (&lt;30 MB RAM) dan sanggup melayani ribuan request per detik secara konkuren.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                  <span className="font-bold text-slate-900 text-xs uppercase tracking-wide block">
                    Fitur Unggulan Gateway
                  </span>
                  <ul className="list-disc list-inside text-slate-600 space-y-1">
                    <li><strong>In-Memory Cache (sync.Map):</strong> Cache data gempa 60 detik (latensi kilat 2-5ms).</li>
                    <li><strong>Standard HTTP ServerMux Go 1.22:</strong> Method-based routing (GET/POST) tanpa dependensi eksternal.</li>
                    <li><strong>Connection Pooling:</strong> <code>SetMaxOpenConns(25)</code>, <code>SetMaxIdleConns(5)</code>.</li>
                    <li><strong>Graceful Shutdown:</strong> Menutup koneksi aktif dengan aman saat sinyal OS diterima.</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                  <span className="font-bold text-slate-900 text-xs uppercase tracking-wide block">
                    Keamanan & Middleware
                  </span>
                  <ul className="list-disc list-inside text-slate-600 space-y-1">
                    <li><strong>JWT Authentication:</strong> Otentikasi stateless dengan verifikasi signature HMAC-SHA256.</li>
                    <li><strong>CORS Middleware:</strong> Kontrol akses header aman untuk Web & Mobile.</li>
                    <li><strong>Timeout Safeguard:</strong> ReadTimeout 10s & WriteTimeout 15s (Anti-Slowloris attack).</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Python Ingestion */}
          {activeTab === 'INGESTION' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200">
                <h4 className="font-bold text-sm text-amber-900 mb-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-amber-600" />
                  Worker Ingestion Mandiri (Zero-Maintenance)
                </h4>
                <p className="text-amber-900/80">
                  Python worker berjalan secara terpisah (decoupled) dari API Gateway. Bertugas secara berkala menarik data BMKG, membersihkan anomali, dan menyimpan ke PostgreSQL.
                </p>
              </div>

              <div className="space-y-2">
                <span className="font-bold text-slate-900 text-xs uppercase tracking-wide block">
                  Daftar Pipeline Data BMKG Terbuka yang Dikelola:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <strong className="text-slate-800 block">1. Autogempa Terkini</strong>
                    <span className="text-slate-500">Mendeteksi gempa signifikan terbaru dan status potensi tsunami.</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <strong className="text-slate-800 block">2. 15 Gempa Dirasakan</strong>
                    <span className="text-slate-500">Menyimpan riwayat intensitas guncangan skala MMI dari laporan masyarakat.</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <strong className="text-slate-800 block">3. Peringatan Dini Cuaca (CAP)</strong>
                    <span className="text-slate-500">Parsing XML feed Nowcast resmi BMKG untuk himbauan cuaca ekstrem.</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <strong className="text-slate-800 block">4. Baku Mutu Udara PM2.5</strong>
                    <span className="text-slate-500">Ekstraksi berkala 25+ stasiun otomatis SPKU seluruh Indonesia.</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: DevOps & Security */}
          {activeTab === 'DEVOPS' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200">
                <h4 className="font-bold text-sm text-indigo-900 mb-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                  DevOps, Docker Multi-Container & Linux Security
                </h4>
                <p className="text-indigo-900/80">
                  Mengisolasi microservice ke dalam kontainer mandiri dengan orkestrasi Docker Compose dan skrip otomasi pengerasan keamanan Linux.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                  <span className="font-bold text-slate-900 text-xs uppercase tracking-wide block">
                    Isolasi Jaringan Docker
                  </span>
                  <ul className="list-disc list-inside text-slate-600 space-y-1">
                    <li>Database PostgreSQL port 5432 hanya dibuka pada bridge internal container.</li>
                    <li>Multi-stage Dockerfile untuk Go Gateway (binary scratch / alpine 3.19).</li>
                    <li>Nginx reverse proxy mengalirkan traffic HTTP port 80/443 ke port internal 8080.</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                  <span className="font-bold text-slate-900 text-xs uppercase tracking-wide block">
                    Linux Server Hardening &amp; Security
                  </span>
                  <ul className="list-disc list-inside text-slate-600 space-y-1">
                    <li>Tersedia script <code>deploy/security/hardening.sh</code>.</li>
                    <li>Otomasi konfigurasi IPTables/UFW Firewall.</li>
                    <li>Fail2ban untuk proteksi brute force SSH.</li>
                    <li>Penonaktifan login SSH password &amp; root.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Info */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-800">Orchestrated by Sanhaji</span>
            <span className="text-slate-300 hidden sm:inline">&bull;</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
              100% Full Open Source (MIT)
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-semibold transition-colors w-full sm:w-auto"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
}

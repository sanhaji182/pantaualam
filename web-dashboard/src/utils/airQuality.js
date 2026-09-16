/**
 * =============================================================================
 * UTILITAS: HELPER KUALITAS UDARA PM2.5 (BAKU MUTU BMKG & PERMEN LHK)
 * File: src/utils/airQuality.js
 * Deskripsi:
 * Mengkategorikan nilai konsentrasi partikulat PM2.5 (ug/m3) berdasarkan regulasi
 * Peraturan Menteri Lingkungan Hidup dan Kehutanan (Permen LHK) No. P.14/2020
 * dan standar operasional BMKG SPKU otomatis.
 * =============================================================================
 */

export function getCategoryBadge(kategori, pm25) {
  const kat = (kategori || '').toLowerCase();

  // Kategori 1: Berbahaya (PM2.5 > 250.4 ug/m3)
  if (kat.includes('berbahaya') || pm25 > 250.4) {
    return {
      label: 'Berbahaya',
      bg: 'bg-red-50 text-red-900 border-red-200',
      badgeBg: 'bg-red-600 text-white',
      barColor: 'bg-red-600',
      dot: 'bg-red-500',
      rec: 'Hindari seluruh aktivitas luar ruangan! Wajib gunakan respirator N95 jika terpaksa bepergian.',
      healthTips: {
        umum: 'Tutup seluruh ventilasi jendela dan aktifkan air purifier.',
        anak: 'Sangat berbahaya bagi sistem pernapasan balita dan lansia. Jangan keluar rumah!',
        asma: 'Gunakan nebulizer/inhaler sesuai anjuran dokter dan hindari paparan udara.',
        olahraga: 'DILARANG berolahraga di luar ruangan! Ganti dengan peregangan indoor.'
      }
    };
  }

  // Kategori 2: Sangat Tidak Sehat (PM2.5 150.5 - 250.4 ug/m3)
  if (kat.includes('sangat tidak sehat') || pm25 > 150.4) {
    return {
      label: 'Sangat Tidak Sehat',
      bg: 'bg-rose-50 text-rose-900 border-rose-200',
      badgeBg: 'bg-rose-600 text-white',
      barColor: 'bg-rose-500',
      dot: 'bg-rose-500',
      rec: 'Kelompok sensitif harus tetap di dalam ruangan. Nyalakan pembersih udara.',
      healthTips: {
        umum: 'Gunakan masker anti-polusi N95 atau KF94 saat keluar ruangan.',
        anak: 'Batasi jam bermain anak di luar rumah, pantau gejala batuk/sesak.',
        asma: 'Siapkan obat pelega pernapasan, hindari jalan raya bertrafik padat.',
        olahraga: 'Tunda lari atau bersepeda luar ruangan sampai indeks membaik.'
      }
    };
  }

  // Kategori 3: Tidak Sehat (PM2.5 55.5 - 150.4 ug/m3)
  if (kat.includes('tidak sehat') || pm25 > 55.4) {
    return {
      label: 'Tidak Sehat',
      bg: 'bg-amber-50 text-amber-900 border-amber-200',
      badgeBg: 'bg-amber-500 text-slate-950 font-black',
      barColor: 'bg-amber-500',
      dot: 'bg-amber-500',
      rec: 'Gunakan masker medis saat bepergian. Kelompok rentan kurangi aktivitas outdoor.',
      healthTips: {
        umum: 'Kenakan masker medis ganda atau KN95 saat beraktivitas di jalan raya.',
        anak: 'Kurangi kegiatan fisik berat anak di halaman sekolah/taman.',
        asma: 'Minum air putih hangat lebih sering dan hindari asap kendaraan.',
        olahraga: 'Kurangi durasi dan intensitas latihan kardio di luar ruangan.'
      }
    };
  }

  // Kategori 4: Sedang (PM2.5 15.5 - 55.4 ug/m3)
  if (kat.includes('sedang') || pm25 > 15.4) {
    return {
      label: 'Sedang',
      bg: 'bg-blue-50 text-blue-900 border-blue-200',
      badgeBg: 'bg-blue-600 text-white',
      barColor: 'bg-blue-500',
      dot: 'bg-blue-500',
      rec: 'Kualitas udara dapat diterima untuk masyarakat umum.',
      healthTips: {
        umum: 'Udara cukup baik untuk aktivitas harian normal.',
        anak: 'Anak-anak dan lansia dapat beraktivitas seperti biasa.',
        asma: 'Kelompok hipersensitif disarankan tetap waspada jika ada gejala batuk.',
        olahraga: 'Aman untuk jogging dan olahraga pagi di area taman terbuka.'
      }
    };
  }

  // Kategori 5: Baik (PM2.5 0 - 15.4 ug/m3)
  return {
    label: 'Baik',
    bg: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    badgeBg: 'bg-emerald-600 text-white',
    barColor: 'bg-emerald-500',
    dot: 'bg-emerald-500',
    rec: 'Kualitas udara sangat bersih dan segar! Sangat ideal untuk berolahraga.',
    healthTips: {
      umum: 'Buka ventilasi rumah untuk sirkulasi udara alami yang segar.',
      anak: 'Sangat aman dan menyehatkan bagi anak-anak bermain di luar.',
      asma: 'Kondisi paru-paru optimal, risiko iritasi sangat minimal.',
      olahraga: 'Waktu terbaik untuk maraton, bersepeda, dan aktivitas kardio outdoor!'
    }
  };
}

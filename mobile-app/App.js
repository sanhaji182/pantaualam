/**
 * =============================================================================
 * APLIKASI MOBILE: PANTAUALAM (React Native Expo)
 * File: mobile-app/App.js
 * Kesesuaian Silabus: Modul 11 — React Native
 * 
 * Integrasi Lengkap Seluruh Data Terbuka BMKG:
 * 1. Peringatan Dini Cuaca Ekstrem (Nowcast CAP RSS BMKG)
 * 2. Gempa Bumi Terkini M 5.0+ & Potensi Tsunami
 * 3. Gempa Bumi Dirasakan Masyarakat (Skala MMI)
 * 4. Prakiraan Cuaca Wilayah Kota (Suhu, Kelembaban, Kondisi)
 * =============================================================================
 */

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  StatusBar
} from 'react-native';

// Alamat API Gateway Golang (Ganti dengan IP laptop/VPS jika menjalankan di perangkat fisik)
const API_BASE_URL = 'http://10.0.2.2:8080/api/v1'; // 10.0.2.2 adalah localhost untuk emulator Android

export default function App() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [latestQuake, setLatestQuake] = useState(null);
  const [feltQuakes, setFeltQuakes] = useState([]);
  const [weatherAlerts, setWeatherAlerts] = useState([]);
  const [citiesWeather, setCitiesWeather] = useState([]);
  const [airQuality, setAirQuality] = useState([]);
  const [quakeTab, setQuakeTab] = useState('TERKINI'); // 'TERKINI' atau 'DIRASAKAN'
  const [selectedCityId, setSelectedCityId] = useState('31.71.01.1001'); // Default: Jakarta Pusat

  // Fungsi mengambil seluruh data BMKG dari Core Gateway Golang
  const fetchData = async () => {
    try {
      // 1. Fetch Gempa Terkini
      const quakeRes = await fetch(`${API_BASE_URL}/gempa/terkini`);
      if (quakeRes.ok) {
        const quakeJson = await quakeRes.json();
        setLatestQuake(quakeJson.data);
      }

      // 2. Fetch Gempa Dirasakan Warga
      const feltRes = await fetch(`${API_BASE_URL}/gempa/dirasakan`);
      if (feltRes.ok) {
        const feltJson = await feltRes.json();
        setFeltQuakes(feltJson.data || []);
      }

      // 3. Fetch Peringatan Dini Cuaca Ekstrem (Nowcast CAP)
      const alertRes = await fetch(`${API_BASE_URL}/cuaca/peringatan-dini`);
      if (alertRes.ok) {
        const alertJson = await alertRes.json();
        setWeatherAlerts(alertJson.data || []);
      }

      // 4. Fetch Cuaca Seluruh Kota
      const weatherRes = await fetch(`${API_BASE_URL}/cuaca`);
      if (weatherRes.ok) {
        const weatherJson = await weatherRes.json();
        setCitiesWeather(weatherJson.data || []);
      }

      // 5. Fetch Kualitas Udara Partikulat PM2.5 BMKG
      const airRes = await fetch(`${API_BASE_URL}/kualitas-udara`);
      if (airRes.ok) {
        const airJson = await airRes.json();
        setAirQuality(airJson.data || []);
      }
    } catch (error) {
      console.log('Error mengambil data mobile:', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Lifecycle useEffect untuk pemanggilan data awal saat aplikasi dibuka
  useEffect(() => {
    fetchData();
  }, []);

  // Handler pull-to-refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* HEADER NAVIGASI APLIKASI */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>PantauAlam</Text>
          <Text style={styles.headerSubtitle}>Portal Lengkap Sensor BMKG</Text>
        </View>
        <View style={styles.badgeLive}>
          <Text style={styles.badgeLiveText}>LIVE</Text>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0284c7']} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0284c7" />
            <Text style={styles.loadingText}>Menghubungkan ke Seluruh Sensor BMKG...</Text>
          </View>
        ) : (
          <>
            {/* ----------------------------------------------------------------- */}
            {/* 1. KARTU PERINGATAN DINI CUACA EKSTREM (NOWCAST BMKG)             */}
            {/* ----------------------------------------------------------------- */}
            {weatherAlerts.length > 0 && (
              <View style={styles.alertBanner}>
                <Text style={styles.alertTag}>PERINGATAN DINI CUACA EKSTREM</Text>
                <Text style={styles.alertTitle}>{weatherAlerts[0].judul}</Text>
                <Text style={styles.alertDesc} numberOfLines={3}>
                  {weatherAlerts[0].deskripsi}
                </Text>
              </View>
            )}

            {/* ----------------------------------------------------------------- */}
            {/* 2. TAB PILIHAN GEMPA (TERKINI vs DIRASAKAN WARGA)                */}
            {/* ----------------------------------------------------------------- */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Aktivitas Seismik BMKG</Text>
              <View style={styles.tabRow}>
                <TouchableOpacity
                  onPress={() => setQuakeTab('TERKINI')}
                  style={[styles.tabBtn, quakeTab === 'TERKINI' && styles.tabBtnActive]}
                >
                  <Text style={[styles.tabBtnText, quakeTab === 'TERKINI' && styles.tabBtnTextActive]}>
                    Terkini
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setQuakeTab('DIRASAKAN')}
                  style={[styles.tabBtn, quakeTab === 'DIRASAKAN' && styles.tabBtnActive]}
                >
                  <Text style={[styles.tabBtnText, quakeTab === 'DIRASAKAN' && styles.tabBtnTextActive]}>
                    Dirasakan ({feltQuakes.length})
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Konten Tab Gempa */}
            {quakeTab === 'TERKINI' ? (
              latestQuake ? (
                <View style={styles.quakeCard}>
                  <View style={styles.quakeHeader}>
                    <View style={styles.magnitudeBox}>
                      <Text style={styles.magnitudeNumber}>{latestQuake.magnitude}</Text>
                      <Text style={styles.magnitudeUnit}>SR</Text>
                    </View>
                    
                    <View style={styles.quakeInfo}>
                      <Text style={styles.quakeTime}>{latestQuake.tanggal_jam}</Text>
                      <Text style={styles.quakeRegion} numberOfLines={2}>{latestQuake.wilayah}</Text>
                      <Text style={styles.quakeDepth}>Kedalaman: {latestQuake.kedalaman}</Text>
                    </View>
                  </View>

                  <View style={styles.tsunamiBanner}>
                    <Text style={styles.tsunamiText}>
                      {latestQuake.potensi || 'Tidak berpotensi tsunami'}
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.emptyCard}><Text style={styles.emptyText}>Data gempa belum dimuat.</Text></View>
              )
            ) : (
              // List Gempa Dirasakan
              feltQuakes.slice(0, 5).map((q, idx) => (
                <View key={idx} style={styles.feltCard}>
                  <View style={styles.feltLeft}>
                    <Text style={styles.feltMag}>{q.magnitude} M</Text>
                    <Text style={styles.feltDepth}>{q.kedalaman}</Text>
                  </View>
                  <View style={styles.feltRight}>
                    <Text style={styles.feltRegion} numberOfLines={2}>{q.wilayah}</Text>
                    <Text style={styles.feltMMI}>Dirasakan: {q.dirasakan || '-'}</Text>
                    <Text style={styles.feltTime}>{q.tanggal_jam}</Text>
                  </View>
                </View>
              ))
            )}

            {/* ----------------------------------------------------------------- */}
            {/* 3. PEMANTAUAN KUALITAS UDARA (PM2.5 BMKG)                         */}
            {/* ----------------------------------------------------------------- */}
            <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
              <Text style={styles.sectionTitle}>Kualitas Udara PM2.5</Text>
              <Text style={styles.sectionBadge}>{airQuality.length} Stasiun BMKG</Text>
            </View>

            {airQuality.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>Data kualitas udara belum tersedia.</Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.airScroll}>
                {airQuality.slice(0, 10).map((station) => {
                  let cardBg = '#f8fafc';
                  let tagColor = '#0284c7';
                  let borderC = '#e2e8f0';

                  if (station.pm25 > 250.4) {
                    cardBg = '#fef2f2';
                    tagColor = '#991b1b';
                    borderC = '#fca5a5';
                  } else if (station.pm25 > 150.4) {
                    cardBg = '#fff1f2';
                    tagColor = '#be123c';
                    borderC = '#fecdd3';
                  } else if (station.pm25 > 55.4) {
                    cardBg = '#fffbeb';
                    tagColor = '#b45309';
                    borderC = '#fde68a';
                  } else if (station.pm25 <= 15.4) {
                    cardBg = '#f0fdf4';
                    tagColor = '#15803d';
                    borderC = '#bbf7d0';
                  }

                  return (
                    <View key={station.id || station.stasiun} style={[styles.airCard, { backgroundColor: cardBg, borderColor: borderC }]}>
                      <Text style={[styles.airTag, { color: tagColor }]}>{station.kategori}</Text>
                      <Text style={styles.airStation} numberOfLines={1}>{station.stasiun}</Text>
                      <Text style={styles.airValue}>{station.pm25}</Text>
                      <Text style={styles.airUnit}>µg/m³ PM2.5</Text>
                    </View>
                  );
                })}
              </ScrollView>
            )}

            {/* ----------------------------------------------------------------- */}
            {/* 4. PILIH WILAYAH PANTAUAN ANDA                                    */}
            {/* ----------------------------------------------------------------- */}
            <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
              <Text style={styles.sectionTitle}>Pilih Wilayah Anda</Text>
              <Text style={styles.sectionBadge}>{citiesWeather.length} Kota Terdata</Text>
            </View>

            {/* Horizontal Chip Selector Kota */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {citiesWeather.map((city) => {
                const isSelected = (selectedCityId === city.kota_id) || (!selectedCityId && city.kota_id === '31.71.01.1001');
                return (
                  <TouchableOpacity
                    key={city.kota_id}
                    onPress={() => setSelectedCityId(city.kota_id)}
                    style={[styles.cityChip, isSelected && styles.cityChipActive]}
                  >
                    <Text style={[styles.cityChipText, isSelected && styles.cityChipTextActive]}>
                      {city.kota_nama}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Spotlight Card Wilayah Terpilih */}
            {(() => {
              const activeCity = citiesWeather.find((c) => c.kota_id === selectedCityId) || citiesWeather[0];
              if (!activeCity) return null;
              return (
                <View style={styles.spotlightCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View>
                      <Text style={styles.spotlightProv}>{activeCity.provinsi_nama}</Text>
                      <Text style={styles.spotlightCity}>{activeCity.kota_nama}</Text>
                      <Text style={styles.spotlightDesc}>{activeCity.kondisi_cuaca || 'Cerah'}</Text>
                    </View>
                    <Text style={styles.spotlightTemp}>
                      {activeCity.suhu_saat_ini !== null ? Math.round(activeCity.suhu_saat_ini) : '--'}°C
                    </Text>
                  </View>
                  <View style={styles.spotlightMetaRow}>
                    <Text style={styles.spotlightMeta}>Lembap: {activeCity.kelembapan_saat_ini ?? '--'}%</Text>
                    <Text style={styles.spotlightMeta}>Angin: {activeCity.kecepatan_angin ?? '--'} km/h</Text>
                    <Text style={styles.spotlightMeta}>Arah: {activeCity.arah_angin || '-'}</Text>
                  </View>
                </View>
              );
            })()}

            {/* ----------------------------------------------------------------- */}
            {/* 5. DAFTAR SELURUH KOTA INDONESIA                                 */}
            {/* ----------------------------------------------------------------- */}
            <Text style={[styles.sectionTitle, { marginTop: 24, marginBottom: 10 }]}>Daftar Seluruh Kota Indonesia</Text>

            {citiesWeather.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>Daftar cuaca kota belum tersedia.</Text>
              </View>
            ) : (
              citiesWeather.map((city) => (
                <TouchableOpacity 
                  key={city.kota_id} 
                  style={[styles.weatherCard, selectedCityId === city.kota_id && styles.weatherCardSelected]} 
                  onPress={() => setSelectedCityId(city.kota_id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.weatherLeft}>
                    <Text style={styles.provinceTag}>{city.provinsi_nama}</Text>
                    <Text style={styles.cityName}>{city.kota_nama}</Text>
                    <Text style={styles.weatherDesc}>{city.kondisi_cuaca || 'Cerah'}</Text>
                  </View>

                  <View style={styles.weatherRight}>
                    <Text style={styles.temperature}>
                      {city.suhu_saat_ini !== null ? Math.round(city.suhu_saat_ini) : '--'}°
                    </Text>
                    <Text style={styles.humidityText}>Lembap {city.kelembapan_saat_ini ?? '--'}%</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}

            {/* Footer Orchestrator & Open Source */}
            <View style={styles.appFooterCard}>
              <Text style={styles.appFooterTitle}>PantauAlam</Text>
              <Text style={styles.appFooterOrchestrator}>Diorchestrasi oleh Sanhaji (System Orchestrator)</Text>
              <Text style={styles.appFooterDesc}>
                100% Full Open Source (Lisensi MIT) &bull; Bebas digunakan dan dikembangkan oleh siapapun untuk mitigasi bencana dan iklim.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  badgeLive: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeLiveText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    paddingTop: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 12,
    color: '#64748b',
  },
  alertBanner: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
  },
  alertTag: {
    fontSize: 9,
    fontWeight: '800',
    color: '#b91c1c',
    letterSpacing: 0.5,
  },
  alertTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#991b1b',
    marginTop: 3,
  },
  alertDesc: {
    fontSize: 11,
    color: '#7f1d1d',
    marginTop: 4,
    lineHeight: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    borderRadius: 10,
    padding: 2,
  },
  tabBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabBtnText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
  },
  tabBtnTextActive: {
    color: '#0f172a',
    fontWeight: '700',
  },
  quakeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
    elevation: 2,
  },
  quakeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  magnitudeBox: {
    width: 54,
    height: 54,
    backgroundColor: '#dc2626',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  magnitudeNumber: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 22,
  },
  magnitudeUnit: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '600',
  },
  quakeInfo: {
    flex: 1,
  },
  quakeTime: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '600',
  },
  quakeRegion: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 2,
  },
  quakeDepth: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  tsunamiBanner: {
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  tsunamiText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#166534',
    textAlign: 'center',
  },
  feltCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  feltLeft: {
    width: 56,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#f1f5f9',
    paddingRight: 10,
    marginRight: 10,
  },
  feltMag: {
    fontSize: 16,
    fontWeight: '800',
    color: '#7c3aed',
  },
  feltDepth: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
  },
  feltRight: {
    flex: 1,
  },
  feltRegion: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  feltMMI: {
    fontSize: 10,
    color: '#7c3aed',
    fontWeight: '600',
    marginTop: 2,
  },
  feltTime: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 1,
  },
  weatherCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  weatherLeft: {
    flex: 1,
  },
  provinceTag: {
    fontSize: 9,
    fontWeight: '700',
    color: '#0284c7',
    textTransform: 'uppercase',
  },
  cityName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 2,
  },
  weatherDesc: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  weatherRight: {
    alignItems: 'flex-end',
  },
  temperature: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0f172a',
  },
  humidityText: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
  },
  emptyCard: {
    padding: 24,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  sectionBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0284c7',
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  airScroll: {
    marginBottom: 10,
  },
  airCard: {
    width: 140,
    borderRadius: 14,
    padding: 14,
    marginRight: 10,
    borderWidth: 1,
    elevation: 1,
  },
  airTag: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  airStation: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 4,
  },
  airValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 8,
  },
  airUnit: {
    fontSize: 9,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 1,
  },
  cityChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#e2e8f0',
    marginRight: 8,
  },
  cityChipActive: {
    backgroundColor: '#0284c7',
  },
  cityChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  cityChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  spotlightCard: {
    backgroundColor: '#0f172a',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  spotlightProv: {
    fontSize: 9,
    fontWeight: '800',
    color: '#38bdf8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  spotlightCity: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 2,
  },
  spotlightDesc: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  spotlightTemp: {
    fontSize: 32,
    fontWeight: '900',
    color: '#ffffff',
  },
  spotlightMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  spotlightMeta: {
    fontSize: 11,
    color: '#cbd5e1',
  },
  weatherCardSelected: {
    borderColor: '#0284c7',
    borderWidth: 1.5,
    backgroundColor: '#f0f9ff',
  },
  appFooterCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 16,
    marginTop: 24,
    marginBottom: 20,
    alignItems: 'center',
  },
  appFooterTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#38bdf8',
    marginBottom: 4,
  },
  appFooterOrchestrator: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  appFooterDesc: {
    fontSize: 10,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 14,
  }
});

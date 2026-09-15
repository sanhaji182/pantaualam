/**
 * =============================================================================
 * MODUL API SERVICE (Frontend React JS)
 * File: src/services/api.js
 * Deskripsi:
 * Mengelola pemanggilan HTTP request (Fetch API) ke Golang Core Gateway.
 * Terdiri dari fungsi untuk mengambil data gempa, cuaca, wilayah, dan login.
 * =============================================================================
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

/**
 * Mengambil data gempa bumi terbaru (M 5.0+ / berpotensi tsunami)
 */
export async function getLatestEarthquake() {
  try {
    const res = await fetch(`${API_BASE_URL}/gempa/terkini`);
    if (!res.ok) throw new Error('Gagal memuat data gempa terkini');
    const json = await res.json();
    return json.data;
  } catch (error) {
    console.error('API Error (getLatestEarthquake):', error);
    return null;
  }
}

/**
 * Mengambil 15 riwayat gempa terakhir
 */
export async function getRecentEarthquakes() {
  try {
    const res = await fetch(`${API_BASE_URL}/gempa/riwayat`);
    if (!res.ok) throw new Error('Gagal memuat riwayat gempa');
    const json = await res.json();
    return json.data || [];
  } catch (error) {
    console.error('API Error (getRecentEarthquakes):', error);
    return [];
  }
}

/**
 * Mengambil ringkasan cuaca untuk seluruh kota terdaftar
 */
export async function getAllWeatherSummary() {
  try {
    const res = await fetch(`${API_BASE_URL}/cuaca`);
    if (!res.ok) throw new Error('Gagal memuat daftar cuaca kota');
    const json = await res.json();
    return json.data || [];
  } catch (error) {
    console.error('API Error (getAllWeatherSummary):', error);
    return [];
  }
}

/**
 * Mengambil detail cuaca 3 hari per jam (data JSONB) untuk satu kota spesifik
 */
export async function getWeatherDetail(kotaId) {
  try {
    const res = await fetch(`${API_BASE_URL}/cuaca/${kotaId}`);
    if (!res.ok) throw new Error(`Gagal memuat detail cuaca kota ${kotaId}`);
    const json = await res.json();
    return json.data;
  } catch (error) {
    console.error('API Error (getWeatherDetail):', error);
    return null;
  }
}

/**
 * Mengambil daftar provinsi untuk dropdown filter
 */
export async function getProvinces() {
  try {
    const res = await fetch(`${API_BASE_URL}/wilayah/provinsi`);
    if (!res.ok) throw new Error('Gagal memuat daftar provinsi');
    const json = await res.json();
    return json.data || [];
  } catch (error) {
    console.error('API Error (getProvinces):', error);
    return [];
  }
}

/**
 * Mengambil daftar 15 gempa bumi terakhir yang dirasakan masyarakat
 */
export async function getFeltEarthquakes() {
  try {
    const res = await fetch(`${API_BASE_URL}/gempa/dirasakan`);
    if (!res.ok) throw new Error('Gagal memuat gempa dirasakan');
    const json = await res.json();
    return json.data || [];
  } catch (error) {
    console.error('API Error (getFeltEarthquakes):', error);
    return [];
  }
}

/**
 * Mengambil daftar peringatan dini cuaca ekstrem resmi BMKG (Nowcast RSS CAP)
 */
export async function getExtremeWeatherAlerts() {
  try {
    const res = await fetch(`${API_BASE_URL}/cuaca/peringatan-dini`);
    if (!res.ok) throw new Error('Gagal memuat peringatan dini cuaca');
    const json = await res.json();
    return json.data || [];
  } catch (error) {
    console.error('API Error (getExtremeWeatherAlerts):', error);
    return [];
  }
}

/**
 * Mengambil data pemantauan kualitas udara partikulat PM2.5 dari Stasiun BMKG
 */
export async function getAirQualityData() {
  try {
    const res = await fetch(`${API_BASE_URL}/kualitas-udara`);
    if (!res.ok) throw new Error('Gagal memuat data kualitas udara');
    const json = await res.json();
    return json.data || [];
  } catch (error) {
    console.error('API Error (getAirQualityData):', error);
    return [];
  }
}



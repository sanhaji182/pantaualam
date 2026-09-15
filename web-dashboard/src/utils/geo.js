/**
 * =============================================================================
 * UTILS GEOLOKASI & PERHITUNGAN JARAK (Haversine Formula)
 * File: src/utils/geo.js
 * Deskripsi:
 * Menghitung jarak garis lurus (great-circle distance) antara dua titik koordinat
 * lintang dan bujur di permukaan bumi dalam satuan kilometer (km).
 * Digunakan untuk mencari stasiun SPKU PM2.5 terdekat dan jarak ke episentrum gempa.
 * =============================================================================
 */

/**
 * Menghitung jarak antara dua koordinat geografis (lat1, lon1) dan (lat2, lon2)
 * menggunakan rumus Trigonometri Spherical Haversine.
 * @returns {number} Jarak dalam kilometer (dibulatkan 1 desimal)
 */
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const p1 = parseFloat(lat1);
  const l1 = parseFloat(lon1);
  const p2 = parseFloat(lat2);
  const l2 = parseFloat(lon2);

  if (isNaN(p1) || isNaN(l1) || isNaN(p2) || isNaN(l2)) {
    return null;
  }

  const R = 6371; // Radius rata-rata bumi dalam kilometer
  const dLat = ((p2 - p1) * Math.PI) / 180;
  const dLon = ((l2 - l1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1 * Math.PI) / 180) *
      Math.cos((p2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 10) / 10;
}

/**
 * Mencari stasiun pemantau kualitas udara (SPKU) BMKG terdekat dari koordinat kota tertentu.
 * @param {number} cityLat
 * @param {number} cityLon
 * @param {Array} stations
 * @returns {Object|null} Objek stasiun beserta properti distanceKm
 */
export function findNearestAirStation(cityLat, cityLon, stations = []) {
  if (!cityLat || !cityLon || !stations || stations.length === 0) return null;

  let nearestStation = null;
  let minDistance = Infinity;

  stations.forEach((station) => {
    if (!station.latitude || !station.longitude) return;
    const dist = calculateDistanceKm(cityLat, cityLon, station.latitude, station.longitude);
    if (dist !== null && dist < minDistance) {
      minDistance = dist;
      nearestStation = { ...station, distanceKm: dist };
    }
  });

  return nearestStation;
}

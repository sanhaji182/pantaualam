/**
 * =============================================================================
 * KONFIGURASI TAILWIND CSS
 * File: tailwind.config.js
 * Deskripsi:
 * Mengatur pemindaian file template HTML/JSX serta mendefinisikan palet warna
 * tema resmi BMKG (biru maritim, oranye peringatan, abu gelap).
 * =============================================================================
 */

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Palet warna khusus identitas NusantaraWeather
        bmkg: {
          blue: "#0A3981",  // Biru laut BMKG
          light: "#E38E49", // Oranye peringatan
          dark: "#1F2937",  // Abu gelap kontras
          teal: "#1F7A8C"   // Biru kehijauan cuaca
        }
      }
    },
  },
  plugins: [],
}

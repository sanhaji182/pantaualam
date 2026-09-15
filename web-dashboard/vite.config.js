import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * =============================================================================
 * KONFIGURASI BUILD TOOLS: VITE (Frontend React JS)
 * File: vite.config.js
 * Deskripsi:
 * Mengatur compiler React cepat berbasis ES-Modules dan konfigurasi reverse proxy
 * lokal agar request '/api' diarahkan otomatis ke backend Golang (port 8080).
 * =============================================================================
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000, // Port lokal dev server web dashboard
    proxy: {
      // Menghindari kendala CORS saat pengujian development lokal
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  }
})

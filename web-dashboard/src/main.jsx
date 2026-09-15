/**
 * =============================================================================
 * ENTRY POINT FRONTEND (React JS 18)
 * File: src/main.jsx
 * Deskripsi:
 * Menginisialisasi React DOM ke elemen root HTML ('#root') dan membungkus
 * komponen utama App dengan React.StrictMode untuk pemeriksaan kualitas kode.
 * =============================================================================
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css' // Memuat utilitas Tailwind CSS dan styling Leaflet

// Me-mount komponen root aplikasi React ke elemen DOM #root di index.html
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

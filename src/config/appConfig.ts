/**
 * Konfigurasi Utama AbsensiPro
 * Agar seluruh device (Device 1, Device 2, HP semua pekerja) yang membuka 1 link yang sama
 * OTOMATIS langsung tersinkronisasi ke Google Sheets tanpa perlu setting manual di tiap HP:
 * 1. Tempelkan URL Google Apps Script Web App Anda pada DEFAULT_GAS_URL di bawah ini, ATAU
 * 2. Set Environment Variable VITE_GAS_URL di Vercel Dashboard, ATAU
 * 3. Bagikan link otomatis menggunakan tombol 'Salin Link Pekerja' yang ada di Tab Admin.
 */
export const APP_CONFIG = {
  // Masukkan URL Google Apps Script Web App Anda di sini jika ingin tertanam permanen di 1 link:
  DEFAULT_GAS_URL: '',
};

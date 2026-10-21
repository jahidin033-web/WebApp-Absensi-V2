import { APP_CONFIG } from '../config/appConfig';
import { AppSettings, AttendanceLog, Employee, Project, ShiftConfig } from '../types';
import { toStandardDriveUrl } from './image';
import { wsClient } from './websocket';

const STORAGE_KEYS = {
  PROJECTS: 'abs_proyek',
  EMPLOYEES: 'abs_karyawan',
  LOGS: 'abs_logs',
  SETTINGS: 'abs_settings',
  PHOTO_CACHE: 'abs_photo_cache',
  THEME: 'abs_theme',
  VIEW_MODE: 'abs_view_mode',
  DELETED_LOGS: 'abs_deleted_logs',
};

/**
 * BroadcastChannel untuk sinkronisasi real-time instan antar-tab di browser yang sama
 */
let bc: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    bc = new BroadcastChannel('absensipro_realtime_channel');
  }
} catch {
  bc = null;
}

export function broadcastLocalChange(type: string, data?: unknown): void {
  try {
    if (bc) {
      bc.postMessage({ type, data, timestamp: Date.now() });
    }
  } catch (e) {
    console.warn('Broadcast error:', e);
  }
}

export function subscribeLocalBroadcast(callback: (msg: { type: string; data?: unknown }) => void): () => void {
  if (!bc) return () => {};
  const handler = (event: MessageEvent) => {
    if (event && event.data) {
      callback(event.data);
    }
  };
  bc.addEventListener('message', handler);
  return () => {
    bc?.removeEventListener('message', handler);
  };
}

/**
 * Rekam log yang dihapus agar tidak muncul kembali saat background sync berjalan
 */
export function recordDeletedLog(userId: string, tanggal: string, jamMasuk?: string, logId?: string): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const raw = localStorage.getItem(STORAGE_KEYS.DELETED_LOGS);
    const set: string[] = raw ? JSON.parse(raw) : [];
    const u = (userId || '').trim().toUpperCase();
    const t = cleanDateString(tanggal);
    const j = cleanTimeString(jamMasuk || '');

    const keys: string[] = [
      `${u}_${t}_${j}`,
      `${u}_${t}`,
    ];
    if (logId) keys.push(String(logId));

    keys.forEach((k) => {
      if (k && !set.includes(k)) {
        set.push(k);
      }
    });

    if (set.length > 500) set.splice(0, set.length - 500);
    localStorage.setItem(STORAGE_KEYS.DELETED_LOGS, JSON.stringify(set));
  } catch (e) {
    console.warn('Record deleted log error:', e);
  }
}

export function isLogDeletedLocally(userId: string, tanggal: string, jamMasuk?: string, logId?: string): boolean {
  try {
    if (typeof localStorage === 'undefined') return false;
    const raw = localStorage.getItem(STORAGE_KEYS.DELETED_LOGS);
    if (!raw) return false;
    const set: string[] = JSON.parse(raw);
    if (logId && set.includes(String(logId))) return true;

    const u = (userId || '').trim().toUpperCase();
    const t = cleanDateString(tanggal);
    const j = cleanTimeString(jamMasuk || '');

    if (set.includes(`${u}_${t}_${j}`)) return true;
    if (set.includes(`${u}_${t}`) && (!j || j === '-')) return true;
    return false;
  } catch {
    return false;
  }
}

export const CENTRAL_GAS_URL: string =
  (APP_CONFIG.DEFAULT_GAS_URL && APP_CONFIG.DEFAULT_GAS_URL.trim()) ||
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GAS_URL
    ? String(import.meta.env.VITE_GAS_URL).trim()
    : '');

export const DEFAULT_PROJECTS: Project[] = [
  {
    id: 'proj-1',
    nama: 'Proyek Gedung A (Tower Office)',
    lat: -6.200000,
    lng: 106.816666,
    radius: 150,
    shiftScheme: '1_SHIFT',
    statusAktif: true,
    shifts: [
      {
        id: 'shift-1-1',
        nama: 'Shift Normal (Pagi)',
        jamMasuk: '08:00',
        jamPulang: '17:00',
        toleransi: 15,
        minJamKerja: 7,
      },
    ],
  },
  {
    id: 'proj-2',
    nama: 'Proyek Jembatan B (Operasional 2 Shift)',
    lat: -6.210000,
    lng: 106.820000,
    radius: 200,
    shiftScheme: '2_SHIFT',
    statusAktif: true,
    shifts: [
      {
        id: 'shift-2-1',
        nama: 'Shift 1 (Pagi/Siang)',
        jamMasuk: '07:00',
        jamPulang: '15:30',
        toleransi: 15,
        minJamKerja: 7,
      },
      {
        id: 'shift-2-2',
        nama: 'Shift 2 (Malam/Lintas Hari)',
        jamMasuk: '19:00',
        jamPulang: '03:30',
        toleransi: 15,
        minJamKerja: 7,
      },
    ],
  },
  {
    id: 'proj-3',
    nama: 'Workshop Fabrikasi Cilegon (3 Shift 24 Jam)',
    lat: -6.002500,
    lng: 106.012500,
    radius: 300,
    shiftScheme: '3_SHIFT',
    statusAktif: true,
    shifts: [
      {
        id: 'shift-3-1',
        nama: 'Shift 1 (Pagi)',
        jamMasuk: '07:00',
        jamPulang: '15:00',
        toleransi: 15,
        minJamKerja: 7,
      },
      {
        id: 'shift-3-2',
        nama: 'Shift 2 (Sore)',
        jamMasuk: '15:00',
        jamPulang: '23:00',
        toleransi: 15,
        minJamKerja: 7,
      },
      {
        id: 'shift-3-3',
        nama: 'Shift 3 (Malam)',
        jamMasuk: '23:00',
        jamPulang: '07:00',
        toleransi: 15,
        minJamKerja: 7,
      },
    ],
  },
];

export const DEFAULT_EMPLOYEES: Employee[] = [];

export const DEFAULT_SETTINGS: AppSettings = {
  companyName: 'PT Konstruksi Pratama Mandiri',
  gasUrl: CENTRAL_GAS_URL || '',
  adminPin: '1234',
  enableVoice: true,
  theme: 'light',
  viewMode: 'responsive',
};

export function getPhotoCache(key: string): string | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const cacheRaw = localStorage.getItem(STORAGE_KEYS.PHOTO_CACHE);
    if (!cacheRaw) return null;
    const cache = JSON.parse(cacheRaw);
    return cache[key.toUpperCase()] || cache[key] || null;
  } catch {
    return null;
  }
}

export function savePhotoCache(key: string, base64: string | null | undefined): void {
  if (!base64 || typeof localStorage === 'undefined') return;
  if (base64.startsWith('http://') || base64.startsWith('https://')) return;
  try {
    const cacheRaw = localStorage.getItem(STORAGE_KEYS.PHOTO_CACHE);
    const cache = cacheRaw ? JSON.parse(cacheRaw) : {};
    cache[key.toUpperCase()] = base64;
    cache[key] = base64;
    const keys = Object.keys(cache);
    if (keys.length > 80) {
      for (let i = 0; i < 20; i++) {
        delete cache[keys[i]];
      }
    }
    localStorage.setItem(STORAGE_KEYS.PHOTO_CACHE, JSON.stringify(cache));
  } catch (err) {
    console.warn('Cache photo warning:', err);
  }
}

export function cleanTimeString(val: unknown): string {
  if (val === null || val === undefined) return '-';
  const str = String(val).trim().replace(/^'/, '');
  if (str === '-' || !str) return '-';
  if (str.includes('1899') || str.includes('GMT') || str.includes('UTC')) {
    const match = str.match(/(\d{1,2}):(\d{2})/);
    if (match) {
      return `${match[1].padStart(2, '0')}:${match[2]}`;
    }
  }
  const timeMatch = str.match(/^(\d{1,2})[:.](\d{2})/);
  if (timeMatch) {
    const hh = timeMatch[1].padStart(2, '0');
    const mm = timeMatch[2];
    return `${hh}:${mm}`;
  }
  return str;
}

export function cleanDateString(val: unknown): string {
  if (!val || val === '-') {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (val instanceof Date) {
    if (isNaN(val.getTime()) || val.getFullYear() === 1899) {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const str = String(val).trim().replace(/^'/, '');
  if (!str || str === '-') {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  // Jika string mengandung GMT / WIB / UTC / nama bulan bahasa Inggris (misal: "Sun May 10 1998 00:00:00 GMT+0700")
  if (str.includes('GMT') || str.includes('UTC') || str.includes('WIB') || /[A-Za-z]{3}\s+[A-Za-z]{3}/.test(str)) {
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime()) && parsed.getFullYear() !== 1899) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      const d = String(parsed.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  const isoMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = isoMatch[2].padStart(2, '0');
    const d = isoMatch[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Jika format DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (dmyMatch) {
    const d = dmyMatch[1].padStart(2, '0');
    const m = dmyMatch[2].padStart(2, '0');
    const y = dmyMatch[3];
    return `${y}-${m}-${d}`;
  }

  return str;
}

/**
 * REVISI 2: Konversi Tanggal Lahir menjadi format umum DD-MM-YYYY (contoh: 10-05-1998)
 * Membersihkan format panjang GMT seperti "Sun May 10 1998 00:00:00 GMT+0700 (Waktu Indonesia Barat)"
 */
export function formatTanggalLahir(val: unknown): string {
  if (!val || val === '-' || val === '') return '-';
  if (val instanceof Date) {
    if (isNaN(val.getTime()) || val.getFullYear() === 1899) return '-';
    const dd = String(val.getDate()).padStart(2, '0');
    const mm = String(val.getMonth() + 1).padStart(2, '0');
    const yyyy = val.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  }
  const str = String(val).trim().replace(/^'/, '');
  if (!str || str === '-') return '-';

  // Jika berupa objek Date atau string dengan zona waktu (Sun May 10 1998 00:00:00 GMT+0700)
  if (str.includes('GMT') || str.includes('WIB') || str.includes('UTC') || str.includes('00:00:00') || /[A-Za-z]{3}\s+[A-Za-z]{3}/.test(str)) {
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime()) && parsed.getFullYear() !== 1899) {
      const dd = String(parsed.getDate()).padStart(2, '0');
      const mm = String(parsed.getMonth() + 1).padStart(2, '0');
      const yyyy = parsed.getFullYear();
      return `${dd}-${mm}-${yyyy}`;
    }
  }

  // Jika format YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (isoMatch) {
    const dd = isoMatch[3].padStart(2, '0');
    const mm = isoMatch[2].padStart(2, '0');
    const yyyy = isoMatch[1];
    return `${dd}-${mm}-${yyyy}`;
  }

  // Jika sudah format DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (dmyMatch) {
    const dd = dmyMatch[1].padStart(2, '0');
    const mm = dmyMatch[2].padStart(2, '0');
    const yyyy = dmyMatch[3];
    return `${dd}-${mm}-${yyyy}`;
  }

  return str;
}

/**
 * Konversi tanggal lahir ke format YYYY-MM-DD untuk input HTML type="date"
 */
export function toIsoDate(val: string): string {
  if (!val || val === '-') return '';
  const clean = val.replace(/[/.]/g, '-').trim();
  const parts = clean.split('-');
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    } else {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }
  return clean;
}

export function loadProjects(): Project[] {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.PROJECTS) : null;
    if (raw) {
      const parsed: Project[] = JSON.parse(raw);
      return parsed.map((p) => {
        const statusAktif = p.statusAktif !== false;
        if (!p.shifts || !Array.isArray(p.shifts) || p.shifts.length === 0) {
          const defaultShift: ShiftConfig = {
            id: `s-${p.id}-1`,
            nama: 'Shift Normal',
            jamMasuk: p.jamMasuk || '08:00',
            jamPulang: '17:00',
            toleransi: p.toleransi || 15,
            minJamKerja: p.minJamKerja || 7,
          };
          return {
            ...p,
            statusAktif,
            shiftScheme: p.shiftScheme || '1_SHIFT',
            shifts: [defaultShift],
          };
        }
        return {
          ...p,
          statusAktif,
        };
      });
    }
  } catch (e) {
    console.error('Failed to load projects from storage', e);
  }
  return DEFAULT_PROJECTS;
}

export function saveProjects(projects: Project[]): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
      broadcastLocalChange('projects_updated', projects);
    }
  } catch (e) {
    console.error('Failed to save projects to storage', e);
  }
}

export function loadEmployees(): Employee[] {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.EMPLOYEES) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((e: Employee) => {
          const cachedSelfie = getPhotoCache(`emp_${e.id}_selfie`) || getPhotoCache(`emp_${e.id.toUpperCase()}_selfie`);
          const cachedKtp = getPhotoCache(`emp_${e.id}_ktp`) || getPhotoCache(`emp_${e.id.toUpperCase()}_ktp`);
          const cachedKk = getPhotoCache(`emp_${e.id}_kk`) || getPhotoCache(`emp_${e.id.toUpperCase()}_kk`);

          const fotoSelfieFinal = (e.fotoSelfie && e.fotoSelfie.startsWith('data:'))
            ? e.fotoSelfie
            : cachedSelfie || toStandardDriveUrl(e.fotoSelfie);

          const fotoKtpFinal = (e.fotoKtp && e.fotoKtp.startsWith('data:'))
            ? e.fotoKtp
            : cachedKtp || toStandardDriveUrl(e.fotoKtp);

          const fotoKkFinal = (e.fotoKk && e.fotoKk.startsWith('data:'))
            ? e.fotoKk
            : cachedKk || toStandardDriveUrl(e.fotoKk);

          const isKtpPdf = Boolean(e.fotoKtpType === 'pdf' || (fotoKtpFinal && fotoKtpFinal.startsWith('data:application/pdf')));
          const isKkPdf = Boolean(e.fotoKkType === 'pdf' || (fotoKkFinal && fotoKkFinal.startsWith('data:application/pdf')));

          return {
            ...e,
            tglLahir: formatTanggalLahir(e.tglLahir),
            ptkp: e.ptkp || 'TK/0',
            fotoKtp: fotoKtpFinal,
            fotoKtpType: isKtpPdf ? 'pdf' : (e.fotoKtpType || 'image'),
            fotoKk: fotoKkFinal,
            fotoKkType: isKkPdf ? 'pdf' : (e.fotoKkType || 'image'),
            fotoSelfie: fotoSelfieFinal,
            statusAktif: e.statusAktif !== false,
            izinBebasLokasi: Boolean(e.izinBebasLokasi),
          };
        });
      }
    }
  } catch (e) {
    console.error('Failed to load employees from storage', e);
  }
  return DEFAULT_EMPLOYEES;
}

export function saveEmployees(employees: Employee[]): void {
  try {
    if (typeof localStorage !== 'undefined') {
      employees.forEach((emp) => {
        if (emp.fotoSelfie) {
          savePhotoCache(`emp_${emp.id.toUpperCase()}_selfie`, emp.fotoSelfie);
        }
        if (emp.fotoKtp && !emp.fotoKtp.startsWith('data:application/pdf')) {
          savePhotoCache(`emp_${emp.id.toUpperCase()}_ktp`, emp.fotoKtp);
        }
        if (emp.fotoKk && !emp.fotoKk.startsWith('data:application/pdf')) {
          savePhotoCache(`emp_${emp.id.toUpperCase()}_kk`, emp.fotoKk);
        }
      });
      localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));
      broadcastLocalChange('employees_updated', employees);
    }
  } catch (e) {
    console.error('Failed to save employees to storage', e);
  }
}

export function loadLogs(): AttendanceLog[] {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.LOGS) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((log: AttendanceLog) => !isLogDeletedLocally(log.userId, log.tanggal, log.jamMasuk, log.id))
          .map((log: AttendanceLog) => {
            const cleanTgl = cleanDateString(log.tanggal);
            const cleanMasuk = cleanTimeString(log.jamMasuk);
            const cleanPulang = cleanTimeString(log.jamPulang);

            const cachedMasuk =
              log.fotoMasuk ||
              getPhotoCache(`${log.userId.toUpperCase()}_${cleanTgl}_in`) ||
              getPhotoCache(`log_${log.id}_in`) ||
              null;
            const cachedPulang =
              log.fotoPulang ||
              getPhotoCache(`${log.userId.toUpperCase()}_${cleanTgl}_out`) ||
              getPhotoCache(`log_${log.id}_out`) ||
              null;

            return {
              ...log,
              tanggal: cleanTgl,
              jamMasuk: cleanMasuk,
              jamPulang: cleanPulang,
              fotoMasuk: toStandardDriveUrl(cachedMasuk),
              fotoPulang: toStandardDriveUrl(cachedPulang),
            };
          });
      }
    }
  } catch (e) {
    console.error('Failed to load logs from storage', e);
  }
  return [];
}

export function saveLogs(logs: AttendanceLog[]): void {
  try {
    if (typeof localStorage !== 'undefined') {
      logs.forEach((log) => {
        const cleanTgl = cleanDateString(log.tanggal);
        if (log.fotoMasuk && log.fotoMasuk.startsWith('data:image')) {
          savePhotoCache(`${log.userId.toUpperCase()}_${cleanTgl}_in`, log.fotoMasuk);
          savePhotoCache(`log_${log.id}_in`, log.fotoMasuk);
        }
        if (log.fotoPulang && log.fotoPulang.startsWith('data:image')) {
          savePhotoCache(`${log.userId.toUpperCase()}_${cleanTgl}_out`, log.fotoPulang);
          savePhotoCache(`log_${log.id}_out`, log.fotoPulang);
        }
      });
      localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
      broadcastLocalChange('logs_updated', logs);
    }
  } catch (e) {
    console.error('Failed to save logs to storage', e);
  }
}

function getUrlSyncParam(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const gasParam = params.get('gas') || params.get('sync') || params.get('gasUrl');
    if (gasParam && gasParam.startsWith('http')) {
      return decodeURIComponent(gasParam).trim();
    }
    if (window.location.hash) {
      const hash = window.location.hash.substring(1);
      const hashParams = new URLSearchParams(hash);
      const hashGas = hashParams.get('gas') || hashParams.get('sync');
      if (hashGas && hashGas.startsWith('http')) {
        return decodeURIComponent(hashGas).trim();
      }
    }
  } catch (err) {
    console.warn('Failed to parse URL sync param:', err);
  }
  return null;
}

export function loadSettings(): AppSettings {
  let settings: AppSettings = DEFAULT_SETTINGS;
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.SETTINGS) : null;
    const rawTheme = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.THEME) : null;
    const rawViewMode = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.VIEW_MODE) : null;

    if (raw) {
      const parsed = JSON.parse(raw);
      settings = {
        companyName:
          typeof parsed.companyName === 'string' && parsed.companyName.trim()
            ? parsed.companyName.trim()
            : DEFAULT_SETTINGS.companyName,
        gasUrl:
          typeof parsed.gasUrl === 'string' && parsed.gasUrl.trim()
            ? parsed.gasUrl.trim()
            : CENTRAL_GAS_URL || '',
        adminPin: typeof parsed.adminPin === 'string' && parsed.adminPin ? parsed.adminPin.trim() : '1234',
        enableVoice: parsed.enableVoice !== undefined ? Boolean(parsed.enableVoice) : true,
        theme: (rawTheme === 'dark' || parsed.theme === 'dark') ? 'dark' : 'light',
        viewMode: (rawViewMode === 'desktop' || parsed.viewMode === 'desktop') ? 'desktop' : (parsed.viewMode === 'mobile' ? 'mobile' : 'responsive'),
      };
    } else if (CENTRAL_GAS_URL) {
      settings.gasUrl = CENTRAL_GAS_URL;
    }
  } catch (e) {
    console.error('Failed to load settings from storage', e);
  }

  const urlGas = getUrlSyncParam();
  if (urlGas && urlGas !== settings.gasUrl) {
    settings.gasUrl = urlGas;
    saveSettings(settings);
    try {
      if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    } catch (_) {}
  }

  if (!settings.gasUrl && CENTRAL_GAS_URL) {
    settings.gasUrl = CENTRAL_GAS_URL;
    saveSettings(settings);
  }

  return settings;
}

export function saveSettings(settings: AppSettings): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
      if (settings.theme) {
        localStorage.setItem(STORAGE_KEYS.THEME, settings.theme);
      }
      if (settings.viewMode) {
        localStorage.setItem(STORAGE_KEYS.VIEW_MODE, settings.viewMode);
      }
      broadcastLocalChange('settings_updated', settings);
    }
  } catch (e) {
    console.error('Failed to save settings to storage', e);
  }
}

export interface CloudSyncResult {
  success: boolean;
  adminPin?: string;
  companyName?: string;
  employees?: Employee[];
  projects?: Project[];
  logs?: AttendanceLog[];
  message?: string;
}

/**
 * Tarik seluruh data pusat dari backend server lokal / Google Sheets
 */
export async function fetchCloudSettings(gasUrl: string): Promise<CloudSyncResult> {
  // 1. Coba ambil dari server API /api/sync jika ada
  try {
    const srvRes = await fetch('/api/sync?t=' + Date.now(), { method: 'GET' });
    if (srvRes.ok) {
      const srvData = await srvRes.json();
      if (srvData && srvData.status === 'success') {
        // Sinkronkan daftar catatan absensi yang telah dihapus agar konsisten di seluruh perangkat
        if (Array.isArray(srvData.deletedLogs)) {
          srvData.deletedLogs.forEach((dl: { userId: string; tanggal: string; jamMasuk?: string; id?: string }) => {
            recordDeletedLog(dl.userId, dl.tanggal, dl.jamMasuk, dl.id);
          });
        }

        const filteredServerLogs = Array.isArray(srvData.logs)
          ? srvData.logs.filter((l: AttendanceLog) => !isLogDeletedLocally(l.userId, l.tanggal, l.jamMasuk, l.id))
          : undefined;

        // PENTING: Hanya simpan karyawan jika server memiliki data (> 0), jangan pernah menimpa dengan array kosong
        if (Array.isArray(srvData.employees) && srvData.employees.length > 0) {
          saveEmployees(srvData.employees);
        }
        if (Array.isArray(srvData.projects) && srvData.projects.length > 0) {
          saveProjects(srvData.projects);
        }
        if (filteredServerLogs) {
          saveLogs(filteredServerLogs);
        }
        if (srvData.adminPin || srvData.companyName) {
          const cur = loadSettings();
          saveSettings({
            ...cur,
            adminPin: srvData.adminPin || cur.adminPin,
            companyName: srvData.companyName || cur.companyName,
          });
        }

        // Jika server lokal sudah memiliki data karyawan ATAU URL GAS belum diatur, kembalikan hasil server
        if ((Array.isArray(srvData.employees) && srvData.employees.length > 0) || !gasUrl || !gasUrl.startsWith('http')) {
          return {
            success: true,
            adminPin: srvData.adminPin,
            companyName: srvData.companyName,
            employees: Array.isArray(srvData.employees) && srvData.employees.length > 0 ? srvData.employees : undefined,
            projects: Array.isArray(srvData.projects) && srvData.projects.length > 0 ? srvData.projects : undefined,
            logs: filteredServerLogs,
          };
        }
        // Jika server belum memiliki data karyawan namun URL Google Sheets ada, lanjutkan ke Google Sheets di bawah
      }
    }
  } catch {
    // Abaikan jika endpoint /api/sync belum siap
  }

  if (!gasUrl || !gasUrl.startsWith('http')) {
    return { success: false, message: 'URL Google Apps Script belum disetel' };
  }

  try {
    const cacheBuster = `t=${Date.now()}&action=get_settings`;
    const finalUrl = gasUrl.includes('?') ? `${gasUrl}&${cacheBuster}` : `${gasUrl}?${cacheBuster}`;

    const res = await fetch(finalUrl, { method: 'GET' });
    if (!res.ok) {
      return { success: false, message: `HTTP status: ${res.status}` };
    }

    const data = await res.json();
    if (data && data.status === 'success') {
      const cleanPin = data.adminPin ? String(data.adminPin).replace(/^'/, '').trim() : undefined;
      const cleanComp = data.companyName ? String(data.companyName).trim() : undefined;

      const current = loadSettings();
      const updated: AppSettings = {
        ...current,
        adminPin: cleanPin || current.adminPin,
        companyName: cleanComp || current.companyName,
        gasUrl: current.gasUrl || gasUrl,
      };
      saveSettings(updated);

      // 1. SINKRONISASI KARYAWAN
      let mergedEmployees: Employee[] | undefined;
      if (Array.isArray(data.employees)) {
        const localEmployees = loadEmployees();
        const empMap = new Map<string, Employee>();
        localEmployees.forEach((e) => empMap.set(e.id.toUpperCase(), e));

        data.employees.forEach((e: Employee & { status?: string; bebasLokasi?: string }) => {
          if (e && e.id) {
            const existing = empMap.get(e.id.toUpperCase());
            let isAktif = true;
            if (e.statusAktif !== undefined) {
              isAktif = Boolean(e.statusAktif);
            } else if (e.status) {
              isAktif = String(e.status).trim().toLowerCase() !== 'nonaktif';
            } else if (existing?.statusAktif !== undefined) {
              isAktif = existing.statusAktif;
            }

            let isBebas = false;
            if (e.izinBebasLokasi !== undefined) {
              isBebas = Boolean(e.izinBebasLokasi);
            } else if (e.bebasLokasi) {
              const bStr = String(e.bebasLokasi).trim().toLowerCase();
              isBebas = bStr === 'ya' || bStr === 'true';
            } else if (existing?.izinBebasLokasi !== undefined) {
              isBebas = Boolean(existing.izinBebasLokasi);
            }

            const cachedSelfie = getPhotoCache(`emp_${e.id.toUpperCase()}_selfie`);
            const cachedKtp = getPhotoCache(`emp_${e.id.toUpperCase()}_ktp`);
            const cachedKk = getPhotoCache(`emp_${e.id.toUpperCase()}_kk`);

            // REVISI 1: Standardisasikan ke URL Google Drive resmi
            const fotoKtpFinal = (existing?.fotoKtp && (existing.fotoKtp.startsWith('data:image') || existing.fotoKtp.startsWith('data:application/pdf')))
              ? existing.fotoKtp
              : cachedKtp || toStandardDriveUrl(e.fotoKtp || existing?.fotoKtp || '');

            const fotoKkFinal = (existing?.fotoKk && (existing.fotoKk.startsWith('data:image') || existing.fotoKk.startsWith('data:application/pdf')))
              ? existing.fotoKk
              : cachedKk || toStandardDriveUrl(e.fotoKk || existing?.fotoKk || '');

            const fotoSelfieFinal = (existing?.fotoSelfie && existing.fotoSelfie.startsWith('data:image'))
              ? existing.fotoSelfie
              : cachedSelfie || toStandardDriveUrl(e.fotoSelfie || existing?.fotoSelfie || '');

            const isKtpPdf = Boolean(fotoKtpFinal && fotoKtpFinal.startsWith('data:application/pdf'));
            const isKkPdf = Boolean(fotoKkFinal && fotoKkFinal.startsWith('data:application/pdf'));

            empMap.set(e.id.toUpperCase(), {
              id: e.id,
              nama: e.nama || existing?.nama || e.id,
              nik: e.nik ? String(e.nik).replace(/^'/, '').trim() : existing?.nik || '',
              tglLahir: formatTanggalLahir(e.tglLahir || existing?.tglLahir || ''),
              dept: e.dept || existing?.dept || '',
              jabatan: e.jabatan || existing?.jabatan || '',
              phone: e.phone || existing?.phone || '',
              ptkp: e.ptkp || existing?.ptkp || 'TK/0',
              fotoKtp: fotoKtpFinal,
              fotoKtpType: isKtpPdf ? 'pdf' : (existing?.fotoKtpType || 'image'),
              fotoKk: fotoKkFinal,
              fotoKkType: isKkPdf ? 'pdf' : (existing?.fotoKkType || 'image'),
              fotoSelfie: fotoSelfieFinal,
              statusAktif: isAktif,
              izinBebasLokasi: isBebas,
              registeredAt: existing?.registeredAt || e.registeredAt || Date.now(),
            });
          }
        });
        mergedEmployees = Array.from(empMap.values());
        saveEmployees(mergedEmployees);
        if (mergedEmployees.length > 0) {
          fetch('/api/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'sync_employees', employees: mergedEmployees }),
          }).catch(() => {});
        }
      }

      // 2. SINKRONISASI PROYEK
      let syncedProjects: Project[] | undefined;
      if (Array.isArray(data.projects) && data.projects.length > 0) {
        syncedProjects = (data.projects as Project[]).map((p) => ({
          ...p,
          statusAktif: p.statusAktif !== false,
        }));
        saveProjects(syncedProjects);
      }

      // 3. SINKRONISASI REKAP ABSENSI (REVISI 3 & 4: Konsistensi URL Drive & Hapus Permanen)
      let mergedLogs: AttendanceLog[] | undefined;
      if (Array.isArray(data.logs)) {
        const cloudLogs = (data.logs as AttendanceLog[]).filter(
          (cloudLog) => !isLogDeletedLocally(cloudLog.userId, cloudLog.tanggal, cloudLog.jamMasuk, cloudLog.id)
        );

        mergedLogs = cloudLogs.map((cloudLog) => {
          const cleanTgl = cleanDateString(cloudLog.tanggal);
          const cleanMasuk = cleanTimeString(cloudLog.jamMasuk);
          const cleanPulang = cleanTimeString(cloudLog.jamPulang);

          // Konsistenkan URL Google Drive resmi untuk foto masuk dan pulang
          const photoMasukFinal = toStandardDriveUrl(
            cloudLog.fotoMasuk ||
            getPhotoCache(`${cloudLog.userId.toUpperCase()}_${cleanTgl}_in`) ||
            getPhotoCache(`log_${cloudLog.id}_in`) ||
            null
          );

          const photoPulangFinal = toStandardDriveUrl(
            cloudLog.fotoPulang ||
            getPhotoCache(`${cloudLog.userId.toUpperCase()}_${cleanTgl}_out`) ||
            getPhotoCache(`log_${cloudLog.id}_out`) ||
            null
          );

          return {
            id: cloudLog.id || `LOG-${Date.now()}-${Math.random()}`,
            userId: cloudLog.userId.toUpperCase(),
            nama: cloudLog.nama || cloudLog.userId,
            proyek: cloudLog.proyek || '-',
            shiftNama: cloudLog.shiftNama || '-',
            tanggal: cleanTgl,
            jamMasuk: cleanMasuk,
            jamPulang: cleanPulang,
            status: cloudLog.status || 'Hadir',
            durasiJam: cloudLog.durasiJam !== undefined ? Number(cloudLog.durasiJam) : 0,
            keterangan: cloudLog.keterangan || '',
            fotoMasuk: photoMasukFinal,
            fotoPulang: photoPulangFinal,
            userLat: cloudLog.userLat !== undefined ? Number(cloudLog.userLat) : undefined,
            userLng: cloudLog.userLng !== undefined ? Number(cloudLog.userLng) : undefined,
            jarakMeter: cloudLog.jarakMeter,
            isBebasLokasi: Boolean(cloudLog.isBebasLokasi),
            createdAt: cloudLog.createdAt || Date.now(),
          };
        }).sort((a, b) => {
          const timeA = `${a.tanggal} ${a.jamMasuk}`;
          const timeB = `${b.tanggal} ${b.jamMasuk}`;
          return timeB.localeCompare(timeA);
        });

        saveLogs(mergedLogs);
      }

      return {
        success: true,
        adminPin: cleanPin,
        companyName: cleanComp,
        employees: mergedEmployees,
        projects: syncedProjects,
        logs: mergedLogs,
      };
    }
    return { success: false, message: data.message || 'Respon format tidak sesuai' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Gagal sinkron cloud';
    return { success: false, message: msg };
  }
}

export function generateDeviceSyncUrl(gasUrl: string): string {
  if (typeof window === 'undefined') return '';
  const origin = window.location.origin + window.location.pathname;
  if (!gasUrl) return origin;
  return `${origin}?gas=${encodeURIComponent(gasUrl.trim())}`;
}

export async function syncToGoogleSheets(
  gasUrl: string,
  action: 'absen' | 'hapus_absen' | 'daftar_karyawan' | 'edit_karyawan' | 'test_koneksi' | 'update_settings' | 'sync_projects' | 'sync_employees',
  payload: Record<string, unknown>
): Promise<{ success: boolean; message?: string }> {
  // Kirim melalui WebSocket dan server API agar seluruh device sinkron seketika
  try {
    wsClient.sendAction(action, payload);
  } catch {
    // Abaikan jika offline
  }

  if (!gasUrl || !gasUrl.startsWith('http')) {
    return { success: false, message: 'URL Google Apps Script belum diisi' };
  }

  const cleanGasUrl = gasUrl.trim();
  const sanitizedPayload: Record<string, unknown> = { ...payload };

  if ('jamMasuk' in sanitizedPayload) {
    sanitizedPayload.jamMasuk = cleanTimeString(sanitizedPayload.jamMasuk);
  }
  if ('jamPulang' in sanitizedPayload) {
    sanitizedPayload.jamPulang = cleanTimeString(sanitizedPayload.jamPulang);
  }
  if ('tanggal' in sanitizedPayload) {
    sanitizedPayload.tanggal = cleanDateString(sanitizedPayload.tanggal);
  }
  if ('tglLahir' in sanitizedPayload) {
    sanitizedPayload.tglLahir = formatTanggalLahir(sanitizedPayload.tglLahir);
  }
  if ('fotoMasuk' in sanitizedPayload && typeof sanitizedPayload.fotoMasuk === 'string' && !sanitizedPayload.fotoMasuk.startsWith('data:')) {
    sanitizedPayload.fotoMasuk = toStandardDriveUrl(sanitizedPayload.fotoMasuk);
  }
  if ('fotoPulang' in sanitizedPayload && typeof sanitizedPayload.fotoPulang === 'string' && !sanitizedPayload.fotoPulang.startsWith('data:')) {
    sanitizedPayload.fotoPulang = toStandardDriveUrl(sanitizedPayload.fotoPulang);
  }

  if (action === 'update_settings') {
    try {
      const pin = sanitizedPayload.adminPin ? encodeURIComponent(String(sanitizedPayload.adminPin).trim()) : '';
      const comp = sanitizedPayload.companyName ? encodeURIComponent(String(sanitizedPayload.companyName).trim()) : '';
      const getSyncUrl = cleanGasUrl.includes('?')
        ? `${cleanGasUrl}&action=update_settings&adminPin=${pin}&companyName=${comp}&t=${Date.now()}`
        : `${cleanGasUrl}?action=update_settings&adminPin=${pin}&companyName=${comp}&t=${Date.now()}`;
      await fetch(getSyncUrl, { method: 'GET' });
    } catch (e) {
      console.warn('GET update_settings sync warning:', e);
    }
  }

  try {
    await fetch(cleanGasUrl, {
      method: 'POST',
      mode: 'no-cors',
      body: JSON.stringify({ action, timestamp: new Date().toISOString(), ...sanitizedPayload }),
    });
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Koneksi gagal';
    console.warn('Google Sheets sync error:', err);
    return { success: false, message: msg };
  }
}

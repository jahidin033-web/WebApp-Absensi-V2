import express, { Request, Response } from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const PORT = Number(process.env.PORT) || 3000;

// Izinkan payload hingga 50MB agar file foto KTP & KK resolusi tinggi asli dapat diproses tanpa kompresi
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Direktori penyimpanan persistent database JSON di server
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface ServerDb {
  employees: Record<string, unknown>[];
  projects: Record<string, unknown>[];
  logs: Record<string, unknown>[];
  deletedLogs: Array<{ userId: string; tanggal: string; jamMasuk?: string; id?: string }>;
  adminPin: string;
  companyName: string;
  lastUpdated: number;
}

const DEFAULT_PROJECTS = [
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

let dbState: ServerDb = {
  employees: [],
  projects: DEFAULT_PROJECTS,
  logs: [],
  deletedLogs: [],
  adminPin: '1234',
  companyName: 'PT Konstruksi Pratama Mandiri',
  lastUpdated: Date.now(),
};

// Baca data tersimpan dari disk saat server boot
try {
  if (fs.existsSync(DB_FILE)) {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    dbState = { ...dbState, ...parsed };
    if (!Array.isArray(dbState.deletedLogs)) {
      dbState.deletedLogs = [];
    }
    if (!Array.isArray(dbState.projects) || dbState.projects.length === 0) {
      dbState.projects = DEFAULT_PROJECTS;
    }
  }
} catch (e) {
  console.warn('Failed to load db.json, using defaults:', e);
}

function persistDb() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(dbState, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Failed to write db.json:', e);
  }
}

// -------------------------------------------------------------
// WEBSOCKET SERVER: SINKRONISASI REAL-TIME DUA ARAH INSTAN
// -------------------------------------------------------------
const wss = new WebSocketServer({ server, path: '/ws' });

// SSE Clients Set untuk fallback backward compatibility
const sseClients = new Set<Response>();

function broadcastRealtimeUpdate(type: string, data: unknown) {
  const payload = JSON.stringify({ type, data, timestamp: Date.now() });

  // 1. Broadcast seketika ke seluruh WebSocket client yang terhubung di device mana pun
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(payload);
      } catch (err) {
        console.warn('[WebSocket] Error sending to client:', err);
      }
    }
  });

  // 2. Broadcast ke SSE client (fallback)
  for (const client of sseClients) {
    try {
      client.write(`data: ${payload}\n\n`);
    } catch {
      sseClients.delete(client);
    }
  }
}

// Heartbeat ping interval untuk menjaga koneksi WebSocket tetap hidup di semua browser/HP
const HEARTBEAT_INTERVAL = 25000;
const heartbeatTimer = setInterval(() => {
  wss.clients.forEach((ws: WebSocket & { isAlive?: boolean }) => {
    if (ws.isAlive === false) {
      return ws.terminate();
    }
    ws.isAlive = false;
    try {
      ws.ping();
    } catch {
      ws.terminate();
    }
  });
}, HEARTBEAT_INTERVAL);

wss.on('close', () => {
  clearInterval(heartbeatTimer);
});

wss.on('connection', (ws: WebSocket & { isAlive?: boolean }, req) => {
  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  // Kirim kondisi database pusat terkini seketika saat client tersambung
  const initMessage = JSON.stringify({
    type: 'init',
    data: {
      employees: dbState.employees,
      projects: dbState.projects,
      logs: dbState.logs,
      deletedLogs: dbState.deletedLogs,
      adminPin: dbState.adminPin,
      companyName: dbState.companyName,
      lastUpdated: dbState.lastUpdated,
    },
    timestamp: Date.now(),
  });
  ws.send(initMessage);

  ws.on('message', (messageData) => {
    try {
      const msgStr = typeof messageData === 'string' ? messageData : messageData.toString();
      const parsed = JSON.parse(msgStr);

      if (parsed.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        return;
      }

      if (parsed.type === 'request_sync') {
        ws.send(
          JSON.stringify({
            type: 'init',
            data: {
              employees: dbState.employees,
              projects: dbState.projects,
              logs: dbState.logs,
              deletedLogs: dbState.deletedLogs,
              adminPin: dbState.adminPin,
              companyName: dbState.companyName,
              lastUpdated: dbState.lastUpdated,
            },
            timestamp: Date.now(),
          })
        );
        return;
      }

      if (parsed.type === 'action' && parsed.action) {
        processAction(parsed.action, parsed.payload || {});
      }
    } catch (err) {
      console.warn('[WebSocket] Gagal memproses pesan client:', err);
    }
  });

  ws.on('error', (err) => {
    console.warn('[WebSocket Client Error]:', err);
  });
});

// Helper pembersih string tanggal & jam
function cleanDateStr(val: unknown): string {
  if (!val || val === '-') return '';
  const str = String(val).trim().replace(/^'/, '');
  const m = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  const dmy = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  return str;
}

function cleanTimeStr(val: unknown): string {
  if (!val || val === '-') return '-';
  const str = String(val).trim().replace(/^'/, '');
  const m = str.match(/(\d{1,2}):(\d{2})/);
  if (m) return `${m[1].padStart(2, '0')}:${m[2]}`;
  return str;
}

/**
 * Pemroses Logika Aksi Database Terpusat:
 * Mengupdate `dbState`, menyimpan ke file `data/db.json`,
 * lalu membroadcast seketika via WebSocket ke seluruh perangkat lain.
 */
function processAction(action: string, payload: Record<string, unknown>) {
  if (action === 'hapus_absen') {
    const targetId = payload.id ? String(payload.id).trim() : '';
    const targetUser = payload.userId ? String(payload.userId).trim().toUpperCase() : '';
    const targetTgl = cleanDateStr(payload.tanggal);
    const targetJam = cleanTimeStr(payload.jamMasuk);

    if (!Array.isArray(dbState.deletedLogs)) {
      dbState.deletedLogs = [];
    }
    dbState.deletedLogs.push({
      id: targetId,
      userId: targetUser,
      tanggal: targetTgl,
      jamMasuk: targetJam,
    });

    dbState.logs = dbState.logs.filter((l) => {
      if (targetId && String(l.id).trim() === targetId) return false;
      const lUser = String(l.userId || '').trim().toUpperCase();
      const lTgl = cleanDateStr(l.tanggal);
      const lJam = cleanTimeStr(l.jamMasuk);
      if (targetUser && targetTgl && lUser === targetUser && lTgl === targetTgl) {
        if (!targetJam || targetJam === '-' || lJam === targetJam || lJam === '-') {
          return false;
        }
      }
      return true;
    });

    dbState.lastUpdated = Date.now();
    persistDb();

    broadcastRealtimeUpdate('log_deleted', {
      id: targetId,
      userId: targetUser,
      tanggal: targetTgl,
      jamMasuk: targetJam,
      logs: dbState.logs,
      deletedLogs: dbState.deletedLogs,
    });
    return { status: 'success', logs: dbState.logs };
  }

  if (action === 'absen') {
    const rawUserId = String(payload.userId || '').trim().toUpperCase();
    if (!rawUserId) {
      return { status: 'error', message: 'ID Karyawan wajib diisi.' };
    }
    // Validasi apakah karyawan terdaftar dan aktif dalam database
    const existingEmp = Array.isArray(dbState.employees)
      ? dbState.employees.find((e) => String(e.id || '').trim().toUpperCase() === rawUserId)
      : null;

    if (!existingEmp) {
      console.warn(`[Absen Server Blocked] ID Karyawan "${rawUserId}" belum terdaftar dalam database.`);
      return { status: 'error', message: `ID Karyawan ${rawUserId} belum terdaftar dalam database.` };
    }

    if (existingEmp.statusAktif === false || existingEmp.statusAktif === 'Nonaktif' || (existingEmp as any).status === 'Nonaktif') {
      console.warn(`[Absen Server Blocked] Akun "${rawUserId}" berstatus Nonaktif.`);
      return { status: 'error', message: `Akun karyawan ${existingEmp.nama || rawUserId} berstatus Nonaktif dalam database.` };
    }

    const existingIdx = (dbState.logs as Array<{ userId: string; tanggal: string }>).findIndex(
      (l) => l.userId?.toUpperCase() === rawUserId && l.tanggal === payload.tanggal
    );

    if (existingIdx >= 0) {
      dbState.logs[existingIdx] = {
        ...dbState.logs[existingIdx],
        ...payload,
      };
    } else {
      dbState.logs.unshift({
        id: `LOG-SRV-${Date.now()}`,
        ...payload,
        createdAt: Date.now(),
      });
    }

    dbState.lastUpdated = Date.now();
    persistDb();
    broadcastRealtimeUpdate('logs_updated', dbState.logs);
    return { status: 'success', logs: dbState.logs };
  }

  if (action === 'daftar_karyawan') {
    const rawTgl = payload.tglLahir ? String(payload.tglLahir).trim() : '';
    let cleanTgl = rawTgl;
    const isoM = rawTgl.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (isoM) {
      cleanTgl = `${isoM[3].padStart(2, '0')}-${isoM[2].padStart(2, '0')}-${isoM[1]}`;
    }

    const emp = {
      id: payload.id,
      nama: payload.nama,
      nik: payload.nik,
      tglLahir: cleanTgl,
      dept: payload.dept,
      jabatan: payload.jabatan,
      phone: payload.phone,
      ptkp: payload.ptkp || 'TK/0',
      fotoKtp: payload.fotoKtp,
      fotoKtpType: payload.fotoKtpType || 'image',
      fotoKtpName: payload.fotoKtpName,
      fotoKk: payload.fotoKk,
      fotoKkType: payload.fotoKkType || 'image',
      fotoKkName: payload.fotoKkName,
      fotoSelfie: payload.fotoSelfie,
      statusAktif: payload.statusAktif !== 'Nonaktif' && payload.statusAktif !== false,
      izinBebasLokasi: payload.izinBebasLokasi === 'Ya' || payload.izinBebasLokasi === true,
      registeredAt: Date.now(),
    };

    const existingEmpIdx = dbState.employees.findIndex((e) => String(e.id).toUpperCase() === String(emp.id).toUpperCase());
    if (existingEmpIdx >= 0) {
      dbState.employees[existingEmpIdx] = emp;
    } else {
      dbState.employees.push(emp);
    }

    dbState.lastUpdated = Date.now();
    persistDb();
    broadcastRealtimeUpdate('employees_updated', dbState.employees);
    return { status: 'success', employees: dbState.employees };
  }

  if (action === 'sync_employees') {
    if (Array.isArray(payload.employees) && payload.employees.length > 0) {
      dbState.employees = payload.employees;
      dbState.lastUpdated = Date.now();
      persistDb();
      broadcastRealtimeUpdate('employees_updated', dbState.employees);
    }
    return { status: 'success', employees: dbState.employees };
  }

  if (action === 'sync_projects') {
    if (Array.isArray(payload.projects) && payload.projects.length > 0) {
      dbState.projects = payload.projects;
      dbState.lastUpdated = Date.now();
      persistDb();
      broadcastRealtimeUpdate('projects_updated', dbState.projects);
    }
    return { status: 'success', projects: dbState.projects };
  }

  if (action === 'update_settings') {
    if (payload.adminPin) dbState.adminPin = String(payload.adminPin).trim();
    if (payload.companyName) dbState.companyName = String(payload.companyName).trim();
    dbState.lastUpdated = Date.now();
    persistDb();
    broadcastRealtimeUpdate('settings_updated', { adminPin: dbState.adminPin, companyName: dbState.companyName });
    return { status: 'success', adminPin: dbState.adminPin, companyName: dbState.companyName };
  }

  return { status: 'success', lastUpdated: dbState.lastUpdated };
}

// -------------------------------------------------------------
// REST API ENDPOINTS
// -------------------------------------------------------------

// SSE stream (fallback)
app.get('/api/realtime', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  res.write(`data: ${JSON.stringify({ type: 'connected', data: dbState })}\n\n`);
  sseClients.add(res);

  req.on('close', () => {
    sseClients.delete(res);
  });
});

// GET database state
app.get('/api/sync', (_req: Request, res: Response) => {
  res.json({
    status: 'success',
    ...dbState,
  });
});

// POST sync action
app.post('/api/sync', (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const { action } = body;
    const result = processAction(action, body);
    res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Sync error';
    res.status(500).json({ status: 'error', message: msg });
  }
});

// Setup Vite Dev Middleware or Static Production Serving
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[AbsensiPro Server with WebSocket] Running on http://0.0.0.0:${PORT} and ws://0.0.0.0:${PORT}/ws`);
  });
}

startServer();

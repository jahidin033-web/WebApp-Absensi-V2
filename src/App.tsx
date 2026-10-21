import { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { BottomNav, MainTab } from './components/BottomNav';
import { WorkerAttendance } from './components/WorkerAttendance';
import { WorkerLogs } from './components/WorkerLogs';
import { AdminPanel } from './components/AdminPanel';
import { PhotoLightbox } from './components/PhotoLightbox';
import { Toast, ToastMessage } from './components/Toast';
import {
  AppSettings,
  AttendanceLog,
  Employee,
  Project,
} from './types';
import {
  fetchCloudSettings,
  loadEmployees,
  loadLogs,
  loadProjects,
  loadSettings,
  saveEmployees,
  saveLogs,
  saveProjects,
  saveSettings,
  subscribeLocalBroadcast,
  isLogDeletedLocally,
  recordDeletedLog,
} from './utils/storage';
import { wsClient } from './utils/websocket';

export default function App() {
  const [projects, setProjects] = useState<Project[]>(loadProjects);
  const [employees, setEmployees] = useState<Employee[]>(loadEmployees);
  const [logs, setLogs] = useState<AttendanceLog[]>(loadLogs);
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [currentTab, setCurrentTab] = useState<MainTab>('pekerja');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // FITUR 1: Mode Malam (Dark Mode)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = loadSettings();
    if (saved.theme === 'dark') return true;
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return true;
    }
    return false;
  });

  // FITUR 1: Mode Desktop (Tampilan Dashboard Proporsional & Lebar)
  const [isDesktopView, setIsDesktopView] = useState<boolean>(() => {
    const saved = loadSettings();
    if (saved.viewMode === 'desktop') return true;
    if (saved.viewMode === 'mobile') return false;
    return typeof window !== 'undefined' && window.innerWidth >= 1024;
  });

  // Apply dark mode class to html & body element
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    const nextDark = !isDarkMode;
    setIsDarkMode(nextDark);
    const updated: AppSettings = {
      ...settings,
      theme: nextDark ? 'dark' : 'light',
    };
    setSettings(updated);
    saveSettings(updated);
    showToast(
      nextDark ? 'Beralih ke Mode Malam (Gelap)' : 'Beralih ke Mode Siang (Terang)',
      'info'
    );
  };

  const toggleDesktopView = () => {
    const nextDesktop = !isDesktopView;
    setIsDesktopView(nextDesktop);
    const updated: AppSettings = {
      ...settings,
      viewMode: nextDesktop ? 'desktop' : 'mobile',
    };
    setSettings(updated);
    saveSettings(updated);
    showToast(
      nextDesktop ? 'Beralih ke Tampilan Mode Desktop' : 'Beralih ke Tampilan Mode Mobile',
      'info'
    );
  };

  const showToast = useCallback((message: string, type: 'success' | 'danger' | 'warning' | 'info' = 'info') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const newToast: ToastMessage = { id, message, type };
    setToasts((prev) => [...prev, newToast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // FITUR 4: SINKRONISASI REAL-TIME MULTI-DEVICE
  // Sinkronisasi dengan Server & Google Sheets
  const syncWithCloud = useCallback(async (silent = true) => {
    setIsSyncing(true);
    try {
      const res = await fetchCloudSettings(settings.gasUrl);
      if (res.success) {
        if (res.adminPin || res.companyName) {
          setSettings((prev) => ({
            ...prev,
            adminPin: res.adminPin || prev.adminPin,
            companyName: res.companyName || prev.companyName,
          }));
        }
        if (res.employees && Array.isArray(res.employees) && res.employees.length > 0) {
          setEmployees(res.employees);
        }
        if (res.projects && Array.isArray(res.projects) && res.projects.length > 0) {
          setProjects(res.projects);
        }
        if (res.logs && Array.isArray(res.logs)) {
          setLogs(res.logs);
        }
        if (!silent) {
          showToast('Data berhasil disinkronkan dari Cloud!', 'success');
        }
      } else if (!silent) {
        showToast(`Gagal sinkron: ${res.message}`, 'danger');
      }
    } catch (e) {
      console.warn('Sync error:', e);
    } finally {
      setIsSyncing(false);
    }
  }, [settings.gasUrl, showToast]);

  // FITUR 4: SINKRONISASI REAL-TIME WEBSOCKET DUA ARAH (MULTI-DEVICE INSTAN)
  useEffect(() => {
    // Sinkronkan karyawan dan proyek lokal ke server agar server terisi saat inisialisasi awal
    const localEmps = loadEmployees();
    if (localEmps.length > 0) {
      wsClient.sendAction('sync_employees', { employees: localEmps });
    }
    const localProjects = loadProjects();
    if (localProjects.length > 0) {
      wsClient.sendAction('sync_projects', { projects: localProjects });
    }

    // Inisialisasi koneksi WebSocket
    wsClient.connect();
    setIsRealtimeConnected(wsClient.getIsConnected());

    const unsubConn = wsClient.on('connection_change', (connected) => {
      setIsRealtimeConnected(Boolean(connected));
    });

    const handleApplySyncData = (data: any) => {
      if (!data) return;
      if (Array.isArray(data.deletedLogs)) {
        data.deletedLogs.forEach((dl: { userId: string; tanggal: string; jamMasuk?: string; id?: string }) => {
          recordDeletedLog(dl.userId, dl.tanggal, dl.jamMasuk, dl.id);
        });
      }
      if (Array.isArray(data.employees) && data.employees.length > 0) {
        setEmployees(data.employees);
        saveEmployees(data.employees);
      }
      if (Array.isArray(data.projects) && data.projects.length > 0) {
        setProjects(data.projects);
        saveProjects(data.projects);
      }
      if (Array.isArray(data.logs)) {
        const filtered = data.logs.filter((l: AttendanceLog) => !isLogDeletedLocally(l.userId, l.tanggal, l.jamMasuk, l.id));
        setLogs(filtered);
        saveLogs(filtered);
      }
      if (data.adminPin || data.companyName) {
        setSettings((prev) => {
          const next = {
            ...prev,
            adminPin: data.adminPin || prev.adminPin,
            companyName: data.companyName || prev.companyName,
          };
          saveSettings(next);
          return next;
        });
      }
    };

    const unsubInit = wsClient.on('init', handleApplySyncData);
    const unsubSyncUpdate = wsClient.on('sync_update', handleApplySyncData);
    const unsubConnected = wsClient.on('connected', handleApplySyncData);

    const unsubLogs = wsClient.on('logs_updated', (data) => {
      if (Array.isArray(data)) {
        const filtered = data.filter((l: AttendanceLog) => !isLogDeletedLocally(l.userId, l.tanggal, l.jamMasuk, l.id));
        setLogs(filtered);
        saveLogs(filtered);
      }
    });

    const handleLogDeleted = (data: any) => {
      if (data?.userId && data?.tanggal) {
        recordDeletedLog(data.userId, data.tanggal, data.jamMasuk, data.id);
      }
      if (Array.isArray(data?.logs)) {
        const filtered = data.logs.filter((l: AttendanceLog) => !isLogDeletedLocally(l.userId, l.tanggal, l.jamMasuk, l.id));
        setLogs(filtered);
        saveLogs(filtered);
      } else {
        setLogs((prev) => {
          const updated = prev.filter((l) => !isLogDeletedLocally(l.userId, l.tanggal, l.jamMasuk, l.id));
          saveLogs(updated);
          return updated;
        });
      }
    };

    const unsubLogDeleted = wsClient.on('log_deleted', handleLogDeleted);

    const unsubEmps = wsClient.on('employees_updated', (data) => {
      if (Array.isArray(data) && data.length > 0) {
        setEmployees(data as Employee[]);
        saveEmployees(data as Employee[]);
      }
    });

    const unsubProjects = wsClient.on('projects_updated', (data) => {
      if (Array.isArray(data) && data.length > 0) {
        setProjects(data as Project[]);
        saveProjects(data as Project[]);
      }
    });

    const unsubSettings = wsClient.on('settings_updated', (data: any) => {
      if (data) {
        setSettings((prev) => {
          const next = {
            ...prev,
            adminPin: data.adminPin || prev.adminPin,
            companyName: data.companyName || prev.companyName,
          };
          saveSettings(next);
          return next;
        });
      }
    });

    // Fallback SSE Listener (jika WebSocket terhalang proxy lawas)
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/realtime');
      eventSource.onopen = () => setIsRealtimeConnected(true);
      eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (!parsed) return;
          if (parsed.type === 'connected' || parsed.type === 'init') {
            handleApplySyncData(parsed.data);
          } else if (parsed.type === 'employees_updated' && Array.isArray(parsed.data) && parsed.data.length > 0) {
            setEmployees(parsed.data);
            saveEmployees(parsed.data);
          } else if (parsed.type === 'projects_updated' && Array.isArray(parsed.data) && parsed.data.length > 0) {
            setProjects(parsed.data);
            saveProjects(parsed.data);
          } else if (parsed.type === 'logs_updated' && Array.isArray(parsed.data)) {
            const filtered = parsed.data.filter((l: AttendanceLog) => !isLogDeletedLocally(l.userId, l.tanggal, l.jamMasuk, l.id));
            setLogs(filtered);
            saveLogs(filtered);
          } else if (parsed.type === 'log_deleted') {
            handleLogDeleted(parsed.data);
          }
        } catch {
          // Abaikan
        }
      };
    } catch {
      // Abaikan jika tidak didukung
    }

    // Subscribe to BroadcastChannel for multi-tab realtime sync pada browser yang sama
    const unsubscribeBroadcast = subscribeLocalBroadcast((msg) => {
      if (msg.type === 'employees_updated' && Array.isArray(msg.data) && msg.data.length > 0) {
        setEmployees(msg.data as Employee[]);
      } else if (msg.type === 'projects_updated' && Array.isArray(msg.data) && msg.data.length > 0) {
        setProjects(msg.data as Project[]);
      } else if (msg.type === 'logs_updated' && Array.isArray(msg.data)) {
        const filtered = (msg.data as AttendanceLog[]).filter((l) => !isLogDeletedLocally(l.userId, l.tanggal, l.jamMasuk, l.id));
        setLogs(filtered);
      } else if (msg.type === 'settings_updated' && msg.data) {
        setSettings(msg.data as AppSettings);
      }
    });

    return () => {
      unsubConn();
      unsubInit();
      unsubSyncUpdate();
      unsubConnected();
      unsubLogs();
      unsubLogDeleted();
      unsubEmps();
      unsubProjects();
      unsubSettings();
      eventSource?.close();
      unsubscribeBroadcast();
    };
  }, []);

  // Auto-sync polling every 8s as reliable fallback for remote devices
  useEffect(() => {
    syncWithCloud(true);
    const interval = setInterval(() => syncWithCloud(true), 8000);
    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        syncWithCloud(true);
        wsClient.sendAction('request_sync', {});
      }
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [syncWithCloud]);

  const [lightboxData, setLightboxData] = useState<{
    url: string | null;
    title?: string;
    subtitle?: string;
    date?: string;
    userLat?: number;
    userLng?: number;
  }>({
    url: null,
  });

  const handleUpdateProjects = (newProjects: Project[]) => {
    setProjects(newProjects);
    saveProjects(newProjects);
    wsClient.sendAction('sync_projects', { projects: newProjects });
  };

  const handleUpdateEmployees = (newEmployees: Employee[]) => {
    setEmployees(newEmployees);
    saveEmployees(newEmployees);
    wsClient.sendAction('sync_employees', { employees: newEmployees });
  };

  const handleUpdateLogs = (newLogs: AttendanceLog[]) => {
    setLogs(newLogs);
    saveLogs(newLogs);
    wsClient.sendAction('logs_updated', { logs: newLogs });
  };

  const handleAddLog = (newLog: AttendanceLog) => {
    const updated = [newLog, ...logs];
    setLogs(updated);
    saveLogs(updated);
    wsClient.sendAction('absen', newLog as any);
  };

  const handleUpdateSingleLog = (updatedLog: AttendanceLog) => {
    const updated = logs.map((l) => (l.id === updatedLog.id ? updatedLog : l));
    setLogs(updated);
    saveLogs(updated);
    wsClient.sendAction('absen', updatedLog as any);
  };

  const handleUpdateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
    wsClient.sendAction('update_settings', { adminPin: newSettings.adminPin, companyName: newSettings.companyName });
  };

  const handleToggleVoice = () => {
    const nextState = !settings.enableVoice;
    handleUpdateSettings({ ...settings, enableVoice: nextState });
    showToast(
      nextState ? 'Umpan balik suara aktif (Bahasa Indonesia)' : 'Umpan balik suara dinonaktifkan',
      'info'
    );
  };

  const handleOpenPhotoPreview = (
    photoUrl: string,
    title?: string,
    subtitle?: string,
    date?: string,
    userLat?: number,
    userLng?: number
  ) => {
    setLightboxData({
      url: photoUrl,
      title,
      subtitle,
      date,
      userLat,
      userLng,
    });
  };

  const handleClosePhotoPreview = () => {
    setLightboxData({ url: null });
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-100 antialiased font-sans transition-colors duration-200">
      <Navbar
        companyName={settings.companyName}
        enableVoice={settings.enableVoice}
        onToggleVoice={handleToggleVoice}
        isSyncing={isSyncing}
        onManualSync={() => syncWithCloud(false)}
        isDarkMode={isDarkMode}
        onToggleDarkMode={toggleDarkMode}
        isDesktopView={isDesktopView}
        onToggleDesktopView={toggleDesktopView}
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        isRealtimeConnected={isRealtimeConnected}
      />

      <Toast toasts={toasts} onDismiss={handleDismissToast} />

      <main className={`mx-auto w-full flex-1 transition-all ${
        isDesktopView
          ? 'max-w-7xl px-4 sm:px-6 py-6'
          : 'max-w-md p-4 pb-24'
      }`}>
        {currentTab === 'pekerja' && (
          <WorkerAttendance
            companyName={settings.companyName}
            projects={projects}
            employees={employees}
            logs={logs}
            onAddLog={handleAddLog}
            onUpdateLog={handleUpdateSingleLog}
            enableVoice={settings.enableVoice}
            gasUrl={settings.gasUrl}
            onShowToast={showToast}
            isDesktopView={isDesktopView}
          />
        )}

        {currentTab === 'log' && (
          <WorkerLogs
            logs={logs}
            employees={employees}
            onPreviewPhoto={handleOpenPhotoPreview}
            isDesktopView={isDesktopView}
          />
        )}

        {currentTab === 'admin' && (
          <AdminPanel
            projects={projects}
            employees={employees}
            logs={logs}
            settings={settings}
            onUpdateProjects={handleUpdateProjects}
            onUpdateEmployees={handleUpdateEmployees}
            onUpdateLogs={handleUpdateLogs}
            onUpdateSettings={handleUpdateSettings}
            onPreviewPhoto={handleOpenPhotoPreview}
            onShowToast={showToast}
            isDesktopView={isDesktopView}
          />
        )}

        <footer className="mt-8 text-center text-[11px] text-slate-400 dark:text-slate-500 space-y-1">
          <div className="font-bold text-slate-600 dark:text-slate-300 text-xs">
            {settings.companyName || 'PT Konstruksi Pratama Mandiri'}
          </div>
          <div className="flex items-center justify-center gap-1">
            <span>Aplikasi Absensi dibuat oleh</span>
            <strong className="text-slate-800 dark:text-slate-200 font-extrabold">Jahidin</strong>
          </div>
          <div className="text-[10px] text-slate-400 dark:text-slate-600">
            &copy; 2024-2026 Jahidin • Seluruh Hak Cipta Dilindungi
          </div>
        </footer>
      </main>

      <PhotoLightbox
        photoUrl={lightboxData.url}
        title={lightboxData.title}
        subtitle={lightboxData.subtitle}
        date={lightboxData.date}
        userLat={lightboxData.userLat}
        userLng={lightboxData.userLng}
        onClose={handleClosePhotoPreview}
      />

      <BottomNav
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        isDesktopView={isDesktopView}
      />
    </div>
  );
}

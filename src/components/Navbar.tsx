import React, { useEffect, useState } from 'react';
import {
  HardHat,
  Wifi,
  WifiOff,
  Volume2,
  VolumeX,
  Clock,
  Building2,
  RefreshCw,
  Sun,
  Moon,
  Monitor,
  Smartphone,
  Radio,
  Camera,
  ClipboardList,
  ShieldCheck,
  SlidersHorizontal,
  X,
  Check,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { MainTab } from './BottomNav';

interface NavbarProps {
  companyName: string;
  enableVoice: boolean;
  onToggleVoice: () => void;
  isSyncing?: boolean;
  onManualSync?: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  isDesktopView: boolean;
  onToggleDesktopView: () => void;
  currentTab?: MainTab;
  onSelectTab?: (tab: MainTab) => void;
  isRealtimeConnected?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  companyName,
  enableVoice,
  onToggleVoice,
  isSyncing = false,
  onManualSync,
  isDarkMode,
  onToggleDarkMode,
  isDesktopView,
  onToggleDesktopView,
  currentTab = 'pekerja',
  onSelectTab,
  isRealtimeConnected = true,
}) => {
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  // Tutup popup dengan tombol Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showSettingsModal) {
        setShowSettingsModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSettingsModal]);

  return (
    <>
      <header className="sticky top-0 z-40 bg-amber-500 dark:bg-amber-600 text-slate-900 shadow-md border-b border-amber-600/30 transition-colors">
        <div
          className={`mx-auto px-3.5 sm:px-4 py-2.5 flex items-center justify-between transition-all ${
            isDesktopView ? 'max-w-7xl' : 'max-w-md'
          }`}
        >
          {/* Brand & Company Info */}
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-900 dark:bg-slate-950 text-amber-400 flex items-center justify-center shadow-sm shrink-0">
              <HardHat className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-sm sm:text-base tracking-wide uppercase text-slate-950">
                  AbsensiPro
                </span>
                <span className="bg-slate-900/15 dark:bg-slate-950/30 text-slate-950 text-[9px] font-black px-1.5 py-0.5 rounded uppercase shrink-0 hidden xs:inline-block">
                  Hybrid
                </span>
              </div>
              {/* Nama Perusahaan */}
              <div className="flex items-center gap-1 text-[11px] font-extrabold text-slate-950 truncate max-w-[170px] sm:max-w-[320px]">
                <Building2 className="w-3 h-3 text-slate-950 shrink-0" />
                <span className="truncate" title={companyName}>
                  {companyName || 'PT Konstruksi Pratama Mandiri'}
                </span>
              </div>
              <div className="text-[10px] font-semibold text-slate-900/80 flex items-center gap-1">
                <Clock className="w-2.5 h-2.5 text-slate-900/70 shrink-0" />
                <span className="font-mono">{currentTime || '00:00:00'} WIB</span>
              </div>
            </div>
          </div>

          {/* Center Navigation Tabs (Hanya di Mode Desktop) */}
          {isDesktopView && onSelectTab && (
            <nav className="hidden md:flex items-center bg-slate-900/10 dark:bg-slate-900/20 p-1 rounded-2xl border border-slate-900/10">
              <button
                type="button"
                onClick={() => onSelectTab('pekerja')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  currentTab === 'pekerja'
                    ? 'bg-slate-900 text-amber-400 shadow-md'
                    : 'text-slate-900 hover:bg-slate-900/10'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Absensi GPS</span>
              </button>
              <button
                type="button"
                onClick={() => onSelectTab('log')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  currentTab === 'log'
                    ? 'bg-slate-900 text-amber-400 shadow-md'
                    : 'text-slate-900 hover:bg-slate-900/10'
                }`}
              >
                <ClipboardList className="w-3.5 h-3.5" />
                <span>Log Riwayat</span>
              </button>
              <button
                type="button"
                onClick={() => onSelectTab('admin')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  currentTab === 'admin'
                    ? 'bg-slate-900 text-amber-400 shadow-md'
                    : 'text-slate-900 hover:bg-slate-900/10'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Panel Admin</span>
              </button>
            </nav>
          )}

          {/* Right Controls: Rapi & Bersih dengan Tombol Popup Pengaturan */}
          <div className="flex items-center space-x-2 shrink-0">
            {/* Status Online/Offline Minimalis */}
            <div
              title={isOnline ? 'Internet Terhubung' : 'Mode Offline (Data tersimpan lokal)'}
              className={`px-2 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-2xs transition-colors ${
                isOnline ? 'bg-emerald-950 text-emerald-200' : 'bg-rose-950 text-rose-200'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                }`}
              />
              {isOnline ? (
                <span className="hidden sm:inline-flex items-center gap-0.5">
                  <Wifi className="w-2.5 h-2.5" /> Online
                </span>
              ) : (
                <span className="flex items-center gap-0.5">
                  <WifiOff className="w-2.5 h-2.5" /> Off
                </span>
              )}
            </div>

            {/* TOMBOL POPUP UTAMA: Membuka Popup Mode Desktop/Mobile, Mode Malam, Sinkron, & Suara */}
            <button
              type="button"
              onClick={() => setShowSettingsModal(true)}
              title="Buka Pengaturan Tampilan & Sistem (Desktop/Mobile, Mode Malam, Sinkron, Suara)"
              className="bg-slate-950 hover:bg-slate-900 text-amber-400 px-3 py-1.5 sm:py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer border border-amber-400/30"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="hidden sm:inline">Pengaturan</span>
              <span className="sm:hidden text-[11px]">Menu</span>
              {/* Badge dot jika sedang sinkron / mode malam aktif */}
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            </button>
          </div>
        </div>
      </header>

      {/* POPUP MODAL PENGATURAN TAMPILAN & SISTEM */}
      {showSettingsModal && (
        <div
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 transition-opacity animate-in fade-in duration-150"
          onClick={() => setShowSettingsModal(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 sm:p-6 w-full max-w-md shadow-2xl space-y-4 text-slate-800 dark:text-slate-100 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Popup */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <SlidersHorizontal className="w-4 h-4 stroke-[2.3]" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900 dark:text-white">
                    Pengaturan Tampilan & Sistem
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Atur mode antarmuka, tema warna, suara, dan sinkronisasi.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                title="Tutup Popup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 1. Mode Desktop / Mobile */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Monitor className="w-3.5 h-3.5 text-amber-500" />
                <span>Mode Tampilan Layar</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {/* Tombol Mobile */}
                <button
                  type="button"
                  onClick={() => {
                    if (isDesktopView) onToggleDesktopView();
                  }}
                  className={`p-3 rounded-2xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                    !isDesktopView
                      ? 'border-amber-500 bg-amber-50/80 dark:bg-amber-950/40 text-slate-900 dark:text-white shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div
                    className={`p-2 rounded-xl shrink-0 ${
                      !isDesktopView
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-extrabold text-xs flex items-center justify-between">
                      <span>Mobile</span>
                      {!isDesktopView && <Check className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />}
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
                      Pas layar HP & ringkas
                    </p>
                  </div>
                </button>

                {/* Tombol Desktop */}
                <button
                  type="button"
                  onClick={() => {
                    if (!isDesktopView) onToggleDesktopView();
                  }}
                  className={`p-3 rounded-2xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                    isDesktopView
                      ? 'border-amber-500 bg-amber-50/80 dark:bg-amber-950/40 text-slate-900 dark:text-white shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div
                    className={`p-2 rounded-xl shrink-0 ${
                      isDesktopView
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Monitor className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-extrabold text-xs flex items-center justify-between">
                      <span>Desktop</span>
                      {isDesktopView && <Check className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />}
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
                      Dashboard lebar & proporsional
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* 2. Mode Malam (Dark Mode) / Terang */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Moon className="w-3.5 h-3.5 text-indigo-500" />
                <span>Tema Tampilan (Mode Malam / Terang)</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {/* Mode Terang */}
                <button
                  type="button"
                  onClick={() => {
                    if (isDarkMode) onToggleDarkMode();
                  }}
                  className={`p-3 rounded-2xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                    !isDarkMode
                      ? 'border-amber-500 bg-amber-50/80 dark:bg-amber-950/40 text-slate-900 dark:text-white shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div
                    className={`p-2 rounded-xl shrink-0 ${
                      !isDarkMode
                        ? 'bg-amber-400 text-slate-950'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Sun className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-extrabold text-xs flex items-center justify-between">
                      <span>Siang / Terang</span>
                      {!isDarkMode && <Check className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />}
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
                      Latar putih cerah & bersih
                    </p>
                  </div>
                </button>

                {/* Mode Malam */}
                <button
                  type="button"
                  onClick={() => {
                    if (!isDarkMode) onToggleDarkMode();
                  }}
                  className={`p-3 rounded-2xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                    isDarkMode
                      ? 'border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/40 text-slate-900 dark:text-white shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div
                    className={`p-2 rounded-xl shrink-0 ${
                      isDarkMode
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Moon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-extrabold text-xs flex items-center justify-between">
                      <span>Malam / Gelap</span>
                      {isDarkMode && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
                      Nyaman di mata & redup
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* 3. Sinkronisasi Data Real-Time & Cloud */}
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3 sm:p-3.5 border border-slate-200/80 dark:border-slate-700/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div>
                    <span className="font-bold text-xs text-slate-900 dark:text-white block">
                      Sinkronisasi Data Multi-Device
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                      <Radio className={`w-3 h-3 text-amber-500 ${isRealtimeConnected ? 'animate-pulse' : ''}`} />
                      {isRealtimeConnected ? 'Jalur Real-Time Terhubung' : 'Standar Background Sync'}
                    </span>
                  </div>
                </div>
                {onManualSync && (
                  <button
                    type="button"
                    onClick={onManualSync}
                    disabled={isSyncing}
                    className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-2xs active:scale-95 transition-all cursor-pointer shrink-0"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Sinkron...' : 'Sinkron Sekarang'}</span>
                  </button>
                )}
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Menyinkronkan data presensi, karyawan, dan proyek seketika antara HP Pekerja, Laptop Admin, dan Google Sheets.
              </p>
            </div>

            {/* 4. Pengaturan Suara (Voice Assistant) */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-2 rounded-xl shrink-0 ${
                    enableVoice
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                      : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                  }`}
                >
                  {enableVoice ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </div>
                <div>
                  <span className="font-bold text-xs text-slate-900 dark:text-white block">
                    Umpan Balik Suara (Bahasa Indonesia)
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    Instruksi suara saat absen masuk, pulang, atau peringatan radius
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={onToggleVoice}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  enableVoice ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    enableVoice ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Tombol Tutup Selesai */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-600 text-white dark:text-slate-950 font-black py-2.5 rounded-2xl text-xs uppercase tracking-wider transition-all cursor-pointer shadow-sm active:scale-98 flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Simpan & Tutup</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

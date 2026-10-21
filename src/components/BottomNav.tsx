import React from 'react';
import { Camera, ClipboardList, ShieldCheck } from 'lucide-react';

export type MainTab = 'pekerja' | 'log' | 'admin';

interface BottomNavProps {
  currentTab: MainTab;
  onSelectTab: (tab: MainTab) => void;
  isDesktopView?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onSelectTab, isDesktopView = false }) => {
  if (isDesktopView) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shadow-lg z-40 transition-colors">
      <div className="max-w-md mx-auto grid grid-cols-3 py-2 px-2">
        <button
          onClick={() => onSelectTab('pekerja')}
          className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer ${
            currentTab === 'pekerja'
              ? 'text-amber-600 dark:text-amber-400 font-bold scale-105'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
          }`}
        >
          <div
            className={`p-1.5 rounded-xl transition-all ${
              currentTab === 'pekerja'
                ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300'
                : 'bg-transparent'
            }`}
          >
            <Camera className="w-5 h-5 stroke-[2.2]" />
          </div>
          <span className="text-[11px] mt-0.5">Absen GPS</span>
        </button>

        <button
          onClick={() => onSelectTab('log')}
          className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer ${
            currentTab === 'log'
              ? 'text-amber-600 dark:text-amber-400 font-bold scale-105'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
          }`}
        >
          <div
            className={`p-1.5 rounded-xl transition-all ${
              currentTab === 'log'
                ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300'
                : 'bg-transparent'
            }`}
          >
            <ClipboardList className="w-5 h-5 stroke-[2.2]" />
          </div>
          <span className="text-[11px] mt-0.5">Log Riwayat</span>
        </button>

        <button
          onClick={() => onSelectTab('admin')}
          className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer ${
            currentTab === 'admin'
              ? 'text-amber-600 dark:text-amber-400 font-bold scale-105'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
          }`}
        >
          <div
            className={`p-1.5 rounded-xl transition-all ${
              currentTab === 'admin'
                ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300'
                : 'bg-transparent'
            }`}
          >
            <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
          </div>
          <span className="text-[11px] mt-0.5">Admin Panel</span>
        </button>
      </div>
    </nav>
  );
};

import React from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'danger' | 'warning' | 'info';
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-16 left-4 right-4 z-50 max-w-md mx-auto space-y-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto p-3.5 rounded-2xl shadow-xl flex items-center justify-between text-xs text-white transition-all transform animate-in fade-in slide-in-from-top-2 ${
            t.type === 'success'
              ? 'bg-emerald-600/95 border border-emerald-500 shadow-emerald-950/20'
              : t.type === 'danger'
              ? 'bg-rose-600/95 border border-rose-500 shadow-rose-950/20'
              : t.type === 'warning'
              ? 'bg-amber-600/95 border border-amber-500 shadow-amber-950/20 text-slate-950'
              : 'bg-slate-900/95 border border-slate-700 shadow-slate-950/20'
          }`}
        >
          <div className="flex items-center space-x-2.5">
            {t.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />}
            {t.type === 'danger' && <AlertCircle className="w-4 h-4 text-rose-200 shrink-0" />}
            {t.type === 'warning' && <AlertTriangle className="w-4 h-4 text-slate-950 shrink-0" />}
            {t.type === 'info' && <Info className="w-4 h-4 text-slate-300 shrink-0" />}
            <span className="font-semibold leading-tight">{t.message}</span>
          </div>
          <button
            onClick={() => onDismiss(t.id)}
            className="ml-3 p-1 rounded-lg opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

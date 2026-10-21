import React, { useState, useRef } from 'react';
import { Upload, Camera, FileText, X, Eye, CheckCircle2, CreditCard } from 'lucide-react';
import { processDocumentFile, isPdfData, getDirectImageUrl } from '../utils/image';

interface DocumentUploadDropzoneProps {
  label: string;
  docKind: 'ktp' | 'kk';
  value: string | null;
  fileType?: 'image' | 'pdf';
  fileName?: string;
  required?: boolean;
  onFileLoaded: (dataUrl: string, type: 'image' | 'pdf', fileName: string) => void;
  onClear: () => void;
  onOpenLiveCamera: () => void;
  onPreview: (url: string, title: string, subtitle?: string) => void;
}

export const DocumentUploadDropzone: React.FC<DocumentUploadDropzoneProps> = ({
  label,
  docKind,
  value,
  fileType = 'image',
  fileName,
  required = true,
  onFileLoaded,
  onClear,
  onOpenLiveCamera,
  onPreview,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isPdf = isPdfData(value) || fileType === 'pdf';
  const hasValue = Boolean(value);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const processFile = async (file: File) => {
    setIsProcessing(true);
    try {
      const result = await processDocumentFile(file);
      onFileLoaded(result.dataUrl, result.type, result.name);
    } catch (err) {
      console.error('File drop process error:', err);
    } finally {
      setIsProcessing(false);
      setIsDragOver(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await processFile(files[0]);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file);
    }
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleViewDocument = () => {
    if (!value) return;
    if (isPdf) {
      // Buka PDF di jendela/tab baru atau lightbox
      if (value.startsWith('data:application/pdf')) {
        const win = window.open();
        if (win) {
          win.document.write(
            `<iframe src="${value}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`
          );
        } else {
          onPreview(value, `Dokumen PDF ${label}`, fileName || 'Berkas PDF');
        }
      } else {
        window.open(value, '_blank');
      }
    } else {
      onPreview(value, `Dokumen ${label}`, fileName || undefined);
    }
  };

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative rounded-2xl p-3 border-2 transition-all flex flex-col justify-between ${
        isDragOver
          ? 'border-amber-500 bg-amber-500/15 dark:bg-amber-500/20 scale-[1.01]'
          : hasValue
          ? 'border-emerald-400/80 bg-emerald-50/60 dark:bg-emerald-950/20 dark:border-emerald-600'
          : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:border-amber-400'
      }`}
    >
      {/* Header Info */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          {docKind === 'ktp' ? (
            <CreditCard className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          ) : (
            <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          )}
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
            {label} {required && <span className="text-rose-500 font-black">*</span>}
          </span>
        </div>
        <span
          className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
            hasValue
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 flex items-center gap-1'
              : 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
          }`}
        >
          {hasValue ? (
            <>
              <CheckCircle2 className="w-3 h-3" />
              <span>{isPdf ? 'PDF Terpasang' : 'Gambar Terpasang'}</span>
            </>
          ) : (
            'Wajib Diisi'
          )}
        </span>
      </div>

      {/* Main Content Area */}
      {hasValue ? (
        <div className="flex items-center justify-between gap-2.5 p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 min-w-0">
            {isPdf ? (
              <div
                onClick={handleViewDocument}
                className="w-14 h-12 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 flex flex-col items-center justify-center shrink-0 cursor-pointer hover:scale-105 transition-transform"
                title="Klik untuk melihat PDF"
              >
                <FileText className="w-6 h-6 stroke-[2]" />
                <span className="text-[8px] font-black uppercase tracking-wider">PDF</span>
              </div>
            ) : (
              <img
                src={getDirectImageUrl(value)}
                alt={label}
                referrerPolicy="no-referrer"
                onClick={handleViewDocument}
                className="w-14 h-12 rounded-lg object-cover border border-emerald-400 dark:border-emerald-600 shrink-0 cursor-pointer hover:scale-105 transition-transform shadow-2xs"
                title="Klik untuk memperbesar"
              />
            )}
            <div className="min-w-0">
              <span className="text-xs font-bold text-slate-900 dark:text-white truncate block">
                {fileName || (isPdf ? `Berkas_${label}.pdf` : `Foto_${label}.jpg`)}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                <span className="capitalize">{isPdf ? 'Dokumen PDF' : 'Foto Dokumen'}</span>
                <span>•</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Siap</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleViewDocument}
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Pratinjau Dokumen"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onClear}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
              title="Hapus / Ganti Dokumen"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        /* Empty Dropzone area */
        <div className="text-center py-2 px-1">
          {isProcessing ? (
            <div className="py-4 text-xs font-bold text-amber-600 dark:text-amber-400 animate-pulse">
              Memproses & Membaca Berkas...
            </div>
          ) : (
            <>
              <div className="flex items-center justify-center gap-1 mb-1">
                <Upload className="w-5 h-5 text-amber-500 animate-bounce" />
              </div>
              <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                Tarik & Letakkan file di sini
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                Format Asli <strong>Foto (JPG, PNG, WEBP)</strong> atau <strong>PDF</strong> (Tanpa Kompresi)
              </p>

              {/* Action Buttons: Browse & Live Rear Camera */}
              <div className="grid grid-cols-2 gap-1.5 mt-2.5">
                <label className="py-2 px-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl text-[11px] font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs transition-all active:scale-95">
                  <Upload className="w-3.5 h-3.5 text-amber-500" />
                  <span>Pilih File Asli / PDF</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/bmp,image/*,application/pdf,.pdf"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                </label>

                <button
                  type="button"
                  onClick={onOpenLiveCamera}
                  className="py-2 px-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold rounded-xl text-[11px] flex items-center justify-center gap-1.5 shadow-2xs transition-all active:scale-95 cursor-pointer"
                  title="Buka kamera belakang resolusi tinggi dengan pembidik ukuran dokumen"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Kamera Belakang HD</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Guide size info footer */}
      <div className="mt-2 text-[9.5px] text-slate-500 dark:text-slate-400 flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-1">
        <span>
          {docKind === 'ktp'
            ? 'Format KTP: Rasio ID-1 (85.6 × 54 mm)'
            : 'Format KK: Dokumen Formulir Standar'}
        </span>
        <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">100% Kualitas Asli</span>
      </div>
    </div>
  );
};

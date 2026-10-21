import React, { useState, useEffect } from 'react';
import { X, Calendar, User, MapPin, Download, ExternalLink, ImageIcon, RotateCw, Loader2, FileText } from 'lucide-react';
import { getDriveImageCandidates, isPdfData } from '../utils/image';

interface PhotoLightboxProps {
  photoUrl: string | null;
  title?: string;
  subtitle?: string;
  date?: string;
  userLat?: number;
  userLng?: number;
  onClose: () => void;
}

export const PhotoLightbox: React.FC<PhotoLightboxProps> = ({
  photoUrl,
  title,
  subtitle,
  date,
  userLat,
  userLng,
  onClose,
}) => {
  const [candidates, setCandidates] = useState<string[]>([]);
  const [candidateIndex, setCandidateIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasAllFailed, setHasAllFailed] = useState<boolean>(false);
  const [rotation, setRotation] = useState<number>(0);

  const isPdf = isPdfData(photoUrl);

  useEffect(() => {
    if (photoUrl) {
      if (isPdf) {
        setIsLoading(false);
        setHasAllFailed(false);
      } else {
        const urls = getDriveImageCandidates(photoUrl);
        setCandidates(urls);
        setCandidateIndex(0);
        setIsLoading(true);
        setHasAllFailed(false);
        setRotation(0);
      }
    }
  }, [photoUrl, isPdf]);

  if (!photoUrl) return null;

  const currentSrc = candidates[candidateIndex] || photoUrl;
  const isDriveUrl = photoUrl.includes('drive.google.com') || photoUrl.includes('googleusercontent.com');

  const handleImageError = () => {
    if (candidateIndex + 1 < candidates.length) {
      setCandidateIndex((prev) => prev + 1);
      setIsLoading(true);
    } else {
      setIsLoading(false);
      setHasAllFailed(true);
    }
  };

  const handleImageLoaded = () => {
    setIsLoading(false);
    setHasAllFailed(false);
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleDownload = () => {
    if (photoUrl.startsWith('data:')) {
      const isPdfFile = photoUrl.startsWith('data:application/pdf');
      const link = document.createElement('a');
      link.href = photoUrl;
      link.download = `Dokumen_${(title || 'berkas').replace(/[^a-zA-Z0-9]/g, '_')}_${date || 'file'}.${isPdfFile ? 'pdf' : 'webp'}`;
      link.click();
      return;
    }

    if (isDriveUrl) {
      window.open(photoUrl, '_blank');
      return;
    }

    const link = document.createElement('a');
    link.href = currentSrc;
    link.download = `Foto_Pratinjau_${date || 'dokumen'}.jpg`;
    link.click();
  };

  return (
    <div
      className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-3 sm:p-5 backdrop-blur-md transition-all"
      onClick={onClose}
    >
      <div
        className="relative max-w-xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-2xl flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Control Bar */}
        <div className="w-full flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-bold text-white tracking-wide">
              {isPdf ? 'Pratinjau Dokumen PDF' : 'Pratinjau Berkas'}
            </span>
            {photoUrl && (
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  isPdf
                    ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                    : photoUrl.startsWith('data:image')
                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    : 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                }`}
              >
                {isPdf ? 'Berkas PDF' : photoUrl.startsWith('data:image') ? 'Foto Lokal' : 'Google Drive'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {!isPdf && (
              <button
                onClick={handleRotate}
                type="button"
                className="p-1.5 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
                title="Putar Foto"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              type="button"
              className="p-1.5 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
              title="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Display Frame: PDF or Image */}
        <div className="w-full max-h-[65vh] min-h-[280px] sm:min-h-[360px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 relative flex items-center justify-center">
          {isPdf ? (
            <div className="w-full h-full min-h-[350px] flex flex-col items-center justify-center p-4">
              {photoUrl.startsWith('data:application/pdf') ? (
                <iframe
                  src={photoUrl}
                  title="PDF Document"
                  className="w-full h-[55vh] rounded-xl border border-slate-800 bg-white"
                />
              ) : (
                <div className="text-center p-6 space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                    <FileText className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Dokumen PDF Terpasang</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm">
                      Dokumen PDF tersimpan. Klik tombol di bawah untuk membuka dokumen di tab baru atau mengunduhnya.
                    </p>
                  </div>
                  <a
                    href={photoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                  >
                    <ExternalLink className="w-4 h-4" /> Buka Dokumen PDF
                  </a>
                </div>
              )}
            </div>
          ) : (
            <>
              {isLoading && !hasAllFailed && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 z-10 text-amber-400">
                  <Loader2 className="w-8 h-8 animate-spin mb-2" />
                  <span className="text-xs font-semibold text-slate-300">Memuat Foto...</span>
                </div>
              )}
              {!hasAllFailed ? (
                <img
                  key={currentSrc}
                  src={currentSrc}
                  alt={title || 'Pratinjau Foto'}
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                  onLoad={handleImageLoaded}
                  onError={handleImageError}
                  style={{ transform: `rotate(${rotation}deg)` }}
                  className={`w-full h-full object-contain transition-transform duration-200 ${
                    isLoading ? 'opacity-0' : 'opacity-100'
                  }`}
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800/80 text-amber-400 flex items-center justify-center mb-2">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-slate-200">Pratinjau Berkas</p>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-[240px] leading-relaxed">
                    {isDriveUrl
                      ? 'Berkas berada di Google Drive. Klik tombol di bawah untuk membukanya secara langsung.'
                      : 'Gambar sedang dimuat atau tidak tersedia.'}
                  </p>
                  {isDriveUrl && (
                    <a
                      href={photoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-extrabold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Buka di Google Drive
                    </a>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Details Footer */}
        <div className="w-full mt-3 space-y-1 text-xs text-slate-300">
          {title && (
            <div className="flex items-center gap-2 text-white font-semibold">
              <User className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="truncate">{title}</span>
            </div>
          )}
          {subtitle && (
            <div className="flex items-center gap-2 text-slate-400">
              <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="truncate">{subtitle}</span>
            </div>
          )}
          {date && (
            <div className="flex items-center gap-2 text-slate-400">
              <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>{date}</span>
            </div>
          )}
          {userLat !== undefined && userLng !== undefined && (
            <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl text-xs mt-2">
              <div className="flex items-center gap-1.5 text-slate-200">
                <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span className="font-mono text-[11px] text-sky-300 font-semibold">
                  GPS: {userLat.toFixed(5)}, {userLng.toFixed(5)}
                </span>
              </div>
              <a
                href={`https://www.google.com/maps?q=${userLat},${userLng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 bg-sky-500 hover:bg-sky-600 text-slate-950 font-bold rounded-lg text-[10px] flex items-center gap-1 transition-all shadow-xs"
              >
                <ExternalLink className="w-3 h-3" /> Peta Google Maps
              </a>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 w-full mt-4">
          <button
            onClick={handleDownload}
            type="button"
            className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
          >
            {isDriveUrl ? (
              <>
                <ExternalLink className="w-3.5 h-3.5 text-amber-400" /> Buka Drive
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5 text-amber-400" /> Unduh Berkas
              </>
            )}
          </button>
          <button
            onClick={onClose}
            type="button"
            className="py-2.5 px-3 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

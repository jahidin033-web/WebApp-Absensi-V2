import React, { useState, useRef, useEffect } from 'react';
import { Camera, SwitchCamera, X, RotateCcw, Check, Sparkles, Scan, FileText, CreditCard } from 'lucide-react';

interface LiveCameraModalProps {
  isOpen: boolean;
  title: string;
  docType?: 'ktp' | 'kk' | 'selfie';
  onCapture: (base64Image: string) => void;
  onClose: () => void;
}

export const LiveCameraModal: React.FC<LiveCameraModalProps> = ({
  isOpen,
  title,
  docType = 'selfie',
  onCapture,
  onClose,
}) => {
  // Jika dokumen KTP/KK, WAJIB default gunakan kamera belakang (environment)
  const isDocument = docType === 'ktp' || docType === 'kk';
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>(isDocument ? 'environment' : 'user');
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isMirrorView, setIsMirrorView] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const startCamera = async (mode: 'user' | 'environment') => {
    stopCamera();
    try {
      // Resolusi tinggi Full-HD untuk menangkap teks dokumen KTP/KK secara tajam & jernih
      const idealW = isDocument ? 1920 : 640;
      const idealH = isDocument ? 1080 : 640;
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: idealW },
          height: { ideal: idealH },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Kamera tidak dapat diakses';
      setCameraError(`Gagal membuka kamera: ${msg}. Pastikan izin kamera telah diberikan.`);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setCapturedPreview(null);
      setCameraError(null);
      const defaultFacing = isDocument ? 'environment' : 'user';
      setFacingMode(defaultFacing);
      setIsMirrorView(!isDocument); // Mirror hanya untuk selfie depan
      startCamera(defaultFacing);
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, docType, isDocument]);

  const toggleCameraFacing = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  const takeSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (isDocument) {
      // Rasio Dokumen:
      // KTP = ID-1 standard (85.6 mm x 53.98 mm ~ 1.586 ratio)
      // KK = Formulir KK (rasio ~ 1.45)
      const targetRatio = docType === 'ktp' ? 85.6 / 53.98 : 1.45;
      
      const vidW = video.videoWidth || 1920;
      const vidH = video.videoHeight || 1080;
      const vidRatio = vidW / vidH;

      let sW = vidW;
      let sH = vidH;
      let sx = 0;
      let sy = 0;

      if (vidRatio > targetRatio) {
        sH = vidH * 0.90;
        sW = sH * targetRatio;
        sx = (vidW - sW) / 2;
        sy = (vidH - sH) / 2;
      } else {
        sW = vidW * 0.92;
        sH = sW / targetRatio;
        sx = (vidW - sW) / 2;
        sy = (vidH - sH) / 2;
      }

      // Gunakan resolusi asli dari video stream tanpa diperkecil sama sekali
      const outWidth = Math.round(sW);
      const outHeight = Math.round(sH);

      canvas.width = outWidth;
      canvas.height = outHeight;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(video, sx, sy, sW, sH, 0, 0, outWidth, outHeight);

      // Watermark dokumen
      const now = new Date();
      const timeStr = now.toLocaleDateString('id-ID') + ' ' + now.toLocaleTimeString('id-ID');
      const bannerHeight = Math.max(28, Math.round(outHeight * 0.05));
      ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
      ctx.fillRect(0, outHeight - bannerHeight, outWidth, bannerHeight);
      ctx.fillStyle = '#ffffff';
      const fontSize = Math.max(12, Math.round(bannerHeight * 0.45));
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.fillText(`Dokumen ${docType.toUpperCase()} - Terverifikasi ${timeStr} WIB`, 12, outHeight - Math.round(bannerHeight * 0.3));

      // Kualitas tinggi tanpa kompresi berlebih untuk dokumen KTP & KK
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      setCapturedPreview(dataUrl);
    } else {
      // Selfie pratinjau hemat memori (200x200, ~5-7 KB)
      const size = 200;
      canvas.width = size;
      canvas.height = size;
      if (isMirrorView && facingMode === 'user') {
        ctx.translate(size, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, size, size);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      } else {
        ctx.drawImage(video, 0, 0, size, size);
      }
      const dataUrl = canvas.toDataURL('image/jpeg', 0.45);
      setCapturedPreview(dataUrl);
    }
    stopCamera();
  };

  const handleRetake = () => {
    setCapturedPreview(null);
    startCamera(facingMode);
  };

  const handleConfirm = () => {
    if (capturedPreview) {
      onCapture(capturedPreview);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs">
      <div className={`bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 w-full shadow-2xl flex flex-col items-center ${
        isDocument ? 'max-w-lg' : 'max-w-sm'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between w-full mb-3 pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2 text-white text-xs font-bold">
            {docType === 'ktp' ? (
              <CreditCard className="w-4 h-4 text-amber-400" />
            ) : docType === 'kk' ? (
              <FileText className="w-4 h-4 text-emerald-400" />
            ) : (
              <Camera className="w-4 h-4 text-amber-400" />
            )}
            <span>{title}</span>
          </div>
          <div className="flex items-center gap-2">
            {isDocument && (
              <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono px-2 py-0.5 rounded-full">
                Kamera Belakang
              </span>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Viewport Frame with Document Size Indicator ("ada tanda ukuran") */}
        <div
          className={`relative bg-slate-950 rounded-2xl overflow-hidden border-2 border-slate-700 flex items-center justify-center shadow-inner w-full ${
            docType === 'ktp'
              ? 'aspect-[85.6/53.98] max-h-[340px]'
              : docType === 'kk'
              ? 'aspect-[1.45/1] max-h-[350px]'
              : 'w-60 h-60'
          }`}
        >
          {cameraError ? (
            <div className="p-4 text-center text-rose-400 text-xs">{cameraError}</div>
          ) : capturedPreview ? (
            <img
              src={capturedPreview}
              alt="Hasil Kamera"
              className="w-full h-full object-contain bg-black"
            />
          ) : (
            <>
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                className={`w-full h-full object-cover ${
                  isMirrorView && facingMode === 'user' ? 'scale-x-[-1]' : ''
                }`}
              />
              <div className="absolute top-2 left-2 bg-rose-600 text-white text-[9px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 animate-pulse z-20">
                <span className="w-1.5 h-1.5 bg-white rounded-full"></span> LIVE
              </div>

              {/* TANDA UKURAN DOKUMEN & BINGKAI PEMBIDIK (KTP / KK) */}
              {isDocument && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-3 z-10">
                  {/* Aspect Ratio Box with Corner Brackets */}
                  <div className="relative w-[92%] h-[88%] border-2 border-dashed border-amber-400/80 rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] flex items-center justify-center">
                    {/* Corner Guides (Tanda Sudut Pembidik Ukuran Dokumen) */}
                    <div className="absolute -top-1 -left-1 w-5 h-5 border-t-3 border-l-3 border-amber-400 rounded-tl-md"></div>
                    <div className="absolute -top-1 -right-1 w-5 h-5 border-t-3 border-r-3 border-amber-400 rounded-tr-md"></div>
                    <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-3 border-l-3 border-amber-400 rounded-bl-md"></div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-3 border-r-3 border-amber-400 rounded-br-md"></div>

                    {/* Badge Tanda Ukuran */}
                    <div className="absolute top-2 px-2.5 py-1 bg-black/75 backdrop-blur-xs border border-amber-400/60 rounded-full text-[10px] font-extrabold text-amber-300 flex items-center gap-1 shadow-md">
                      <Scan className="w-3 h-3 text-amber-400" />
                      <span>
                        {docType === 'ktp'
                          ? 'Ukuran Standar KTP (85.60 × 53.98 mm)'
                          : 'Ukuran Dokumen KK (Kartu Keluarga)'}
                      </span>
                    </div>

                    {/* Center watermark placeholder */}
                    <div className="text-center opacity-30 text-white">
                      {docType === 'ktp' ? (
                        <CreditCard className="w-14 h-14 mx-auto mb-1 stroke-1" />
                      ) : (
                        <FileText className="w-14 h-14 mx-auto mb-1 stroke-1" />
                      )}
                      <span className="text-[11px] font-bold tracking-wider uppercase">
                        Posisikan {docType.toUpperCase()} di Dalam Bingkai
                      </span>
                    </div>

                    <div className="absolute bottom-2 text-[10px] text-white/90 bg-black/60 px-2 py-0.5 rounded font-medium">
                      Pastikan teks dan foto terlihat jelas & tidak terpotong
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Subtitle Warning */}
        <p className="text-[10px] text-amber-300/80 mt-2 text-center">
          {isDocument
            ? '*Kamera belakang aktif secara otomatis. Pas-kan dokumen ke dalam tanda pembidik ukuran.'
            : '*Foto live kamera langsung (hasil sesuai tampilan layar)'}
        </p>

        {/* Control Buttons */}
        <div className="flex items-center gap-2 mt-4 w-full">
          {!capturedPreview && !cameraError && (
            <>
              <button
                type="button"
                onClick={toggleCameraFacing}
                className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs flex items-center justify-center border border-slate-700 transition-colors cursor-pointer"
                title="Ganti Kamera Belakang / Depan"
              >
                <SwitchCamera className="w-4 h-4" />
              </button>
              {!isDocument && (
                <button
                  type="button"
                  onClick={() => setIsMirrorView(!isMirrorView)}
                  className={`p-2 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                    isMirrorView
                      ? 'bg-amber-500 text-slate-950 border-amber-600'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                  title="Alihkan mode cermin tampilan live"
                >
                  {isMirrorView ? 'Cermin' : 'Normal'}
                </button>
              )}
              <button
                type="button"
                onClick={takeSnapshot}
                className="flex-1 py-2.5 px-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4" /> Ambil Foto {isDocument ? 'Dokumen' : 'Selfie'}
              </button>
            </>
          )}
          {capturedPreview && (
            <>
              <button
                type="button"
                onClick={handleRetake}
                className="flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1 border border-slate-700 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Foto Ulang
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1 shadow-md active:scale-95 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" /> Gunakan Berkas
              </button>
            </>
          )}
          {cameraError && (
            <button
              type="button"
              onClick={() => startCamera(facingMode)}
              className="w-full py-2.5 px-3 bg-slate-800 text-white font-bold rounded-xl text-xs cursor-pointer"
            >
              Coba Lagi
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

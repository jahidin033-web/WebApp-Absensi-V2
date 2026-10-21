import React, { useState, useEffect, useRef } from 'react';
import {
  RefreshCw,
  Camera,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  LogIn,
  LogOut,
  ExternalLink,
  SwitchCamera,
  Clock,
  Sparkles,
  UserX,
  Navigation,
  MapPin,
  ShieldAlert,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { AttendanceLog, Employee, Project } from '../types';
import { calculateHaversine, getCurrentPosition } from '../utils/geo';
import { speakIndonesian } from '../utils/speech';
import { syncToGoogleSheets, cleanTimeString, cleanDateString, savePhotoCache, loadEmployees } from '../utils/storage';
import { getDirectImageUrl } from '../utils/image';

interface WorkerAttendanceProps {
  companyName: string;
  projects: Project[];
  employees: Employee[];
  logs: AttendanceLog[];
  onAddLog: (log: AttendanceLog) => void;
  onUpdateLog: (log: AttendanceLog) => void;
  enableVoice: boolean;
  gasUrl: string;
  onShowToast: (msg: string, type: 'success' | 'danger' | 'warning' | 'info') => void;
  isDesktopView?: boolean;
}

export const WorkerAttendance: React.FC<WorkerAttendanceProps> = ({
  companyName,
  projects,
  employees,
  logs,
  onAddLog,
  onUpdateLog,
  enableVoice,
  gasUrl,
  onShowToast,
  isDesktopView = false,
}) => {
  // Hanya proyek aktif yg dapat dipilih
  const activeProjects = projects.filter((p) => p.statusAktif !== false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    activeProjects[0]?.id || ''
  );
  const [selectedShiftId, setSelectedShiftId] = useState<string>('');
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [isGpsLoading, setIsGpsLoading] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Jika selectedProjectId tidak ada di activeProjects, alihkan ke activeProjects[0]
  useEffect(() => {
    if (activeProjects.length > 0 && !activeProjects.some((p) => p.id === selectedProjectId)) {
      setSelectedProjectId(activeProjects[0].id);
    }
  }, [activeProjects, selectedProjectId]);

  const selectedProject = activeProjects.find((p) => p.id === selectedProjectId) || activeProjects[0];

  // Active shift configuration for this project
  const activeShift =
    selectedProject?.shifts?.find((s) => s.id === selectedShiftId) ||
    selectedProject?.shifts?.[0] || {
      id: 'default',
      nama: 'Shift Normal',
      jamMasuk: selectedProject?.jamMasuk || '08:00',
      jamPulang: '17:00',
      toleransi: selectedProject?.toleransi || 15,
      minJamKerja: selectedProject?.minJamKerja || 7,
    };

  // Sync selectedShiftId when project changes
  useEffect(() => {
    if (selectedProject?.shifts?.[0]) {
      setSelectedShiftId(selectedProject.shifts[0].id);
    }
  }, [selectedProjectId, selectedProject]);

  // Employee ID & auto verification
  const [userIdInput, setUserIdInput] = useState<string>('');
  const [matchedEmployee, setMatchedEmployee] = useState<Employee | null>(null);

  // Status Aktif & Izin Bebas Lokasi
  const isEmployeeInactive = matchedEmployee ? matchedEmployee.statusAktif === false : false;
  const isBebasLokasi = matchedEmployee ? Boolean(matchedEmployee.izinBebasLokasi) : false;

  // Camera & Photo state
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isMirrorView, setIsMirrorView] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Early departure confirmation dialog state
  const [earlyDepartureWarning, setEarlyDepartureWarning] = useState<{
    show: boolean;
    hoursWorked: number;
    minRequired: number;
    logToUpdate: AttendanceLog | null;
  }>({
    show: false,
    hoursWorked: 0,
    minRequired: 0,
    logToUpdate: null,
  });
  const [earlyReason, setEarlyReason] = useState<string>('');

  // Calculate distance & validity
  let distanceToProject = 0;
  let isWithinRadius = false;

  if (isBebasLokasi) {
    isWithinRadius = true;
    if (userCoords && selectedProject) {
      distanceToProject = calculateHaversine(
        userCoords.lat,
        userCoords.lng,
        selectedProject.lat,
        selectedProject.lng
      );
    }
  } else if (userCoords && selectedProject) {
    distanceToProject = calculateHaversine(
      userCoords.lat,
      userCoords.lng,
      selectedProject.lat,
      selectedProject.lng
    );
    isWithinRadius = distanceToProject <= selectedProject.radius;
  }

  // Refresh GPS
  const handleRefreshGPS = async () => {
    setIsGpsLoading(true);
    setGpsError(null);
    try {
      const pos = await getCurrentPosition();
      setUserCoords(pos);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal mengakses GPS';
      setGpsError(message);
      onShowToast(message, 'danger');
    } finally {
      setIsGpsLoading(false);
    }
  };

  useEffect(() => {
    handleRefreshGPS();
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    const cleanId = userIdInput.trim().toUpperCase();
    if (!cleanId) {
      setMatchedEmployee(null);
      return;
    }
    const empList = employees && employees.length > 0 ? employees : loadEmployees();
    const found = empList.find((e) => e.id.toUpperCase() === cleanId);
    setMatchedEmployee(found || null);
  }, [userIdInput, employees]);

  // Camera handling
  const startCamera = async (mode: 'user' | 'environment' = facingMode) => {
    try {
      stopCamera();
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: mode,
          width: { ideal: 640 },
          height: { ideal: 640 },
        },
        audio: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
      setCapturedPhoto(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Tidak dapat membuka kamera';
      onShowToast(`Kamera Error: ${msg}. Pastikan izin kamera aktif.`, 'danger');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const toggleCameraFacing = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    if (isCameraActive) {
      startCamera(nextMode);
    }
  };

  const takeSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) {
      onShowToast('Buka kamera terlebih dahulu!', 'warning');
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // REVISI 3: Ukuran ultra-ringan hemat memori untuk pratinjau verifikasi absensi (200x200, ~5-7 KB)
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

    // Watermark ringkas & rapi
    const now = new Date();
    const dateStr = now.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const timeStr = `${hours}:${minutes}:${seconds}`;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fillRect(0, size - 34, size, 34);

    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 8.5px sans-serif';
    ctx.fillText(`${companyName || 'AbsensiPro'} - ${selectedProject?.nama || 'Site'}`, 6, size - 19);

    ctx.fillStyle = '#ffffff';
    ctx.font = '7.5px monospace';
    const coordsStr = userCoords
      ? `${userCoords.lat.toFixed(4)}, ${userCoords.lng.toFixed(4)}`
      : 'GPS OK';
    ctx.fillText(`${dateStr} ${timeStr} WIB | ${coordsStr}`, 6, size - 7);

    // Selalu JPEG untuk kompatibilitas native Google Drive & ukuran super kecil
    const dataUrl = canvas.toDataURL('image/jpeg', 0.42);

    setCapturedPhoto(dataUrl);
    stopCamera();
    onShowToast('Foto selfie berhasil diambil!', 'success');
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
    startCamera();
  };

  const getTodayDateString = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const getCurrentTimeString = () => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  // Absen Masuk Handler
  const handleAbsenMasuk = async () => {
    const rawId = userIdInput.trim().toUpperCase();
    if (!rawId) {
      onShowToast('Masukkan ID Karyawan terlebih dahulu!', 'warning');
      speakIndonesian('Mohon masukkan ID unik Anda.', enableVoice);
      return;
    }

    // 1. Validasi Keberadaan Karyawan dalam Database (Wajib Terdaftar)
    const currentEmployees = employees.length > 0 ? employees : loadEmployees();
    const registeredEmp = currentEmployees.find((e) => e.id.toUpperCase() === rawId);
    if (!registeredEmp) {
      const msg = `Absen Masuk Ditolak! ID "${rawId}" tidak terdaftar dalam database. Karyawan yang belum terdaftar tidak dapat melakukan absensi.`;
      onShowToast(msg, 'danger');
      speakIndonesian('Absen ditolak. ID Karyawan Anda tidak terdaftar dalam database.', enableVoice);
      return;
    }

    // 2. Validasi Status Keaktifan Akun dalam Database (Status Aktif)
    if (registeredEmp.statusAktif === false || (registeredEmp as any).statusAktif === 'Nonaktif') {
      const msg = `Absen Masuk Ditolak! Akun karyawan "${registeredEmp.nama}" (${registeredEmp.id}) berstatus NONAKTIF dalam database. Hubungi Admin untuk aktivasi akun.`;
      onShowToast(msg, 'danger');
      speakIndonesian('Absen ditolak. Akun karyawan Anda berstatus nonaktif.', enableVoice);
      return;
    }

    if (!selectedProject) {
      onShowToast('Pilih lokasi proyek aktif terlebih dahulu!', 'warning');
      return;
    }

    if (selectedProject.statusAktif === false) {
      onShowToast('Proyek ini berstatus Nonaktif dan tidak dapat digunakan untuk absensi!', 'danger');
      return;
    }

    if (!userCoords) {
      onShowToast('Lokasi GPS belum terdeteksi. Silakan klik Refresh GPS.', 'warning');
      speakIndonesian('GPS belum siap. Mohon refresh lokasi GPS.', enableVoice);
      return;
    }

    if (!isWithinRadius && !isBebasLokasi) {
      const msg = `Absen Masuk Ditolak! Anda berada di luar radius proyek (${distanceToProject}m dari lokasi, batas ${selectedProject.radius}m).`;
      onShowToast(msg, 'danger');
      speakIndonesian('Absen ditolak. Anda berada di luar radius lokasi proyek.', enableVoice);
      return;
    }

    if (!capturedPhoto) {
      onShowToast('Ambil foto selfie verifikasi terlebih dahulu!', 'warning');
      speakIndonesian('Mohon ambil foto selfie terlebih dahulu.', enableVoice);
      return;
    }

    const todayStr = getTodayDateString();
    const existing = logs.find(
      (l) => l.userId.toUpperCase() === rawId && cleanDateString(l.tanggal) === todayStr
    );

    if (existing) {
      onShowToast(`Anda sudah melakukan Absen Masuk hari ini pukul ${cleanTimeString(existing.jamMasuk)}!`, 'warning');
      speakIndonesian('Anda sudah melakukan absen masuk hari ini.', enableVoice);
      return;
    }

    const timeStr = getCurrentTimeString();
    const employeeName = matchedEmployee ? matchedEmployee.nama : rawId;
    let status: AttendanceLog['status'] = 'Hadir';
    let isLate = false;
    let lateMinutes = 0;

    const shiftJamMasuk = cleanTimeString(activeShift.jamMasuk || selectedProject.jamMasuk || '08:00');
    const shiftToleransi = activeShift.toleransi ?? selectedProject.toleransi ?? 15;

    if (shiftJamMasuk && shiftJamMasuk !== '-') {
      const [schedH, schedM] = shiftJamMasuk.split(':').map(Number);
      const schedMinutes = schedH * 60 + schedM;
      const [curH, curM] = timeStr.split(':').map(Number);
      const curMinutes = curH * 60 + curM;
      const diff = curMinutes - schedMinutes;
      if (diff > shiftToleransi) {
        status = 'Terlambat';
        isLate = true;
        lateMinutes = diff;
      }
    }

    const note = isBebasLokasi
      ? `Bebas Lokasi (${activeShift.nama})${isLate ? ` | Terlambat ${lateMinutes}m` : ''}`
      : isLate
      ? `Terlambat ${lateMinutes} menit (${activeShift.nama})`
      : `Tepat Waktu (${activeShift.nama})`;

    const newLog: AttendanceLog = {
      id: `LOG-${Date.now()}`,
      userId: rawId,
      nama: employeeName,
      proyek: selectedProject.nama,
      proyekId: selectedProject.id,
      shiftNama: activeShift.nama,
      tanggal: todayStr,
      jamMasuk: timeStr,
      jamPulang: '-',
      status: status,
      fotoMasuk: capturedPhoto,
      fotoPulang: null,
      durasiJam: 0,
      keterangan: note,
      userLat: userCoords.lat,
      userLng: userCoords.lng,
      jarakMeter: distanceToProject,
      isBebasLokasi: isBebasLokasi,
      createdAt: Date.now(),
    };

    savePhotoCache(`${newLog.userId}_${newLog.tanggal}_in`, capturedPhoto);
    onAddLog(newLog);

    syncToGoogleSheets(gasUrl, 'absen', {
      userId: newLog.userId,
      nama: newLog.nama,
      proyek: newLog.proyek,
      shiftNama: newLog.shiftNama,
      tanggal: newLog.tanggal,
      jamMasuk: newLog.jamMasuk,
      jamPulang: newLog.jamPulang,
      status: newLog.status,
      durasiJam: 0,
      keterangan: newLog.keterangan,
      fotoMasuk: capturedPhoto,
      fotoPulang: null,
      userLat: newLog.userLat,
      userLng: newLog.userLng,
      isBebasLokasi: isBebasLokasi,
      mapsUrl: newLog.userLat && newLog.userLng ? `https://www.google.com/maps?q=${newLog.userLat},${newLog.userLng}` : '',
    });

    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    });

    const successMsg = `Absen Masuk Berhasil! Selamat bekerja, ${employeeName}.`;
    onShowToast(successMsg, 'success');
    speakIndonesian(`Absen masuk berhasil. Selamat bekerja ${employeeName}`, enableVoice);
    setCapturedPhoto(null);
  };

  // Absen Pulang Handler
  const handleAbsenPulang = async () => {
    const rawId = userIdInput.trim().toUpperCase();
    if (!rawId) {
      onShowToast('Masukkan ID Karyawan terlebih dahulu!', 'warning');
      speakIndonesian('Mohon masukkan ID unik Anda.', enableVoice);
      return;
    }

    // 1. Validasi Keberadaan Karyawan dalam Database (Wajib Terdaftar)
    const currentEmployees = employees.length > 0 ? employees : loadEmployees();
    const registeredEmp = currentEmployees.find((e) => e.id.toUpperCase() === rawId);
    if (!registeredEmp) {
      const msg = `Absen Pulang Ditolak! ID "${rawId}" tidak terdaftar dalam database karyawan.`;
      onShowToast(msg, 'danger');
      speakIndonesian('Absen ditolak. ID Karyawan Anda tidak terdaftar.', enableVoice);
      return;
    }

    // 2. Validasi Status Keaktifan Akun dalam Database (Status Aktif)
    if (registeredEmp.statusAktif === false || (registeredEmp as any).statusAktif === 'Nonaktif') {
      const msg = `Absen Pulang Ditolak! Akun karyawan "${registeredEmp.nama}" (${registeredEmp.id}) berstatus NONAKTIF dalam database. Hubungi Admin.`;
      onShowToast(msg, 'danger');
      speakIndonesian('Absen ditolak. Akun karyawan Anda berstatus nonaktif.', enableVoice);
      return;
    }

    if (!selectedProject) {
      onShowToast('Pilih lokasi proyek aktif!', 'warning');
      return;
    }

    if (selectedProject.statusAktif === false) {
      onShowToast('Proyek ini berstatus Nonaktif dan tidak dapat digunakan untuk absensi!', 'danger');
      return;
    }

    if (!userCoords) {
      onShowToast('Lokasi GPS belum terdeteksi. Silakan klik Refresh GPS.', 'warning');
      return;
    }

    if (!isWithinRadius && !isBebasLokasi) {
      onShowToast(`Absen Pulang Ditolak! Anda di luar radius proyek (${distanceToProject}m).`, 'danger');
      speakIndonesian('Absen ditolak. Anda berada di luar radius proyek.', enableVoice);
      return;
    }

    if (!capturedPhoto) {
      onShowToast('Ambil foto selfie sebelum Absen Pulang!', 'warning');
      speakIndonesian('Mohon ambil foto selfie sebelum absen pulang.', enableVoice);
      return;
    }

    const todayStr = getTodayDateString();
    const existingLog = logs.find(
      (l) => l.userId.toUpperCase() === rawId && cleanDateString(l.tanggal) === todayStr
    );

    if (!existingLog) {
      onShowToast('Absen Pulang Ditolak! Anda belum melakukan Absen Masuk hari ini.', 'danger');
      speakIndonesian('Absen pulang ditolak. Anda belum melakukan absen masuk hari ini.', enableVoice);
      return;
    }

    const cleanExistingPulang = cleanTimeString(existingLog.jamPulang);
    if (cleanExistingPulang && cleanExistingPulang !== '-') {
      onShowToast(`Anda sudah melakukan Absen Pulang hari ini pukul ${cleanExistingPulang}!`, 'warning');
      speakIndonesian('Anda sudah melakukan absen pulang sebelumnya.', enableVoice);
      return;
    }

    const timeStr = getCurrentTimeString();
    const cleanMasuk = cleanTimeString(existingLog.jamMasuk);
    const [inH, inM] = cleanMasuk.split(':').map(Number);
    const [outH, outM] = timeStr.split(':').map(Number);
    let diffMinutes = outH * 60 + outM - (inH * 60 + inM);
    if (diffMinutes < 0) {
      diffMinutes += 24 * 60;
    }

    const hoursWorked = Number((diffMinutes / 60).toFixed(2));
    const minRequiredHours = activeShift.minJamKerja || selectedProject.minJamKerja || 7;

    if (hoursWorked < minRequiredHours) {
      setEarlyDepartureWarning({
        show: true,
        hoursWorked,
        minRequired: minRequiredHours,
        logToUpdate: existingLog,
      });
      speakIndonesian(
        `Waktu kerja baru ${hoursWorked} jam. Kurang dari batas minimal ${minRequiredHours} jam.`,
        enableVoice
      );
      return;
    }

    finalizeAbsenPulang(existingLog, hoursWorked, timeStr, 'Hadir');
  };

  const finalizeAbsenPulang = (
    logToUpdate: AttendanceLog,
    hoursWorked: number,
    timeStr: string,
    finalStatus: AttendanceLog['status'],
    note?: string
  ) => {
    if (capturedPhoto) {
      savePhotoCache(`${logToUpdate.userId}_${logToUpdate.tanggal}_out`, capturedPhoto);
    }

    const updatedLog: AttendanceLog = {
      ...logToUpdate,
      jamPulang: timeStr,
      fotoPulang: capturedPhoto || logToUpdate.fotoPulang,
      durasiJam: hoursWorked,
      status: finalStatus,
      keterangan: note
        ? `${logToUpdate.keterangan ? logToUpdate.keterangan + ' | ' : ''}${note}`
        : logToUpdate.keterangan,
    };

    onUpdateLog(updatedLog);

    syncToGoogleSheets(gasUrl, 'absen', {
      userId: updatedLog.userId,
      nama: updatedLog.nama,
      proyek: updatedLog.proyek,
      shiftNama: updatedLog.shiftNama,
      tanggal: updatedLog.tanggal,
      jamMasuk: updatedLog.jamMasuk,
      jamPulang: updatedLog.jamPulang,
      status: updatedLog.status,
      durasiJam: updatedLog.durasiJam,
      keterangan: updatedLog.keterangan,
      fotoMasuk: updatedLog.fotoMasuk,
      fotoPulang: capturedPhoto || updatedLog.fotoPulang,
      userLat: updatedLog.userLat,
      userLng: updatedLog.userLng,
      isBebasLokasi: updatedLog.isBebasLokasi,
      mapsUrl: updatedLog.userLat && updatedLog.userLng ? `https://www.google.com/maps?q=${updatedLog.userLat},${updatedLog.userLng}` : '',
    });

    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 },
    });

    const successMsg = `Absen Pulang Berhasil! Total kerja: ${hoursWorked} jam. Hati-hati di jalan, ${logToUpdate.nama}!`;
    onShowToast(successMsg, 'success');
    speakIndonesian(
      `Absen pulang berhasil. Terima kasih dan hati-hati di jalan ${logToUpdate.nama}`,
      enableVoice
    );
    setCapturedPhoto(null);
    setEarlyDepartureWarning({ show: false, hoursWorked: 0, minRequired: 0, logToUpdate: null });
    setEarlyReason('');
  };

  return (
    <div className={`space-y-4 ${isDesktopView ? 'max-w-5xl mx-auto' : ''}`}>
      {/* Desktop Layout: Grid 2 Kolom yang Rapi dan Proporsional */}
      <div className={`${isDesktopView ? 'grid grid-cols-1 lg:grid-cols-12 gap-5' : 'space-y-4'}`}>
        
        {/* Kolom Kiri: Proyek, Radius GPS & Identitas Karyawan */}
        <div className={`${isDesktopView ? 'lg:col-span-6 space-y-4' : 'space-y-4'}`}>
          {/* 1. LOKASI PROYEK & RADIUS GPS */}
          <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[10px] font-black">
                  1
                </span>
                Lokasi Proyek & Radius GPS
              </label>
              {selectedProject && (
                <a
                  href={`https://www.google.com/maps?q=${selectedProject.lat},${selectedProject.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline font-bold flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" /> Peta Site
                </a>
              )}
            </div>

            {activeProjects.length === 0 ? (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-2xl text-rose-800 dark:text-rose-300 text-xs font-semibold text-center">
                Tidak ada proyek yang aktif saat ini. Harap hubungi Admin untuk mengaktifkan proyek.
              </div>
            ) : (
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl p-3 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none transition-all cursor-pointer"
              >
                {activeProjects.map((proj) => (
                  <option key={proj.id} value={proj.id}>
                    {proj.nama} ({proj.shiftScheme === '1_SHIFT' ? '1 Shift' : proj.shiftScheme === '2_SHIFT' ? '2 Shift' : '3 Shift'})
                  </option>
                ))}
              </select>
            )}

            {/* Shift Selection */}
            {selectedProject?.shifts && selectedProject.shifts.length > 0 && (
              <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Pilih Shift Kerja Anda:
                </label>
                <div
                  className={`grid ${
                    selectedProject.shifts.length === 1
                      ? 'grid-cols-1'
                      : selectedProject.shifts.length === 2
                      ? 'grid-cols-2'
                      : 'grid-cols-3'
                  } gap-1.5`}
                >
                  {selectedProject.shifts.map((sh) => (
                    <button
                      key={sh.id}
                      type="button"
                      onClick={() => setSelectedShiftId(sh.id)}
                      className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                        activeShift?.id === sh.id
                          ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="font-extrabold text-xs truncate">{sh.nama}</div>
                      <div className="text-[10px] opacity-85 mt-0.5 font-mono">
                        {sh.jamMasuk} - {sh.jamPulang}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Project Shift Brief */}
            {selectedProject && (
              <div className="mt-2.5 text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-1.5 px-1">
                <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium px-2 py-0.5 rounded-lg flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-500" /> Masuk: {activeShift.jamMasuk} (Tol: {activeShift.toleransi}m)
                </span>
                <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium px-2 py-0.5 rounded-lg">
                  Min: {activeShift.minJamKerja} Jam
                </span>
                <span className="bg-amber-100/70 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 font-bold px-2 py-0.5 rounded-lg">
                  Radius: {selectedProject.radius}m
                </span>
              </div>
            )}

            {/* GPS Radius Check Status Box */}
            <div
              className={`mt-3 p-3.5 rounded-2xl border flex items-center justify-between text-xs transition-all ${
                isGpsLoading
                  ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                  : gpsError
                  ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                  : isBebasLokasi
                  ? 'bg-sky-50 dark:bg-sky-950/30 border-sky-300 dark:border-sky-800 text-sky-950 dark:text-sky-200'
                  : isWithinRadius
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                  : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
              }`}
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                {isGpsLoading ? (
                  <RefreshCw className="w-4 h-4 text-amber-600 animate-spin shrink-0" />
                ) : isBebasLokasi ? (
                  <Navigation className="w-4 h-4 text-sky-600 shrink-0" />
                ) : isWithinRadius ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="font-bold flex items-center gap-1.5 truncate">
                    <span>
                      {isGpsLoading
                        ? 'Mendeteksi Posisi GPS...'
                        : gpsError
                        ? 'Gagal Membaca GPS'
                        : isBebasLokasi
                        ? 'Izin Bebas Lokasi Aktif'
                        : isWithinRadius
                        ? 'Di Dalam Radius Proyek'
                        : 'Di Luar Radius Proyek'}
                    </span>
                    {isBebasLokasi && (
                      <span className="bg-sky-200/80 dark:bg-sky-900 text-sky-900 dark:text-sky-200 text-[9px] font-bold px-1.5 py-0.2 rounded shrink-0">
                        Fleksibel
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] opacity-80 truncate">
                    {userCoords ? (
                      isBebasLokasi ? (
                        <>Bebas radius ({userCoords.lat.toFixed(4)}, {userCoords.lng.toFixed(4)})</>
                      ) : (
                        <>
                          Jarak: <strong>{distanceToProject} m</strong> (Batas: {selectedProject?.radius}m) | Akurasi: {userCoords.accuracy}m
                        </>
                      )
                    ) : (
                      'Pastikan izin GPS browser aktif'
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={handleRefreshGPS}
                disabled={isGpsLoading}
                className="px-2.5 py-1.5 bg-white/90 dark:bg-slate-800 hover:bg-white text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold shadow-xs border border-slate-200 dark:border-slate-700 active:scale-95 transition-all flex items-center gap-1 cursor-pointer shrink-0 ml-2"
              >
                <RefreshCw className={`w-3 h-3 ${isGpsLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* 2. IDENTITAS KARYAWAN */}
          <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800 transition-colors">
            <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[10px] font-black">
                  2
                </span>
                ID Karyawan
              </span>
              {employees.length > 0 && (
                <span className="text-[10px] font-normal text-slate-400">
                  {employees.filter((e) => e.statusAktif !== false).length} aktif / {employees.length} terdaftar
                </span>
              )}
            </label>

            <div className="relative">
              <input
                type="text"
                value={userIdInput}
                onChange={(e) => setUserIdInput(e.target.value.toUpperCase())}
                placeholder="Masukkan ID Karyawan Anda"
                className={`w-full bg-slate-50 dark:bg-slate-800 border rounded-2xl p-3 pl-10 pr-10 text-sm font-bold tracking-wider uppercase text-slate-900 dark:text-white focus:ring-2 outline-none transition-all ${
                  isEmployeeInactive || (!matchedEmployee && userIdInput.trim().length > 0)
                    ? 'border-rose-400 bg-rose-50/40 dark:bg-rose-950/20 focus:ring-rose-400'
                    : matchedEmployee
                    ? 'border-emerald-400 bg-emerald-50/20 dark:bg-emerald-950/20 focus:ring-emerald-400'
                    : 'border-slate-300 dark:border-slate-700 focus:ring-amber-500'
                }`}
              />
              <UserCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              {matchedEmployee && !isEmployeeInactive && (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 absolute right-3.5 top-3.5" />
              )}
              {isEmployeeInactive && (
                <UserX className="w-4 h-4 text-rose-500 absolute right-3.5 top-3.5" />
              )}
              {!matchedEmployee && userIdInput.trim().length > 0 && (
                <ShieldAlert className="w-4 h-4 text-rose-500 absolute right-3.5 top-3.5" />
              )}
            </div>

            {/* Warning jika karyawan belum terdaftar */}
            {!matchedEmployee && userIdInput.trim().length > 0 && (
              <div className="mt-2.5 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-2xl flex items-center gap-2.5 text-rose-900 dark:text-rose-200">
                <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                <div className="text-xs">
                  <strong className="block font-bold">ID Karyawan Tidak Terdaftar!</strong>
                  <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5">
                    ID <strong>{userIdInput.trim().toUpperCase()}</strong> belum terdaftar dalam database. Karyawan yang belum terdaftar tidak dapat melakukan absensi. Hubungi Admin untuk mendaftarkan akun Anda.
                  </p>
                </div>
              </div>
            )}

            {/* Warning jika akun karyawan nonaktif */}
            {isEmployeeInactive && (
              <div className="mt-2.5 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-2xl flex items-center gap-2.5 text-rose-900 dark:text-rose-200">
                <UserX className="w-5 h-5 text-rose-600 shrink-0" />
                <div className="text-xs">
                  <strong className="block font-bold">Akun Karyawan Nonaktif!</strong>
                  <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5">
                    Akun <strong>{matchedEmployee?.nama}</strong> ({matchedEmployee?.id}) telah dinonaktifkan dalam database oleh Admin. Absen masuk dan pulang diblokir.
                  </p>
                </div>
              </div>
            )}

            {/* Matched Employee Profile Card */}
            {matchedEmployee && !isEmployeeInactive && (
              <div className="mt-2.5 p-2.5 bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {matchedEmployee.fotoSelfie ? (
                    <img
                      src={getDirectImageUrl(matchedEmployee.fotoSelfie)}
                      alt={matchedEmployee.nama}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-full object-cover border border-emerald-400 shadow-xs"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center font-bold text-xs">
                      {matchedEmployee.nama.charAt(0)}
                    </div>
                  )}
                  <div>
                    <div className="text-xs font-bold text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{matchedEmployee.nama}</span>
                      {matchedEmployee.izinBebasLokasi && (
                        <span className="bg-sky-200 dark:bg-sky-900 text-sky-950 dark:text-sky-200 text-[9px] font-bold px-1.5 py-0.2 rounded">
                          Bebas Lokasi
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-emerald-700 dark:text-emerald-400">
                      Divisi: {matchedEmployee.dept} | {matchedEmployee.jabatan || 'Staff'}
                    </div>
                  </div>
                </div>
                <span className="bg-emerald-200/80 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg">
                  Karyawan Aktif
                </span>
              </div>
            )}

            {!userIdInput.trim() && (
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 px-1">
                *Format: Inisial nama + tanggal lahir (DDMMYY)
              </p>
            )}
          </div>
        </div>

        {/* Kolom Kanan: Foto Selfie Live & Tombol Absen */}
        <div className={`${isDesktopView ? 'lg:col-span-6 space-y-4 flex flex-col justify-between' : 'space-y-4'}`}>
          {/* 3. FOTO SELFIE LIVE */}
          <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800 text-center transition-colors">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[10px] font-black">
                  3
                </span>
                Foto Selfie Live
              </label>
              <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full font-semibold">
                Anti-Fake GPS & Joki
              </span>
            </div>

            {/* Camera Viewport / Captured Preview */}
            <div className="relative w-56 h-56 sm:w-60 sm:h-60 mx-auto bg-slate-950 rounded-3xl overflow-hidden shadow-inner border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center">
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                className={`w-full h-full object-cover ${isCameraActive ? 'block' : 'hidden'} ${
                  isMirrorView && facingMode === 'user' ? 'scale-x-[-1]' : ''
                }`}
              />
              {capturedPhoto && !isCameraActive && (
                <img
                  src={capturedPhoto}
                  alt="Selfie Preview"
                  className="w-full h-full object-cover"
                />
              )}
              <canvas ref={canvasRef} className="hidden" />

              {!isCameraActive && !capturedPhoto && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 text-xs p-4 bg-slate-900">
                  <Camera className="w-8 h-8 mb-2 text-slate-500" />
                  <span className="font-medium text-center">Kamera Belum Aktif</span>
                  <span className="text-[10px] text-slate-500 mt-0.5">
                    Klik tombol &quot;Buka Kamera&quot; di bawah
                  </span>
                </div>
              )}

              {isCameraActive && (
                <div className="absolute top-2 left-2 bg-rose-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-1 animate-pulse">
                  <span className="w-1.5 h-1.5 bg-white rounded-full"></span> LIVE
                </div>
              )}
            </div>

            {/* Camera Control Buttons */}
            <div className="flex justify-center items-center gap-2 mt-3.5">
              {!isCameraActive && !capturedPhoto && (
                <button
                  onClick={() => startCamera()}
                  className="px-4 py-2 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                >
                  <Camera className="w-4 h-4 text-amber-400" /> Buka Kamera
                </button>
              )}
              {isCameraActive && (
                <>
                  <button
                    type="button"
                    onClick={toggleCameraFacing}
                    className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                    title="Ganti Kamera Depan/Belakang"
                  >
                    <SwitchCamera className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsMirrorView(!isMirrorView)}
                    className={`p-2 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                      isMirrorView
                        ? 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                    title="Alihkan mode cermin tampilan live"
                  >
                    {isMirrorView ? 'Cermin ON' : 'Normal'}
                  </button>
                  <button
                    type="button"
                    onClick={takeSnapshot}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" /> Ambil Foto Selfie
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    Tutup
                  </button>
                </>
              )}
              {capturedPhoto && !isCameraActive && (
                <button
                  onClick={handleRetake}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1.5 border border-slate-300 dark:border-slate-700 shadow-xs active:scale-95 transition-all cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4 text-slate-600 dark:text-slate-400" /> Foto Ulang
                </button>
              )}
            </div>
          </div>

          {/* 4. TOMBOL ABSENSI UTAMA (MASUK & PULANG) */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              onClick={handleAbsenMasuk}
              disabled={(!isWithinRadius && !isBebasLokasi) || !capturedPhoto || !userIdInput.trim() || !matchedEmployee || isEmployeeInactive || activeProjects.length === 0}
              className={`py-4 px-3 rounded-2xl shadow-lg flex flex-col items-center justify-center transition-all ${
                (isWithinRadius || isBebasLokasi) && capturedPhoto && userIdInput.trim() && matchedEmployee && !isEmployeeInactive && activeProjects.length > 0
                  ? 'bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white cursor-pointer shadow-emerald-600/30'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none'
              }`}
            >
              <LogIn className="w-6 h-6 mb-1" />
              <span className="text-sm font-extrabold tracking-wide">ABSEN MASUK</span>
              <span className="text-[10px] opacity-80 mt-0.5">
                {isBebasLokasi ? 'Mulai Kerja (Bebas Lokasi)' : 'Mulai Jam Kerja'}
              </span>
            </button>
            <button
              onClick={handleAbsenPulang}
              disabled={(!isWithinRadius && !isBebasLokasi) || !capturedPhoto || !userIdInput.trim() || !matchedEmployee || isEmployeeInactive || activeProjects.length === 0}
              className={`py-4 px-3 rounded-2xl shadow-lg flex flex-col items-center justify-center transition-all ${
                (isWithinRadius || isBebasLokasi) && capturedPhoto && userIdInput.trim() && matchedEmployee && !isEmployeeInactive && activeProjects.length > 0
                  ? 'bg-rose-600 hover:bg-rose-700 active:scale-95 text-white cursor-pointer shadow-rose-600/30'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none'
              }`}
            >
              <LogOut className="w-6 h-6 mb-1" />
              <span className="text-sm font-extrabold tracking-wide">ABSEN PULANG</span>
              <span className="text-[10px] opacity-80 mt-0.5">
                {isBebasLokasi ? 'Selesai (Bebas Lokasi)' : 'Selesai Jam Kerja'}
              </span>
            </button>
          </div>
        </div>

      </div>

      {/* MODAL KONFIRMASI PULANG LEBIH AWAL */}
      {earlyDepartureWarning.show && earlyDepartureWarning.logToUpdate && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Konfirmasi Pulang Cepat</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                Waktu kerja Anda baru tercatat{' '}
                <strong className="text-amber-700 dark:text-amber-400">{earlyDepartureWarning.hoursWorked} jam</strong>.{' '}
                Standar minimal proyek adalah{' '}
                <strong>{earlyDepartureWarning.minRequired} jam</strong>.
              </p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  Alasan / Izin Pulang Lebih Awal:
                </label>
                <span className="text-[10px] text-rose-600 font-bold bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.2 rounded">
                  *Wajib Diisi
                </span>
              </div>
              <textarea
                value={earlyReason}
                onChange={(e) => setEarlyReason(e.target.value)}
                placeholder="Tuliskan alasan izin pulang lebih awal..."
                rows={3}
                required
                className={`w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 resize-none ${
                  !earlyReason.trim()
                    ? 'border-rose-300 focus:ring-rose-400'
                    : 'border-slate-300 dark:border-slate-700 focus:ring-amber-500'
                }`}
              />
              {!earlyReason.trim() && (
                <span className="text-[10px] text-rose-500 mt-0.5 block">
                  *Anda wajib mengisi alasan izin sebelum melanjutkan.
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setEarlyDepartureWarning({
                    show: false,
                    hoursWorked: 0,
                    minRequired: 0,
                    logToUpdate: null,
                  });
                  setEarlyReason('');
                }}
                className="py-2.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!earlyReason.trim()}
                onClick={() => {
                  if (!earlyReason.trim()) {
                    onShowToast('Alasan / Izin pulang lebih awal wajib diisi!', 'warning');
                    return;
                  }
                  const timeStr = getCurrentTimeString();
                  finalizeAbsenPulang(
                    earlyDepartureWarning.logToUpdate!,
                    earlyDepartureWarning.hoursWorked,
                    timeStr,
                    'Pulang Cepat',
                    `Izin: ${earlyReason.trim()}`
                  );
                }}
                className="py-2.5 px-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:bg-slate-400 text-white rounded-xl text-xs font-bold cursor-pointer transition-all"
              >
                Tetap Pulang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

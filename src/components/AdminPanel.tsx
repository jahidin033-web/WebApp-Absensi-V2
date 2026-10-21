import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  Filter,
  FileSpreadsheet,
  PlusCircle,
  Trash2,
  Edit3,
  UserPlus,
  Building,
  KeyRound,
  Copy,
  Check,
  MapPin,
  Clock,
  Download,
  Upload,
  Search,
  Users,
  AlertCircle,
  AlertTriangle,
  X,
  CreditCard,
  FileText,
  Camera,
  Send,
  Globe,
  Building2,
  RefreshCw,
  Share2,
  Link2,
  CloudUpload,
  Power,
  PowerOff,
  CheckCircle2,
  XCircle,
  Navigation,
  Loader2,
  Radio,
} from 'lucide-react';
import { AppSettings, AttendanceLog, Employee, Project, ShiftConfig, ShiftScheme, PTKP_OPTIONS } from '../types';
import { generateEmployeeId } from '../utils/idGenerator';
import { exportAttendanceToExcel } from '../utils/excel';
import { getCurrentPosition } from '../utils/geo';
import {
  syncToGoogleSheets,
  fetchCloudSettings,
  generateDeviceSyncUrl,
  cleanDateString,
  cleanTimeString,
  formatTanggalLahir,
  toIsoDate,
  recordDeletedLog,
} from '../utils/storage';
import { getDirectImageUrl, toStandardDriveUrl } from '../utils/image';
import { LiveCameraModal } from './LiveCameraModal';
import { DocumentUploadDropzone } from './DocumentUploadDropzone';

interface AdminPanelProps {
  projects: Project[];
  employees: Employee[];
  logs: AttendanceLog[];
  settings: AppSettings;
  onUpdateProjects: (projects: Project[]) => void;
  onUpdateEmployees: (employees: Employee[]) => void;
  onUpdateLogs: (logs: AttendanceLog[]) => void;
  onUpdateSettings: (settings: AppSettings) => void;
  onPreviewPhoto: (photoUrl: string, title?: string, subtitle?: string, date?: string, userLat?: number, userLng?: number) => void;
  onShowToast: (msg: string, type: 'success' | 'danger' | 'warning' | 'info') => void;
  isDesktopView?: boolean;
}

type AdminTab = 'rekap' | 'karyawan' | 'proyek' | 'integrasi';

interface DeleteModalState {
  show: boolean;
  type: 'project' | 'employee' | 'log';
  targetId: string;
  title: string;
  description: string;
  targetLog?: AttendanceLog;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  projects,
  employees,
  logs,
  settings,
  onUpdateProjects,
  onUpdateEmployees,
  onUpdateLogs,
  onUpdateSettings,
  onPreviewPhoto,
  onShowToast,
  isDesktopView = false,
}) => {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>('');
  const [showPin, setShowPin] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<AdminTab>('rekap');

  // Delete Confirmation Modal State
  const [deleteModal, setDeleteModal] = useState<DeleteModalState>({
    show: false,
    type: 'project',
    targetId: '',
    title: '',
    description: '',
  });

  // Filter State for Rekap
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [filterProject, setFilterProject] = useState<string>('');
  const [filterKeyword, setFilterKeyword] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  // Manual Correction Modal State
  const [showCorrectionModal, setShowCorrectionModal] = useState<boolean>(false);
  const [correctionTarget, setCorrectionTarget] = useState<AttendanceLog | null>(null);
  const [korUserId, setKorUserId] = useState<string>('');
  const [korTanggal, setKorTanggal] = useState<string>('');
  const [korJamMasuk, setKorJamMasuk] = useState<string>('08:00');
  const [korJamPulang, setKorJamPulang] = useState<string>('17:00');
  const [korProyek, setKorProyek] = useState<string>(projects[0]?.nama || '');
  const [korCatatan, setKorCatatan] = useState<string>('Koreksi Admin (Lupa Absen)');

  // FITUR 2: POPUP PENDAFTARAN KARYAWAN BARU
  const [showRegisterModal, setShowRegisterModal] = useState<boolean>(false);
  const [regNama, setRegNama] = useState<string>('');
  const [regNik, setRegNik] = useState<string>('');
  const [regTglLahir, setRegTglLahir] = useState<string>('');
  const [regDept, setRegDept] = useState<string>('');
  const [regJabatan, setRegJabatan] = useState<string>('');
  const [regPhone, setRegPhone] = useState<string>('');
  const [regPtkp, setRegPtkp] = useState<string>('TK/0');
  const [regStatusAktif, setRegStatusAktif] = useState<boolean>(true);
  const [regIzinBebasLokasi, setRegIzinBebasLokasi] = useState<boolean>(false);
  const [regFotoKtp, setRegFotoKtp] = useState<string | null>(null);
  const [regFotoKtpType, setRegFotoKtpType] = useState<'image' | 'pdf'>('image');
  const [regFotoKtpName, setRegFotoKtpName] = useState<string>('');
  const [regFotoKk, setRegFotoKk] = useState<string | null>(null);
  const [regFotoKkType, setRegFotoKkType] = useState<'image' | 'pdf'>('image');
  const [regFotoKkName, setRegFotoKkName] = useState<string>('');
  const [regFotoSelfie, setRegFotoSelfie] = useState<string | null>(null);

  // Search & Filter Karyawan List
  const [searchKaryawan, setSearchKaryawan] = useState<string>('');
  const [filterEmployeeStatus, setFilterEmployeeStatus] = useState<'all' | 'active' | 'inactive'>('all');

  // Camera Target for Registration
  const [activeCameraTarget, setActiveCameraTarget] = useState<'ktp' | 'kk' | 'selfie' | null>(null);

  // FITUR 2: POPUP EDIT KARYAWAN
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editNama, setEditNama] = useState<string>('');
  const [editNik, setEditNik] = useState<string>('');
  const [editTglLahir, setEditTglLahir] = useState<string>('');
  const [editDept, setEditDept] = useState<string>('');
  const [editJabatan, setEditJabatan] = useState<string>('');
  const [editPhone, setEditPhone] = useState<string>('');
  const [editPtkp, setEditPtkp] = useState<string>('TK/0');
  const [editStatusAktif, setEditStatusAktif] = useState<boolean>(true);
  const [editIzinBebasLokasi, setEditIzinBebasLokasi] = useState<boolean>(false);
  const [editFotoKtp, setEditFotoKtp] = useState<string | null>(null);
  const [editFotoKtpType, setEditFotoKtpType] = useState<'image' | 'pdf'>('image');
  const [editFotoKtpName, setEditFotoKtpName] = useState<string>('');
  const [editFotoKk, setEditFotoKk] = useState<string | null>(null);
  const [editFotoKkType, setEditFotoKkType] = useState<'image' | 'pdf'>('image');
  const [editFotoKkName, setEditFotoKkName] = useState<string>('');
  const [editFotoSelfie, setEditFotoSelfie] = useState<string | null>(null);
  const [editCameraTarget, setEditCameraTarget] = useState<'ktp' | 'kk' | 'selfie' | null>(null);

  // Check if NIK is already registered
  const cleanRegNik = regNik.trim();
  const existingEmployeeWithNik = cleanRegNik
    ? employees.find((e) => e.nik.trim() === cleanRegNik)
    : null;

  // FITUR 2: POPUP TAMBAH / EDIT PROYEK
  const [showProjectModal, setShowProjectModal] = useState<boolean>(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [projNama, setProjNama] = useState<string>('');
  const [projLat, setProjLat] = useState<string>('');
  const [projLng, setProjLng] = useState<string>('');
  const [projRadius, setProjRadius] = useState<number>(100);
  const [projShiftScheme, setProjShiftScheme] = useState<ShiftScheme>('1_SHIFT');
  const [projStatusAktif, setProjStatusAktif] = useState<boolean>(true);
  const [projShifts, setProjShifts] = useState<ShiftConfig[]>([
    {
      id: 'shift-1',
      nama: 'Shift Normal (Pagi)',
      jamMasuk: '08:00',
      jamPulang: '17:00',
      toleransi: 15,
      minJamKerja: 7,
    },
  ]);
  const [isGettingGpsForProj, setIsGettingGpsForProj] = useState<boolean>(false);

  // Settings & Google Apps Script
  const [gasUrlInput, setGasUrlInput] = useState<string>(settings.gasUrl || '');
  const [isTestingGas, setIsTestingGas] = useState<boolean>(false);
  const [isCopiedCode, setIsCopiedCode] = useState<boolean>(false);
  const [isSyncingAll, setIsSyncingAll] = useState<boolean>(false);

  // Company Name State
  const [companyNameInput, setCompanyNameInput] = useState<string>(
    settings.companyName || 'PT Konstruksi Pratama Mandiri'
  );

  const handleSaveCompanyName = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanName = companyNameInput.trim();
    if (!cleanName) {
      onShowToast('Nama perusahaan tidak boleh kosong!', 'warning');
      return;
    }
    const updated = {
      ...settings,
      companyName: cleanName,
    };
    onUpdateSettings(updated);
    if (settings.gasUrl) {
      syncToGoogleSheets(settings.gasUrl, 'update_settings', {
        adminPin: settings.adminPin,
        companyName: cleanName,
      });
    }
    onShowToast(`Nama perusahaan berhasil diperbarui menjadi "${cleanName}"!`, 'success');
  };

  // PIN Management State
  const [currentPinVerify, setCurrentPinVerify] = useState<string>('');
  const [newPinInput, setNewPinInput] = useState<string>('');
  const [confirmPinInput, setConfirmPinInput] = useState<string>('');
  const [showPinChangeInputs, setShowPinChangeInputs] = useState<boolean>(false);
  const [isSyncingPin, setIsSyncingPin] = useState<boolean>(false);
  const [showLoginGasInput, setShowLoginGasInput] = useState<boolean>(false);

  const autoGeneratedId = generateEmployeeId(regNama, regTglLahir, employees);
  const activeAdminPin = settings.adminPin || '1234';
  const isUsingDefaultPin = activeAdminPin === '1234';

  useEffect(() => {
    if (settings.gasUrl) {
      fetchCloudSettings(settings.gasUrl).then((cloudRes) => {
        if (cloudRes.success) {
          if (cloudRes.adminPin && cloudRes.adminPin !== settings.adminPin) {
            onUpdateSettings({
              ...settings,
              adminPin: cloudRes.adminPin,
              companyName: cloudRes.companyName || settings.companyName,
            });
          }
          if (cloudRes.employees && cloudRes.employees.length > 0) {
            onUpdateEmployees(cloudRes.employees);
          }
          if (cloudRes.projects && cloudRes.projects.length > 0) {
            onUpdateProjects(cloudRes.projects);
          }
          if (cloudRes.logs && cloudRes.logs.length > 0) {
            onUpdateLogs(cloudRes.logs);
          }
        }
      });
    }
  }, [settings.gasUrl]);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const entered = pinInput.trim();
    if (!entered) {
      onShowToast('Masukkan PIN Admin!', 'warning');
      return;
    }

    let currentPin = settings.adminPin || '1234';

    if (settings.gasUrl) {
      setIsSyncingPin(true);
      try {
        const cloudRes = await fetchCloudSettings(settings.gasUrl);
        if (cloudRes.success && cloudRes.adminPin) {
          currentPin = cloudRes.adminPin;
          onUpdateSettings({
            ...settings,
            adminPin: cloudRes.adminPin,
            companyName: cloudRes.companyName || settings.companyName,
          });
          if (cloudRes.employees) onUpdateEmployees(cloudRes.employees);
          if (cloudRes.projects) onUpdateProjects(cloudRes.projects);
          if (cloudRes.logs) onUpdateLogs(cloudRes.logs);
        }
      } catch (err) {
        console.warn('Sync pin check error:', err);
      } finally {
        setIsSyncingPin(false);
      }
    }

    if (entered === '1234' && currentPin !== '1234') {
      onShowToast('PIN Default (1234) sudah dinonaktifkan permanen karena PIN admin telah diganti. Silakan gunakan PIN baru!', 'danger');
      return;
    }

    if (entered === currentPin) {
      setIsAuthenticated(true);
      setPinInput('');
      onShowToast('Berhasil masuk ke Panel Admin!', 'success');
    } else {
      onShowToast('PIN Admin salah. Silakan periksa kembali PIN Anda.', 'danger');
    }
  };

  const handleManualSyncSettings = async () => {
    if (!settings.gasUrl) {
      onShowToast('URL Google Sheets belum disetel di device ini.', 'warning');
      return;
    }
    setIsSyncingAll(true);
    try {
      const res = await fetchCloudSettings(settings.gasUrl);
      if (res.success) {
        onUpdateSettings({
          ...settings,
          adminPin: res.adminPin || settings.adminPin,
          companyName: res.companyName || settings.companyName,
        });
        if (res.companyName) setCompanyNameInput(res.companyName);
        if (res.employees) onUpdateEmployees(res.employees);
        if (res.projects) onUpdateProjects(res.projects);
        if (res.logs) onUpdateLogs(res.logs);

        const empCount = res.employees?.length ?? employees.length;
        const projCount = res.projects?.length ?? projects.length;
        const logCount = res.logs?.length ?? logs.length;
        onShowToast(`Sinkronisasi Cloud Berhasil! (${empCount} Karyawan, ${projCount} Proyek, ${logCount} Rekap Absensi)`, 'success');
      } else {
        onShowToast(`Gagal sinkron cloud: ${res.message || 'Periksa koneksi'}`, 'danger');
      }
    } finally {
      setIsSyncingAll(false);
    }
  };

  const [isUploadingLocalPhotos, setIsUploadingLocalPhotos] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');

  const handleUploadLocalPhotosToCloud = async () => {
    if (!settings.gasUrl) {
      onShowToast('Silakan isi URL Google Apps Script terlebih dahulu di tab Integrasi Cloud!', 'warning');
      return;
    }
    const localPhotoLogs = logs.filter(
      (l) =>
        (l.fotoMasuk && l.fotoMasuk.startsWith('data:image')) ||
        (l.fotoPulang && l.fotoPulang.startsWith('data:image'))
    );
    if (localPhotoLogs.length === 0) {
      onShowToast('Semua foto absensi di perangkat ini sudah tersimpan di Google Drive Cloud!', 'info');
      return;
    }
    setIsUploadingLocalPhotos(true);
    setUploadProgressText('Menyiapkan pengunggahan...');
    let successCount = 0;
    try {
      for (let i = 0; i < localPhotoLogs.length; i++) {
        const item = localPhotoLogs[i];
        setUploadProgressText(`Mengunggah foto ${i + 1} dari ${localPhotoLogs.length} (${item.nama})...`);
        try {
          await syncToGoogleSheets(settings.gasUrl, 'absen', {
            userId: item.userId,
            nama: item.nama,
            proyek: item.proyek,
            shiftNama: item.shiftNama,
            tanggal: item.tanggal,
            jamMasuk: item.jamMasuk,
            jamPulang: item.jamPulang,
            status: item.status,
            durasiJam: item.durasiJam,
            keterangan: item.keterangan,
            fotoMasuk: item.fotoMasuk,
            fotoPulang: item.fotoPulang,
            userLat: item.userLat,
            userLng: item.userLng,
            isBebasLokasi: item.isBebasLokasi,
          });
          successCount++;
        } catch (err) {
          console.warn('Gagal upload foto log:', item.id, err);
        }
      }
      onShowToast(`Berhasil mengunggah ${successCount} foto absensi ke Google Drive! Memperbarui data...`, 'success');
      const cloudRes = await fetchCloudSettings(settings.gasUrl);
      if (cloudRes.logs) {
        onUpdateLogs(cloudRes.logs);
      }
    } catch {
      onShowToast('Terjadi kesalahan saat mengunggah foto ke Google Drive.', 'danger');
    } finally {
      setIsUploadingLocalPhotos(false);
      setUploadProgressText('');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    onShowToast('Telah keluar dari sesi Admin.', 'info');
  };

  // Toggle Status Aktif / Nonaktif Karyawan
  const handleToggleEmployeeStatus = (emp: Employee) => {
    const nextStatus = emp.statusAktif === false;
    const updated = employees.map((e) =>
      e.id === emp.id ? { ...e, statusAktif: nextStatus } : e
    );
    onUpdateEmployees(updated);
    if (settings.gasUrl) {
      syncToGoogleSheets(settings.gasUrl, 'sync_employees', { employees: updated });
    }
    onShowToast(
      `Status karyawan "${emp.nama}" berhasil diubah menjadi: ${nextStatus ? 'AKTIF' : 'NONAKTIF'}`,
      nextStatus ? 'success' : 'warning'
    );
  };

  // Toggle Izin Bebas Lokasi Karyawan
  const handleToggleBebasLokasi = (emp: Employee) => {
    const nextBebas = !emp.izinBebasLokasi;
    const updated = employees.map((e) =>
      e.id === emp.id ? { ...e, izinBebasLokasi: nextBebas } : e
    );
    onUpdateEmployees(updated);
    if (settings.gasUrl) {
      syncToGoogleSheets(settings.gasUrl, 'sync_employees', { employees: updated });
    }
    onShowToast(
      `Izin Bebas Lokasi untuk "${emp.nama}": ${nextBebas ? 'DIIZINKAN (Bebas Radius)' : 'STANDAR (Wajib Radius)'}`,
      nextBebas ? 'success' : 'info'
    );
  };

  // Start Editing Employee (Triggers Modal)
  const handleStartEditEmployee = (emp: Employee) => {
    setEditingEmployee(emp);
    setEditNama(emp.nama);
    setEditNik(emp.nik);
    setEditTglLahir(toIsoDate(emp.tglLahir));
    setEditDept(emp.dept);
    setEditJabatan(emp.jabatan);
    setEditPhone(emp.phone === '-' ? '' : emp.phone || '');
    setEditPtkp(emp.ptkp || 'TK/0');
    setEditStatusAktif(emp.statusAktif !== false);
    setEditIzinBebasLokasi(Boolean(emp.izinBebasLokasi));
    setEditFotoKtp(emp.fotoKtp || null);
    setEditFotoKtpType(emp.fotoKtpType || (emp.fotoKtp?.startsWith('data:application/pdf') ? 'pdf' : 'image'));
    setEditFotoKtpName(emp.fotoKtpName || '');
    setEditFotoKk(emp.fotoKk || null);
    setEditFotoKkType(emp.fotoKkType || (emp.fotoKk?.startsWith('data:application/pdf') ? 'pdf' : 'image'));
    setEditFotoKkName(emp.fotoKkName || '');
    setEditFotoSelfie(emp.fotoSelfie || null);
  };

  // Save Edited Employee
  const handleSaveEditEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;

    if (!editNama.trim()) {
      onShowToast('Nama lengkap karyawan wajib diisi!', 'warning');
      return;
    }

    const cleanNik = editNik.trim();
    if (cleanNik.length !== 16 || !/^\d{16}$/.test(cleanNik)) {
      onShowToast('Nomor NIK KTP harus tepat 16 digit angka!', 'danger');
      return;
    }

    const duplicate = employees.find(
      (emp) => emp.id !== editingEmployee.id && emp.nik.trim() === cleanNik
    );
    if (duplicate) {
      onShowToast(`NIK ${cleanNik} sudah terdaftar atas nama "${duplicate.nama}" (${duplicate.id})!`, 'danger');
      return;
    }

    const cleanTglLahir = formatTanggalLahir(editTglLahir);

    const updatedEmp: Employee = {
      ...editingEmployee,
      nama: editNama.trim().toUpperCase(),
      nik: cleanNik,
      tglLahir: cleanTglLahir,
      dept: editDept.trim(),
      jabatan: editJabatan.trim(),
      phone: editPhone.trim() || '-',
      ptkp: editPtkp || 'TK/0',
      statusAktif: editStatusAktif,
      izinBebasLokasi: editIzinBebasLokasi,
      fotoKtp: editFotoKtp || editingEmployee.fotoKtp,
      fotoKtpType: editFotoKtpType,
      fotoKtpName: editFotoKtpName,
      fotoKk: editFotoKk || editingEmployee.fotoKk,
      fotoKkType: editFotoKkType,
      fotoKkName: editFotoKkName,
      fotoSelfie: editFotoSelfie || editingEmployee.fotoSelfie,
    };

    const updatedList = employees.map((emp) =>
      emp.id === editingEmployee.id ? updatedEmp : emp
    );
    onUpdateEmployees(updatedList);
    onShowToast(`Menyimpan perubahan data ${updatedEmp.nama}...`, 'info');

    if (settings.gasUrl) {
      syncToGoogleSheets(settings.gasUrl, 'sync_employees', { employees: updatedList }).then((res) => {
        if (res.success) {
          onShowToast(`Data karyawan ${updatedEmp.nama} berhasil diperbarui & disinkronkan ke Google Sheets!`, 'success');
        } else {
          onShowToast(`Tersimpan lokal, respon sync: ${res.message || 'Periksa koneksi'}`, 'warning');
        }
      });
    } else {
      onShowToast(`Data karyawan ${updatedEmp.nama} berhasil diperbarui secara lokal!`, 'success');
    }
    setEditingEmployee(null);
  };

  // Toggle Status Aktif / Nonaktif Proyek
  const handleToggleProjectStatus = (proj: Project) => {
    const nextStatus = proj.statusAktif === false;
    const updated = projects.map((p) =>
      p.id === proj.id ? { ...p, statusAktif: nextStatus } : p
    );
    onUpdateProjects(updated);
    if (settings.gasUrl) {
      syncToGoogleSheets(settings.gasUrl, 'sync_projects', { projects: updated });
    }
    onShowToast(
      `Status proyek "${proj.nama}" berhasil diubah menjadi: ${nextStatus ? 'AKTIF' : 'NONAKTIF'}`,
      nextStatus ? 'success' : 'warning'
    );
  };

  const handleTriggerDeleteProject = (proj: Project) => {
    if (projects.length <= 1) {
      onShowToast('Minimal harus ada 1 proyek di sistem!', 'warning');
      return;
    }
    setDeleteModal({
      show: true,
      type: 'project',
      targetId: proj.id,
      title: 'Hapus Proyek',
      description: `Apakah Anda yakin ingin menghapus proyek "${proj.nama}"? Data absensi yang terkait akan tetap tersimpan.`,
    });
  };

  const handleTriggerDeleteEmployee = (emp: Employee) => {
    setDeleteModal({
      show: true,
      type: 'employee',
      targetId: emp.id,
      title: 'Hapus Data Karyawan',
      description: `Apakah Anda yakin ingin menghapus karyawan "${emp.nama}" (ID: ${emp.id}, NIK: ${emp.nik})?`,
    });
  };

  const handleTriggerDeleteLog = (log: AttendanceLog) => {
    setDeleteModal({
      show: true,
      type: 'log',
      targetId: log.id,
      title: 'Hapus Catatan Absensi',
      description: `Hapus catatan absensi tanggal ${log.tanggal} (${log.jamMasuk} WIB) untuk karyawan ${log.nama} (${log.userId})? Catatan akan dihapus permanen dari sistem dan Google Sheets.`,
      targetLog: log,
    });
  };

  const handleExecuteDelete = () => {
    if (deleteModal.type === 'project') {
      const updated = projects.filter((p) => p.id !== deleteModal.targetId);
      onUpdateProjects(updated);
      if (settings.gasUrl) {
        syncToGoogleSheets(settings.gasUrl, 'sync_projects', { projects: updated });
      }
      onShowToast('Proyek berhasil dihapus.', 'info');
    } else if (deleteModal.type === 'employee') {
      const updated = employees.filter((e) => e.id !== deleteModal.targetId);
      onUpdateEmployees(updated);
      if (settings.gasUrl) {
        syncToGoogleSheets(settings.gasUrl, 'sync_employees', { employees: updated });
      }
      onShowToast(`Karyawan dengan ID ${deleteModal.targetId} berhasil dihapus.`, 'info');
    } else if (deleteModal.type === 'log') {
      const targetLog = deleteModal.targetLog || logs.find((l) => l.id === deleteModal.targetId);
      if (targetLog) {
        // Rekam ID & composite key agar tidak pernah muncul lagi saat sinkronisasi
        recordDeletedLog(targetLog.userId, targetLog.tanggal, targetLog.jamMasuk, targetLog.id);
        
        // 1. Kirim hapus ke Google Sheets via POST
        syncToGoogleSheets(settings.gasUrl, 'hapus_absen', {
          id: targetLog.id,
          userId: targetLog.userId,
          tanggal: targetLog.tanggal,
          jamMasuk: targetLog.jamMasuk,
        });

        // 2. Kirim juga via GET sebagai fallback cadangan agar baris di Google Sheets pasti terhapus
        if (settings.gasUrl && settings.gasUrl.startsWith('http')) {
          try {
            const cleanGas = settings.gasUrl.trim();
            const sep = cleanGas.includes('?') ? '&' : '?';
            const getDelUrl = `${cleanGas}${sep}action=hapus_absen&userId=${encodeURIComponent(targetLog.userId)}&tanggal=${encodeURIComponent(cleanDateString(targetLog.tanggal))}&jamMasuk=${encodeURIComponent(cleanTimeString(targetLog.jamMasuk))}&id=${encodeURIComponent(targetLog.id)}&t=${Date.now()}`;
            fetch(getDelUrl, { method: 'GET', keepalive: true }).catch(() => {});
          } catch (_) {}
        }
      }
      const updated = logs.filter((l) => {
        if (targetLog) {
          if (l.id && targetLog.id && l.id === targetLog.id) return false;
          if (
            String(l.userId).trim().toUpperCase() === String(targetLog.userId).trim().toUpperCase() &&
            cleanDateString(l.tanggal) === cleanDateString(targetLog.tanggal) &&
            cleanTimeString(l.jamMasuk) === cleanTimeString(targetLog.jamMasuk)
          ) {
            return false;
          }
        }
        return l.id !== deleteModal.targetId;
      });
      onUpdateLogs(updated);
      onShowToast('Data absensi berhasil dihapus permanen dari sistem & Google Sheets.', 'info');
    }
    setDeleteModal({
      show: false,
      type: 'project',
      targetId: '',
      title: '',
      description: '',
    });
  };

  const filteredLogs = logs.filter((l) => {
    const cleanTgl = cleanDateString(l.tanggal);
    if (filterStartDate && cleanTgl < filterStartDate) return false;
    if (filterEndDate && cleanTgl > filterEndDate) return false;
    if (filterProject && l.proyek !== filterProject) return false;
    if (filterStatus && l.status !== filterStatus) return false;
    if (filterKeyword) {
      const q = filterKeyword.toLowerCase();
      const matchName = l.nama.toLowerCase().includes(q);
      const matchId = l.userId.toLowerCase().includes(q);
      if (!matchName && !matchId) return false;
    }
    return true;
  });

  const localPhotoLogsCount = logs.filter(
    (l) =>
      (l.fotoMasuk && l.fotoMasuk.startsWith('data:image')) ||
      (l.fotoPulang && l.fotoPulang.startsWith('data:image'))
  ).length;

  const handleExportExcel = () => {
    try {
      exportAttendanceToExcel(filteredLogs, 'Rekap_Absensi_Proyek');
      onShowToast('File Excel rekap absensi berhasil diunduh!', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal ekspor excel';
      onShowToast(msg, 'danger');
    }
  };

  const handleOpenCorrection = (log?: AttendanceLog) => {
    if (log) {
      setCorrectionTarget(log);
      setKorUserId(log.userId);
      setKorTanggal(cleanDateString(log.tanggal));
      setKorJamMasuk(cleanTimeString(log.jamMasuk));
      const cleanPulang = cleanTimeString(log.jamPulang);
      setKorJamPulang(cleanPulang !== '-' ? cleanPulang : '17:00');
      setKorProyek(log.proyek);
      setKorCatatan(log.keterangan || 'Koreksi Admin');
    } else {
      setCorrectionTarget(null);
      setKorUserId(employees[0]?.id || '');
      setKorTanggal(new Date().toISOString().split('T')[0]);
      setKorJamMasuk('08:00');
      setKorJamPulang('17:00');
      setKorProyek(projects[0]?.nama || '');
      setKorCatatan('Koreksi Lupa Absen');
    }
    setShowCorrectionModal(true);
  };

  const handleSaveCorrection = () => {
    if (!korUserId || !korTanggal) {
      onShowToast('ID Karyawan dan Tanggal wajib diisi!', 'warning');
      return;
    }

    const matched = employees.find((e) => e.id.toUpperCase() === korUserId.toUpperCase());
    if (!matched) {
      onShowToast(`Karyawan dengan ID "${korUserId}" belum terdaftar dalam database!`, 'danger');
      return;
    }
    if (matched.statusAktif === false) {
      onShowToast(`Catatan: Akun karyawan "${matched.nama}" (${matched.id}) berstatus Nonaktif.`, 'warning');
    }
    const namaKaryawan = matched.nama;
    let durasi = 0;
    if (korJamMasuk && korJamPulang && korJamPulang !== '-') {
      const [inH, inM] = korJamMasuk.split(':').map(Number);
      const [outH, outM] = korJamPulang.split(':').map(Number);
      let diff = outH * 60 + outM - (inH * 60 + inM);
      if (diff < 0) diff += 24 * 60;
      durasi = Number((diff / 60).toFixed(2));
    }

    if (correctionTarget) {
      const updated = logs.map((l) =>
        l.id === correctionTarget.id
          ? {
              ...l,
              userId: korUserId.toUpperCase(),
              nama: namaKaryawan,
              tanggal: korTanggal,
              jamMasuk: korJamMasuk,
              jamPulang: korJamPulang,
              proyek: korProyek,
              durasiJam: durasi,
              status: 'Koreksi Admin' as const,
              keterangan: korCatatan,
            }
          : l
      );
      onUpdateLogs(updated);
      if (settings.gasUrl) {
        syncToGoogleSheets(settings.gasUrl, 'absen', {
          userId: korUserId.toUpperCase(),
          nama: namaKaryawan,
          proyek: korProyek,
          shiftNama: 'Koreksi Admin',
          tanggal: korTanggal,
          jamMasuk: korJamMasuk,
          jamPulang: korJamPulang,
          status: 'Koreksi Admin',
          durasiJam: durasi,
          keterangan: korCatatan,
        });
      }
      onShowToast('Koreksi absensi berhasil diperbarui & disinkronkan ke Google Sheets!', 'success');
    } else {
      const newManualLog: AttendanceLog = {
        id: `LOG-KOR-${Date.now()}`,
        userId: korUserId.toUpperCase(),
        nama: namaKaryawan,
        proyek: korProyek,
        tanggal: korTanggal,
        jamMasuk: korJamMasuk,
        jamPulang: korJamPulang,
        status: 'Koreksi Admin',
        fotoMasuk: null,
        fotoPulang: null,
        durasiJam: durasi,
        keterangan: korCatatan,
        createdAt: Date.now(),
      };
      onUpdateLogs([newManualLog, ...logs]);
      if (settings.gasUrl) {
        syncToGoogleSheets(settings.gasUrl, 'absen', {
          userId: newManualLog.userId,
          nama: newManualLog.nama,
          proyek: newManualLog.proyek,
          shiftNama: 'Koreksi Admin',
          tanggal: newManualLog.tanggal,
          jamMasuk: newManualLog.jamMasuk,
          jamPulang: newManualLog.jamPulang,
          status: newManualLog.status,
          durasiJam: durasi,
          keterangan: korCatatan,
        });
      }
      onShowToast('Absensi manual berhasil ditambahkan & disinkronkan ke Google Sheets!', 'success');
    }
    setShowCorrectionModal(false);
  };

  // FITUR 2: SUBMIT PENDAFTARAN KARYAWAN (POPUP)
  const handleRegisterEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regNama.trim()) {
      onShowToast('Nama lengkap karyawan wajib diisi!', 'warning');
      return;
    }
    const cleanNik = regNik.trim();
    if (cleanNik.length !== 16 || !/^\d{16}$/.test(cleanNik)) {
      onShowToast('Nomor NIK KTP harus tepat 16 digit angka!', 'danger');
      return;
    }
    const duplicateEmployee = employees.find((emp) => emp.nik.trim() === cleanNik);
    if (duplicateEmployee) {
      onShowToast(
        `NIK ${cleanNik} sudah terdaftar atas nama "${duplicateEmployee.nama}" (${duplicateEmployee.id})!`,
        'danger'
      );
      return;
    }
    if (!regTglLahir) {
      onShowToast('Tanggal lahir wajib diisi untuk pembuatan ID Unik!', 'warning');
      return;
    }
    if (!regDept.trim()) {
      onShowToast('Departemen / Divisi wajib diisi!', 'warning');
      return;
    }
    if (!regJabatan.trim()) {
      onShowToast('Jabatan wajib diisi!', 'warning');
      return;
    }
    if (!regFotoKtp) {
      onShowToast('Foto / Dokumen KTP Wajib Diunggah!', 'danger');
      return;
    }
    if (!regFotoKk) {
      onShowToast('Foto / Dokumen KK (Kartu Keluarga) Wajib Diunggah!', 'danger');
      return;
    }
    if (!regFotoSelfie) {
      onShowToast('Foto Selfie Karyawan Wajib Diambil!', 'danger');
      return;
    }

    const formattedTglLahir = formatTanggalLahir(regTglLahir);

    const newEmp: Employee = {
      id: autoGeneratedId,
      nama: regNama.trim().toUpperCase(),
      nik: cleanNik,
      tglLahir: formattedTglLahir,
      dept: regDept.trim(),
      jabatan: regJabatan.trim(),
      phone: regPhone.trim() || '-',
      ptkp: regPtkp || 'TK/0',
      fotoKtp: regFotoKtp,
      fotoKtpType: regFotoKtpType,
      fotoKtpName: regFotoKtpName,
      fotoKk: regFotoKk,
      fotoKkType: regFotoKkType,
      fotoKkName: regFotoKkName,
      fotoSelfie: regFotoSelfie,
      statusAktif: regStatusAktif,
      izinBebasLokasi: regIzinBebasLokasi,
      registeredAt: Date.now(),
    };

    const updatedEmployees = [...employees, newEmp];
    onUpdateEmployees(updatedEmployees);
    onShowToast(`Mendaftarkan ${newEmp.nama} & sinkronisasi data...`, 'info');

    syncToGoogleSheets(settings.gasUrl, 'daftar_karyawan', {
      id: newEmp.id,
      nama: newEmp.nama,
      nik: newEmp.nik,
      tglLahir: formattedTglLahir,
      dept: newEmp.dept,
      jabatan: newEmp.jabatan,
      phone: newEmp.phone,
      ptkp: newEmp.ptkp,
      fotoKtp: newEmp.fotoKtp,
      fotoKk: newEmp.fotoKk,
      fotoSelfie: newEmp.fotoSelfie,
      statusAktif: newEmp.statusAktif ? 'Aktif' : 'Nonaktif',
      izinBebasLokasi: newEmp.izinBebasLokasi ? 'Ya' : 'Tidak',
      waktuDaftar: new Date().toLocaleString('id-ID'),
    }).then((res) => {
      if (res.success) {
        onShowToast(`Karyawan ${newEmp.nama} berhasil didaftarkan dan tersimpan!`, 'success');
      } else if (settings.gasUrl) {
        onShowToast(`Data tersimpan lokal, respon server: ${res.message || 'Periksa URL GAS'}`, 'warning');
      } else {
        onShowToast(`Karyawan baru berhasil didaftarkan secara lokal! ID: ${newEmp.id}`, 'success');
      }
    });

    // Reset Form & Tutup Modal
    setRegNama('');
    setRegNik('');
    setRegTglLahir('');
    setRegDept('');
    setRegJabatan('');
    setRegPhone('');
    setRegPtkp('TK/0');
    setRegStatusAktif(true);
    setRegIzinBebasLokasi(false);
    setRegFotoKtp(null);
    setRegFotoKtpName('');
    setRegFotoKk(null);
    setRegFotoKkName('');
    setRegFotoSelfie(null);
    setShowRegisterModal(false);
  };

  // Skema Shift Project
  const handleShiftSchemeChange = (scheme: ShiftScheme) => {
    setProjShiftScheme(scheme);
    if (scheme === '1_SHIFT') {
      setProjShifts([
        {
          id: `s-${Date.now()}-1`,
          nama: 'Shift Normal (Pagi)',
          jamMasuk: '08:00',
          jamPulang: '17:00',
          toleransi: 15,
          minJamKerja: 7,
        },
      ]);
    } else if (scheme === '2_SHIFT') {
      setProjShifts([
        {
          id: `s-${Date.now()}-1`,
          nama: 'Shift 1 (Pagi/Siang)',
          jamMasuk: '07:00',
          jamPulang: '15:30',
          toleransi: 15,
          minJamKerja: 7,
        },
        {
          id: `s-${Date.now()}-2`,
          nama: 'Shift 2 (Malam/Lintas Hari)',
          jamMasuk: '19:00',
          jamPulang: '03:30',
          toleransi: 15,
          minJamKerja: 7,
        },
      ]);
    } else if (scheme === '3_SHIFT') {
      setProjShifts([
        {
          id: `s-${Date.now()}-1`,
          nama: 'Shift 1 (Pagi)',
          jamMasuk: '07:00',
          jamPulang: '15:00',
          toleransi: 15,
          minJamKerja: 7,
        },
        {
          id: `s-${Date.now()}-2`,
          nama: 'Shift 2 (Sore)',
          jamMasuk: '15:00',
          jamPulang: '23:00',
          toleransi: 15,
          minJamKerja: 7,
        },
        {
          id: `s-${Date.now()}-3`,
          nama: 'Shift 3 (Malam)',
          jamMasuk: '23:00',
          jamPulang: '07:00',
          toleransi: 15,
          minJamKerja: 7,
        },
      ]);
    }
  };

  const handleUpdateShiftField = (
    index: number,
    field: keyof ShiftConfig,
    value: string | number
  ) => {
    setProjShifts((prev) => {
      const clone = [...prev];
      clone[index] = {
        ...clone[index],
        [field]: value,
      };
      return clone;
    });
  };

  const handleSetProjGpsFromCurrent = async () => {
    setIsGettingGpsForProj(true);
    try {
      const pos = await getCurrentPosition();
      setProjLat(pos.lat.toFixed(6));
      setProjLng(pos.lng.toFixed(6));
      onShowToast(`Koordinat GPS terisi otomatis (Akurasi: ${pos.accuracy}m)`, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal ambil GPS';
      onShowToast(msg, 'danger');
    } finally {
      setIsGettingGpsForProj(false);
    }
  };

  const handleOpenAddProjectModal = () => {
    setEditingProjectId(null);
    setProjNama('');
    setProjLat('');
    setProjLng('');
    setProjRadius(100);
    setProjShiftScheme('1_SHIFT');
    setProjStatusAktif(true);
    setProjShifts([
      {
        id: 'shift-1',
        nama: 'Shift Normal (Pagi)',
        jamMasuk: '08:00',
        jamPulang: '17:00',
        toleransi: 15,
        minJamKerja: 7,
      },
    ]);
    setShowProjectModal(true);
  };

  const handleEditProject = (proj: Project) => {
    setEditingProjectId(proj.id);
    setProjNama(proj.nama);
    setProjLat(proj.lat.toString());
    setProjLng(proj.lng.toString());
    setProjRadius(proj.radius || 100);
    setProjShiftScheme(proj.shiftScheme || '1_SHIFT');
    setProjStatusAktif(proj.statusAktif !== false);
    if (proj.shifts && proj.shifts.length > 0) {
      setProjShifts(proj.shifts);
    } else {
      setProjShifts([
        {
          id: 's-legacy',
          nama: 'Shift Normal',
          jamMasuk: proj.jamMasuk || '08:00',
          jamPulang: '17:00',
          toleransi: proj.toleransi || 15,
          minJamKerja: proj.minJamKerja || 7,
        },
      ]);
    }
    setShowProjectModal(true);
  };

  // FITUR 2: SIMPAN PROYEK DARI POPUP
  const handleSaveProject = (e: React.FormEvent) => {
    e.preventDefault();
    const latNum = parseFloat(projLat);
    const lngNum = parseFloat(projLng);
    if (!projNama.trim() || isNaN(latNum) || isNaN(lngNum)) {
      onShowToast('Nama proyek, Latitude, dan Longitude wajib diisi valid!', 'warning');
      return;
    }
    if (projShifts.length === 0) {
      onShowToast('Setidaknya harus memiliki 1 pengaturan shift!', 'warning');
      return;
    }

    if (editingProjectId) {
      const updated = projects.map((p) =>
        p.id === editingProjectId
          ? {
              ...p,
              nama: projNama.trim(),
              lat: latNum,
              lng: lngNum,
              radius: projRadius,
              shiftScheme: projShiftScheme,
              shifts: projShifts,
              statusAktif: projStatusAktif,
              jamMasuk: projShifts[0]?.jamMasuk || '08:00',
              toleransi: projShifts[0]?.toleransi || 15,
              minJamKerja: projShifts[0]?.minJamKerja || 7,
            }
          : p
      );
      onUpdateProjects(updated);
      if (settings.gasUrl) {
        syncToGoogleSheets(settings.gasUrl, 'sync_projects', { projects: updated });
      }
      onShowToast(`Proyek "${projNama}" berhasil diperbarui & disinkronkan ke Google Sheets!`, 'success');
    } else {
      const newProj: Project = {
        id: `proj-${Date.now()}`,
        nama: projNama.trim(),
        lat: latNum,
        lng: lngNum,
        radius: projRadius,
        shiftScheme: projShiftScheme,
        shifts: projShifts,
        statusAktif: projStatusAktif,
        jamMasuk: projShifts[0]?.jamMasuk || '08:00',
        toleransi: projShifts[0]?.toleransi || 15,
        minJamKerja: projShifts[0]?.minJamKerja || 7,
      };
      const updated = [...projects, newProj];
      onUpdateProjects(updated);
      if (settings.gasUrl) {
        syncToGoogleSheets(settings.gasUrl, 'sync_projects', { projects: updated });
      }
      onShowToast(`Proyek baru "${projNama}" berhasil ditambahkan & disinkronkan ke Google Sheets!`, 'success');
    }
    setShowProjectModal(false);
  };

  const handleSyncProjectsToCloud = () => {
    if (!settings.gasUrl) {
      onShowToast('URL Google Sheets belum disetel!', 'warning');
      return;
    }
    syncToGoogleSheets(settings.gasUrl, 'sync_projects', { projects }).then((res) => {
      if (res.success) {
        onShowToast('Database seluruh proyek berhasil dikirim ke Google Sheets (Sheet Proyek)!', 'success');
      } else {
        onShowToast(`Gagal kirim proyek: ${res.message}`, 'danger');
      }
    });
  };

  const handleSaveGasUrl = () => {
    onUpdateSettings({
      ...settings,
      gasUrl: gasUrlInput.trim(),
    });
    onShowToast('URL Endpoint Google Sheets berhasil disimpan!', 'success');
  };

  const handleTestGasConnection = async () => {
    if (!gasUrlInput.trim()) {
      onShowToast('Masukkan URL Web App Google Apps Script terlebih dahulu!', 'warning');
      return;
    }
    setIsTestingGas(true);
    try {
      const res = await syncToGoogleSheets(gasUrlInput.trim(), 'test_koneksi', {
        pesan: 'Tes koneksi dari AbsensiPro Admin',
        waktu: new Date().toISOString(),
      });
      if (res.success) {
        onShowToast('Tes sinyal Google Sheets berhasil terkirim!', 'success');
      } else {
        onShowToast(`Tes gagal: ${res.message || 'Periksa URL Web App'}`, 'danger');
      }
    } finally {
      setIsTestingGas(false);
    }
  };

  const handleChangeAdminPin = (e: React.FormEvent) => {
    e.preventDefault();
    const activePin = settings.adminPin || '1234';
    if (currentPinVerify.trim() !== activePin) {
      onShowToast('PIN Saat Ini tidak cocok! Gagal mengubah PIN.', 'danger');
      return;
    }
    const cleanNewPin = newPinInput.trim();
    if (cleanNewPin.length < 4) {
      onShowToast('PIN Baru minimal 4 karakter!', 'warning');
      return;
    }
    if (cleanNewPin !== confirmPinInput.trim()) {
      onShowToast('Konfirmasi PIN Baru tidak cocok dengan PIN Baru!', 'danger');
      return;
    }

    onUpdateSettings({
      ...settings,
      adminPin: cleanNewPin,
    });
    if (settings.gasUrl) {
      syncToGoogleSheets(settings.gasUrl, 'update_settings', {
        adminPin: cleanNewPin,
        companyName: settings.companyName,
      });
    }
    setCurrentPinVerify('');
    setNewPinInput('');
    setConfirmPinInput('');
    setShowPinChangeInputs(false);
    onShowToast(`PIN Admin Berhasil Diperbarui & Disinkronkan ke Cloud! Semua device lain otomatis menggunakan PIN ini.`, 'success');
  };

  const handleResetPinToDefault = () => {
    if (currentPinVerify.trim() !== (settings.adminPin || '1234')) {
      onShowToast('Masukkan PIN saat ini terlebih dahulu untuk melakukan reset!', 'danger');
      return;
    }
    onUpdateSettings({
      ...settings,
      adminPin: '1234',
    });
    if (settings.gasUrl) {
      syncToGoogleSheets(settings.gasUrl, 'update_settings', {
        adminPin: '1234',
        companyName: settings.companyName,
      });
    }
    setCurrentPinVerify('');
    onShowToast('PIN Admin telah di-reset ke default 1234 dan disinkronkan ke Cloud.', 'info');
  };

  // Google Apps Script template code
  // Google Apps Script template code (v4.2 - Hemat Memori, URL Drive Konsisten & Hapus Permanen)
  const gasSampleCode = `/**
 * GOOGLE APPS SCRIPT - ABSENSIPRO DATABASE DENGAN GOOGLE DRIVE
 * v4.2: 
 * 1. Foto KTP, KK, Selfie otomatis diubah menjadi URL Google Drive berukuran kecil (bukan data:image/webp).
 * 2. Tanggal lahir konsisten dalam format umum DD-MM-YYYY (contoh: 10-05-1998) tanpa teks GMT panjang.
 * 3. URL Foto Masuk & Pulang konsisten seragam link Google Drive resmi (https://drive.google.com/file/d/.../view).
 * 4. Hapus data presensi karyawan di tab rekap terhapus permanen dari sheet dan tidak kembali lagi.
 */

function standardizeDriveLink(url) {
  if (!url || typeof url !== 'string') return '-';
  var clean = url.trim();
  if (clean === '' || clean === '-') return '-';
  if (clean.indexOf('data:') === 0) return clean;

  var matchD = clean.match(/\\/file\\/d\\/([a-zA-Z0-9_-]+)/);
  if (matchD && matchD[1]) return "https://drive.google.com/file/d/" + matchD[1] + "/view";

  var matchId = clean.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchId && matchId[1]) return "https://drive.google.com/file/d/" + matchId[1] + "/view";

  var matchLh = clean.match(/googleusercontent\\.com\\/d\\/([a-zA-Z0-9_-]+)/);
  if (matchLh && matchLh[1]) return "https://drive.google.com/file/d/" + matchLh[1] + "/view";

  return clean;
}

function saveBase64ToDrive(base64Data, fileName, folder) {
  if (!base64Data || typeof base64Data !== 'string') return '-';
  var clean = base64Data.trim();
  if (clean === '' || clean === '-') return '-';

  // Jika sudah berupa link Google Drive / URL CDN, ubah ke URL Drive resmi seragam
  if (clean.indexOf('http://') === 0 || clean.indexOf('https://') === 0) {
    return standardizeDriveLink(clean);
  }
  if (clean.indexOf('data:') === -1) return clean;

  try {
    var parts = clean.split(',');
    if (parts.length < 2) return '-';
    var header = parts[0];
    var isPdf = header.indexOf('application/pdf') !== -1;
    var contentType = isPdf ? 'application/pdf' : 'image/jpeg';
    var ext = isPdf ? '.pdf' : '.jpg';
    var cleanFileName = fileName.replace(/\\.[^/.]+$/, '') + ext;

    var decoded = Utilities.base64Decode(parts[1]);
    var blob = Utilities.newBlob(decoded, contentType, cleanFileName);
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    // REVISI 1 & 3: Link resmi Google Drive yang konsisten, berukuran kecil & hemat memori
    return "https://drive.google.com/file/d/" + file.getId() + "/view";
  } catch (err) {
    Logger.log('Gagal simpan Drive: ' + err.toString());
    return '-'; // Jangan simpan data:image mentah ke cell agar memori sheet tidak penuh
  }
}

function formatCleanTime(val) {
  if (val === null || val === undefined || val === '') return '-';
  if (val instanceof Date) {
    var hh = ('0' + val.getHours()).slice(-2);
    var mm = ('0' + val.getMinutes()).slice(-2);
    return hh + ':' + mm;
  }
  var str = String(val).replace(/^'/, '').trim();
  if (str === '-' || !str) return '-';
  var match = str.match(/(\\d{1,2})[:.](\\d{2})/);
  if (match) return ('0' + match[1]).slice(-2) + ':' + match[2];
  return str;
}

function formatCleanDate(val) {
  if (val === null || val === undefined || val === '') return Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd');
  if (val instanceof Date) {
    if (val.getFullYear() === 1899) return Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd');
    return Utilities.formatDate(val, 'Asia/Jakarta', 'yyyy-MM-dd');
  }
  var str = String(val).replace(/^'/, '').trim();
  if (str.indexOf('1899') !== -1 || str.indexOf('GMT') !== -1 || str.indexOf('WIB') !== -1 || /[A-Za-z]{3}\\s+[A-Za-z]{3}/.test(str)) {
    var d = new Date(str);
    if (!isNaN(d.getTime()) && d.getFullYear() !== 1899) return Utilities.formatDate(d, 'Asia/Jakarta', 'yyyy-MM-dd');
    return Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd');
  }
  var isoM = str.match(/^(\\d{4})[-/.](\\d{1,2})[-/.](\\d{1,2})/);
  if (isoM) return isoM[1] + '-' + ('0' + isoM[2]).slice(-2) + '-' + ('0' + isoM[3]).slice(-2);
  var dmyM = str.match(/^(\\d{1,2})[-/.](\\d{1,2})[-/.](\\d{4})/);
  if (dmyM) return dmyM[3] + '-' + ('0' + dmyM[2]).slice(-2) + '-' + ('0' + dmyM[1]).slice(-2);
  return str;
}

// REVISI 2: Format Tanggal Lahir ke format umum DD-MM-YYYY (contoh: 10-05-1998)
function formatTanggalLahir(val) {
  if (!val || val === '' || val === '-') return '-';
  if (val instanceof Date) {
    var d = ('0' + val.getDate()).slice(-2);
    var m = ('0' + (val.getMonth() + 1)).slice(-2);
    var y = val.getFullYear();
    return d + '-' + m + '-' + y;
  }
  var str = String(val).replace(/^'/, '').trim();
  if (!str || str === '-') return '-';

  // Bersihkan format panjang GMT seperti "Sun May 10 1998 00:00:00 GMT+0700 (Waktu Indonesia Barat)"
  if (str.indexOf('GMT') !== -1 || str.indexOf('WIB') !== -1 || str.indexOf('00:00:00') !== -1 || /[A-Za-z]{3}\\s+[A-Za-z]{3}/.test(str)) {
    var p = new Date(str);
    if (!isNaN(p.getTime()) && p.getFullYear() !== 1899) {
      var dd = ('0' + p.getDate()).slice(-2);
      var mm = ('0' + (p.getMonth() + 1)).slice(-2);
      var yy = p.getFullYear();
      return dd + '-' + mm + '-' + yy;
    }
  }

  // Jika format YYYY-MM-DD
  var isoMatch = str.match(/^(\\d{4})[-/.](\\d{1,2})[-/.](\\d{1,2})/);
  if (isoMatch) {
    return ('0' + isoMatch[3]).slice(-2) + '-' + ('0' + isoMatch[2]).slice(-2) + '-' + isoMatch[1];
  }

  // Jika sudah format DD-MM-YYYY
  var dmyMatch = str.match(/^(\\d{1,2})[-/.](\\d{1,2})[-/.](\\d{4})/);
  if (dmyMatch) {
    return ('0' + dmyMatch[1]).slice(-2) + '-' + ('0' + dmyMatch[2]).slice(-2) + '-' + dmyMatch[3];
  }

  return str;
}

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetSettings = ss.getSheetByName("Settings") || ss.insertSheet("Settings");
    if (sheetSettings.getLastRow() === 0) {
      sheetSettings.appendRow(["Key", "Value", "Terakhir_Diperbarui"]);
      sheetSettings.getRange(1, 1, 1, 3).setFontWeight("bold").setBackground("#fed7aa");
      sheetSettings.appendRow(["adminPin", "1234", new Date().toLocaleString("id-ID")]);
      sheetSettings.appendRow(["companyName", "PT Konstruksi Pratama Mandiri", new Date().toLocaleString("id-ID")]);
    }

    var params = e ? e.parameter : {};

    // REVISI 4: Dukung hapus absensi via GET agar penghapusan pasti berhasil
    if (params && params.action === "hapus_absen") {
      var sheetAbsen = ss.getSheetByName("Absensi");
      if (sheetAbsen && sheetAbsen.getLastRow() > 1) {
        var rows = sheetAbsen.getDataRange().getValues();
        var targetUser = String(params.userId || "").replace(/^'/, '').trim().toUpperCase();
        var targetTgl = formatCleanDate(params.tanggal);
        var targetJam = formatCleanTime(params.jamMasuk);
        for (var i = rows.length - 1; i >= 1; i--) {
          var rowUser = String(rows[i][1]).replace(/^'/, '').trim().toUpperCase();
          var rowTgl = formatCleanDate(rows[i][5]);
          var rowJam = formatCleanTime(rows[i][6]);
          if (rowUser === targetUser && rowTgl === targetTgl) {
            if (!targetJam || targetJam === '-' || rowJam === targetJam || rowJam === '-' || rowJam.indexOf(targetJam) !== -1 || targetJam.indexOf(rowJam) !== -1) {
              sheetAbsen.deleteRow(i + 1);
              break;
            }
          }
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Catatan absensi berhasil dihapus permanen" })).setMimeType(ContentService.MimeType.JSON);
    }

    if (params && params.action === "update_settings") {
      var rows = sheetSettings.getDataRange().getValues();
      var pinUpdated = false;
      var compUpdated = false;
      for (var r = 1; r < rows.length; r++) {
        if (rows[r][0] === "adminPin" && params.adminPin) {
          sheetSettings.getRange(r + 1, 2).setValue("'" + String(params.adminPin).trim());
          sheetSettings.getRange(r + 1, 3).setValue(new Date().toLocaleString("id-ID"));
          pinUpdated = true;
        }
        if (rows[r][0] === "companyName" && params.companyName) {
          sheetSettings.getRange(r + 1, 2).setValue(String(params.companyName).trim());
          sheetSettings.getRange(r + 1, 3).setValue(new Date().toLocaleString("id-ID"));
          compUpdated = true;
        }
      }
      if (!pinUpdated && params.adminPin) sheetSettings.appendRow(["adminPin", "'" + String(params.adminPin).trim(), new Date().toLocaleString("id-ID")]);
      if (!compUpdated && params.companyName) sheetSettings.appendRow(["companyName", String(params.companyName).trim(), new Date().toLocaleString("id-ID")]);
    }

    var adminPin = "1234";
    var companyName = "PT Konstruksi Pratama Mandiri";
    var rowsSettings = sheetSettings.getDataRange().getValues();
    for (var i = 1; i < rowsSettings.length; i++) {
      if (rowsSettings[i][0] === "adminPin" && rowsSettings[i][1] !== "") adminPin = String(rowsSettings[i][1]).replace(/^'/, '').trim();
      if (rowsSettings[i][0] === "companyName" && rowsSettings[i][1] !== "") companyName = String(rowsSettings[i][1]).trim();
    }

    // BACA KARYAWAN DENGAN FORMAT TANGGAL LAHIR DD-MM-YYYY & URL DRIVE KONSISTEN
    var employees = [];
    var sheetKaryawan = ss.getSheetByName("Karyawan");
    if (sheetKaryawan && sheetKaryawan.getLastRow() > 1) {
      var kRows = sheetKaryawan.getDataRange().getValues();
      for (var k = 1; k < kRows.length; k++) {
        var row = kRows[k];
        if (row[1]) {
          var statusStr = String(row[11] || "Aktif").trim();
          var bebasStr = String(row[12] || "").trim().toLowerCase();
          var ptkpStr = row[13] ? String(row[13]).trim() : "TK/0";
          employees.push({
            id: String(row[1]).trim(),
            nama: String(row[2] || "").trim(),
            nik: String(row[3] || "").replace(/^'/, '').trim(),
            tglLahir: formatTanggalLahir(row[4]),
            dept: String(row[5] || "").trim(),
            jabatan: String(row[6] || "").trim(),
            phone: String(row[7] || "").trim(),
            fotoKtp: standardizeDriveLink(String(row[8] || "").trim()),
            fotoKk: standardizeDriveLink(String(row[9] || "").trim()),
            fotoSelfie: standardizeDriveLink(String(row[10] || "").trim()),
            statusAktif: statusStr.toLowerCase() !== "nonaktif",
            izinBebasLokasi: bebasStr === "ya" || bebasStr === "true",
            ptkp: ptkpStr
          });
        }
      }
    }

    // BACA PROYEK
    var projects = [];
    var sheetProyek = ss.getSheetByName("Proyek");
    if (sheetProyek && sheetProyek.getLastRow() > 1) {
      var pRows = sheetProyek.getDataRange().getValues();
      for (var p = 1; p < pRows.length; p++) {
        var pRow = pRows[p];
        if (pRow[0]) {
          var shiftsParsed = [];
          try { if (pRow[6]) shiftsParsed = JSON.parse(pRow[6]); } catch (e) {}
          var pStatusStr = String(pRow[7] || "Aktif").trim();
          projects.push({
            id: String(pRow[0]).trim(),
            nama: String(pRow[1] || "").trim(),
            lat: Number(pRow[2]) || 0,
            lng: Number(pRow[3]) || 0,
            radius: Number(pRow[4]) || 150,
            shiftScheme: String(pRow[5] || "1_SHIFT").trim(),
            shifts: shiftsParsed,
            statusAktif: pStatusStr.toLowerCase() !== "nonaktif"
          });
        }
      }
    }

    // BACA REKAP ABSENSI (URL FOTO KONSISTEN)
    var logs = [];
    var sheetAbsen = ss.getSheetByName("Absensi");
    if (sheetAbsen && sheetAbsen.getLastRow() > 1) {
      var aRows = sheetAbsen.getDataRange().getValues();
      for (var a = 1; a < aRows.length; a++) {
        var aRow = aRows[a];
        if (aRow[1]) {
          var fMasuk = aRow[11] ? standardizeDriveLink(String(aRow[11]).trim()) : "";
          var fPulang = aRow[12] ? standardizeDriveLink(String(aRow[12]).trim()) : "";
          var uLat = aRow[13] !== undefined && aRow[13] !== "" && aRow[13] !== "-" ? Number(aRow[13]) : undefined;
          var uLng = aRow[14] !== undefined && aRow[14] !== "" && aRow[14] !== "-" ? Number(aRow[14]) : undefined;
          var isBebas = false;
          if (aRow[15] !== undefined) {
            var bStr = String(aRow[15]).trim().toLowerCase();
            isBebas = bStr === "ya" || bStr === "true";
          }
          logs.push({
            id: "LOG-GS-" + a,
            userId: String(aRow[1]).replace(/^'/, '').trim(),
            nama: String(aRow[2] || "").replace(/^'/, '').trim(),
            proyek: String(aRow[3] || "").replace(/^'/, '').trim(),
            shiftNama: String(aRow[4] || "").replace(/^'/, '').trim(),
            tanggal: formatCleanDate(aRow[5]),
            jamMasuk: formatCleanTime(aRow[6]),
            jamPulang: formatCleanTime(aRow[7]),
            status: String(aRow[8] || "Hadir").replace(/^'/, '').trim(),
            durasiJam: Number(aRow[9]) || 0,
            keterangan: String(aRow[10] || "").replace(/^'/, '').trim(),
            fotoMasuk: fMasuk && fMasuk !== "-" ? fMasuk : null,
            fotoPulang: fPulang && fPulang !== "-" ? fPulang : null,
            userLat: isNaN(uLat) ? undefined : uLat,
            userLng: isNaN(uLng) ? undefined : uLng,
            isBebasLokasi: isBebas
          });
        }
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      adminPin: adminPin,
      companyName: companyName,
      employees: employees,
      projects: projects,
      logs: logs
    })).setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. REVISI 4: HAPUS ABSENSI PERMANEN DARI GOOGLE SHEET
    if (data.action === "hapus_absen") {
      var sheetAbsen = ss.getSheetByName("Absensi");
      if (sheetAbsen && sheetAbsen.getLastRow() > 1) {
        var rows = sheetAbsen.getDataRange().getValues();
        var targetUser = String(data.userId || "").replace(/^'/, '').trim().toUpperCase();
        var targetTgl = formatCleanDate(data.tanggal);
        var targetJam = formatCleanTime(data.jamMasuk);
        for (var i = rows.length - 1; i >= 1; i--) {
          var rowUser = String(rows[i][1]).replace(/^'/, '').trim().toUpperCase();
          var rowTgl = formatCleanDate(rows[i][5]);
          var rowJam = formatCleanTime(rows[i][6]);
          if (rowUser === targetUser && rowTgl === targetTgl) {
            if (!targetJam || targetJam === '-' || rowJam === targetJam || rowJam === '-' || rowJam.indexOf(targetJam) !== -1 || targetJam.indexOf(rowJam) !== -1) {
              sheetAbsen.deleteRow(i + 1);
              break;
            }
          }
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Catatan absensi berhasil dihapus permanen" })).setMimeType(ContentService.MimeType.JSON);
    }

    // 2. SIMPAN / UPDATE ABSENSI (REVISI 3: URL GOOGLE DRIVE RESMI KONSISTEN)
    if (data.action === "absen") {
      var sheetAbsen = ss.getSheetByName("Absensi") || ss.insertSheet("Absensi");
      if (sheetAbsen.getLastRow() === 0) {
        sheetAbsen.appendRow([
          "Tanggal_Waktu", "ID_Karyawan", "Nama", "Proyek", 
          "Shift", "Tanggal", "Jam_Masuk", "Jam_Pulang", 
          "Status", "Durasi_Jam", "Keterangan",
          "URL_Foto_Masuk", "URL_Foto_Pulang", "User_Lat", "User_Lng", "Bebas_Lokasi"
        ]);
        sheetAbsen.getRange(1, 1, 1, 16).setFontWeight("bold").setBackground("#fef08a");
      }

      var cleanMasuk = formatCleanTime(data.jamMasuk);
      var cleanPulang = formatCleanTime(data.jamPulang);
      var cleanTgl = formatCleanDate(data.tanggal);

      var folderAbsen = DriveApp.getFoldersByName("AbsensiPro_Foto_Absensi").hasNext() 
        ? DriveApp.getFoldersByName("AbsensiPro_Foto_Absensi").next() 
        : DriveApp.createFolder("AbsensiPro_Foto_Absensi");
      folderAbsen.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

      var fotoMasukUrl = "";
      if (data.fotoMasuk && String(data.fotoMasuk).indexOf('data:') !== -1) {
        fotoMasukUrl = saveBase64ToDrive(data.fotoMasuk, "IN_" + String(data.userId) + "_" + cleanTgl + "_" + cleanMasuk.replace(':', '') + ".jpg", folderAbsen);
      } else if (data.fotoMasuk && String(data.fotoMasuk).trim() !== "-") {
        fotoMasukUrl = standardizeDriveLink(String(data.fotoMasuk).trim());
      }

      var fotoPulangUrl = "";
      if (data.fotoPulang && String(data.fotoPulang).indexOf('data:') !== -1) {
        fotoPulangUrl = saveBase64ToDrive(data.fotoPulang, "OUT_" + String(data.userId) + "_" + cleanTgl + "_" + (cleanPulang || '').replace(':', '') + ".jpg", folderAbsen);
      } else if (data.fotoPulang && String(data.fotoPulang).trim() !== "-") {
        fotoPulangUrl = standardizeDriveLink(String(data.fotoPulang).trim());
      }

      var rows = sheetAbsen.getDataRange().getValues();
      var updated = false;
      for (var i = 1; i < rows.length; i++) {
        var rowUser = String(rows[i][1]).replace(/^'/, '').trim();
        var rowTgl = formatCleanDate(rows[i][5]);
        if (rowUser.toUpperCase() === String(data.userId).toUpperCase() && rowTgl === cleanTgl) {
          if (cleanPulang && cleanPulang !== '-') sheetAbsen.getRange(i + 1, 8).setValue("'" + cleanPulang);
          if (data.durasiJam !== undefined) sheetAbsen.getRange(i + 1, 10).setValue(data.durasiJam);
          if (data.status) sheetAbsen.getRange(i + 1, 9).setValue("'" + data.status);
          if (data.keterangan) sheetAbsen.getRange(i + 1, 11).setValue("'" + data.keterangan);
          if (fotoMasukUrl && fotoMasukUrl !== "-") sheetAbsen.getRange(i + 1, 12).setValue(fotoMasukUrl);
          if (fotoPulangUrl && fotoPulangUrl !== "-") sheetAbsen.getRange(i + 1, 13).setValue(fotoPulangUrl);
          if (data.userLat !== undefined && data.userLat !== null) sheetAbsen.getRange(i + 1, 14).setValue(data.userLat);
          if (data.userLng !== undefined && data.userLng !== null) sheetAbsen.getRange(i + 1, 15).setValue(data.userLng);
          if (data.isBebasLokasi !== undefined) sheetAbsen.getRange(i + 1, 16).setValue(data.isBebasLokasi ? "Ya" : "Tidak");
          updated = true;
          break;
        }
      }

      if (!updated) {
        sheetAbsen.appendRow([
          new Date().toLocaleString("id-ID"), "'" + String(data.userId || "-"), "'" + String(data.nama || "-"),
          "'" + String(data.proyek || "-"), "'" + String(data.shiftNama || "-"), "'" + cleanTgl, "'" + cleanMasuk,
          "'" + (cleanPulang || "-"), "'" + String(data.status || "Hadir"), Number(data.durasiJam) || 0,
          "'" + String(data.keterangan || "-"), fotoMasukUrl || "-", fotoPulangUrl || "-",
          data.userLat || "-", data.userLng || "-", data.isBebasLokasi ? "Ya" : "Tidak"
        ]);
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success", fotoMasukUrl: fotoMasukUrl, fotoPulangUrl: fotoPulangUrl })).setMimeType(ContentService.MimeType.JSON);
    }

    // 3. DAFTAR KARYAWAN (REVISI 1 & 2: FORMAT DD-MM-YYYY & URL DRIVE KECIL, DILENGKAPI STATUS PTKP)
    if (data.action === "daftar_karyawan") {
      var sheetKaryawan = ss.getSheetByName("Karyawan") || ss.insertSheet("Karyawan");
      if (sheetKaryawan.getLastRow() === 0) {
        sheetKaryawan.appendRow(["Waktu_Daftar", "ID_Unik", "Nama", "NIK_KTP", "Tgl_Lahir", "Departemen", "Jabatan", "No_HP", "URL_Drive_KTP", "URL_Drive_KK", "URL_Drive_Selfie", "Status_Aktif", "Izin_Bebas_Lokasi", "Status_PTKP"]);
        sheetKaryawan.getRange(1, 1, 1, 14).setFontWeight("bold").setBackground("#bfdbfe");
      }

      var folder = DriveApp.getFoldersByName("AbsensiPro_Berkas_Karyawan").hasNext() 
        ? DriveApp.getFoldersByName("AbsensiPro_Berkas_Karyawan").next() 
        : DriveApp.createFolder("AbsensiPro_Berkas_Karyawan");
      folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

      var ktpUrl = saveBase64ToDrive(data.fotoKtp, "KTP_" + data.id + "_" + data.nama + (data.fotoKtp && data.fotoKtp.indexOf('application/pdf') !== -1 ? ".pdf" : ".jpg"), folder);
      var kkUrl = saveBase64ToDrive(data.fotoKk, "KK_" + data.id + "_" + data.nama + (data.fotoKk && data.fotoKk.indexOf('application/pdf') !== -1 ? ".pdf" : ".jpg"), folder);
      var selfieUrl = saveBase64ToDrive(data.fotoSelfie, "Selfie_" + data.id + "_" + data.nama + ".jpg", folder);

      var cleanTglLahir = formatTanggalLahir(data.tglLahir);

      sheetKaryawan.appendRow([
        data.waktuDaftar || new Date().toLocaleString("id-ID"), 
        "'" + String(data.id), 
        String(data.nama), 
        "'" + String(data.nik),
        "'" + cleanTglLahir, 
        String(data.dept), 
        String(data.jabatan), 
        "'" + String(data.phone || "-"),
        ktpUrl, 
        kkUrl, 
        selfieUrl, 
        data.statusAktif || "Aktif", 
        data.izinBebasLokasi || "Tidak",
        String(data.ptkp || "TK/0")
      ]);

      return ContentService.createTextOutput(JSON.stringify({ 
        status: "success", 
        fotoKtpUrl: ktpUrl, 
        fotoKkUrl: kkUrl, 
        fotoSelfieUrl: selfieUrl 
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 4. SINKRONISASI SEMUA KARYAWAN (REVISI 1: UBAH SEMUA BASE64 MENJADI URL DRIVE)
    if (data.action === "sync_employees") {
      var sheetKaryawan = ss.getSheetByName("Karyawan") || ss.insertSheet("Karyawan");
      sheetKaryawan.clearContents();
      sheetKaryawan.appendRow(["Waktu_Daftar", "ID_Unik", "Nama", "NIK_KTP", "Tgl_Lahir", "Departemen", "Jabatan", "No_HP", "URL_Drive_KTP", "URL_Drive_KK", "URL_Drive_Selfie", "Status_Aktif", "Izin_Bebas_Lokasi", "Status_PTKP"]);
      sheetKaryawan.getRange(1, 1, 1, 14).setFontWeight("bold").setBackground("#bfdbfe");

      var folder = DriveApp.getFoldersByName("AbsensiPro_Berkas_Karyawan").hasNext() 
        ? DriveApp.getFoldersByName("AbsensiPro_Berkas_Karyawan").next() 
        : DriveApp.createFolder("AbsensiPro_Berkas_Karyawan");
      folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

      if (Array.isArray(data.employees)) {
        data.employees.forEach(function(e) {
          var ktpVal = String(e.fotoKtp || "-");
          if (ktpVal.indexOf("data:") !== -1) {
            ktpVal = saveBase64ToDrive(ktpVal, "KTP_" + e.id + "_" + e.nama + (ktpVal.indexOf('application/pdf') !== -1 ? ".pdf" : ".jpg"), folder);
          } else {
            ktpVal = standardizeDriveLink(ktpVal);
          }
          var kkVal = String(e.fotoKk || "-");
          if (kkVal.indexOf("data:") !== -1) {
            kkVal = saveBase64ToDrive(kkVal, "KK_" + e.id + "_" + e.nama + (kkVal.indexOf('application/pdf') !== -1 ? ".pdf" : ".jpg"), folder);
          } else {
            kkVal = standardizeDriveLink(kkVal);
          }
          var selfieVal = String(e.fotoSelfie || "-");
          if (selfieVal.indexOf("data:") !== -1) {
            selfieVal = saveBase64ToDrive(selfieVal, "Selfie_" + e.id + "_" + e.nama + ".jpg", folder);
          } else {
            selfieVal = standardizeDriveLink(selfieVal);
          }

          sheetKaryawan.appendRow([
            new Date().toLocaleString("id-ID"), 
            "'" + String(e.id), 
            String(e.nama), 
            "'" + String(e.nik),
            "'" + formatTanggalLahir(e.tglLahir), 
            String(e.dept), 
            String(e.jabatan), 
            "'" + String(e.phone || "-"),
            ktpVal, 
            kkVal, 
            selfieVal,
            e.statusAktif !== false ? "Aktif" : "Nonaktif", 
            e.izinBebasLokasi ? "Ya" : "Tidak",
            String(e.ptkp || "TK/0")
          ]);
        });
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
    }

    // 5. SINKRONISASI DATABASE PROYEK
    if (data.action === "sync_projects") {
      var sheetProyek = ss.getSheetByName("Proyek") || ss.insertSheet("Proyek");
      sheetProyek.clearContents();
      sheetProyek.appendRow(["ID_Proyek", "Nama_Proyek", "Latitude", "Longitude", "Radius_Meter", "Skema_Shift", "Shifts_JSON", "Status_Aktif", "Terakhir_Diperbarui"]);
      sheetProyek.getRange(1, 1, 1, 9).setFontWeight("bold").setBackground("#fed7aa");
      if (Array.isArray(data.projects)) {
        data.projects.forEach(function(p) {
          sheetProyek.appendRow([
            "'" + String(p.id), String(p.nama), Number(p.lat), Number(p.lng), Number(p.radius),
            String(p.shiftScheme || "1_SHIFT"), JSON.stringify(p.shifts || []),
            p.statusAktif !== false ? "Aktif" : "Nonaktif", new Date().toLocaleString("id-ID")
          ]);
        });
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
    }

    // 6. UPDATE PENGATURAN
    if (data.action === "update_settings") {
      var sheetSettings = ss.getSheetByName("Settings") || ss.insertSheet("Settings");
      if (data.adminPin) sheetSettings.appendRow(["adminPin", "'" + String(data.adminPin).trim(), new Date().toLocaleString("id-ID")]);
      if (data.companyName) sheetSettings.appendRow(["companyName", String(data.companyName).trim(), new Date().toLocaleString("id-ID")]);
      return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
    }

    // 7. TES KONEKSI
    if (data.action === "test_koneksi") {
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Koneksi Google Sheets & Drive Berhasil!" })).setMimeType(ContentService.MimeType.JSON);
    }
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

// FUNGSI PEMBERSIH OTOMATIS: Mengubah data lama di Google Sheet
// (data:image base64 & tanggal lahir GMT panjang) agar sheet langsung bersih & rapi
function bersihkanDatabaseSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Bersihkan Sheet Karyawan
  var sheetKaryawan = ss.getSheetByName("Karyawan");
  if (sheetKaryawan && sheetKaryawan.getLastRow() > 1) {
    var folder = DriveApp.getFoldersByName("AbsensiPro_Berkas_Karyawan").hasNext() 
      ? DriveApp.getFoldersByName("AbsensiPro_Berkas_Karyawan").next() 
      : DriveApp.createFolder("AbsensiPro_Berkas_Karyawan");
    folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    var rows = sheetKaryawan.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      var empId = String(rows[i][1] || "EMP").trim();
      var empNama = String(rows[i][2] || "Karyawan").trim();

      // Perbaiki Tanggal Lahir (Kolom 5) -> Format DD-MM-YYYY
      var tglLahirRaw = rows[i][4];
      var cleanTgl = formatTanggalLahir(tglLahirRaw);
      if (cleanTgl && cleanTgl !== '-') {
        sheetKaryawan.getRange(i + 1, 5).setValue("'" + cleanTgl);
      }

      // Perbaiki Foto KTP jika masih data:image webp
      var ktpVal = String(rows[i][8] || "");
      if (ktpVal.indexOf("data:") === 0) {
        var ktpUrl = saveBase64ToDrive(ktpVal, "KTP_" + empId + "_" + empNama + ".jpg", folder);
        sheetKaryawan.getRange(i + 1, 9).setValue(ktpUrl);
      } else if (ktpVal) {
        sheetKaryawan.getRange(i + 1, 9).setValue(standardizeDriveLink(ktpVal));
      }

      // Perbaiki Foto KK jika masih data:image webp
      var kkVal = String(rows[i][9] || "");
      if (kkVal.indexOf("data:") === 0) {
        var kkUrl = saveBase64ToDrive(kkVal, "KK_" + empId + "_" + empNama + ".jpg", folder);
        sheetKaryawan.getRange(i + 1, 10).setValue(kkUrl);
      } else if (kkVal) {
        sheetKaryawan.getRange(i + 1, 10).setValue(standardizeDriveLink(kkVal));
      }

      // Perbaiki Foto Selfie jika masih data:image webp
      var selfieVal = String(rows[i][10] || "");
      if (selfieVal.indexOf("data:") === 0) {
        var selfieUrl = saveBase64ToDrive(selfieVal, "Selfie_" + empId + "_" + empNama + ".jpg", folder);
        sheetKaryawan.getRange(i + 1, 11).setValue(selfieUrl);
      } else if (selfieVal) {
        sheetKaryawan.getRange(i + 1, 11).setValue(standardizeDriveLink(selfieVal));
      }
    }
  }

  // 2. Bersihkan Sheet Absensi
  var sheetAbsen = ss.getSheetByName("Absensi");
  if (sheetAbsen && sheetAbsen.getLastRow() > 1) {
    var aRows = sheetAbsen.getDataRange().getValues();
    for (var a = 1; a < aRows.length; a++) {
      var fMasuk = String(aRows[a][11] || "").trim();
      var fPulang = String(aRows[a][12] || "").trim();
      if (fMasuk && fMasuk !== "-") {
        sheetAbsen.getRange(a + 1, 12).setValue(standardizeDriveLink(fMasuk));
      }
      if (fPulang && fPulang !== "-") {
        sheetAbsen.getRange(a + 1, 13).setValue(standardizeDriveLink(fPulang));
      }
    }
  }
}`;

  const handleCopyGasCode = () => {
    navigator.clipboard.writeText(gasSampleCode);
    setIsCopiedCode(true);
    setTimeout(() => setIsCopiedCode(false), 2500);
    onShowToast('Kode Google Apps Script terbaru berhasil disalin ke clipboard!', 'success');
  };

  const handleExportBackupJson = () => {
    const backupData = {
      projects,
      employees,
      logs,
      settings,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Backup_AbsensiPro_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onShowToast('File backup JSON berhasil diunduh!', 'success');
  };

  const handleImportBackupJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.projects && Array.isArray(parsed.projects)) {
          onUpdateProjects(parsed.projects);
        }
        if (parsed.employees && Array.isArray(parsed.employees)) {
          onUpdateEmployees(parsed.employees);
        }
        if (parsed.logs && Array.isArray(parsed.logs)) {
          onUpdateLogs(parsed.logs);
        }
        if (parsed.settings) {
          onUpdateSettings(parsed.settings);
        }
        onShowToast('Data backup berhasil di-restore!', 'success');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Format JSON tidak valid';
        onShowToast(`Gagal import backup: ${msg}`, 'danger');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Login View if not Authenticated
  if (!isAuthenticated) {
    return (
      <div className={`bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800 text-center space-y-4 transition-colors ${
        isDesktopView ? 'max-w-md mx-auto my-6' : ''
      }`}>
        <div className="w-14 h-14 rounded-3xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-inner">
          <ShieldCheck className="w-8 h-8 stroke-[2.2]" />
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-800 inline-block mb-1">
            {settings.companyName || 'PT Konstruksi Pratama Mandiri'}
          </span>
          <h3 className="font-extrabold text-slate-900 dark:text-white text-lg">Akses Khusus Admin</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Masukkan PIN Admin untuk membuka rekap absensi, kelola karyawan, dan koordinat proyek.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-3 pt-2">
          <div className="relative max-w-xs mx-auto">
            <input
              type={showPin ? 'text' : 'password'}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="Masukkan PIN Admin"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl p-3 pr-10 text-center font-mono font-bold tracking-widest text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPin(!showPin)}
              className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <button
            type="submit"
            disabled={isSyncingPin}
            className="w-full max-w-xs mx-auto bg-slate-900 dark:bg-amber-500 dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-amber-600 disabled:opacity-50 text-white font-extrabold py-3 rounded-2xl text-xs uppercase tracking-wider shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {isSyncingPin ? (
              <>
                <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />
                <span>Mengecek Sinkronisasi Cloud...</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 text-amber-400 dark:text-slate-950" />
                <span>Masuk Panel Admin</span>
              </>
            )}
          </button>
        </form>

        <div className="text-[11px] pt-1 space-y-2">
          {settings.gasUrl ? (
            <div className="flex items-center justify-center gap-2">
              <span className="text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 text-[10px] font-semibold">
                Cloud Sync Aktif
              </span>
              <button
                type="button"
                onClick={handleManualSyncSettings}
                disabled={isSyncingAll}
                className="text-[10px] text-amber-800 dark:text-amber-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                title="Tarik data terbaru dari Google Sheets"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncingAll ? 'animate-spin' : ''}`} />
                <span>Sinkronkan Sekarang</span>
              </button>
            </div>
          ) : (
            <div className="p-3 bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl text-[10px] text-amber-900 dark:text-amber-200 leading-relaxed text-left space-y-2">
              <div className="font-bold flex items-center gap-1.5 text-amber-950 dark:text-amber-300">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Device ini belum terhubung ke Google Sheets</span>
              </div>
              <p className="text-slate-600 dark:text-slate-300 leading-normal">
                Karena belum terhubung ke cloud database, device ini masih menggunakan PIN awal (<strong>1234</strong>). Sambungkan URL Google Sheets di bawah agar PIN & data terbaru dari Device 1 langsung aktif:
              </p>
              <div>
                <button
                  type="button"
                  onClick={() => setShowLoginGasInput(!showLoginGasInput)}
                  className="w-full py-1.5 px-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-[10px] flex items-center justify-center gap-1 cursor-pointer transition-all shadow-xs"
                >
                  <Link2 className="w-3 h-3" />
                  <span>{showLoginGasInput ? 'Tutup Input URL' : 'Hubungkan URL Google Sheets di HP/Device Ini'}</span>
                </button>
              </div>

              {showLoginGasInput && (
                <div className="pt-2 space-y-1.5 border-t border-amber-200 dark:border-amber-800">
                  <input
                    type="url"
                    value={gasUrlInput}
                    onChange={(e) => setGasUrlInput(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-[10px] font-mono outline-none text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      if (!gasUrlInput.trim()) {
                        onShowToast('Masukkan URL Web App Google Apps Script!', 'warning');
                        return;
                      }
                      const cleanUrl = gasUrlInput.trim();
                      onUpdateSettings({ ...settings, gasUrl: cleanUrl });
                      setIsSyncingPin(true);
                      try {
                        const res = await fetchCloudSettings(cleanUrl);
                        if (res.success) {
                          onShowToast('Berhasil terhubung ke Google Sheets! Seluruh data telah disinkronkan.', 'success');
                          setShowLoginGasInput(false);
                          if (res.employees) onUpdateEmployees(res.employees);
                          if (res.projects) onUpdateProjects(res.projects);
                          if (res.logs) onUpdateLogs(res.logs);
                        } else {
                          onShowToast(`Tersimpan, respon cloud: ${res.message || 'Periksa URL'}`, 'warning');
                        }
                      } finally {
                        setIsSyncingPin(false);
                      }
                    }}
                    disabled={isSyncingPin}
                    className="w-full bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 hover:bg-slate-800 disabled:opacity-50 font-bold py-2 rounded-xl text-[10px] flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 text-amber-400 dark:text-slate-950 ${isSyncingPin ? 'animate-spin' : ''}`} />
                    <span>Hubungkan & Tarik Data Cloud</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {isUsingDefaultPin ? (
            <span className="text-amber-800 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-800 inline-block font-mono text-[10px]">
              PIN saat ini: <strong>1234</strong>
            </span>
          ) : (
            <span className="text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800 inline-block font-semibold text-[10px]">
              PIN Kustom Aktif (PIN default 1234 telah dinonaktifkan)
            </span>
          )}

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400">
            Aplikasi dibuat oleh <strong className="text-slate-700 dark:text-slate-300">Jahidin</strong> • &copy; 2024-2026 Hak Cipta Dilindungi
          </div>
        </div>
      </div>
    );
  }

  const activeEmployeesCount = employees.filter((e) => e.statusAktif !== false).length;
  const inactiveEmployeesCount = employees.filter((e) => e.statusAktif === false).length;

  return (
    <div className={`space-y-4 ${isDesktopView ? 'max-w-6xl mx-auto' : ''}`}>
      {/* Admin Sub-Tabs Navigation */}
      <div className="bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex gap-1 transition-colors">
        <button
          onClick={() => setActiveTab('rekap')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'rekap'
              ? 'bg-amber-500 text-slate-950 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          <span>Rekap</span>
        </button>
        <button
          onClick={() => setActiveTab('karyawan')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'karyawan'
              ? 'bg-amber-500 text-slate-950 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Karyawan ({employees.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('proyek')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'proyek'
              ? 'bg-amber-500 text-slate-950 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <Building className="w-3.5 h-3.5" />
          <span>Proyek ({projects.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('integrasi')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'integrasi'
              ? 'bg-amber-500 text-slate-950 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <KeyRound className="w-3.5 h-3.5" />
          <span>Setup</span>
        </button>
      </div>

      {/* Cloud & Realtime Multi-Device Sync Status Bar */}
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200/90 dark:border-amber-800/80 p-3 rounded-2xl flex items-center justify-between text-xs transition-colors">
        <div className="flex items-center gap-2 text-amber-950 dark:text-amber-200 font-bold min-w-0">
          <Radio className={`w-3.5 h-3.5 text-amber-600 dark:text-amber-400 animate-pulse shrink-0`} />
          <div className="truncate">
            <span className="font-black">Sinkronisasi Real-Time Multi-Device: </span>
            <span className="font-normal text-[11px] text-amber-800 dark:text-amber-300">
              {activeEmployeesCount} Karyawan Aktif | {projects.filter((p) => p.statusAktif !== false).length} Proyek Aktif
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={handleManualSyncSettings}
          disabled={isSyncingAll || !settings.gasUrl}
          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-[10px] font-black shadow-xs active:scale-95 cursor-pointer flex items-center gap-1.5 shrink-0 ml-2"
        >
          <RefreshCw className={`w-3 h-3 ${isSyncingAll ? 'animate-spin' : ''}`} />
          <span>{isSyncingAll ? 'Sinkron...' : 'Tarik Cloud'}</span>
        </button>
      </div>

      {/* TAB 1: REKAP */}
      {activeTab === 'rekap' && (
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-4 transition-colors">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-xs uppercase tracking-wider">
              Filter Rekap Kehadiran
            </h3>
            <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-lg border border-amber-200 dark:border-amber-800">
              {filteredLogs.length} Data Ditemukan
            </span>
          </div>

          <div className={`grid ${isDesktopView ? 'grid-cols-4 gap-3' : 'grid-cols-2 gap-2'} text-xs`}>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                Dari Tanggal
              </label>
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2 font-medium text-slate-800 dark:text-slate-200 text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                Sampai Tanggal
              </label>
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2 font-medium text-slate-800 dark:text-slate-200 text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                Filter Proyek
              </label>
              <select
                value={filterProject}
                onChange={(e) => setFilterProject(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2 font-medium text-slate-800 dark:text-slate-200 text-xs"
              >
                <option value="">Semua Proyek</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.nama}>
                    {p.nama} {p.statusAktif === false ? '(Nonaktif)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                Cari Nama / ID
              </label>
              <input
                type="text"
                value={filterKeyword}
                onChange={(e) => setFilterKeyword(e.target.value)}
                placeholder="Inisial / ID / Nama"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2 font-medium text-slate-800 dark:text-slate-200 text-xs"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <div className="flex-1">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-medium text-slate-800 dark:text-slate-200 text-xs"
              >
                <option value="">Semua Status Kehadiran</option>
                <option value="Hadir">Hadir</option>
                <option value="Terlambat">Terlambat</option>
                <option value="Pulang Cepat">Pulang Cepat</option>
                <option value="Koreksi Admin">Koreksi Admin</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleExportExcel}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-3.5 rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" /> Ekspor Excel (.xlsx)
              </button>
              <button
                onClick={() => handleOpenCorrection()}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2.5 px-3.5 rounded-2xl text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" /> Koreksi Manual
              </button>
            </div>
          </div>

          {/* Banner jika ada foto lokal yang belum diunggah ke Google Drive */}
          {localPhotoLogsCount > 0 && settings.gasUrl && (
            <div className="bg-sky-50 dark:bg-sky-950/40 border border-sky-200/90 dark:border-sky-800 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-start gap-2.5">
                <div className="p-2 bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300 rounded-xl shrink-0 mt-0.5">
                  <CloudUpload className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-sky-950 dark:text-sky-200 flex items-center gap-1.5 flex-wrap">
                    <span>{localPhotoLogsCount} Foto Absensi Lokal di Perangkat Ini</span>
                    <span className="bg-sky-200 dark:bg-sky-900 text-sky-800 dark:text-sky-300 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                      Perlu Upload ke Cloud
                    </span>
                  </div>
                  <p className="text-[11px] text-sky-700 dark:text-sky-400 leading-relaxed mt-0.5">
                    Agar pratinjau foto absensi ini dapat dilihat di perangkat lain (laptop/HP Admin lain), unggah foto ke Google Drive sekarang.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleUploadLocalPhotosToCloud}
                disabled={isUploadingLocalPhotos}
                className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-3.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shrink-0 shadow-xs cursor-pointer disabled:opacity-50 transition-all active:scale-95"
              >
                {isUploadingLocalPhotos ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{uploadProgressText || 'Mengunggah...'}</span>
                  </>
                ) : (
                  <>
                    <CloudUpload className="w-3.5 h-3.5" />
                    <span>Unggah ke Google Drive ({localPhotoLogsCount})</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Table Container */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/90 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 text-[10px] uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <th className="p-2.5">Tgl / ID</th>
                  <th className="p-2.5">Karyawan</th>
                  <th className="p-2.5">Shift</th>
                  <th className="p-2.5">Masuk</th>
                  <th className="p-2.5">Pulang</th>
                  <th className="p-2.5 text-center">Foto Masuk</th>
                  <th className="p-2.5 text-center">Foto Pulang</th>
                  <th className="p-2.5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-slate-400 text-xs">
                      Tidak ada data absensi yang sesuai filter.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => {
                    const cleanTgl = cleanDateString(log.tanggal);
                    const cleanMasuk = cleanTimeString(log.jamMasuk);
                    const cleanPulang = cleanTimeString(log.jamPulang);
                    return (
                      <tr key={log.id} className="hover:bg-amber-50/40 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="p-2.5 font-mono text-[10px]">
                          <span className="font-bold text-slate-900 dark:text-slate-100 block">{cleanTgl}</span>
                          <span className="text-amber-700 dark:text-amber-400 font-bold">{log.userId}</span>
                        </td>
                        <td className="p-2.5">
                          <span className="font-semibold text-slate-900 dark:text-slate-100 block">{log.nama}</span>
                          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                            <span className="text-[10px] text-slate-500 dark:text-slate-400">{log.proyek}</span>
                            {log.isBebasLokasi && (
                              <span className="bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 text-[9px] font-bold px-1.5 py-0.2 rounded border border-sky-300 dark:border-sky-800">
                                Bebas Lokasi
                              </span>
                            )}
                            {log.userLat !== undefined && log.userLng !== undefined ? (
                              <a
                                href={`https://www.google.com/maps?q=${log.userLat},${log.userLng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800 transition-colors shadow-2xs"
                                title={`Titik GPS: ${log.userLat.toFixed(5)}, ${log.userLng.toFixed(5)} (Klik buka Google Maps)`}
                              >
                                <MapPin className="w-2.5 h-2.5 text-sky-600" />
                                <span>Peta GPS</span>
                              </a>
                            ) : log.isBebasLokasi ? (
                              <span className="text-[9px] text-slate-400 italic">GPS Aktif</span>
                            ) : null}
                          </div>
                        </td>
                        <td className="p-2.5">
                          <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-semibold px-1.5 py-0.5 rounded">
                            {log.shiftNama || '-'}
                          </span>
                        </td>
                        <td className="p-2.5 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {cleanMasuk}
                        </td>
                        <td className="p-2.5 font-mono font-bold text-rose-600 dark:text-rose-400">
                          {cleanPulang || '-'}
                        </td>
                        <td className="p-2.5 text-center">
                          {log.fotoMasuk ? (
                            <button
                              type="button"
                              onClick={() =>
                                onPreviewPhoto(
                                  log.fotoMasuk!,
                                  `${log.nama} (${log.userId})`,
                                  `Foto Masuk: ${cleanMasuk} | ${log.proyek}${log.isBebasLokasi ? ' (Bebas Lokasi)' : ''}`,
                                  cleanTgl,
                                  log.userLat,
                                  log.userLng
                                )
                              }
                              className="inline-flex flex-col items-center group cursor-pointer"
                              title="Klik untuk melihat foto selfie masuk & lokasi"
                            >
                              <img
                                src={getDirectImageUrl(log.fotoMasuk)}
                                alt="Foto Masuk"
                                referrerPolicy="no-referrer"
                                className="w-8 h-8 rounded-lg object-cover border-2 border-emerald-500 shadow-xs group-hover:scale-110 transition-transform"
                              />
                              <span className="text-[9px] text-emerald-700 dark:text-emerald-400 font-bold mt-0.5">Masuk</span>
                            </button>
                          ) : (
                            <span className="text-slate-400 text-[10px]">-</span>
                          )}
                        </td>
                        <td className="p-2.5 text-center">
                          {log.fotoPulang ? (
                            <button
                              type="button"
                              onClick={() =>
                                onPreviewPhoto(
                                  log.fotoPulang!,
                                  `${log.nama} (${log.userId})`,
                                  `Foto Pulang: ${cleanPulang} | ${log.proyek}${log.isBebasLokasi ? ' (Bebas Lokasi)' : ''}`,
                                  cleanTgl,
                                  log.userLat,
                                  log.userLng
                                )
                              }
                              className="inline-flex flex-col items-center group cursor-pointer"
                              title="Klik untuk melihat foto selfie pulang & lokasi"
                            >
                              <img
                                src={getDirectImageUrl(log.fotoPulang)}
                                alt="Foto Pulang"
                                referrerPolicy="no-referrer"
                                className="w-8 h-8 rounded-lg object-cover border-2 border-rose-500 shadow-xs group-hover:scale-110 transition-transform"
                              />
                              <span className="text-[9px] text-rose-700 dark:text-rose-400 font-bold mt-0.5">Pulang</span>
                            </button>
                          ) : (
                            <span className="text-slate-400 text-[10px]">
                              {cleanPulang && cleanPulang !== '-' ? 'Tanpa Foto' : '-'}
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenCorrection(log)}
                              title="Edit Koreksi"
                              className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-amber-600 hover:bg-amber-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleTriggerDeleteLog(log)}
                              title="Hapus Baris"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: KARYAWAN (FITUR 2: SISTEM POPUP PENDAFTARAN) */}
      {activeTab === 'karyawan' && (
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-4 transition-colors">
          {/* Header with Prominent "+ Daftarkan Karyawan Baru" Button (Popup) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-500" />
                <h3 className="font-extrabold text-slate-800 dark:text-white text-sm">
                  Kelola Database Karyawan ({employees.length})
                </h3>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Karyawan <strong>Aktif</strong> ({activeEmployeesCount}) dapat melakukan absensi; <strong>Nonaktif</strong> ({inactiveEmployeesCount}) diblokir.
              </p>
            </div>

            {/* Tombol Popup Pendaftaran Karyawan */}
            <button
              type="button"
              onClick={() => setShowRegisterModal(true)}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-4 py-2.5 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all cursor-pointer shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Daftarkan Karyawan Baru</span>
            </button>
          </div>

          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            {/* Filter Tabs */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setFilterEmployeeStatus('all')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  filterEmployeeStatus === 'all'
                    ? 'bg-white dark:bg-slate-900 shadow-xs text-slate-900 dark:text-white'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                Semua ({employees.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterEmployeeStatus('active')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  filterEmployeeStatus === 'active'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-emerald-700 dark:text-emerald-400'
                }`}
              >
                Aktif ({activeEmployeesCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterEmployeeStatus('inactive')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  filterEmployeeStatus === 'inactive'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-rose-700 dark:text-rose-400'
                }`}
              >
                Nonaktif ({inactiveEmployeesCount})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 sm:max-w-xs">
              <input
                type="text"
                value={searchKaryawan}
                onChange={(e) => setSearchKaryawan(e.target.value)}
                placeholder="Cari nama, NIK, atau ID..."
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl pl-3 pr-8 py-1.5 text-xs text-slate-900 dark:text-white outline-none"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
            </div>
          </div>

          {/* Registered Employees List */}
          <div className="space-y-2 max-h-[600px] overflow-y-auto no-scrollbar">
            {employees.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                <Users className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                <p className="font-bold text-slate-600 dark:text-slate-300">Belum ada karyawan terdaftar.</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Klik tombol <strong>&quot;+ Daftarkan Karyawan Baru&quot;</strong> di atas untuk membuka formulir popup.
                </p>
              </div>
            ) : (
              employees
                .filter((e) => {
                  if (filterEmployeeStatus === 'active' && e.statusAktif === false) return false;
                  if (filterEmployeeStatus === 'inactive' && e.statusAktif !== false) return false;
                  if (searchKaryawan) {
                    const q = searchKaryawan.toLowerCase();
                    return (
                      e.nama.toLowerCase().includes(q) ||
                      e.id.toLowerCase().includes(q) ||
                      e.nik.includes(q) ||
                      e.dept.toLowerCase().includes(q) ||
                      (e.ptkp && e.ptkp.toLowerCase().includes(q))
                    );
                  }
                  return true;
                })
                .map((emp) => {
                  const isAktif = emp.statusAktif !== false;
                  const isKtpPdf = emp.fotoKtpType === 'pdf' || (emp.fotoKtp && emp.fotoKtp.startsWith('data:application/pdf'));
                  const isKkPdf = emp.fotoKkType === 'pdf' || (emp.fotoKk && emp.fotoKk.startsWith('data:application/pdf'));

                  return (
                    <div
                      key={emp.id}
                      className={`p-3.5 border rounded-2xl flex items-center justify-between text-xs transition-colors ${
                        isAktif
                          ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 hover:border-amber-400'
                          : 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60 opacity-90'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {emp.fotoSelfie ? (
                          <img
                            src={getDirectImageUrl(emp.fotoSelfie)}
                            alt={emp.nama}
                            referrerPolicy="no-referrer"
                            onClick={() =>
                              onPreviewPhoto(emp.fotoSelfie, emp.nama, `Foto Profil | ${emp.dept}`)
                            }
                            className={`w-11 h-11 rounded-full object-cover border-2 shrink-0 cursor-pointer shadow-xs hover:scale-105 transition-transform ${
                              isAktif ? 'border-amber-400' : 'border-rose-300 grayscale'
                            }`}
                            title="Klik untuk melihat foto selfie"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 font-bold text-sm">
                            {emp.nama.charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-black text-slate-900 dark:text-white truncate text-sm">
                              {emp.nama}
                            </span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md ${
                                isAktif
                                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                  : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                              }`}
                            >
                              {isAktif ? 'Aktif' : 'Nonaktif'}
                            </span>
                            {emp.izinBebasLokasi && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-800 flex items-center gap-0.5">
                                <Navigation className="w-2.5 h-2.5 text-sky-600" />
                                <span>Bebas Lokasi</span>
                              </span>
                            )}
                            <span
                              className="text-[9.5px] font-bold font-mono px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700 shadow-2xs"
                              title={`Status Pajak PTKP: ${emp.ptkp || 'TK/0'}`}
                            >
                              PTKP: {emp.ptkp || 'TK/0'}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-1.5 mt-0.5">
                            <span className="font-mono text-amber-700 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-200 dark:border-amber-800">
                              {emp.id}
                            </span>
                            <span className="font-mono text-slate-600 dark:text-slate-400">NIK: {emp.nik}</span>
                            <span>• {emp.dept}</span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300">({emp.jabatan})</span>
                          </div>

                          {/* Document Badges (PDF or Image) */}
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            {emp.fotoKtp ? (
                              <button
                                type="button"
                                onClick={() =>
                                  onPreviewPhoto(
                                    emp.fotoKtp,
                                    `KTP - ${emp.nama}`,
                                    `NIK: ${emp.nik}`
                                  )
                                }
                                className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-md text-[9px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                title="Lihat Berkas KTP"
                              >
                                {isKtpPdf ? <FileText className="w-2.5 h-2.5 text-rose-500" /> : <CreditCard className="w-2.5 h-2.5" />}
                                <span>{isKtpPdf ? 'KTP (PDF)' : 'KTP (Gambar)'}</span>
                              </button>
                            ) : (
                              <span className="text-[9px] text-slate-400">Tanpa KTP</span>
                            )}

                            {emp.fotoKk ? (
                              <button
                                type="button"
                                onClick={() =>
                                  onPreviewPhoto(
                                    emp.fotoKk,
                                    `Kartu Keluarga (KK) - ${emp.nama}`,
                                    `NIK: ${emp.nik}`
                                  )
                                }
                                className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-md text-[9px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                title="Lihat Berkas KK"
                              >
                                {isKkPdf ? <FileText className="w-2.5 h-2.5 text-rose-500" /> : <FileText className="w-2.5 h-2.5" />}
                                <span>{isKkPdf ? 'KK (PDF)' : 'KK (Gambar)'}</span>
                              </button>
                            ) : (
                              <span className="text-[9px] text-slate-400">Tanpa KK</span>
                            )}

                            {emp.fotoSelfie && (
                              <button
                                type="button"
                                onClick={() =>
                                  onPreviewPhoto(
                                    emp.fotoSelfie,
                                    `Selfie - ${emp.nama}`,
                                    `Dept: ${emp.dept}`
                                  )
                                }
                                className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-md text-[9px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                title="Lihat Foto Selfie"
                              >
                                <Camera className="w-2.5 h-2.5" />
                                <span>Selfie</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 ml-2 shrink-0 flex-wrap justify-end">
                        <button
                          type="button"
                          onClick={() => handleStartEditEmployee(emp)}
                          className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-amber-800 dark:hover:text-amber-400 hover:bg-amber-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl transition-colors cursor-pointer"
                          title={`Edit Data Karyawan ${emp.nama}`}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleBebasLokasi(emp)}
                          className={`px-2 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer border ${
                            emp.izinBebasLokasi
                              ? 'bg-sky-100 dark:bg-sky-950 hover:bg-sky-200 text-sky-900 dark:text-sky-300 border-sky-300 dark:border-sky-800'
                              : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                          }`}
                          title={
                            emp.izinBebasLokasi
                              ? 'Bebas Lokasi: Aktif. Klik untuk ubah ke Standar (Wajib Radius)'
                              : 'Bebas Lokasi: Nonaktif. Klik untuk izinkan Bebas Lokasi'
                          }
                        >
                          <Navigation className="w-3 h-3 text-sky-600" />
                          <span className="hidden sm:inline">{emp.izinBebasLokasi ? 'Bebas' : 'Standar'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleEmployeeStatus(emp)}
                          className={`px-2 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer border ${
                            isAktif
                              ? 'bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 text-slate-700 dark:text-slate-300 hover:text-rose-800 border-slate-300 dark:border-slate-700 hover:border-rose-300'
                              : 'bg-emerald-100 dark:bg-emerald-950 hover:bg-emerald-200 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800'
                          }`}
                          title={isAktif ? 'Klik untuk menonaktifkan karyawan (tidak bisa absen)' : 'Klik untuk mengaktifkan karyawan (bisa absen)'}
                        >
                          {isAktif ? (
                            <>
                              <PowerOff className="w-3 h-3 text-rose-600" />
                              <span className="hidden sm:inline">Nonaktif</span>
                            </>
                          ) : (
                            <>
                              <Power className="w-3 h-3 text-emerald-600" />
                              <span className="hidden sm:inline">Aktifkan</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleTriggerDeleteEmployee(emp)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-rose-200"
                          title={`Hapus karyawan ${emp.nama}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      )}

      {/* TAB 3: PROYEK (FITUR 2: SISTEM POPUP TAMBAH PROYEK) */}
      {activeTab === 'proyek' && (
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-4 transition-colors">
          {/* Header with Prominent "+ Tambah Proyek Baru" Button (Popup) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-amber-500" />
                <h3 className="font-extrabold text-slate-800 dark:text-white text-sm">
                  Kelola Database Proyek & Lokasi ({projects.length})
                </h3>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Hanya proyek <strong>Aktif</strong> yang dapat dipilih oleh pekerja pada tab absensi GPS.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {settings.gasUrl && (
                <button
                  type="button"
                  onClick={handleSyncProjectsToCloud}
                  className="bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 text-slate-800 dark:text-slate-200 font-bold px-3 py-2.5 rounded-2xl text-xs flex items-center gap-1.5 cursor-pointer transition-colors border border-slate-200 dark:border-slate-700"
                  title="Upload Database Proyek ke Sheet Proyek"
                >
                  <CloudUpload className="w-3.5 h-3.5 text-amber-600" />
                  <span>Kirim ke Sheet</span>
                </button>
              )}

              {/* Tombol Popup Tambah Proyek */}
              <button
                type="button"
                onClick={handleOpenAddProjectModal}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-4 py-2.5 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all cursor-pointer shrink-0"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Tambah Proyek Baru</span>
              </button>
            </div>
          </div>

          {/* Registered Projects List */}
          <div className="space-y-2.5 max-h-[600px] overflow-y-auto no-scrollbar">
            {projects.map((proj) => {
              const isAktif = proj.statusAktif !== false;
              return (
                <div
                  key={proj.id}
                  className={`p-4 border rounded-2xl flex items-center justify-between text-xs transition-colors ${
                    isAktif
                      ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 hover:border-amber-400'
                      : 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60 opacity-90'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-slate-900 dark:text-white text-sm">{proj.nama}</span>
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${
                          isAktif
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                            : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                        }`}
                      >
                        {isAktif ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span>
                          Radius: <strong>{proj.radius}m</strong> ({proj.lat.toFixed(5)}, {proj.lng.toFixed(5)})
                        </span>
                        <a
                          href={`https://www.google.com/maps?q=${proj.lat},${proj.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-amber-600 dark:text-amber-400 hover:underline font-bold text-[10px] ml-1"
                        >
                          Buka Peta
                        </a>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 font-black px-2 py-0.5 rounded text-[10px]">
                          {proj.shiftScheme === '1_SHIFT'
                            ? '1 Shift'
                            : proj.shiftScheme === '2_SHIFT'
                            ? '2 Shift'
                            : '3 Shift'}
                        </span>
                        {proj.shifts?.map((s, i) => (
                          <span
                            key={i}
                            className="bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-[10px] px-2 py-0.5 rounded font-mono"
                          >
                            {s.nama}: <strong>{s.jamMasuk}</strong>-<strong>{s.jamPulang}</strong> (Tol {s.toleransi}m)
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 ml-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleProjectStatus(proj)}
                      className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer border ${
                        isAktif
                          ? 'bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 text-slate-700 dark:text-slate-300 hover:text-rose-800 border-slate-300 dark:border-slate-700 hover:border-rose-300'
                          : 'bg-emerald-100 dark:bg-emerald-950 hover:bg-emerald-200 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800'
                      }`}
                      title={isAktif ? 'Klik untuk menonaktifkan proyek' : 'Klik untuk mengaktifkan proyek'}
                    >
                      {isAktif ? (
                        <>
                          <PowerOff className="w-3 h-3 text-rose-600" />
                          <span className="hidden sm:inline">Nonaktifkan</span>
                        </>
                      ) : (
                        <>
                          <Power className="w-3 h-3 text-emerald-600" />
                          <span className="hidden sm:inline">Aktifkan</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEditProject(proj)}
                      className="p-2 bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 hover:bg-amber-200 rounded-xl transition-colors cursor-pointer"
                      title="Edit Proyek"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTriggerDeleteProject(proj)}
                      className="p-2 bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 hover:bg-rose-200 rounded-xl transition-colors cursor-pointer"
                      title="Hapus Proyek"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: SETUP & INTEGRASI */}
      {activeTab === 'integrasi' && (
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-4 transition-colors">
          {/* NAMA PERUSAHAAN */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-400 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">Nama Perusahaan Pengguna</h4>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    Ditampilkan di Header Aplikasi & Watermark Selfie
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-0.5 bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-[10px] font-bold rounded-lg truncate max-w-[130px]">
                {settings.companyName || 'Belum Diatur'}
              </span>
            </div>
            <form onSubmit={handleSaveCompanyName} className="space-y-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Ubah / Masukkan Nama Perusahaan:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={companyNameInput}
                    onChange={(e) => setCompanyNameInput(e.target.value)}
                    placeholder="Contoh: PT Konstruksi Pratama Mandiri"
                    className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    type="submit"
                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 rounded-xl text-xs shadow-xs active:scale-95 transition-all cursor-pointer shrink-0"
                  >
                    Simpan
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* HAK CIPTA PEMBUAT */}
          <div className="p-4 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent rounded-2xl border border-amber-300/80 dark:border-amber-700/60 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-sm shadow-xs">
                  JP
                </div>
                <div>
                  <div className="font-extrabold text-xs text-slate-950 dark:text-white">
                    Hak Cipta & Pembuat Aplikasi
                  </div>
                  <div className="text-[11px] font-bold text-amber-800 dark:text-amber-400">
                    Pengembang: <span className="text-slate-950 dark:text-white font-black underline decoration-amber-400">Jahidin</span>
                  </div>
                </div>
              </div>
              <span className="px-2 py-0.5 bg-slate-900 text-amber-400 text-[10px] font-mono font-bold rounded-full shadow-xs">
                Official Developer
              </span>
            </div>
            <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed pt-1.5 border-t border-amber-200/80 dark:border-amber-800/60">
              Copyright &copy; 2024-2026 <strong>Jahidin</strong>. Seluruh hak cipta dilindungi undang-undang. Sistem Absensi Hybrid Presisi Lapangan.
            </p>
          </div>

          {/* GANTI PIN ADMIN */}
          <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs text-white">Keamanan PIN Admin</h4>
                  <span className="text-[10px] text-slate-400">
                    Status: {isUsingDefaultPin ? (
                      <span className="text-amber-400 font-bold">Masih PIN Default (1234)</span>
                    ) : (
                      <span className="text-emerald-400 font-bold">PIN Kustom Terproteksi</span>
                    )}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPinChangeInputs(!showPinChangeInputs)}
                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-[11px] cursor-pointer transition-colors"
              >
                {showPinChangeInputs ? 'Tutup Form' : 'Ganti PIN'}
              </button>
            </div>
            <p className="text-[10px] text-slate-300 leading-relaxed">
              Setelah Anda mengganti PIN di sini, <strong>PIN default (1234) otomatis hangus dan tidak dapat digunakan lagi</strong>. Hanya PIN baru yang sah.
            </p>
            {showPinChangeInputs && (
              <form onSubmit={handleChangeAdminPin} className="space-y-2.5 pt-2 border-t border-slate-800 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-300 mb-0.5">
                    1. Masukkan PIN Saat Ini (Verifikasi Keamanan) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="password"
                    value={currentPinVerify}
                    onChange={(e) => setCurrentPinVerify(e.target.value)}
                    placeholder="PIN aktif saat ini (contoh: 1234)"
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white font-mono text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-300 mb-0.5">
                      2. PIN Baru (Min. 4 Digit) <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="password"
                      value={newPinInput}
                      onChange={(e) => setNewPinInput(e.target.value)}
                      placeholder="PIN baru Anda"
                      required
                      minLength={4}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white font-mono text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-300 mb-0.5">
                      3. Konfirmasi PIN Baru <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="password"
                      value={confirmPinInput}
                      onChange={(e) => setConfirmPinInput(e.target.value)}
                      placeholder="Ketik ulang PIN baru"
                      required
                      minLength={4}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white font-mono text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2 rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Simpan & Terapkan PIN Baru
                  </button>
                  {!isUsingDefaultPin && (
                    <button
                      type="button"
                      onClick={handleResetPinToDefault}
                      className="px-3 bg-slate-800 hover:bg-slate-700 text-rose-300 font-semibold rounded-xl text-[10px] cursor-pointer"
                      title="Reset PIN ke 1234 (perlu isi PIN saat ini)"
                    >
                      Reset ke 1234
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>

          {/* SINKRONISASI REAL-TIME MULTI-DEVICE (POINT 4) */}
          <div className="p-4 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-xs">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs text-sky-950 dark:text-sky-200">1 Link Sinkron Otomatis Antar Perangkat</h4>
                  <span className="text-[10px] text-sky-700 dark:text-sky-400">
                    Solusi Sinkronisasi Real-Time (Device 1, Device 2, dan Seluruh HP Pekerja)
                  </span>
                </div>
              </div>
              <span className="px-2 py-0.5 bg-sky-200 dark:bg-sky-900 text-sky-950 dark:text-sky-200 border border-sky-300 dark:border-sky-800 text-[10px] font-bold rounded-lg">
                Real-Time Hub
              </span>
            </div>
            <p className="text-[11px] text-sky-950 dark:text-sky-200 leading-relaxed">
              Seluruh perubahan di Device 1 (Pendaftaran Karyawan, Proyek Baru, Status Aktif, PIN, dan Absensi Masuk/Pulang) langsung tersinkron secara real-time ke Device 2. Bagikan link auto-koneksi berikut ke perangkat lain:
            </p>
            <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-sky-200 dark:border-sky-800 space-y-2">
              <div className="text-[10px] font-bold text-sky-900 dark:text-sky-300 uppercase tracking-wider flex items-center justify-between">
                <span>Link Auto-Koneksi:</span>
                <span className="text-emerald-700 dark:text-emerald-400 font-extrabold">Rekomendasi</span>
              </div>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  readOnly
                  value={generateDeviceSyncUrl(settings.gasUrl)}
                  className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-[10px] font-mono text-slate-700 dark:text-slate-300 select-all outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!settings.gasUrl) {
                      onShowToast('Hubungkan URL Google Sheets terlebih dahulu di form bawah!', 'warning');
                      return;
                    }
                    const syncUrl = generateDeviceSyncUrl(settings.gasUrl);
                    navigator.clipboard.writeText(syncUrl);
                    onShowToast('Link auto-sinkron berhasil disalin! Buka di Device 2 atau bagikan ke HP pekerja.', 'success');
                  }}
                  className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 active:scale-95 text-white font-bold rounded-lg text-[10px] flex items-center gap-1 transition-all cursor-pointer shadow-xs shrink-0"
                >
                  <Copy className="w-3 h-3" />
                  <span>Salin Link</span>
                </button>
              </div>
            </div>
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleManualSyncSettings}
                disabled={isSyncingAll || !settings.gasUrl}
                className="py-1.5 px-3 bg-white dark:bg-slate-900 hover:bg-sky-100 dark:hover:bg-slate-800 border border-sky-300 dark:border-sky-700 text-sky-900 dark:text-sky-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingAll ? 'animate-spin' : ''}`} />
                <span>{isSyncingAll ? 'Menyinkronkan...' : 'Tarik & Sinkronkan Semua Data Sekarang'}</span>
              </button>
            </div>
          </div>

          {/* GOOGLE SHEETS CONNECTOR */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-800 dark:text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                Database Google Sheets & Google Drive
              </h3>
              <span
                className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                  settings.gasUrl
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950 dark:text-amber-300'
                }`}
              >
                {settings.gasUrl ? 'URL Terhubung' : 'Belum Terhubung'}
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">
                URL Endpoint Web App GAS:
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={gasUrlInput}
                  onChange={(e) => setGasUrlInput(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-mono text-slate-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={handleSaveGasUrl}
                  className="bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 hover:bg-slate-800 font-bold px-3.5 rounded-xl text-xs cursor-pointer"
                >
                  Simpan URL
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center pt-0.5">
              <button
                type="button"
                onClick={handleSyncProjectsToCloud}
                disabled={!gasUrlInput.trim()}
                className="py-1.5 px-3 bg-amber-100 dark:bg-amber-950/80 hover:bg-amber-200 text-amber-950 dark:text-amber-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <CloudUpload className="w-3.5 h-3.5" />
                <span>Upload Database Proyek</span>
              </button>
              <button
                type="button"
                onClick={handleTestGasConnection}
                disabled={isTestingGas || !gasUrlInput.trim()}
                className="py-1.5 px-3 bg-emerald-100 dark:bg-emerald-950/80 hover:bg-emerald-200 disabled:opacity-40 text-emerald-900 dark:text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isTestingGas ? 'Mengirim Tes...' : 'Tes Sinyal'}</span>
              </button>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-slate-800 dark:text-white">Kode Google Apps Script v3.5</h4>
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">
                    Dukungan PDF KTP & KK, Kamera Belakang, Sinkronisasi Multi-Device & Anti-1899
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyGasCode}
                  className="text-xs bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-xs cursor-pointer active:scale-95 transition-all"
                >
                  {isCopiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopiedCode ? 'Tersalin!' : 'Copy Script'}</span>
                </button>
              </div>
              <textarea
                readOnly
                value={gasSampleCode}
                rows={8}
                className="w-full bg-slate-950 text-amber-300 font-mono text-[10px] p-3 rounded-2xl border border-slate-800 resize-none"
              />
            </div>
          </div>

          {/* BACKUP & RESTORE DATA */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
            <h4 className="font-bold text-xs text-slate-800 dark:text-white flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5 text-amber-600" />
              Cadangkan & Pulihkan Data Lokal (JSON)
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleExportBackupJson}
                className="py-2 px-3 bg-white dark:bg-slate-900 hover:bg-slate-100 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 shadow-xs cursor-pointer"
              >
                <Download className="w-3 h-3" /> Unduh Backup JSON
              </button>
              <label className="py-2 px-3 bg-white dark:bg-slate-900 hover:bg-slate-100 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 shadow-xs cursor-pointer text-center">
                <Upload className="w-3 h-3" /> Restore JSON
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportBackupJson}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Logout Admin Button */}
      <button
        type="button"
        onClick={handleLogout}
        className="w-full bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-2.5 rounded-2xl text-xs transition-colors cursor-pointer"
      >
        Keluar dari Sesi Admin
      </button>

      {/* ============================================================== */}
      {/* FITUR 2: MODAL POPUP PENDAFTARAN KARYAWAN BARU                */}
      {/* ============================================================== */}
      {showRegisterModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-3 sm:p-5 backdrop-blur-md overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 my-6 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                    Pendaftaran Karyawan Baru
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Formulir popup pendaftaran tenaga kerja dengan upload berkas KTP & KK (Gambar/PDF).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRegisterModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterEmployee} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Lengkap Karyawan <span className="text-rose-500 font-black">*</span>
                </label>
                <input
                  type="text"
                  value={regNama}
                  onChange={(e) => setRegNama(e.target.value.toUpperCase())}
                  placeholder="NAMA LENGKAP KARYAWAN"
                  required
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-bold uppercase text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Nomor NIK KTP <span className="text-rose-500 font-black">*</span>
                    </label>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                        cleanRegNik.length === 16
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {cleanRegNik.length}/16 digit
                    </span>
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={regNik}
                    onChange={(e) => {
                      const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 16);
                      setRegNik(digitsOnly);
                    }}
                    placeholder="16 digit NIK KTP"
                    maxLength={16}
                    required
                    className={`w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 font-mono text-slate-900 dark:text-white focus:ring-2 outline-none ${
                      existingEmployeeWithNik
                        ? 'border-rose-500 focus:ring-rose-400 bg-rose-50/50 dark:bg-rose-950/20'
                        : cleanRegNik.length === 16
                        ? 'border-emerald-400 focus:ring-emerald-400'
                        : 'border-slate-300 dark:border-slate-700 focus:ring-amber-500'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tanggal Lahir <span className="text-rose-500 font-black">*</span>
                  </label>
                  <input
                    type="date"
                    value={regTglLahir}
                    onChange={(e) => setRegTglLahir(e.target.value)}
                    required
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>

              {existingEmployeeWithNik && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-2xl flex items-start gap-2 text-rose-800 dark:text-rose-300 text-[11px]">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold">NIK Sudah Terdaftar di Sistem!</strong>
                    <span>
                      NIK <strong>{cleanRegNik}</strong> sudah digunakan oleh{' '}
                      <strong>{existingEmployeeWithNik.nama}</strong> (ID: {existingEmployeeWithNik.id}).
                    </span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Departemen / Divisi <span className="text-rose-500 font-black">*</span>
                  </label>
                  <input
                    type="text"
                    value={regDept}
                    onChange={(e) => setRegDept(e.target.value)}
                    placeholder="Contoh: Teknik Sipil / MEP / HSE"
                    required
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Jabatan Pekerja <span className="text-rose-500 font-black">*</span>
                  </label>
                  <input
                    type="text"
                    value={regJabatan}
                    onChange={(e) => setRegJabatan(e.target.value)}
                    placeholder="Contoh: Site Supervisor / Mandor / Tukang"
                    required
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nomor WhatsApp / HP
                  </label>
                  <input
                    type="tel"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="081234567890"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2 font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Status Karyawan
                  </label>
                  <button
                    type="button"
                    onClick={() => setRegStatusAktif(!regStatusAktif)}
                    className={`w-full p-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      regStatusAktif
                        ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                        : 'bg-rose-50 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                    }`}
                  >
                    {regStatusAktif ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Status: AKTIF</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                        <span>Status: NONAKTIF</span>
                      </>
                    )}
                  </button>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Izin Bebas Lokasi
                  </label>
                  <button
                    type="button"
                    onClick={() => setRegIzinBebasLokasi(!regIzinBebasLokasi)}
                    className={`w-full p-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      regIzinBebasLokasi
                        ? 'bg-sky-50 dark:bg-sky-950 text-sky-800 dark:text-sky-300 border-sky-300 dark:border-sky-800'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                    }`}
                    title={regIzinBebasLokasi ? 'Karyawan bisa absen di mana saja' : 'Karyawan wajib berada dalam radius proyek'}
                  >
                    <Navigation className="w-3.5 h-3.5 text-sky-600" />
                    <span>{regIzinBebasLokasi ? 'Bebas Lokasi: YA' : 'Standar (Radius)'}</span>
                  </button>
                </div>
              </div>

              {/* FITUR STATUS PTKP (PENGHASILAN TIDAK KENA PAJAK) DENGAN KETERANGAN LENGKAP */}
              <div className="p-3.5 bg-amber-50/80 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[9px] font-black">
                      %
                    </span>
                    <span>Status PTKP (Penghasilan Tidak Kena Pajak PPh 21)</span>
                    <span className="text-rose-500 font-black">*</span>
                  </label>
                  <span className="text-[10px] font-mono font-black bg-amber-500 text-slate-950 px-2.5 py-0.5 rounded-full shadow-2xs">
                    {regPtkp}
                  </span>
                </div>

                <select
                  value={regPtkp}
                  onChange={(e) => setRegPtkp(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none cursor-pointer"
                >
                  <optgroup label="Tidak Kawin / Lajang (TK)">
                    {PTKP_OPTIONS.filter((p) => p.code.startsWith('TK/')).map((opt) => (
                      <option key={opt.code} value={opt.code}>
                        {opt.label} — Bebas Pajak: {opt.nominalTahunan}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Kawin / Menikah (K)">
                    {PTKP_OPTIONS.filter((p) => p.code.startsWith('K/') && !p.code.startsWith('K/I/')).map((opt) => (
                      <option key={opt.code} value={opt.code}>
                        {opt.label} — Bebas Pajak: {opt.nominalTahunan}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Kawin + Penghasilan Istri Digabung (K/I)">
                    {PTKP_OPTIONS.filter((p) => p.code.startsWith('K/I/')).map((opt) => (
                      <option key={opt.code} value={opt.code}>
                        {opt.label} — Bebas Pajak: {opt.nominalTahunan}
                      </option>
                    ))}
                  </optgroup>
                </select>

                {/* Box Penjelasan Lengkap PTKP Terpilih Supaya Tidak Membingungkan */}
                {(() => {
                  const info = PTKP_OPTIONS.find((p) => p.code === regPtkp) || PTKP_OPTIONS[0];
                  return (
                    <div className="bg-white/95 dark:bg-slate-900/90 p-3 rounded-xl border border-amber-200/90 dark:border-amber-800/60 text-[11px] space-y-1.5 shadow-2xs">
                      <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 flex-wrap gap-1">
                        <span className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Kategori: {info.kategori}</span>
                        </span>
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold px-2 py-0.5 rounded-lg">
                          Jumlah Tanggungan: <strong className="text-amber-600 dark:text-amber-400">{info.tanggungan} orang</strong>
                        </span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 text-[10.5px] leading-relaxed">
                        <strong>Keterangan:</strong> {info.keterangan}.
                      </p>
                      <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400 flex-wrap gap-1">
                        <span>Batas Bebas Pajak: <strong className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">{info.nominalTahunan}</strong></span>
                        <span className="font-mono text-slate-600 dark:text-slate-300">({info.nominalBulanan})</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* FITUR 3: DRAG & DROP UNTUK UPLOAD KTP DAN KK (BISA FILE PDF & KAMERA BELAKANG DENGAN TANDA UKURAN) */}
              <div className="pt-2 space-y-3 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                      <span>Dokumen Wajib: KTP, KK, & Selfie</span>
                      <span className="text-rose-500 font-bold">*</span>
                    </label>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Tarik & lepas (Drag & Drop) file foto atau PDF. Jika menggunakan kamera, otomatis kamera belakang dengan tanda ukuran dokumen.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* 1. KTP Dropzone (Gambar / PDF) */}
                  <DocumentUploadDropzone
                    label="Dokumen KTP"
                    docKind="ktp"
                    value={regFotoKtp}
                    fileType={regFotoKtpType}
                    fileName={regFotoKtpName}
                    required={true}
                    onFileLoaded={(dataUrl, type, name) => {
                      setRegFotoKtp(dataUrl);
                      setRegFotoKtpType(type);
                      setRegFotoKtpName(name);
                      onShowToast(`Berkas KTP (${type.toUpperCase()}) berhasil dimuat!`, 'success');
                    }}
                    onClear={() => {
                      setRegFotoKtp(null);
                      setRegFotoKtpName('');
                    }}
                    onOpenLiveCamera={() => setActiveCameraTarget('ktp')}
                    onPreview={(url, t, sub) => onPreviewPhoto(url, t, sub)}
                  />

                  {/* 2. KK Dropzone (Gambar / PDF) */}
                  <DocumentUploadDropzone
                    label="Dokumen KK"
                    docKind="kk"
                    value={regFotoKk}
                    fileType={regFotoKkType}
                    fileName={regFotoKkName}
                    required={true}
                    onFileLoaded={(dataUrl, type, name) => {
                      setRegFotoKk(dataUrl);
                      setRegFotoKkType(type);
                      setRegFotoKkName(name);
                      onShowToast(`Berkas KK (${type.toUpperCase()}) berhasil dimuat!`, 'success');
                    }}
                    onClear={() => {
                      setRegFotoKk(null);
                      setRegFotoKkName('');
                    }}
                    onOpenLiveCamera={() => setActiveCameraTarget('kk')}
                    onPreview={(url, t, sub) => onPreviewPhoto(url, t, sub)}
                  />

                  {/* 3. Selfie Box */}
                  <div className="p-3 rounded-2xl border-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex flex-col justify-between text-center">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                        <Camera className="w-4 h-4 text-amber-500" />
                        Foto Selfie <span className="text-rose-500 font-bold">*</span>
                      </span>
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          regFotoSelfie
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}
                      >
                        {regFotoSelfie ? 'Siap' : 'Wajib'}
                      </span>
                    </div>

                    {regFotoSelfie ? (
                      <div className="my-2 flex flex-col items-center">
                        <img
                          src={regFotoSelfie}
                          alt="Selfie"
                          onClick={() => onPreviewPhoto(regFotoSelfie, `Selfie - ${regNama}`, `Dept: ${regDept}`)}
                          className="w-16 h-16 rounded-full object-cover border-2 border-amber-400 cursor-pointer shadow-xs hover:scale-105 transition-transform"
                        />
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            type="button"
                            onClick={() => setActiveCameraTarget('selfie')}
                            className="text-[10px] text-amber-700 dark:text-amber-400 font-bold hover:underline cursor-pointer"
                          >
                            Foto Ulang
                          </button>
                          <span className="text-slate-300 dark:text-slate-700">|</span>
                          <button
                            type="button"
                            onClick={() => setRegFotoSelfie(null)}
                            className="text-[10px] text-rose-600 dark:text-rose-400 font-bold hover:underline cursor-pointer"
                          >
                            Hapus
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="py-3 space-y-2">
                        <button
                          type="button"
                          onClick={() => setActiveCameraTarget('selfie')}
                          className="w-full py-2.5 px-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                        >
                          <Camera className="w-4 h-4" />
                          <span>Ambil Live Selfie</span>
                        </button>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          Foto wajah langsung untuk validasi absensi
                        </p>
                      </div>
                    )}

                    <div className="text-[9.5px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-800">
                      Format: Kamera Wajah Live
                    </div>
                  </div>
                </div>
              </div>

              {/* ID Unik Otomatis & Submit Button */}
              <div className="p-3.5 bg-slate-950 text-white rounded-2xl flex items-center justify-between shadow-inner">
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">
                    ID Unik Otomatis Tergenerate:
                  </span>
                  <span className="text-base font-mono font-black text-amber-400 tracking-wider">
                    {autoGeneratedId}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowRegisterModal(false)}
                    className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={
                      autoGeneratedId === '---' ||
                      cleanRegNik.length !== 16 ||
                      !!existingEmployeeWithNik ||
                      !regDept.trim() ||
                      !regJabatan.trim() ||
                      !regFotoKtp ||
                      !regFotoKk ||
                      !regFotoSelfie
                    }
                    className="bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:bg-slate-700 disabled:text-slate-400 text-slate-950 px-4 py-2.5 rounded-xl font-extrabold text-xs shadow-sm transition-all active:scale-95 cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Simpan & Daftarkan</span>
                  </button>
                </div>
              </div>

              {(!regFotoKtp || !regFotoKk || !regFotoSelfie) && (
                <p className="text-[10px] text-center text-rose-600 dark:text-rose-400 font-semibold">
                  *Semua dokumen (KTP, KK, dan Selfie) wajib diunggah agar tombol pendaftaran dapat ditekan.
                </p>
              )}
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* FITUR 2: MODAL POPUP TAMBAH / EDIT PROYEK                      */}
      {/* ============================================================== */}
      {showProjectModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-3 sm:p-5 backdrop-blur-md overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 my-6 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                    {editingProjectId ? 'Edit Data Proyek & Shift' : 'Tambah Proyek & Shift Baru'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Atur titik koordinat GPS lokasi proyek, batas radius presensi, serta skema shift jam kerja.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowProjectModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProject} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Proyek / Site Konstruksi <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  value={projNama}
                  onChange={(e) => setProjNama(e.target.value)}
                  placeholder="Contoh: Gedung Office Tower C"
                  required
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Latitude <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={projLat}
                    onChange={(e) => setProjLat(e.target.value)}
                    placeholder="-6.200000"
                    required
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Longitude <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={projLng}
                    onChange={(e) => setProjLng(e.target.value)}
                    placeholder="106.816666"
                    required
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleSetProjGpsFromCurrent}
                disabled={isGettingGpsForProj}
                className="w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-slate-200 dark:border-slate-700"
              >
                <MapPin className={`w-3.5 h-3.5 text-amber-600 ${isGettingGpsForProj ? 'animate-bounce' : ''}`} />
                <span>{isGettingGpsForProj ? 'Mengambil GPS...' : 'Ambil Koordinat GPS Saya Saat Ini'}</span>
              </button>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Batas Radius (Meter) <span className="text-rose-500 font-bold">*</span>
                    </label>
                    <span className="text-[10px] text-amber-800 dark:text-amber-400 font-black bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.2 rounded">
                      {projRadius}m
                    </span>
                  </div>
                  <input
                    type="number"
                    value={projRadius}
                    onChange={(e) => setProjRadius(Number(e.target.value))}
                    min={20}
                    max={2000}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2 font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Status Proyek
                  </label>
                  <button
                    type="button"
                    onClick={() => setProjStatusAktif(!projStatusAktif)}
                    className={`w-full p-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      projStatusAktif
                        ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                        : 'bg-rose-50 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                    }`}
                  >
                    {projStatusAktif ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Proyek: AKTIF</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                        <span>Proyek: NONAKTIF</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Pilih Skema Shift Kerja Proyek:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleShiftSchemeChange('1_SHIFT')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      projShiftScheme === '1_SHIFT'
                        ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    1 Shift
                    <span className="block text-[9px] font-normal opacity-80">Non-Shift</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleShiftSchemeChange('2_SHIFT')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      projShiftScheme === '2_SHIFT'
                        ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    2 Shift
                    <span className="block text-[9px] font-normal opacity-80">Pagi & Malam</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleShiftSchemeChange('3_SHIFT')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      projShiftScheme === '3_SHIFT'
                        ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    3 Shift
                    <span className="block text-[9px] font-normal opacity-80">24 Jam Penuh</span>
                  </button>
                </div>
              </div>

              {/* Shift Timing Details */}
              <div className="space-y-2 pt-1">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Atur Jam Masuk, Pulang, & Toleransi ({projShifts.length} Shift):
                </span>
                {projShifts.map((sh, idx) => (
                  <div
                    key={sh.id || idx}
                    className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-slate-800 dark:text-white text-xs flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        {sh.nama}
                      </span>
                      <span className="text-[9px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded font-bold">
                        Shift #{idx + 1}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 mb-0.5">
                          Nama Shift
                        </label>
                        <input
                          type="text"
                          value={sh.nama}
                          onChange={(e) => handleUpdateShiftField(idx, 'nama', e.target.value)}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-1.5 text-xs font-medium text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 mb-0.5">
                          Jam Masuk
                        </label>
                        <input
                          type="time"
                          value={sh.jamMasuk}
                          onChange={(e) => handleUpdateShiftField(idx, 'jamMasuk', e.target.value)}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-1.5 text-xs font-bold text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 mb-0.5">
                          Jam Pulang
                        </label>
                        <input
                          type="time"
                          value={sh.jamPulang}
                          onChange={(e) => handleUpdateShiftField(idx, 'jamPulang', e.target.value)}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-1.5 text-xs font-medium text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 mb-0.5">
                          Toleransi (Mnt)
                        </label>
                        <input
                          type="number"
                          value={sh.toleransi}
                          onChange={(e) =>
                            handleUpdateShiftField(idx, 'toleransi', Number(e.target.value))
                          }
                          min={0}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-1.5 text-xs font-medium text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 mb-0.5">
                          Min Kerja (Jam)
                        </label>
                        <input
                          type="number"
                          value={sh.minJamKerja}
                          onChange={(e) =>
                            handleUpdateShiftField(idx, 'minJamKerja', Number(e.target.value))
                          }
                          min={1}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-1.5 text-xs font-medium text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowProjectModal(false)}
                  className="py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-2.5 px-4 rounded-xl text-xs shadow-sm transition-all active:scale-95 cursor-pointer"
                >
                  {editingProjectId ? 'Simpan Perubahan Proyek' : 'Simpan Proyek Baru & Sync Cloud'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL EDIT DATA KARYAWAN (POPUP)                               */}
      {/* ============================================================== */}
      {editingEmployee && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-3 sm:p-5 backdrop-blur-md overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 my-6 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Edit Data Karyawan</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    ID Unik: <span className="font-mono font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded">{editingEmployee.id}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingEmployee(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditEmployee} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nama Lengkap <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    value={editNama}
                    onChange={(e) => setEditNama(e.target.value)}
                    required
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-bold uppercase text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nomor NIK KTP (16 Digit) <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={16}
                    value={editNik}
                    onChange={(e) => setEditNik(e.target.value.replace(/\D/g, ''))}
                    required
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tanggal Lahir <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="date"
                    value={editTglLahir}
                    onChange={(e) => setEditTglLahir(e.target.value)}
                    required
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    No. WhatsApp / HP
                  </label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="081234567890"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Departemen / Divisi <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    value={editDept}
                    onChange={(e) => setEditDept(e.target.value)}
                    required
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Jabatan <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    value={editJabatan}
                    onChange={(e) => setEditJabatan(e.target.value)}
                    required
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Status Keaktifan
                  </label>
                  <button
                    type="button"
                    onClick={() => setEditStatusAktif(!editStatusAktif)}
                    className={`w-full p-2.5 rounded-xl font-bold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      editStatusAktif
                        ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                        : 'bg-rose-50 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                    }`}
                  >
                    {editStatusAktif ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Status: AKTIF (Bisa Absen)</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                        <span>Status: NONAKTIF (Diblokir)</span>
                      </>
                    )}
                  </button>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Izin Bebas Lokasi (Mobile)
                  </label>
                  <button
                    type="button"
                    onClick={() => setEditIzinBebasLokasi(!editIzinBebasLokasi)}
                    className={`w-full p-2.5 rounded-xl font-bold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      editIzinBebasLokasi
                        ? 'bg-sky-50 dark:bg-sky-950 text-sky-800 dark:text-sky-300 border-sky-300 dark:border-sky-800'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    <Navigation className="w-3.5 h-3.5 text-sky-600" />
                    <span>{editIzinBebasLokasi ? 'Bebas Lokasi: YA' : 'Standar (Wajib Radius)'}</span>
                  </button>
                </div>
              </div>

              {/* EDIT STATUS PTKP (PENGHASILAN TIDAK KENA PAJAK) DENGAN KETERANGAN LENGKAP */}
              <div className="p-3.5 bg-amber-50/80 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[9px] font-black">
                      %
                    </span>
                    <span>Status PTKP (Penghasilan Tidak Kena Pajak PPh 21)</span>
                    <span className="text-rose-500 font-black">*</span>
                  </label>
                  <span className="text-[10px] font-mono font-black bg-amber-500 text-slate-950 px-2.5 py-0.5 rounded-full shadow-2xs">
                    {editPtkp}
                  </span>
                </div>

                <select
                  value={editPtkp}
                  onChange={(e) => setEditPtkp(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none cursor-pointer"
                >
                  <optgroup label="Tidak Kawin / Lajang (TK)">
                    {PTKP_OPTIONS.filter((p) => p.code.startsWith('TK/')).map((opt) => (
                      <option key={opt.code} value={opt.code}>
                        {opt.label} — Bebas Pajak: {opt.nominalTahunan}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Kawin / Menikah (K)">
                    {PTKP_OPTIONS.filter((p) => p.code.startsWith('K/') && !p.code.startsWith('K/I/')).map((opt) => (
                      <option key={opt.code} value={opt.code}>
                        {opt.label} — Bebas Pajak: {opt.nominalTahunan}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Kawin + Penghasilan Istri Digabung (K/I)">
                    {PTKP_OPTIONS.filter((p) => p.code.startsWith('K/I/')).map((opt) => (
                      <option key={opt.code} value={opt.code}>
                        {opt.label} — Bebas Pajak: {opt.nominalTahunan}
                      </option>
                    ))}
                  </optgroup>
                </select>

                {/* Box Penjelasan Lengkap PTKP Terpilih Supaya Tidak Membingungkan */}
                {(() => {
                  const info = PTKP_OPTIONS.find((p) => p.code === editPtkp) || PTKP_OPTIONS[0];
                  return (
                    <div className="bg-white/95 dark:bg-slate-900/90 p-3 rounded-xl border border-amber-200/90 dark:border-amber-800/60 text-[11px] space-y-1.5 shadow-2xs">
                      <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 flex-wrap gap-1">
                        <span className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Kategori: {info.kategori}</span>
                        </span>
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold px-2 py-0.5 rounded-lg">
                          Jumlah Tanggungan: <strong className="text-amber-600 dark:text-amber-400">{info.tanggungan} orang</strong>
                        </span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 text-[10.5px] leading-relaxed">
                        <strong>Keterangan:</strong> {info.keterangan}.
                      </p>
                      <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400 flex-wrap gap-1">
                        <span>Batas Bebas Pajak: <strong className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">{info.nominalTahunan}</strong></span>
                        <span className="font-mono text-slate-600 dark:text-slate-300">({info.nominalBulanan})</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Berkas Dokumen KTP, KK, Selfie */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                  Perbarui / Pratinjau Berkas KTP, KK (Gambar/PDF), & Selfie
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <DocumentUploadDropzone
                    label="KTP"
                    docKind="ktp"
                    value={editFotoKtp}
                    fileType={editFotoKtpType}
                    fileName={editFotoKtpName}
                    onFileLoaded={(dataUrl, type, name) => {
                      setEditFotoKtp(dataUrl);
                      setEditFotoKtpType(type);
                      setEditFotoKtpName(name);
                    }}
                    onClear={() => {
                      setEditFotoKtp(null);
                      setEditFotoKtpName('');
                    }}
                    onOpenLiveCamera={() => setEditCameraTarget('ktp')}
                    onPreview={(url, t, sub) => onPreviewPhoto(url, t, sub)}
                  />

                  <DocumentUploadDropzone
                    label="KK"
                    docKind="kk"
                    value={editFotoKk}
                    fileType={editFotoKkType}
                    fileName={editFotoKkName}
                    onFileLoaded={(dataUrl, type, name) => {
                      setEditFotoKk(dataUrl);
                      setEditFotoKkType(type);
                      setEditFotoKkName(name);
                    }}
                    onClear={() => {
                      setEditFotoKk(null);
                      setEditFotoKkName('');
                    }}
                    onOpenLiveCamera={() => setEditCameraTarget('kk')}
                    onPreview={(url, t, sub) => onPreviewPhoto(url, t, sub)}
                  />

                  {/* Selfie Box */}
                  <div className="p-3 border rounded-2xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex flex-col justify-between text-center">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Selfie Profil</span>
                    {editFotoSelfie ? (
                      <div className="my-1 flex flex-col items-center">
                        <img
                          src={getDirectImageUrl(editFotoSelfie)}
                          alt="Selfie"
                          referrerPolicy="no-referrer"
                          onClick={() => onPreviewPhoto(editFotoSelfie, `Selfie - ${editNama}`, `Dept: ${editDept}`)}
                          className="w-16 h-16 rounded-full object-cover border-2 border-amber-400 cursor-pointer shadow-xs"
                        />
                        <button
                          type="button"
                          onClick={() => setEditCameraTarget('selfie')}
                          className="text-[10px] text-amber-700 dark:text-amber-400 font-bold hover:underline mt-2 cursor-pointer"
                        >
                          Foto Ulang Selfie
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setEditCameraTarget('selfie')}
                        className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Buka Kamera Selfie</span>
                      </button>
                    )}
                    <span className="text-[9.5px] text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-700 mt-2">
                      Live Selfie
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingEmployee(null)}
                  className="py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all active:scale-95"
                >
                  <Check className="w-4 h-4" /> Simpan Perubahan Karyawan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL KOREKSI / TAMBAH ABSENSI MANUAL                          */}
      {/* ============================================================== */}
      {showCorrectionModal && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                <Edit3 className="w-4 h-4 text-amber-500" />
                {correctionTarget ? 'Koreksi Data Absensi' : 'Tambah Absensi Manual'}
              </h3>
              <button
                onClick={() => setShowCorrectionModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-0.5">
                  ID Karyawan
                </label>
                <input
                  type="text"
                  value={korUserId}
                  onChange={(e) => setKorUserId(e.target.value.toUpperCase())}
                  placeholder="ID Karyawan"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2 font-mono font-bold uppercase text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-0.5">
                  Tanggal
                </label>
                <input
                  type="date"
                  value={korTanggal}
                  onChange={(e) => setKorTanggal(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2 font-medium text-slate-900 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-0.5">
                    Jam Masuk
                  </label>
                  <input
                    type="time"
                    value={korJamMasuk}
                    onChange={(e) => setKorJamMasuk(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2 font-medium text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-0.5">
                    Jam Pulang
                  </label>
                  <input
                    type="time"
                    value={korJamPulang}
                    onChange={(e) => setKorJamPulang(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2 font-medium text-slate-900 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-0.5">
                  Lokasi Proyek
                </label>
                <select
                  value={korProyek}
                  onChange={(e) => setKorProyek(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2 font-medium text-slate-900 dark:text-white"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.nama}>
                      {p.nama} {p.statusAktif === false ? '(Nonaktif)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-0.5">
                  Alasan Koreksi / Catatan
                </label>
                <input
                  type="text"
                  value={korCatatan}
                  onChange={(e) => setKorCatatan(e.target.value)}
                  placeholder="Misal: Lupa absen pulang karena lembur"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCorrectionModal(false)}
                className="py-2.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveCorrection}
                className="py-2.5 px-3 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold cursor-pointer"
              >
                Simpan Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL KONFIRMASI HAPUS                                         */}
      {/* ============================================================== */}
      {deleteModal.show && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">{deleteModal.title}</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                {deleteModal.description}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() =>
                  setDeleteModal({
                    show: false,
                    type: 'project',
                    targetId: '',
                    title: '',
                    description: '',
                  })
                }
                className="py-2.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteDelete}
                className="py-2.5 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* FITUR 3: LIVE CAMERA MODAL DOKUMEN & SELFIE                    */}
      {/* Kamera belakang otomatis untuk KTP / KK dengan Tanda Ukuran    */}
      {/* ============================================================== */}
      <LiveCameraModal
        isOpen={activeCameraTarget !== null || editCameraTarget !== null}
        title={
          (activeCameraTarget || editCameraTarget) === 'ktp'
            ? 'Ambil Foto KTP Langsung (Kamera Belakang)'
            : (activeCameraTarget || editCameraTarget) === 'kk'
            ? 'Ambil Foto KK Langsung (Kamera Belakang)'
            : 'Ambil Foto Selfie Live'
        }
        docType={(activeCameraTarget || editCameraTarget) || 'selfie'}
        onCapture={(img) => {
          if (editCameraTarget) {
            if (editCameraTarget === 'ktp') {
              setEditFotoKtp(img);
              setEditFotoKtpType('image');
              setEditFotoKtpName('KTP_Kamera.jpg');
              onShowToast('Foto KTP berhasil diambil dengan kamera belakang!', 'success');
            } else if (editCameraTarget === 'kk') {
              setEditFotoKk(img);
              setEditFotoKkType('image');
              setEditFotoKkName('KK_Kamera.jpg');
              onShowToast('Foto KK berhasil diambil dengan kamera belakang!', 'success');
            } else if (editCameraTarget === 'selfie') {
              setEditFotoSelfie(img);
              onShowToast('Foto Selfie berhasil diperbarui dari kamera!', 'success');
            }
            setEditCameraTarget(null);
            return;
          }

          if (activeCameraTarget === 'ktp') {
            setRegFotoKtp(img);
            setRegFotoKtpType('image');
            setRegFotoKtpName('KTP_Kamera.jpg');
            onShowToast('Foto KTP berhasil diambil dengan kamera belakang (Tanda Ukuran KTP)!', 'success');
          } else if (activeCameraTarget === 'kk') {
            setRegFotoKk(img);
            setRegFotoKkType('image');
            setRegFotoKkName('KK_Kamera.jpg');
            onShowToast('Foto KK berhasil diambil dengan kamera belakang (Tanda Ukuran KK)!', 'success');
          } else if (activeCameraTarget === 'selfie') {
            setRegFotoSelfie(img);
            onShowToast('Foto Selfie live berhasil diambil!', 'success');
          }
          setActiveCameraTarget(null);
        }}
        onClose={() => {
          setActiveCameraTarget(null);
          setEditCameraTarget(null);
        }}
      />
    </div>
  );
};

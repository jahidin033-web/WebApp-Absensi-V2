export type ShiftScheme = '1_SHIFT' | '2_SHIFT' | '3_SHIFT';

export interface ShiftConfig {
  id: string;
  nama: string; // Contoh: "Shift 1 (Pagi)", "Shift 2 (Sore)", "Shift 3 (Malam)"
  jamMasuk: string; // "07:00"
  jamPulang: string; // "15:00"
  toleransi: number; // menit, contoh: 15
  minJamKerja: number; // jam, contoh: 7
}

export interface Project {
  id: string;
  nama: string;
  lat: number;
  lng: number;
  radius: number; // dalam meter
  shiftScheme: ShiftScheme; // 1_SHIFT, 2_SHIFT, 3_SHIFT
  shifts: ShiftConfig[];
  statusAktif?: boolean; // true = Aktif, false = Nonaktif (hanya proyek aktif yg dapat dipilih)
  // Kompatibilitas mundur
  jamMasuk?: string;
  toleransi?: number;
  minJamKerja?: number;
  shiftType?: string;
}

export interface PtkpOption {
  code: string;
  label: string;
  kategori: string;
  tanggungan: number;
  keterangan: string;
  nominalTahunan: string;
  nominalBulanan: string;
}

export const PTKP_OPTIONS: PtkpOption[] = [
  {
    code: 'TK/0',
    label: 'TK/0 - Tidak Kawin (0 Tanggungan)',
    kategori: 'Tidak Kawin / Lajang',
    tanggungan: 0,
    keterangan: 'Lajang/sendiri tanpa tanggungan keluarga sedarah/anak',
    nominalTahunan: 'Rp 54.000.000 / tahun',
    nominalBulanan: 'Rp 4.500.000 / bulan',
  },
  {
    code: 'TK/1',
    label: 'TK/1 - Tidak Kawin (1 Tanggungan)',
    kategori: 'Tidak Kawin / Lajang',
    tanggungan: 1,
    keterangan: 'Lajang dengan 1 orang tanggungan keluarga (orang tua / anak angkat)',
    nominalTahunan: 'Rp 58.500.000 / tahun',
    nominalBulanan: 'Rp 4.875.000 / bulan',
  },
  {
    code: 'TK/2',
    label: 'TK/2 - Tidak Kawin (2 Tanggungan)',
    kategori: 'Tidak Kawin / Lajang',
    tanggungan: 2,
    keterangan: 'Lajang dengan 2 orang tanggungan keluarga sedarah semenda',
    nominalTahunan: 'Rp 63.000.000 / tahun',
    nominalBulanan: 'Rp 5.250.000 / bulan',
  },
  {
    code: 'TK/3',
    label: 'TK/3 - Tidak Kawin (3 Tanggungan)',
    kategori: 'Tidak Kawin / Lajang',
    tanggungan: 3,
    keterangan: 'Lajang dengan 3 orang tanggungan keluarga (maksimal tanggungan)',
    nominalTahunan: 'Rp 67.500.000 / tahun',
    nominalBulanan: 'Rp 5.625.000 / bulan',
  },
  {
    code: 'K/0',
    label: 'K/0 - Kawin (0 Tanggungan)',
    kategori: 'Kawin / Menikah',
    tanggungan: 0,
    keterangan: 'Menikah, istri tidak berpenghasilan, belum memiliki anak/tanggungan',
    nominalTahunan: 'Rp 58.500.000 / tahun',
    nominalBulanan: 'Rp 4.875.000 / bulan',
  },
  {
    code: 'K/1',
    label: 'K/1 - Kawin (1 Tanggungan)',
    kategori: 'Kawin / Menikah',
    tanggungan: 1,
    keterangan: 'Menikah, istri tidak bekerja + 1 orang anak/tanggungan',
    nominalTahunan: 'Rp 63.000.000 / tahun',
    nominalBulanan: 'Rp 5.250.000 / bulan',
  },
  {
    code: 'K/2',
    label: 'K/2 - Kawin (2 Tanggungan)',
    kategori: 'Kawin / Menikah',
    tanggungan: 2,
    keterangan: 'Menikah, istri tidak bekerja + 2 orang anak/tanggungan',
    nominalTahunan: 'Rp 67.500.000 / tahun',
    nominalBulanan: 'Rp 5.625.000 / bulan',
  },
  {
    code: 'K/3',
    label: 'K/3 - Kawin (3 Tanggungan)',
    kategori: 'Kawin / Menikah',
    tanggungan: 3,
    keterangan: 'Menikah, istri tidak bekerja + 3 orang anak/tanggungan (maksimal)',
    nominalTahunan: 'Rp 72.000.000 / tahun',
    nominalBulanan: 'Rp 6.000.000 / bulan',
  },
  {
    code: 'K/I/0',
    label: 'K/I/0 - Kawin + Istri Bekerja (0 Tanggungan)',
    kategori: 'Kawin Penghasilan Digabung',
    tanggungan: 0,
    keterangan: 'Menikah, penghasilan suami & istri digabung, tanpa tanggungan anak',
    nominalTahunan: 'Rp 112.500.000 / tahun',
    nominalBulanan: 'Rp 9.375.000 / bulan',
  },
  {
    code: 'K/I/1',
    label: 'K/I/1 - Kawin + Istri Bekerja (1 Tanggungan)',
    kategori: 'Kawin Penghasilan Digabung',
    tanggungan: 1,
    keterangan: 'Menikah, penghasilan suami & istri digabung + 1 anak/tanggungan',
    nominalTahunan: 'Rp 117.000.000 / tahun',
    nominalBulanan: 'Rp 9.750.000 / bulan',
  },
  {
    code: 'K/I/2',
    label: 'K/I/2 - Kawin + Istri Bekerja (2 Tanggungan)',
    kategori: 'Kawin Penghasilan Digabung',
    tanggungan: 2,
    keterangan: 'Menikah, penghasilan suami & istri digabung + 2 anak/tanggungan',
    nominalTahunan: 'Rp 121.500.000 / tahun',
    nominalBulanan: 'Rp 10.125.000 / bulan',
  },
  {
    code: 'K/I/3',
    label: 'K/I/3 - Kawin + Istri Bekerja (3 Tanggungan)',
    kategori: 'Kawin Penghasilan Digabung',
    tanggungan: 3,
    keterangan: 'Menikah, penghasilan suami & istri digabung + 3 anak/tanggungan (maksimal)',
    nominalTahunan: 'Rp 126.000.000 / tahun',
    nominalBulanan: 'Rp 10.500.000 / bulan',
  },
];

export interface Employee {
  id: string; // Contoh: ABC010190
  nama: string;
  nik: string; // 16 digit angka KTP
  tglLahir: string; // YYYY-MM-DD
  dept: string;
  jabatan: string;
  phone?: string;
  ptkp?: string; // Status PTKP contoh: "TK/0", "K/1", "K/2", dll
  fotoKtp: string; // URL Google Drive, Base64 Image asli, atau Base64 PDF
  fotoKtpType?: 'image' | 'pdf';
  fotoKtpName?: string;
  fotoKk: string; // URL Google Drive, Base64 Image asli, atau Base64 PDF
  fotoKkType?: 'image' | 'pdf';
  fotoKkName?: string;
  fotoSelfie: string; // URL Google Drive atau Base64 lokal
  registeredAt?: number;
  statusAktif?: boolean; // true = Aktif, false = Nonaktif (hanya karyawan aktif yg bisa absen)
  izinBebasLokasi?: boolean; // true = bisa absen di mana saja tanpa batasan radius proyek
}

export interface AttendanceLog {
  id: string;
  userId: string;
  nama: string;
  proyek: string;
  proyekId?: string;
  shiftNama?: string; // Nama shift yang diambil
  tanggal: string; // YYYY-MM-DD
  jamMasuk: string; // "07:55"
  jamPulang: string; // "17:05" or "-"
  status: 'Hadir' | 'Terlambat' | 'Pulang Cepat' | 'Koreksi Admin';
  fotoMasuk?: string | null;
  fotoPulang?: string | null;
  durasiJam?: number; // total jam kerja
  keterangan?: string;
  userLat?: number;
  userLng?: number;
  jarakMeter?: number;
  isBebasLokasi?: boolean;
  createdAt: number;
}

export interface AppSettings {
  companyName: string; // Nama perusahaan pengguna (dapat diatur di admin)
  gasUrl: string;
  adminPin: string; // PIN Admin (Default 1234 saat pertama kali)
  enableVoice: boolean;
  theme?: 'light' | 'dark';
  viewMode?: 'responsive' | 'desktop' | 'mobile';
}

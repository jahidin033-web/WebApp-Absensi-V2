import * as XLSX from 'xlsx';
import { AttendanceLog } from '../types';

export function exportAttendanceToExcel(logs: AttendanceLog[], filenamePrefix = 'Rekap_Absensi'): void {
  if (!logs || logs.length === 0) {
    throw new Error('Tidak ada data absensi untuk diekspor');
  }

  const rows = logs.map((log, index) => ({
    No: index + 1,
    'ID Karyawan': log.userId,
    'Nama Karyawan': log.nama,
    Proyek: log.proyek,
    Shift: log.shiftNama || '-',
    Tanggal: log.tanggal,
    'Jam Masuk': log.jamMasuk,
    'Jam Pulang': log.jamPulang || '-',
    'Durasi Kerja (Jam)': log.durasiJam !== undefined ? log.durasiJam.toFixed(2) : '-',
    Status: log.status,
    'Jarak GPS (Meter)': log.jarakMeter !== undefined ? log.jarakMeter : '-',
    Keterangan: log.keterangan || '-',
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Atur lebar kolom agar rapi
  worksheet['!cols'] = [
    { wch: 5 },  // No
    { wch: 14 }, // ID
    { wch: 24 }, // Nama
    { wch: 26 }, // Proyek
    { wch: 18 }, // Shift
    { wch: 13 }, // Tanggal
    { wch: 12 }, // Jam Masuk
    { wch: 12 }, // Jam Pulang
    { wch: 18 }, // Durasi
    { wch: 15 }, // Status
    { wch: 16 }, // Jarak
    { wch: 25 }, // Keterangan
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Absensi');

  const today = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `${filenamePrefix}_${today}.xlsx`);
}

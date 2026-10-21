import { Employee } from '../types';

/**
 * Buat ID Unik Karyawan:
 * - 3 huruf kapital inisial nama
 * - 6 angka tanggal lahir format DDMMYY (hari + bulan + 2 digit tahun)
 * - Dilengkapi algoritma anti-duplikasi otomatis
 */
export function generateEmployeeId(
  nama: string,
  tglLahir: string,
  existingEmployees: Employee[] = []
): string {
  const cleanNama = nama.trim().replace(/[^a-zA-Z\s]/g, '');
  if (!cleanNama || !tglLahir) {
    return '---';
  }

  const words = cleanNama.split(/\s+/).filter(Boolean);
  let inisial = '';
  if (words.length >= 3) {
    inisial = (words[0][0] + words[1][0] + words[2][0]).toUpperCase();
  } else if (words.length === 2) {
    inisial = (words[0][0] + words[1].substring(0, 2)).toUpperCase();
  } else if (words.length === 1) {
    inisial = words[0].padEnd(3, 'X').substring(0, 3).toUpperCase();
  } else {
    inisial = 'EMP';
  }

  // Parse tanggal lahir YYYY-MM-DD atau DD-MM-YYYY
  const parts = tglLahir.replace(/[/.]/g, '-').split('-');
  let dd = '01';
  let mm = '01';
  let yy = '90';

  if (parts.length === 3) {
    if (parts[0].length === 4) {
      // Format YYYY-MM-DD
      yy = parts[0].slice(-2);
      mm = parts[1].padStart(2, '0');
      dd = parts[2].padStart(2, '0');
    } else {
      // Format DD-MM-YYYY
      dd = parts[0].padStart(2, '0');
      mm = parts[1].padStart(2, '0');
      yy = parts[2].slice(-2);
    }
  }

  const dateSuffix = `${dd}${mm}${yy}`;
  const baseId = `${inisial}${dateSuffix}`;

  // Collision handling jika sudah terdaftar
  let variant = 0;
  let finalId = baseId;
  const existingIds = new Set(existingEmployees.map((e) => e.id.toUpperCase()));

  while (existingIds.has(finalId)) {
    variant++;
    const thirdCharCode = inisial.charCodeAt(2) + variant;
    const newChar = String.fromCharCode(
      thirdCharCode > 90 ? 65 + (thirdCharCode % 26) : thirdCharCode
    );
    const newInisial = inisial.substring(0, 2) + newChar;
    finalId = `${newInisial}${dateSuffix}`;
  }

  return finalId;
}

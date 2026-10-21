/**
 * Utilitas Gambar & Kompresi Dokumen AbsensiPro
 * Mendukung kompresi gambar hemat memori (JPEG standar ultra-ringan),
 * pembacaan berkas PDF, serta standarisasi format URL Google Drive.
 */

export function isPdfData(url: string | null | undefined): boolean {
  if (!url) return false;
  const clean = url.trim();
  return clean.startsWith('data:application/pdf') || clean.toLowerCase().endsWith('.pdf') || clean.includes('/pdf');
}

/**
 * Kompresi gambar ringan & hemat memori.
 * Menggunakan format JPEG standar (bukan WebP mentah) berukuran kecil (200-420px)
 * dengan kualitas sedang (0.45 - 0.55), menghasilkan ukuran berkas super ringkas (~6-18 KB).
 * Format JPEG dijamin kompatibel penuh dengan Google Drive & Google Apps Script.
 */
export function compressImageFile(
  file: File,
  maxWidth = 420,
  maxHeight = 420,
  quality = 0.5
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = (err) => reject(err);
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = (err) => reject(err);
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Hitung rasio aspek proporsional
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'medium';
        ctx.drawImage(img, 0, 0, width, height);

        // Selalu gunakan JPEG untuk kompatibilitas universal dengan Google Drive & Google Apps Script
        const jpegData = canvas.toDataURL('image/jpeg', quality);
        resolve(jpegData);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Memproses berkas yang diunggah (KTP dan KK)
 * PERMINTAAN USER: Tidak diperkecil dan format gambar asli diunggah tanpa kompresi sama sekali.
 * Membaca berkas asli (JPG, PNG, WEBP, PDF, dll) secara langsung via FileReader
 */
export async function processDocumentFile(
  file: File
): Promise<{ dataUrl: string; type: 'image' | 'pdf'; name: string; sizeKb: number }> {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  const sizeKb = Math.round(file.size / 1024);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = (err) => reject(err);
    reader.onload = (e) => {
      resolve({
        dataUrl: e.target?.result as string,
        type: isPdf ? 'pdf' : 'image',
        name: file.name,
        sizeKb: sizeKb || 1,
      });
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Ekstrak ID file Google Drive dari berbagai variasi URL
 * Mendukung format:
 * - https://drive.google.com/file/d/FILE_ID/view
 * - https://drive.google.com/open?id=FILE_ID
 * - https://drive.google.com/uc?id=FILE_ID
 * - https://drive.google.com/thumbnail?id=FILE_ID
 * - https://lh3.googleusercontent.com/d/FILE_ID
 */
export function extractDriveFileId(url: string | null | undefined): string | null {
  if (!url) return null;
  const clean = url.trim();
  if (clean.startsWith('data:')) return null;

  // Pola /file/d/FILE_ID
  const matchD = clean.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (matchD && matchD[1]) return matchD[1];

  // Pola id=FILE_ID
  const matchId = clean.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchId && matchId[1]) return matchId[1];

  // Pola googleusercontent /d/FILE_ID (Google Leus / Lens CDN)
  const matchLh = clean.match(/googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);
  if (matchLh && matchLh[1]) return matchLh[1];

  // Pola /uc?id=FILE_ID
  const matchUc = clean.match(/\/uc\?[^#]*id=([a-zA-Z0-9_-]+)/);
  if (matchUc && matchUc[1]) return matchUc[1];

  // Pola /thumbnail?id=FILE_ID
  const matchThumb = clean.match(/\/thumbnail\?[^#]*id=([a-zA-Z0-9_-]+)/);
  if (matchThumb && matchThumb[1]) return matchThumb[1];

  return null;
}

/**
 * REVISI 3 & 1: Standarisasi URL Google Drive agar selalu konsisten dan seragam!
 * Mengubah URL apa pun (termasuk googleusercontent / google leus) menjadi link Google Drive resmi:
 * https://drive.google.com/file/d/FILE_ID/view
 */
export function toStandardDriveUrl(url: string | null | undefined): string {
  if (!url) return '';
  const clean = url.trim();
  if (clean.startsWith('data:') || clean === '-' || clean === '') return clean;

  const fileId = extractDriveFileId(clean);
  if (fileId) {
    return `https://drive.google.com/file/d/${fileId}/view`;
  }
  return clean;
}

/**
 * Ubah URL Google Drive menjadi URL gambar langsung (direct CDN thumbnail)
 * untuk rendering cepat pada tag <img> di browser tanpa redirect.
 */
export function getDirectImageUrl(url: string | null | undefined): string {
  if (!url) return '';
  const clean = url.trim();
  if (clean.startsWith('data:')) return clean;

  const fileId = extractDriveFileId(clean);
  if (fileId) {
    // Thumbnail ukuran kecil untuk pratinjau super cepat & hemat kuota
    return `https://lh3.googleusercontent.com/d/${fileId}`;
  }
  return clean;
}

/**
 * Dapatkan daftar kandidat URL gambar langsung untuk fallback pratinjau
 */
export function getDriveImageCandidates(url: string | null | undefined): string[] {
  if (!url) return [];
  const clean = url.trim();
  if (clean.startsWith('data:')) return [clean];

  const fileId = extractDriveFileId(clean);
  if (!fileId) return [clean];

  return [
    `https://lh3.googleusercontent.com/d/${fileId}`,
    `https://drive.google.com/thumbnail?id=${fileId}&sz=w600`,
    `https://drive.google.com/file/d/${fileId}/view`,
    clean,
  ];
}

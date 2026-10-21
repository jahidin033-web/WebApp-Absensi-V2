import React, { useState } from 'react';
import {
  History,
  Search,
  Calendar,
  Building2,
  Clock,
  AlertCircle,
  Navigation,
  MapPin,
} from 'lucide-react';
import { AttendanceLog, Employee } from '../types';
import { cleanDateString, cleanTimeString } from '../utils/storage';
import { getDirectImageUrl } from '../utils/image';

interface WorkerLogsProps {
  logs: AttendanceLog[];
  employees: Employee[];
  onPreviewPhoto: (photoUrl: string, title?: string, subtitle?: string, date?: string, userLat?: number, userLng?: number) => void;
  isDesktopView?: boolean;
}

export const WorkerLogs: React.FC<WorkerLogsProps> = ({
  logs,
  employees,
  onPreviewPhoto,
  isDesktopView = false,
}) => {
  const [searchId, setSearchId] = useState<string>('');
  const [activeQuery, setActiveQuery] = useState<string>('');

  const handleSearch = (idToSearch?: string) => {
    const q = (idToSearch !== undefined ? idToSearch : searchId).trim().toUpperCase();
    setActiveQuery(q);
  };

  const filteredLogs = activeQuery
    ? logs.filter((l) => l.userId.toUpperCase() === activeQuery)
    : [];

  const matchedEmployee = employees.find(
    (e) => e.id.toUpperCase() === activeQuery
  );

  const totalHadir = filteredLogs.length;
  const totalJam = filteredLogs.reduce((acc, curr) => acc + (curr.durasiJam || 0), 0);
  const totalTerlambat = filteredLogs.filter((l) => l.status === 'Terlambat').length;

  return (
    <div className={`space-y-4 ${isDesktopView ? 'max-w-5xl mx-auto' : ''}`}>
      {/* Search Header */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800 transition-colors">
        <h2 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm mb-3 flex items-center gap-2">
          <History className="w-4 h-4 text-amber-500" />
          Riwayat Absensi Mandiri
        </h2>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Masukkan ID Karyawan Anda"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs font-bold tracking-wider uppercase text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none transition-all"
            />
          </div>
          <button
            onClick={() => handleSearch()}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-sm cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            Cari
          </button>
        </div>
      </div>

      {/* Profile & Summary stats if searched */}
      {activeQuery && (
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-3 transition-colors">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              {matchedEmployee?.fotoSelfie && (
                <img
                  src={getDirectImageUrl(matchedEmployee.fotoSelfie)}
                  alt={matchedEmployee.nama}
                  referrerPolicy="no-referrer"
                  onClick={() =>
                    onPreviewPhoto(
                      matchedEmployee.fotoSelfie,
                      matchedEmployee.nama,
                      `Foto Profil | ${matchedEmployee.dept}`
                    )
                  }
                  className="w-12 h-12 rounded-full object-cover border-2 border-amber-400 shadow-xs cursor-pointer hover:scale-105 transition-transform"
                  title="Klik untuk melihat foto"
                />
              )}
              <div>
                <div className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
                  <span>Profil Karyawan</span>
                  {matchedEmployee?.izinBebasLokasi && (
                    <span className="bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 text-[9px] font-bold px-1.5 py-0.2 rounded border border-sky-300 dark:border-sky-800 flex items-center gap-0.5">
                      <Navigation className="w-2.5 h-2.5 text-sky-600" />
                      <span>Bebas Lokasi</span>
                    </span>
                  )}
                </div>
                <div className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                  {matchedEmployee ? matchedEmployee.nama : activeQuery}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  ID: <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{activeQuery}</span>
                  {matchedEmployee && ` | ${matchedEmployee.dept} (${matchedEmployee.jabatan || 'Staff'})`}
                </div>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 text-[10px] font-bold rounded-xl border border-amber-200 dark:border-amber-800">
              {filteredLogs.length} Catatan
            </span>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 dark:text-slate-400 block font-medium">Total Hadir</span>
              <span className="text-base font-black text-slate-800 dark:text-white">{totalHadir} Hari</span>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 dark:text-slate-400 block font-medium">Total Jam</span>
              <span className="text-base font-black text-emerald-600 dark:text-emerald-400">{totalJam.toFixed(1)} Jam</span>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 dark:text-slate-400 block font-medium">Terlambat</span>
              <span className={`text-base font-black ${totalTerlambat > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>
                {totalTerlambat} Kali
              </span>
            </div>
          </div>
        </div>
      )}

      {/* History Log List */}
      <div className="space-y-2.5">
        {!activeQuery ? (
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl text-center border border-slate-200/80 dark:border-slate-800 text-slate-400 transition-colors">
            <History className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Masukkan ID Karyawan Anda di atas
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 max-w-sm mx-auto">
              Data absensi harian, jam masuk, jam pulang, dan pratinjau foto verifikasi akan ditampilkan secara rapi.
            </p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl text-center border border-slate-200/80 dark:border-slate-800 text-slate-400 transition-colors">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-amber-500" />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Tidak ada catatan absensi untuk ID {activeQuery}.
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              Pastikan Anda telah melakukan Absen Masuk dengan ID yang tepat.
            </p>
          </div>
        ) : (
          <div className={`${isDesktopView ? 'grid grid-cols-1 md:grid-cols-2 gap-3' : 'space-y-2.5'}`}>
            {filteredLogs.map((log) => {
              const cleanTgl = cleanDateString(log.tanggal);
              const cleanMasuk = cleanTimeString(log.jamMasuk);
              const cleanPulang = cleanTimeString(log.jamPulang);
              const isCompleted = cleanPulang && cleanPulang !== '-';

              return (
                <div
                  key={log.id}
                  className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2.5 hover:border-amber-400 dark:hover:border-amber-600 transition-all"
                >
                  {/* Header: Date & Status */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                      <Calendar className="w-3.5 h-3.5 text-amber-500" />
                      <span>{cleanTgl}</span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        log.status === 'Hadir'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                          : log.status === 'Terlambat'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                          : log.status === 'Pulang Cepat'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
                          : 'bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300'
                      }`}
                    >
                      {log.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                    <div className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>{log.proyek}</span>
                    </div>
                    {log.shiftNama && (
                      <span className="bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 text-[9px] font-bold px-1.5 py-0.2 rounded">
                        {log.shiftNama}
                      </span>
                    )}
                    {log.isBebasLokasi ? (
                      <span className="bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 text-[9px] font-bold px-1.5 py-0.2 rounded border border-sky-300 dark:border-sky-800 flex items-center gap-0.5">
                        <Navigation className="w-2.5 h-2.5 text-sky-600" />
                        <span>Bebas Lokasi</span>
                      </span>
                    ) : log.jarakMeter !== undefined ? (
                      <span className="text-[10px] text-slate-400">({log.jarakMeter}m)</span>
                    ) : null}
                    {log.userLat !== undefined && log.userLng !== undefined && (
                      <a
                        href={`https://www.google.com/maps?q=${log.userLat},${log.userLng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 hover:bg-sky-100 border border-sky-200 dark:border-sky-800 transition-colors shadow-2xs"
                        title="Buka Peta Google Maps"
                      >
                        <MapPin className="w-2.5 h-2.5 text-sky-600" />
                        <span>Titik GPS</span>
                      </a>
                    )}
                  </div>

                  {/* Clock In / Out times */}
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/70 rounded-xl grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-emerald-600" /> Jam Masuk
                      </div>
                      <div className="font-extrabold text-slate-800 dark:text-slate-100 font-mono mt-0.5">
                        {cleanMasuk} WIB
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-rose-600" /> Jam Pulang
                      </div>
                      <div className="font-extrabold text-slate-800 dark:text-slate-100 font-mono mt-0.5">
                        {isCompleted ? `${cleanPulang} WIB` : <span className="text-amber-600 dark:text-amber-400 font-sans text-xs">Masih Bekerja</span>}
                      </div>
                    </div>
                  </div>

                  {/* Duration & Notes & Photo */}
                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <div className="space-y-0.5">
                      {log.durasiJam !== undefined && log.durasiJam > 0 && (
                        <div className="font-bold text-emerald-700 dark:text-emerald-400">
                          Total Kerja: {log.durasiJam} Jam
                        </div>
                      )}
                      {log.keterangan && (
                        <div className="text-slate-500 dark:text-slate-400 text-[10px] italic">
                          {log.keterangan}
                        </div>
                      )}
                    </div>

                    {/* Selfie Thumbnails */}
                    <div className="flex items-center gap-1.5">
                      {log.fotoMasuk && (
                        <button
                          type="button"
                          onClick={() =>
                            onPreviewPhoto(
                              log.fotoMasuk!,
                              `${log.nama} (${log.userId})`,
                              `Foto Absen Masuk: ${cleanMasuk} | ${log.proyek}${log.isBebasLokasi ? ' (Bebas Lokasi)' : ''}`,
                              cleanTgl,
                              log.userLat,
                              log.userLng
                            )
                          }
                          className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-[10px] font-bold transition-all cursor-pointer shadow-2xs"
                          title="Lihat Foto Masuk"
                        >
                          <img
                            src={getDirectImageUrl(log.fotoMasuk)}
                            alt="Masuk"
                            referrerPolicy="no-referrer"
                            className="w-5 h-5 rounded-md object-cover border border-emerald-400 shrink-0"
                          />
                          <span>Masuk</span>
                        </button>
                      )}
                      {log.fotoPulang && (
                        <button
                          type="button"
                          onClick={() =>
                            onPreviewPhoto(
                              log.fotoPulang!,
                              `${log.nama} (${log.userId})`,
                              `Foto Absen Pulang: ${cleanPulang} | ${log.proyek}${log.isBebasLokasi ? ' (Bebas Lokasi)' : ''}`,
                              cleanTgl,
                              log.userLat,
                              log.userLng
                            )
                          }
                          className="flex items-center gap-1.5 px-2 py-1 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl text-[10px] font-bold transition-all cursor-pointer shadow-2xs"
                          title="Lihat Foto Pulang"
                        >
                          <img
                            src={getDirectImageUrl(log.fotoPulang)}
                            alt="Pulang"
                            referrerPolicy="no-referrer"
                            className="w-5 h-5 rounded-md object-cover border border-rose-400 shrink-0"
                          />
                          <span>Pulang</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

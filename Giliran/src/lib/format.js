const BULAN = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

/** "2026-11-24" atau ISO → "24 November 2026" */
export function formatTanggal(value) {
  if (!value) return "—";
  const iso = String(value).slice(0, 10);
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return String(value);
  return `${day} ${BULAN[month - 1]} ${year}`;
}

/** ISO → "14:05 WIB" (waktu Asia/Jakarta) */
export function formatJam(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })} WIB`;
}

export function formatWaktu(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${formatTanggal(date.toISOString())} · ${formatJam(value)}`;
}

export const STATUS_LABEL = {
  draf: "Draf",
  siap: "Siap",
  berjalan: "Berjalan",
  ditutup: "Ditutup",
};

export const RETENSI_LABEL = {
  anonim: "Anonim",
  arsip_lpj: "Arsip LPJ",
};

export function todayInput() {
  const now = new Date(Date.now() + 7 * 60 * 60 * 1000);
  return now.toISOString().slice(0, 10);
}

export function uid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
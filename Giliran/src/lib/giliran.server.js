const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

// Helper khusus server untuk GILIRAN. Tidak pernah diimpor di browser.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export async function sha256Hex(value) {
  const data = new TextEncoder().encode(String(value));
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Token acak 128 bit (32 karakter hex). Hanya hash-nya yang disimpan. */
export function randomToken() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Kode 6 karakter: huruf besar dan angka tanpa 0, O, 1, I, L. */
export function randomCode() {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length])
    .join("");
}

export function normalizeCode(value) {
  return String(value ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);
}

export function firstName(nama) {
  const clean = String(nama ?? "").trim();
  if (!clean) return "Penerima";
  return clean.split(/\s+/)[0];
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const JAKARTA_OFFSET_MIN = 7 * 60;

export function jakartaNow(date = new Date()) {
  const shifted = new Date(date.getTime() + JAKARTA_OFFSET_MIN * 60000);
  const hh = String(shifted.getUTCHours()).padStart(2, "0");
  const mm = String(shifted.getUTCMinutes()).padStart(2, "0");
  return {
    date: shifted.toISOString().slice(0, 10),
    minutes: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
    clock: `${hh}:${mm}`,
  };
}

export function parseClock(value) {
  const match = /^(\d{1,2})[:.](\d{2})$/.exec(String(value ?? "").trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function isOutsideWindow(group, now) {
  const start = parseClock(group?.gelombang_mulai);
  const end = parseClock(group?.gelombang_selesai);
  if (start === null || end === null) return false;
  return now.minutes < start || now.minutes > end;
}

/** filter/list dengan opsi mengembalikan halaman; baca .items dengan aman. */
export async function listAll(entity, query = {}, { sort = "-created_date", limit = 500, max = 2000 } = {}) {
  const out = [];
  let cursor = null;
  for (let i = 0; i < 12; i += 1) {
    const res = await entity.filter(query, { sort, limit, ...(cursor ? { cursor } : {}) });
    const items = Array.isArray(res) ? res : res?.items ?? [];
    out.push(...items);
    if (Array.isArray(res) || !res?.has_more || !res?.next_cursor) break;
    cursor = res.next_cursor;
    if (out.length >= max) break;
  }
  return out;
}

export async function requireEventOwner(base44, eventId, user) {
  const svc = base44.asServiceRole;
  let event = null;
  try {
    event = await svc.entities.Event.get(eventId);
  } catch {
    event = null;
  }
  if (!event || event.pemilik !== user.id) {
    throw Object.assign(new Error("Acara tidak ditemukan atau bukan milik Anda."), { status: 404 });
  }
  return event;
}

export async function writeAudit(svc, { eventId, pemilik, aktor, aksi, hasil, serviceTableId, detail }) {
  await svc.entities.AuditLog.create({
    event_id: eventId,
    pemilik,
    aktor: aktor || "sistem",
    aksi,
    hasil,
    waktu: new Date().toISOString(),
    service_table_id: serviceTableId || "",
    detail: detail || "",
  });
}

export async function findTableByToken(svc, token) {
  if (!token || typeof token !== "string") return null;
  const hash = await sha256Hex(token.trim());
  const rows = await listAll(svc.entities.ServiceTable, { link_token_hash: hash }, { limit: 1 });
  return rows[0] ?? null;
}

export async function deliveredCount(svc, eventId) {
  return svc.entities.Handover.count({ event_id: eventId });
}

export async function recipientWithGroup(svc, recipientId) {
  const recipient = await svc.entities.Recipient.get(recipientId).catch(() => null);
  if (!recipient) return { recipient: null, group: null };
  const group = await svc.entities.Group.get(recipient.group_id).catch(() => null);
  return { recipient, group };
}

export function groupWindowLabel(group) {
  if (!group?.gelombang_mulai || !group?.gelombang_selesai) return "Belum dijadwalkan";
  return `${group.gelombang_mulai}–${group.gelombang_selesai}`;
}
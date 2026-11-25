import { env } from "cloudflare:workers";

const BOOLEAN_FIELDS = new Set(["cadangkan_jatah", "mode_offline", "di_luar_gelombang"]);

const TABLES = new Set([
  "User",
  "Event",
  "Group",
  "Recipient",
  "Ticket",
  "ServiceTable",
  "Handover",
  "StockMovement",
  "Incident",
  "AuditLog",
]);

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS "User" ("id" TEXT PRIMARY KEY, "email" TEXT NOT NULL UNIQUE, "full_name" TEXT DEFAULT '', "password_hash" TEXT NOT NULL, "role" TEXT DEFAULT 'user', "created_date" TEXT NOT NULL, "updated_date" TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS "sessions" ("token" TEXT PRIMARY KEY, "user_id" TEXT NOT NULL, "expires_at" TEXT NOT NULL, "created_date" TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS "Event" ("id" TEXT PRIMARY KEY, "nama" TEXT NOT NULL, "tanggal" TEXT NOT NULL, "jenis_paket" TEXT DEFAULT '', "stok_awal" REAL DEFAULT 0, "terpakai" REAL DEFAULT 0, "jumlah_meja" INTEGER DEFAULT 1, "menit_per_orang" REAL DEFAULT 2, "faktor_utilisasi" REAL DEFAULT 0.8, "cadangkan_jatah" INTEGER DEFAULT 0, "mode_offline" INTEGER DEFAULT 1, "status" TEXT DEFAULT 'draf', "mode_retensi" TEXT DEFAULT 'anonim', "tanggal_akhir_retensi" TEXT DEFAULT '', "ditutup_pada" TEXT DEFAULT '', "laporan_token_hash" TEXT DEFAULT '', "pemilik" TEXT DEFAULT '', "created_date" TEXT NOT NULL, "updated_date" TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS "Group" ("id" TEXT PRIMARY KEY, "event_id" TEXT NOT NULL, "pemilik" TEXT DEFAULT '', "nama" TEXT NOT NULL, "jumlah_keluarga" INTEGER DEFAULT 0, "gelombang_urutan" INTEGER DEFAULT 1, "gelombang_mulai" TEXT DEFAULT '', "gelombang_selesai" TEXT DEFAULT '', "service_table_id" TEXT DEFAULT '', "created_date" TEXT NOT NULL, "updated_date" TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS "Recipient" ("id" TEXT PRIMARY KEY, "event_id" TEXT NOT NULL, "pemilik" TEXT DEFAULT '', "group_id" TEXT NOT NULL, "nama" TEXT NOT NULL, "jumlah_anggota" INTEGER DEFAULT 1, "hp" TEXT DEFAULT '', "created_date" TEXT NOT NULL, "updated_date" TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS "Ticket" ("id" TEXT PRIMARY KEY, "event_id" TEXT NOT NULL, "pemilik" TEXT DEFAULT '', "recipient_id" TEXT NOT NULL, "nomor_sobekan" INTEGER NOT NULL, "kode" TEXT NOT NULL, "token_hash" TEXT NOT NULL, "versi_terbit" INTEGER DEFAULT 1, "status" TEXT DEFAULT 'aktif', "klaim_penanda" TEXT DEFAULT '', "waktu_klaim" TEXT DEFAULT '', "created_date" TEXT NOT NULL, "updated_date" TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS "ServiceTable" ("id" TEXT PRIMARY KEY, "event_id" TEXT NOT NULL, "pemilik" TEXT DEFAULT '', "nama" TEXT NOT NULL, "urutan" INTEGER DEFAULT 1, "link_token_hash" TEXT DEFAULT '', "status_tautan" TEXT DEFAULT 'dicabut', "created_date" TEXT NOT NULL, "updated_date" TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS "Handover" ("id" TEXT PRIMARY KEY, "event_id" TEXT NOT NULL, "pemilik" TEXT DEFAULT '', "ticket_id" TEXT NOT NULL, "service_table_id" TEXT NOT NULL, "waktu" TEXT NOT NULL, "nama_pengambil" TEXT DEFAULT '', "di_luar_gelombang" INTEGER DEFAULT 0, "klaim_penanda" TEXT DEFAULT '', "created_date" TEXT NOT NULL, "updated_date" TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS "StockMovement" ("id" TEXT PRIMARY KEY, "event_id" TEXT NOT NULL, "pemilik" TEXT DEFAULT '', "jenis" TEXT NOT NULL, "jumlah" REAL NOT NULL, "catatan" TEXT DEFAULT '', "aktor" TEXT DEFAULT '', "waktu" TEXT NOT NULL, "created_date" TEXT NOT NULL, "updated_date" TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS "Incident" ("id" TEXT PRIMARY KEY, "event_id" TEXT NOT NULL, "pemilik" TEXT DEFAULT '', "ticket_id" TEXT DEFAULT '', "jenis" TEXT NOT NULL, "catatan" TEXT DEFAULT '', "status" TEXT DEFAULT 'terbuka', "keputusan" TEXT DEFAULT '', "diselesaikan_pada" TEXT DEFAULT '', "created_date" TEXT NOT NULL, "updated_date" TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS "AuditLog" ("id" TEXT PRIMARY KEY, "event_id" TEXT NOT NULL, "pemilik" TEXT DEFAULT '', "aktor" TEXT NOT NULL, "aksi" TEXT NOT NULL, "hasil" TEXT NOT NULL, "waktu" TEXT NOT NULL, "service_table_id" TEXT DEFAULT '', "detail" TEXT DEFAULT '', "created_date" TEXT NOT NULL, "updated_date" TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS "idx_event_pemilik" ON "Event"("pemilik")`,
  `CREATE INDEX IF NOT EXISTS "idx_group_event" ON "Group"("event_id")`,
  `CREATE INDEX IF NOT EXISTS "idx_recipient_event" ON "Recipient"("event_id")`,
  `CREATE INDEX IF NOT EXISTS "idx_ticket_event" ON "Ticket"("event_id")`,
  `CREATE INDEX IF NOT EXISTS "idx_ticket_token" ON "Ticket"("token_hash")`,
  `CREATE INDEX IF NOT EXISTS "idx_ticket_kode" ON "Ticket"("kode")`,
  `CREATE INDEX IF NOT EXISTS "idx_table_event" ON "ServiceTable"("event_id")`,
  `CREATE INDEX IF NOT EXISTS "idx_table_token" ON "ServiceTable"("link_token_hash")`,
  `CREATE INDEX IF NOT EXISTS "idx_handover_event" ON "Handover"("event_id")`,
  `CREATE INDEX IF NOT EXISTS "idx_audit_event" ON "AuditLog"("event_id")`,
];

let schemaReadyPromise = null;

async function getDb() {
  const d1 = env.DB;
  if (!d1) {
    throw new Error("Binding database D1 (DB) tidak ditemukan di wrangler.jsonc.");
  }
  if (!schemaReadyPromise) {
    schemaReadyPromise = d1
      .batch(SCHEMA_STATEMENTS.map((sql) => d1.prepare(sql)))
      .catch((err) => {
        schemaReadyPromise = null;
        throw err;
      });
  }
  await schemaReadyPromise;
  return d1;
}

function safeCol(name) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error(`Invalid column name: ${name}`);
  }
  return `"${name}"`;
}

function toSqlValue(value) {
  if (typeof value === "boolean") return value ? 1 : 0;
  if (value === undefined) return null;
  return value;
}

function normalizeRow(row) {
  if (!row) return null;
  const out = { ...row };
  for (const field of BOOLEAN_FIELDS) {
    if (field in out && out[field] !== null && out[field] !== undefined) {
      out[field] = Boolean(out[field]);
    }
  }
  return out;
}

function buildWhere(query = {}) {
  const clauses = [];
  const params = [];
  for (const [key, val] of Object.entries(query)) {
    if (val === undefined) continue;
    const col = safeCol(key);
    if (val !== null && typeof val === "object" && !Array.isArray(val)) {
      for (const [op, opVal] of Object.entries(val)) {
        if (op === "$lte") {
          clauses.push(`COALESCE(${col}, 0) <= ?`);
          params.push(toSqlValue(opVal));
        } else if (op === "$lt") {
          clauses.push(`COALESCE(${col}, 0) < ?`);
          params.push(toSqlValue(opVal));
        } else if (op === "$gte") {
          clauses.push(`COALESCE(${col}, 0) >= ?`);
          params.push(toSqlValue(opVal));
        } else if (op === "$gt") {
          clauses.push(`COALESCE(${col}, 0) > ?`);
          params.push(toSqlValue(opVal));
        } else if (op === "$ne") {
          clauses.push(`${col} != ?`);
          params.push(toSqlValue(opVal));
        } else if (op === "$in" && Array.isArray(opVal)) {
          if (opVal.length === 0) {
            clauses.push("1 = 0");
          } else {
            clauses.push(`${col} IN (${opVal.map(() => "?").join(", ")})`);
            params.push(...opVal.map(toSqlValue));
          }
        }
      }
    } else if (val === null) {
      clauses.push(`${col} IS NULL`);
    } else {
      clauses.push(`${col} = ?`);
      params.push(toSqlValue(val));
    }
  }
  return {
    sql: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
    params,
  };
}

function buildOrderBy(sort) {
  if (!sort) return "";
  const desc = String(sort).startsWith("-");
  const field = desc ? String(sort).slice(1) : String(sort);
  return `ORDER BY ${safeCol(field)} ${desc ? "DESC" : "ASC"}`;
}

function createEntityRepo(tableName) {
  if (!TABLES.has(tableName)) throw new Error(`Unknown entity: ${tableName}`);
  const table = `"${tableName}"`;

  return {
    async get(id) {
      const d1 = await getDb();
      const row = await d1.prepare(`SELECT * FROM ${table} WHERE "id" = ?`).bind(id).first();
      return normalizeRow(row);
    },

    async filter(query = {}, options = {}) {
      const d1 = await getDb();
      const { sql: whereSql, params } = buildWhere(query);
      const orderSql = buildOrderBy(options.sort);
      const limit = Math.min(Number(options.limit) || 500, 2000);
      const offset = Number(options.cursor) || 0;
      const stmt = d1.prepare(`SELECT * FROM ${table} ${whereSql} ${orderSql} LIMIT ? OFFSET ?`);
      const res = await stmt.bind(...params, limit, offset).all();
      return (res.results ?? []).map(normalizeRow);
    },

    async count(query = {}) {
      const d1 = await getDb();
      const { sql: whereSql, params } = buildWhere(query);
      const row = await d1.prepare(`SELECT COUNT(*) AS cnt FROM ${table} ${whereSql}`).bind(...params).first();
      return Number(row?.cnt ?? 0);
    },

    async create(data) {
      const d1 = await getDb();
      const now = new Date().toISOString();
      const record = {
        id: data.id || crypto.randomUUID(),
        ...data,
        created_date: data.created_date || now,
        updated_date: data.updated_date || now,
      };
      const keys = Object.keys(record);
      const cols = keys.map(safeCol).join(", ");
      const placeholders = keys.map(() => "?").join(", ");
      const vals = keys.map((k) => toSqlValue(record[k]));
      await d1.prepare(`INSERT INTO ${table} (${cols}) VALUES (${placeholders})`).bind(...vals).run();
      return normalizeRow(record);
    },

    async bulkCreate(items) {
      if (!items?.length) return [];
      const d1 = await getDb();
      const now = new Date().toISOString();
      const records = items.map((data) => ({
        id: data.id || crypto.randomUUID(),
        ...data,
        created_date: data.created_date || now,
        updated_date: data.updated_date || now,
      }));
      const stmts = records.map((record) => {
        const keys = Object.keys(record);
        const cols = keys.map(safeCol).join(", ");
        const placeholders = keys.map(() => "?").join(", ");
        const vals = keys.map((k) => toSqlValue(record[k]));
        return d1.prepare(`INSERT INTO ${table} (${cols}) VALUES (${placeholders})`).bind(...vals);
      });
      await d1.batch(stmts);
      return records.map(normalizeRow);
    },

    async update(id, patch) {
      const d1 = await getDb();
      const now = new Date().toISOString();
      const data = { ...patch, updated_date: now };
      delete data.id;
      const keys = Object.keys(data);
      if (!keys.length) return this.get(id);
      const sets = keys.map((k) => `${safeCol(k)} = ?`).join(", ");
      const vals = keys.map((k) => toSqlValue(data[k]));
      await d1.prepare(`UPDATE ${table} SET ${sets} WHERE "id" = ?`).bind(...vals, id).run();
      return this.get(id);
    },

    async bulkUpdate(changes) {
      if (!changes?.length) return [];
      const d1 = await getDb();
      const now = new Date().toISOString();
      const stmts = [];
      for (const item of changes) {
        const { id, ...rest } = item;
        if (!id) continue;
        const data = { ...rest, updated_date: now };
        const keys = Object.keys(data);
        if (!keys.length) continue;
        const sets = keys.map((k) => `${safeCol(k)} = ?`).join(", ");
        const vals = keys.map((k) => toSqlValue(data[k]));
        stmts.push(d1.prepare(`UPDATE ${table} SET ${sets} WHERE "id" = ?`).bind(...vals, id));
      }
      if (stmts.length) await d1.batch(stmts);
      return { updated: stmts.length };
    },

    async updateMany(query = {}, updateSpec = {}) {
      const d1 = await getDb();
      const now = new Date().toISOString();
      const setClauses = [`"updated_date" = ?`];
      const setParams = [now];

      const setObj = updateSpec.$set ?? (updateSpec.$inc ? {} : updateSpec);
      const incObj = updateSpec.$inc ?? {};

      for (const [k, v] of Object.entries(setObj)) {
        if (k === "id" || k.startsWith("$")) continue;
        setClauses.push(`${safeCol(k)} = ?`);
        setParams.push(toSqlValue(v));
      }
      for (const [k, v] of Object.entries(incObj)) {
        const col = safeCol(k);
        setClauses.push(`${col} = COALESCE(${col}, 0) + ?`);
        setParams.push(Number(v));
      }

      const { sql: whereSql, params: whereParams } = buildWhere(query);
      const res = await d1
        .prepare(`UPDATE ${table} SET ${setClauses.join(", ")} ${whereSql}`)
        .bind(...setParams, ...whereParams)
        .run();
      return { updated: Number(res.meta?.changes ?? 0) };
    },

    async delete(id) {
      const d1 = await getDb();
      await d1.prepare(`DELETE FROM ${table} WHERE "id" = ?`).bind(id).run();
      return { deleted: true };
    },
  };
}

const entities = Object.fromEntries([...TABLES].map((name) => [name, createEntityRepo(name)]));

function bytesToHex(bytes) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

async function hashPassword(password) {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    key,
    256,
  );
  return `${bytesToHex(salt)}:${bytesToHex(new Uint8Array(bits))}`;
}

async function verifyPassword(password, stored) {
  const [saltHex, hashHex] = String(stored ?? "").split(":");
  if (!saltHex || !hashHex) return false;
  const salt = hexToBytes(saltHex);
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    key,
    256,
  );
  return bytesToHex(new Uint8Array(bits)) === hashHex;
}

function randomTokenHex() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

function extractBearer(request) {
  const authHeader = request?.headers?.get?.("Authorization") || request?.headers?.get?.("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return null;
  return authHeader.slice(7).trim() || null;
}

async function createSession(userId) {
  const d1 = await getDb();
  const token = randomTokenHex();
  const now = new Date();
  const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await d1
    .prepare(`INSERT INTO "sessions" ("token", "user_id", "expires_at", "created_date") VALUES (?, ?, ?, ?)`)
    .bind(token, userId, expires, now.toISOString())
    .run();
  return token;
}

export async function loginLocalUser(email, password) {
  const d1 = await getDb();
  const cleanEmail = String(email ?? "").trim().toLowerCase();
  const user = await d1.prepare(`SELECT * FROM "User" WHERE lower("email") = ?`).bind(cleanEmail).first();
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    throw Object.assign(new Error("Email atau kata sandi salah."), { status: 401 });
  }
  const token = await createSession(user.id);
  return {
    access_token: token,
    user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role },
  };
}

export async function registerLocalUser({ email, password, full_name = "" }) {
  const d1 = await getDb();
  const cleanEmail = String(email ?? "").trim().toLowerCase();
  if (!cleanEmail || !password || password.length < 6) {
    throw Object.assign(new Error("Email harus valid dan kata sandi minimal 6 karakter."), { status: 400 });
  }
  const existing = await d1.prepare(`SELECT "id" FROM "User" WHERE lower("email") = ?`).bind(cleanEmail).first();
  if (existing) {
    throw Object.assign(new Error("Email sudah terdaftar."), { status: 400 });
  }
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const passwordHash = await hashPassword(password);
  const name = full_name.trim() || cleanEmail.split("@")[0];
  await d1
    .prepare(
      `INSERT INTO "User" ("id", "email", "full_name", "password_hash", "role", "created_date", "updated_date") VALUES (?, ?, ?, ?, 'user', ?, ?)`,
    )
    .bind(id, cleanEmail, name, passwordHash, now, now)
    .run();
  const token = await createSession(id);
  return {
    access_token: token,
    user: { id, email: cleanEmail, full_name: name, role: "user" },
  };
}

export async function logoutLocalSession(token) {
  if (!token) return;
  const d1 = await getDb();
  await d1.prepare(`DELETE FROM "sessions" WHERE "token" = ?`).bind(token).run();
}

export function createLocalBase44(request) {
  const auth = {
    async me() {
      const token = extractBearer(request);
      if (!token) {
        throw Object.assign(new Error("Unauthorized"), { status: 401 });
      }
      const d1 = await getDb();
      const row = await d1
        .prepare(
          `SELECT u."id", u."email", u."full_name", u."role", s."expires_at"
           FROM "sessions" s
           JOIN "User" u ON u."id" = s."user_id"
           WHERE s."token" = ?`,
        )
        .bind(token)
        .first();
      if (!row || new Date(row.expires_at).getTime() < Date.now()) {
        throw Object.assign(new Error("Unauthorized"), { status: 401 });
      }
      return { id: row.id, email: row.email, full_name: row.full_name, role: row.role };
    },
  };

  return {
    auth,
    entities,
    asServiceRole: { entities },
  };
}

-- Skema database lokal (Cloudflare D1 / SQLite) untuk aplikasi GILIRAN

CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT NOT NULL UNIQUE,
  "full_name" TEXT DEFAULT '',
  "password_hash" TEXT NOT NULL,
  "role" TEXT DEFAULT 'user',
  "created_date" TEXT NOT NULL,
  "updated_date" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "sessions" (
  "token" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "expires_at" TEXT NOT NULL,
  "created_date" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "Event" (
  "id" TEXT PRIMARY KEY,
  "nama" TEXT NOT NULL,
  "tanggal" TEXT NOT NULL,
  "jenis_paket" TEXT DEFAULT '',
  "stok_awal" REAL DEFAULT 0,
  "terpakai" REAL DEFAULT 0,
  "jumlah_meja" INTEGER DEFAULT 1,
  "menit_per_orang" REAL DEFAULT 2,
  "faktor_utilisasi" REAL DEFAULT 0.8,
  "cadangkan_jatah" INTEGER DEFAULT 0,
  "mode_offline" INTEGER DEFAULT 1,
  "status" TEXT DEFAULT 'draf',
  "mode_retensi" TEXT DEFAULT 'anonim',
  "tanggal_akhir_retensi" TEXT DEFAULT '',
  "ditutup_pada" TEXT DEFAULT '',
  "laporan_token_hash" TEXT DEFAULT '',
  "pemilik" TEXT DEFAULT '',
  "created_date" TEXT NOT NULL,
  "updated_date" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "Group" (
  "id" TEXT PRIMARY KEY,
  "event_id" TEXT NOT NULL,
  "pemilik" TEXT DEFAULT '',
  "nama" TEXT NOT NULL,
  "jumlah_keluarga" INTEGER DEFAULT 0,
  "gelombang_urutan" INTEGER DEFAULT 1,
  "gelombang_mulai" TEXT DEFAULT '',
  "gelombang_selesai" TEXT DEFAULT '',
  "service_table_id" TEXT DEFAULT '',
  "created_date" TEXT NOT NULL,
  "updated_date" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "Recipient" (
  "id" TEXT PRIMARY KEY,
  "event_id" TEXT NOT NULL,
  "pemilik" TEXT DEFAULT '',
  "group_id" TEXT NOT NULL,
  "nama" TEXT NOT NULL,
  "jumlah_anggota" INTEGER DEFAULT 1,
  "hp" TEXT DEFAULT '',
  "created_date" TEXT NOT NULL,
  "updated_date" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "Ticket" (
  "id" TEXT PRIMARY KEY,
  "event_id" TEXT NOT NULL,
  "pemilik" TEXT DEFAULT '',
  "recipient_id" TEXT NOT NULL,
  "nomor_sobekan" INTEGER NOT NULL,
  "kode" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "versi_terbit" INTEGER DEFAULT 1,
  "status" TEXT DEFAULT 'aktif',
  "klaim_penanda" TEXT DEFAULT '',
  "waktu_klaim" TEXT DEFAULT '',
  "created_date" TEXT NOT NULL,
  "updated_date" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "ServiceTable" (
  "id" TEXT PRIMARY KEY,
  "event_id" TEXT NOT NULL,
  "pemilik" TEXT DEFAULT '',
  "nama" TEXT NOT NULL,
  "urutan" INTEGER DEFAULT 1,
  "link_token_hash" TEXT DEFAULT '',
  "status_tautan" TEXT DEFAULT 'dicabut',
  "created_date" TEXT NOT NULL,
  "updated_date" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "Handover" (
  "id" TEXT PRIMARY KEY,
  "event_id" TEXT NOT NULL,
  "pemilik" TEXT DEFAULT '',
  "ticket_id" TEXT NOT NULL,
  "service_table_id" TEXT NOT NULL,
  "waktu" TEXT NOT NULL,
  "nama_pengambil" TEXT DEFAULT '',
  "di_luar_gelombang" INTEGER DEFAULT 0,
  "klaim_penanda" TEXT DEFAULT '',
  "created_date" TEXT NOT NULL,
  "updated_date" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "StockMovement" (
  "id" TEXT PRIMARY KEY,
  "event_id" TEXT NOT NULL,
  "pemilik" TEXT DEFAULT '',
  "jenis" TEXT NOT NULL,
  "jumlah" REAL NOT NULL,
  "catatan" TEXT DEFAULT '',
  "aktor" TEXT DEFAULT '',
  "waktu" TEXT NOT NULL,
  "created_date" TEXT NOT NULL,
  "updated_date" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "Incident" (
  "id" TEXT PRIMARY KEY,
  "event_id" TEXT NOT NULL,
  "pemilik" TEXT DEFAULT '',
  "ticket_id" TEXT DEFAULT '',
  "jenis" TEXT NOT NULL,
  "catatan" TEXT DEFAULT '',
  "status" TEXT DEFAULT 'terbuka',
  "keputusan" TEXT DEFAULT '',
  "diselesaikan_pada" TEXT DEFAULT '',
  "created_date" TEXT NOT NULL,
  "updated_date" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "AuditLog" (
  "id" TEXT PRIMARY KEY,
  "event_id" TEXT NOT NULL,
  "pemilik" TEXT DEFAULT '',
  "aktor" TEXT NOT NULL,
  "aksi" TEXT NOT NULL,
  "hasil" TEXT NOT NULL,
  "waktu" TEXT NOT NULL,
  "service_table_id" TEXT DEFAULT '',
  "detail" TEXT DEFAULT '',
  "created_date" TEXT NOT NULL,
  "updated_date" TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_event_pemilik" ON "Event"("pemilik");
CREATE INDEX IF NOT EXISTS "idx_group_event" ON "Group"("event_id");
CREATE INDEX IF NOT EXISTS "idx_recipient_event" ON "Recipient"("event_id");
CREATE INDEX IF NOT EXISTS "idx_ticket_event" ON "Ticket"("event_id");
CREATE INDEX IF NOT EXISTS "idx_ticket_token" ON "Ticket"("token_hash");
CREATE INDEX IF NOT EXISTS "idx_ticket_kode" ON "Ticket"("kode");
CREATE INDEX IF NOT EXISTS "idx_table_event" ON "ServiceTable"("event_id");
CREATE INDEX IF NOT EXISTS "idx_table_token" ON "ServiceTable"("link_token_hash");
CREATE INDEX IF NOT EXISTS "idx_handover_event" ON "Handover"("event_id");
CREATE INDEX IF NOT EXISTS "idx_audit_event" ON "AuditLog"("event_id");

# GILIRAN

Aplikasi manajemen distribusi dan antrean paket bantuan berbasis **TanStack Start**, **React 19**, dan **Cloudflare Workers + D1 (SQLite lokal)**.

---

## Prasyarat

- **Node.js** (disarankan v20+ / v22+)
- **npm** (bawaan Node.js)

---

## Cara Menjalankan Proyek (Lokal)

1. **Masuk ke direktori proyek**

   ```bash
   cd Giliran
   ```

2. **Install dependensi**

   Gunakan flag `--legacy-peer-deps` karena ada perbedaan versi peer dependency pada paket `@tanstack/ai`:

   ```bash
   npm install --legacy-peer-deps
   ```

3. **Jalankan server development**

   ```bash
   npm run dev
   ```

4. **Buka di browser**

   Buka alamat yang muncul di terminal, secara default:

   ```text
   http://localhost:5173
   ```

---

## Database & Akun

- Proyek ini sudah menggunakan **Cloudflare D1 (SQLite lokal)** yang otomatis berjalan bersama `npm run dev` (dikonfigurasi di `wrangler.jsonc` dengan skema di `schema.sql`).
- Tabel database akan **otomatis dibuat** saat request pertama masuk — tidak perlu setup database eksternal atau akun Base44.
- Untuk mulai menggunakan fitur admin/panitia, klik **Masuk / Daftar** di aplikasi (atau buka `/register`) untuk membuat akun baru dengan email dan kata sandi.
- Data tersimpan secara persisten di folder `.wrangler/state/` di dalam `Giliran`.

---

## Perintah Lainnya

```bash
npm run lint     # Cek error linting dengan ESLint
npm run build    # Build produksi (client + SSR worker di dist/)
npm run preview  # Preview hasil build produksi
```

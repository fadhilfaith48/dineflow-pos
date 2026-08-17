# WORKFLOW.md - Alur Kerja Pengembangan DineFlow POS

Panduan cara kerja standar di proyek ini. Ringkasan operasional dari `AGENTS.md`, `PROGRESS.md`, dan `todo.md`.

---

## 1. Baca Dokumen Wajib di Awal Sesi

Sebelum coding, baca dokumen berikut:

> Dokumen level proyek kini berada di folder `docs/` (root). AI coding assistant
> membaca `AGENTS.md` (di root) secara otomatis di awal sesi.

| Dokumen | Isi |
|---|---|
| `AGENTS.md` (root) | Aturan proyek, tech stack, prinsip kerja |
| `frontend/PROGRESS.md` | Status & peta file, log keputusan |
| `prd.md` | Kebutuhan fitur lengkap (versi markdown dari dokumen Word asli) |
| `architecture.md` | Arsitektur sistem: komponen, alur data, peta endpoint, status migrasi |
| `DESIGN.md` | Warna/token, tipografi, komponen visual |
| `todo.md` | Daftar tugas yang harus dikerjakan |
| `skill.md` | Kompetensi yang dibutuhkan |
| `uji manual.md` | Panduan verifikasi manual |
| `workflow.md` | File ini |

> PRD tersedia dua versi: `prd.md` (markdown, ringkas & mudah dibaca) dan file Word
> asli `_ PRODUCT REQUIREMENTS DOCUMENT (PRD).md` (sumber resmi). Jika perlu teks
> dari Word: ekstrak `word/document.xml`-nya (lihat catatan di `PROGRESS.md`).

---

## 2. Prinsip Kerja

- **Bertahap, satu fitur per batch** — jangan generate semua fitur sekaligus dalam satu prompt.
- **Jelaskan setiap langkah** yang dikerjakan, jangan hanya kode.
- **Fase dulu**: kerjakan fase A (frontend murni) sebelum fase B (butuh backend) sesuai urutan di `todo.md`.
- **Race condition (stok/order bersamaan)**: gunakan database transaction + `lockForUpdate()` di backend Laravel — BUKAN Golang/Kafka.
- **Real-time**: gunakan Laravel Reverb + Redis + `laravel-echo` — BUKAN websocket/Node terpisah.

---

## 3. Aturan Wajib (Konvensi Kode)

1. **Semua data lewat service layer** (`api.*` dari `frontend/src/services/api.ts`). Komponen UI TIDAK boleh memanggil mock/fetch langsung. Ini supaya mudah ditukar ke Laravel.
2. **Warna wajib dari token DESIGN.md** (`frontend/src/index.css`). Jangan tambah hex baru di luar tabel token. Aksen biru `#2563EB` hanya untuk aksi utama.
3. **Angka/harga/kode order** pakai font monospace (`font-num`).
4. **Layout mockup Stitch** (folder `resto-pos-frontendstitch-export-*`) hanya panduan LAYOUT; warna/komponen mengikuti DESIGN.md.
5. **Jangan menambah komentar** di kode kecuali diminta.
6. Gunakan tipe data dari `frontend/src/types/index.ts` (kontrak PRD).

---

## 4. Siklus Kerja Satu Fitur

```
1. Pilih item dari todo.md (prioritas P1 dulu)
2. Pahami alur terkait di PRD (bagian "Fitur Utama" & "Alur Pengguna")
3. Kerjakan di kode (ikuti konvensi di atas)
4. Verifikasi WAJIB:
   cd frontend
   npm run build     # tsc + vite build
   npm run lint      # oxlint
   npm test          # vitest (tes service layer & guard)
   # ketiganya harus lolos tanpa error baru
5. Uji manual di browser (lihat uji manual.md)
6. Update dokumen:
   - Centang item di todo.md
   - Sinkronkan checklist & peta file di frontend/PROGRESS.md
   - Tambah log keputusan bila ada keputusan baru
```

---

## 5. Alur Kontribusi (Multi-AI / Kolaborasi)

- Ambil tugas dari `todo.md`; jangan bentrok dengan tugas orang lain.
- Jika menyentuh service layer (`api.ts` / `mockApi.ts`), kabari anggota lain (kontrak berubah).
- Perubahan besar (struktur, backend) diskusikan dulu sebelum eksekusi.
- Jangan commit ke git kecuali diminta pengguna.

---

## 6. Migrasi Mock → Laravel & Gabung ke Folder Utama

Urutan besar proyek:
1. Selesaikan fase A (frontend murni): todo.md A1–A5. ✅ SELESAI.
2. Bangun backend Laravel di folder `backend/` — implementasikan kontrak
   `frontend/src/services/api.ts`.
3. Sambungkan: ganti `mockApi.ts` → `httpApi.ts` (fetch). UI tidak berubah.
4. Gabung ke folder utama `resto-pos/` → `frontend/` + `backend/` + `docs/` sekaligus.

Pemetaan endpoint (`api.*` → Laravel):
- `login()`              → POST /api/login (Sanctum)
- `getCategories()`      → GET /api/categories
- `getMenuItems()`       → GET /api/menu-items
- `getTables()` / create/update/deleteTable → CRUD /api/tables
- `getOrders()`          → GET /api/orders
- `createOrder()`        → POST /api/orders (transaction + lockForUpdate)
- `updateItemStatus()`   → PATCH /api/orders/{id}/items/{itemId} (+ broadcast)
- `processPayment()`     → POST /api/orders/{id}/payments (transaction)
- CRUD menu-item         → CRUD /api/menu-items
- CRUD user              → CRUD /api/users (admin)
- `getSalesSummary()`    → GET /api/sales-summary?period=

Cara kerja:
- Env frontend: `VITE_API_URL`; dev pakai proxy `/api` di `vite.config` → Laravel.
- Real-time: Reverb + Redis + `laravel-echo`; ganti polling 5s (KDS & tracking QR) — NFR ≤ 2 detik.
- Race condition: DB transaction + `lockForUpdate()` (BUKAN Golang/Kafka).
- Seeder DB meniru `mockData.ts` agar tampilan sama.
- Auth: Sanctum, role dari server, ganti `AuthContext` + `mockApi.login`.

Peta endpoint lengkap & struktur backend: `architecture.md` bagian 4.

Jika bingung alur ini: tanya di sesi mana pun — AI membaca `workflow.md` ini.

---

## 7. Penutup Sesi (wajib di akhir tiap sesi kerja)

Checklist penutupan sesi. Jalankan berurutan, lalu komit + push hanya bila diminta pengguna.

- [ ] **Verifikasi build/lint/test** di `frontend/`:
      `npm run build` (tsc) → `npm run lint` (oxlint) → `npm test` (vitest, 18 tes).
- [ ] **Verifikasi tes backend** di `backend/`: `php artisan test` (3 tes).
- [ ] **Uji manual** sesuai `uji manual.md` untuk fitur yang dikerjakan sesi ini.
- [ ] **Reset DB ke data demo**: `php artisan migrate:fresh --seed` di `backend/`
      (data presentasi: 4 user, 19 menu, 8 meja, 3 order).
- [ ] **Update dokumen**: centang item di `docs/todo.md`, sinkronkan
      `frontend/PROGRESS.md` (checklist, peta file, log keputusan), dan tambah
      entri sesi di `docs/jurnal-pkl.md` bila perlu.
- [ ] **Cek `git status`** — pastikan tidak ada file rahasia/berat tertinggal
      (`.env`, `vendor/`, `node_modules/`, `dist/`, `database.sqlite`).
- [ ] **Commit + push** — TANYA pesan commit ke pengguna dulu, jangan commit otomatis.

---

## 8. Gabung ke Folder Utama & Upload ke GitHub

Urutan memindahkan frontend + backend ke satu folder utama lalu meng-upload ke GitHub
(untuk presentasi/penyimpanan). Repo bersifat **private**.

```
D:/laragon/www/resto_pos/          ← folder utama
├── frontend/                      ← React (src/, package.json, PROGRESS.md)
├── backend/                       ← Laravel (app/, routes/, composer.json, .env*)
├── docs/                          ← semua dokumen level proyek (file ini, prd.md, dll)
└── AGENTS.md                      ← aturan AI (WAJIB di root agar otomatis terbaca)
```

### 8.1 Persiapan file (sebelum git)

1. **Jangan upload file rahasia/berat** — pastikan `backend/.gitignore` berisi:
   - `.env` (APP_KEY, kredensial DB) → sudah ada.
   - `/vendor` (84MB) → sudah ada.
   - `database/database.sqlite` (DB dev) → **tambahkan** jika belum.
2. **frontend/.gitignore** → pastikan berisi `node_modules` (148MB) & `dist` → sudah ada.
3. **Update referensi path** di `AGENTS.md` & `docs/*.md` agar menunjuk ke `docs/...`
   (karena dokumen sudah pindah dari root ke `docs/`).

### 8.2 Init & commit

```
cd D:/laragon/www/resto_pos
git init
git add -A
git commit -m "DineFlow POS: frontend (Fase A) + backend Laravel scaffold + docs"
```

### 8.3 Verifikasi (WAJIB sebelum push)

- [ ] `git status` bersih (tidak ada file tertinggal).
- [ ] Cek daftar file ter-commit dengan `git ls-files`:
      `.env`, `vendor/`, `node_modules/`, `dist/`, `database.sqlite` **TIDAK muncul**.
      Jika muncul → tambahkan ke `.gitignore`, lalu `git rm --cached <file>` & commit ulang.

### 8.4 Buat repo di GitHub (manual)

1. Buka github.com → **New repository**.
2. Nama mis. `resto-pos`, **Private**, **JANGAN centang** "Add a README / .gitignore / license".
3. Salin URL remote (HTTPS `https://github.com/<user>/resto-pos.git` atau SSH).

### 8.5 Remote & push

```
git remote add origin <URL_remote>
git push -u origin main        # sesuaikan nama branch hasil git init (main/master)
```

### 8.6 Catatan

- Repo private → aman dari publik; tetap pastikan `.env` tidak ter-commit.
- Folder lama (`resto-pos-frontend/`, `resto-pos-backend/`) dibiarkan sebagai cadangan
  sampai `resto_pos/` terverifikasi; hapus hanya jika sudah yakin.
- Setelah repo aktif, kerja lanjut dilakukan di `resto_pos/` (buka opencode di folder
  ini, bukan di dalam `backend/`).
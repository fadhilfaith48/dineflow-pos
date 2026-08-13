# TODO.md - DineFlow POS (Roadmap Pekerjaan)

Daftar tugas proyek DineFlow POS. **Sumber kebenaran pekerjaan** selain `PROGRESS.md`. Centang (`- [x]`) setiap item setelah selesai & terverifikasi (build + lint), lalu sinkronkan dengan `PROGRESS.md`.

---

## Ringkasan Status

- ✅ **Fase A (frontend murni) SELESAI**: Kasir (pesanan masuk + konfirmasi + bayar nota meja), Pelayan, KDS (urut waktu), Menu QR, Admin (menu/meja/staf/laporan + filter periode), Auth mock (4 role), QR per meja, struk, navbar di semua halaman role, status meja otomatis, tes otomatis Vitest (18 tes).
- ⬜ **Fase B (butuh backend Laravel)**: API asli, real-time Reverb, auth Sanctum.
- ⬜ **Upload ke GitHub** (private): gabung folder utama `resto_pos/`, bersihkan `.gitignore`, init+commit+push (langkah detail: `workflow.md` §8).

---

## Fase A - Frontend Murni (bisa dikerjakan sekarang)

### A1. Alur Kasir: pesanan masuk & konfirmasi (Prioritas: P1)
- [x] Halaman/panel "Pesanan Masuk" di Kasir: daftar order baru dari Pelayan & Self-order (status `menunggu-konfirmasi`).
- [x] Aksi **Konfirmasi** dari Kasir → pesanan diteruskan ke dapur (status jadi `diproses`, tampil di KDS sebagai aktif).
- [x] Indikator jumlah pesanan masuk yang belum dikonfirmasi (badge di header panel).

### A2. Kasir: buka nota meja untuk pembayaran (Prioritas: P1)
- [x] Kasir bisa memilih meja → melihat pesanan (order) yang sedang aktif di meja itu (tab "Nota" di panel queue Kasir).
- [x] Proses pembayaran pesanan yang SUDAH ADA (bukan hanya dari keranjang sendiri): pilih metode tunai/QRIS → struk.
- [x] Setelah bayar: status pesanan `selesai` dan meja otomatis jadi `perlu dibersihkan`.

### A3. Status meja otomatis di mock (Prioritas: P2)
- [x] `createOrder` dengan `tableId` (dine-in) → meja jadi `terisi`.
- [x] `processPayment` order dine-in → meja jadi `perlu dibersihkan` (dikerjakan bersama A2).
- [x] Admin tetap bisa mengubah status meja manual (dropdown di Manajemen Meja, sudah ada sebelumnya).

### A4. KDS urut berdasarkan waktu masuk (Prioritas: P2)
- [x] `KitchenPage`: urutkan `activeOrders` berdasarkan `createdAt` (tertua dulu = antrian).

### A5. Tes otomatis (Prioritas: P3)
- [x] Setup Vitest + React Testing Library.
- [x] Contoh test service layer (`mockApi`: login, createOrder, getSalesSummary per periode).
- [x] Contoh test komponen/guard (login → redirect sesuai role, ProtectedRoute).

---

## Fase B - Tergantung Backend Laravel

### B0. Setup infrastruktur backend (Prioritas: P1)
- [x] Aktifkan MySQL 8.4 & Redis 5.0 di Laragon (`D:/laragon`); MySQL via GUI Start All, Redis via `redis-server` (Windows tanpa daemonize → `Start-Process`).
- [x] Buat database `dineflow_pos` (utf8mb4_unicode_ci).
- [x] Ubah `.env` backend: MySQL (`dineflow_pos`, root tanpa password), `REDIS_CLIENT=predis` (DLL phpredis tidak tersedia di PHP Laragon 8.3), `QUEUE/CACHE/SESSION=redis`, `BROADCAST_CONNECTION=reverb` + key Reverb.
- [x] Install `laravel/sanctum`, `laravel/reverb`, `predis/predis` (composer via PHP 8.3 Laragon, bukan XAMPP 8.2).
- [x] Publish config Sanctum & Reverb (`config/sanctum.php`, `config/reverb.php`); migrate dasar + `personal_access_tokens` sukses.
- [x] Verifikasi: Redis `cache()->put/get` OK; `migrate:status` semua Ran; `artisan list` ada `reverb:*`.

### B1. Implementasi API Laravel (Prioritas: P1)
- [x] Data layer: migrasi + model + seeder (meniru `mockData.ts`) — B1a.
- [ ] Implement `Api` interface di `frontend/src/services/api.ts` → ganti `mockApi.ts` dengan fetch/axios (base URL di `.env`).
- [ ] Setup CORS backend Laravel.
- [ ] Sinkronkan payload/response agar sama dengan tipe data `frontend/src/types/index.ts`.
- [ ] UI tidak boleh berubah (service layer menukar implementasi di balik layar).

### B2. Real-time Reverb + Redis (Prioritas: P1)
- [ ] Ganti polling 5s di `KitchenPage` dengan `laravel-echo` subscribe channel pesanan.
- [ ] Ganti polling tracking di `MenuPage` (status pesanan pelanggan) dengan Echo.
- [ ] NFR: pembaruan status ke semua channel ≤ 2 detik.

### B3. Auth nyata (Sanctum) (Prioritas: P1)
- [ ] Ganti mock login (`AuthContext` + `mockApi.login`) dengan endpoint auth Laravel (Sanctum).
- [ ] Role dari server (bukan dari localStorage/demo).

### B4. Foto menu upload (Prioritas: P2)
- [ ] Ganti input URL gambar dengan upload file ke server.
- [ ] Simpan URL dari server & tampilkan di menu pelanggan.

### B5. Race condition stok/order (Prioritas: P2)
- [ ] Di backend: database transaction + `lockForUpdate()` untuk order & stok bersamaan (aturan AGENTS.md, BUKAN Golang/Kafka).

---

## Fase C - Repo & Deployment

### C1. Upload repo ke GitHub (Prioritas: P2)
- [x] Gabung frontend + backend ke folder utama `resto_pos/` (frontend/ + backend/ + docs/ + AGENTS.md).
- [x] Bersihkan `.gitignore` backend: pastikan `.env`, `/vendor`, `database/database.sqlite` tidak ikut.
- [x] Update referensi path di `AGENTS.md` & `docs/*.md` (dokumen sudah pindah ke `docs/`).
- [x] `git init` → `git add -A` → `git commit`.
- [x] Verifikasi `git ls-files`: `.env`, `vendor/`, `node_modules/`, `dist/`, `database.sqlite` TIDAK muncul.
- [x] Buat repo **public** di github.com (manual, tanpa README) → `https://github.com/fadhilfaith48/dineflow-pos.git`.
- [x] `git remote add origin <URL>` → `git push -u origin main`.

> Langkah detail: `workflow.md` §8.

---

## Catatan Konvensi

- Kerjakan **satu item per batch**, jelaskan tiap langkah.
- Verifikasi wajib tiap selesai: `npm run build` (tsc) lalu `npm run lint` (oxlint) di `frontend/`.
- Semua data lewat service layer (`api.*`), warna dari token `DESIGN.md`, angka pakai `font-num`.
- Update `todo.md` dan `PROGRESS.md` setelah satu item selesai.
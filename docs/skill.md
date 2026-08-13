# SKILL.md - Keterampilan yang Dibutuhkan untuk DineFlow POS

Daftar kompetensi yang diperlukan untuk mengerjakan proyek ini, beserta **kenapa penting** dan **di mana dipakai**. Pakai sebagai panduan belajar/checklist skill. Referensi teknis: `architecture.md` (peta komponen & endpoint).

---

## 1. Frontend (Saat Ini)

### React + TypeScript
- **Kenapa**: Semua antarmuka (Kasir, Pelayan, KDS, Menu QR, Admin) dibangun dengan React + TypeScript.
- **Dipakai di**: `frontend/src/**` — komponen `pages/`, `components/`, `hooks/`.

### Vite (Build tool)
- **Kenapa**: Dev server & build produksi (tsc + bundling).
- **Dipakai di**: `frontend/vite.config.ts` (alias `@` → `src`), script `npm run dev` / `build`.

### Tailwind CSS v4 (token `@theme`)
- **Kenapa**: Semua styling lewat utility class. Warna WAJIB dari token DESIGN.md yang didefinisikan di `index.css` (jangan tambah hex baru).
- **Dipakai di**: `frontend/src/index.css` (token `--color-*`, `font-num`), semua komponen.

### React Router v7 + Guard Role
- **Kenapa**: Routing 1 SPA + proteksi halaman berdasarkan role (kasir/pelayan/dapur/admin).
- **Dipakai di**: `frontend/src/App.tsx`, `components/ProtectedRoute.tsx`, `components/HomeRedirect.tsx`, `lib/roles.ts`.

### Pola Service Layer
- **Kenapa**: Semua data harus lewat kontrak `Api` (`services/api.ts`) supaya gampang ditukar dari mock ke Laravel tanpa mengubah UI.
- **Dipakai di**: `services/api.ts` (kontrak), `services/mockApi.ts` (implementasi in-memory), `services/mockData.ts` (data tiruan).

### React Hooks & Context
- **Kenapa**: State keranjang bersama (Kasir/Pelayan/Menu QR) dan sesi login global.
- **Dipakai di**: `hooks/useCart.ts`, `context/AuthContext.tsx`.

### Library pendukung
- `qrcode.react` — generator QR per meja (`pages/admin/TableManagement.tsx`).
- `react-router-dom` — routing & navigasi.

---

## 2. Backend (Fase B - Laravel)

### Laravel (REST API)
- **Kenapa**: Backend tunggal yang melayani semua channel; implementasikan `Api` interface frontend.
- **Butuh**: Routing API, Controller, Eloquent ORM, Migration/Seeder.

### Autentikasi Sanctum
- **Kenapa**: Auth nyata + role dari server (ganti mock login).

### Laravel Broadcasting + Reverb + Redis
- **Kenapa**: Notifikasi status pesanan real-time ≤ 2 detik ke semua channel (PRD NFR).
- **Butuh**: Channel pesanan, `laravel-echo` di frontend, Redis sebagai message layer.
- **Status**: Backend dikerjakan di folder `backend/` repo utama `resto_pos/` (fase B).

### Database Transaction + Row Locking
- **Kenapa**: Mencegah race condition stok/order bersamaan. **WAJIB pakai `lockForUpdate()`**, BUKAN Golang/Kafka (aturan AGENTS.md).

---

## 3. Testing & Kualitas

### Vitest + React Testing Library (sudah terpasang)
- **Kenapa**: Tes otomatis (lihat `todo.md` A5 ✅, 18 tes): service layer, komponen, guard role.

### TypeScript strict
- **Kenapa**: `tsc -b` di build; error tipe = build gagal.

### oxlint
- **Kenapa**: Lint cepat; `npm run lint`.

---

## 4. Alat Kerja

- **npm** — instalasi & script (`dev`, `build`, `lint`, `preview`).
- **Git/GitHub** — version control & PR (perlu jika kolaborasi).
- **Laragon** — lingkungan lokal (MySQL/MariaDB + PHP untuk fase B).

---

## Tips Belajar (sesuai tahap)

1. **Sekarang**: pelajari React + TS + Tailwind v4 + pola service layer (lihat `PROGRESS.md` peta file).
2. **Menjelang fase B**: pelajari Laravel API + Eloquent + Sanctum.
3. **Real-time**: pelajari Reverb + Redis + `laravel-echo`.
4. **Ketahanan data**: pelajari database transaction & row locking untuk race condition.
# AGENTS.md - DineFlow POS (Resto POS Multi-Channel)

Instruksi tetap untuk AI coding assistant (OpenCode/Claude Code) yang bekerja di proyek ini. Baca file ini di awal setiap sesi baru sebelum mulai coding.

## Tentang Proyek Ini

**Nama Produk:** DineFlow POS
**Jenis:** Sistem Point of Sale (POS) restoran dengan 3 kanal pemesanan (Kasir, Pelayan, Self-order QR di meja) dan Kitchen Display System
**Target Pengguna:** Kasir, Pelayan, Staf Dapur, Admin/Owner restoran, Pelanggan
**Skala:** Prototype/tugas PKL untuk 1 outlet restoran tunggal (bukan multi-cabang)

## Dokumen Referensi Wajib Dibaca

Dokumen level proyek berada di folder `docs/` di root repo. Sebelum mengerjakan fitur
apa pun, baca dokumen berikut:
- `docs/prd.md` - **PRD (Product Requirements Document)** kebutuhan fitur lengkap, 12 bagian (scope, data, NFR, dst). Versi markdown dari dokumen Word asli
- `docs/architecture.md` - arsitektur sistem: komponen, alur data, peta endpoint, status migrasi mock → Laravel
- `docs/DESIGN.md` - warna, tipografi, komponen visual (token warna WAJIB dirujuk dari sini, jangan pakai hex code baru)
- `docs/todo.md` - roadmap tugas fase A/B/C, prioritas P1/P2/P3 (sumber daftar pekerjaan)
- `docs/skill.md` - keterampilan yang dibutuhkan & di mana dipakai
- `docs/workflow.md` - alur kerja, konvensi kode, verifikasi build/lint, cara migrasi mock → Laravel, upload GitHub (§8), penutup sesi (§7)
- `docs/presentasi-demo.md` - panduan demo/presentasi PKL per role
- `docs/deployment.md` - runbook deployment Vercel (frontend) + Render (backend/Reverb)

Untuk sesi kerja di frontend (`frontend/`), WAJIB baca juga di awal sesi dan perbarui di akhir sesi:
- `frontend/PROGRESS.md` - status pengerjaan (checklist), cara kerja, peta file `src/`, rencana langkah berikutnya, dan log keputusan. Update checklist & log setiap kali selesai satu step/fitur.
- `docs/uji manual.md` - panduan uji manual per peran (verifikasi fitur sesuai PRD sebelum dianggap selesai)

## Tech Stack

| Komponen | Teknologi |
|---|---|
| Backend | Laravel (PHP) |
| Frontend | React (TypeScript) |
| Real-time | Laravel Broadcasting (Reverb) |
| Database | MySQL/MariaDB (lokal: via Laragon) |
| Cache/Broadcasting layer | Redis |

## Struktur Folder

```
resto-pos/
├── frontend/    - React (Kasir, Pelayan, Kitchen Display, Menu Pesan Mandiri) + PROGRESS.md
├── backend/     - Laravel API + Broadcasting (fase B)
├── docs/        - dokumen level proyek (prd.md, architecture.md, DESIGN.md, todo.md, skill.md, workflow.md, uji manual.md, README.md)
└── AGENTS.md    - file ini (aturan proyek; di root agar otomatis terbaca AI)
```

> Proyek kini bekerja di folder utama `resto_pos/` = `frontend/` + `backend/` + `docs/`
> (dokumen level proyek di `docs/`). Langkah gabung/upload GitHub: `docs/workflow.md` §8.

## 4 Antarmuka yang Harus Dibangun

1. **Kasir** - input pesanan manual, proses pembayaran (Web)
2. **Kitchen Display** - lihat pesanan real-time, ubah status (Web, layar besar)
3. **Pelayan** - input pesanan dari meja (Mobile/tablet)
4. **Menu Pesan Mandiri** - pelanggan scan QR, pesan sendiri (Mobile)

Plus **Admin** (Manajemen Menu & Laporan Penjualan) - Web.

## Prinsip Kerja dengan AI Coding Assistant

- **Kerjakan bertahap, satu fitur per permintaan** - jangan generate semua sekaligus dalam 1 prompt
- **Jelaskan setiap langkah** yang dikerjakan, jangan hanya kasih kode tanpa penjelasan
- **Fase 1 dulu (GPS/dasar), baru Fase 2** - kalau ada fitur bertahap sesuai PRD, ikuti urutan fase yang tertulis
- **Race condition (stok/order bersamaan)** - gunakan database transaction dengan row locking (`lockForUpdate()`), BUKAN Golang/Kafka
- **Real-time** - gunakan Laravel Reverb + Redis, BUKAN Node.js/WebSocket terpisah

## Aturan Desain (Ringkasan dari DESIGN.md)

- Warna primary: `#2563EB` (biru) - satu-satunya warna aksen utama
- 3 status meja: Kosong (hijau), Terisi (biru), Perlu Dibersihkan (merah)
- 4 status pesanan: Baru (abu), Dimasak (kuning), Siap (hijau), Selesai (biru)
- Font: Inter (UI umum), monospace untuk angka/harga/kode order
- Kitchen Display: teks besar, kontras tinggi, dibaca dari jarak 1-2 meter
- Hindari: foto produk di Kasir/Kitchen (boleh di Menu Pelanggan), gradient, shadow berlebihan

## Sumber Desain Visual

Tampilan awal (mockup) sudah dibuat di Google Stitch, hasil export ada di:
- `resto-pos-frontendstitch-export-web/` - Kasir, Kitchen, Peta Meja, Menu Admin, Laporan
- `resto-pos-frontendstitch-export-mobile/` - Pelayan, Menu Pesan Mandiri

Kode dari Stitch adalah **starting point tampilan saja** (belum ada logic/koneksi database) - perlu dirapikan dan disambungkan ke API Laravel.

Catatan: proyek bekerja di folder utama `resto_pos/` (frontend/ + backend/ + docs/).
Layout mockup Stitch dipakai sebagai panduan, tetapi warna/token wajib mengikuti
`docs/DESIGN.md` (lihat log keputusan di `frontend/PROGRESS.md`).

## Deployment (Untuk Referensi, Belum Tahap Ini)

- Frontend → Vercel
- Backend → Render (bukan Vercel, karena Laravel butuh server persisten)
- Database lokal development: Laragon (MySQL)

# DineFlow POS

[![License: MIT](https://img.shields.io/badge/License-MIT-2563EB.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-19-2563EB.svg)](https://react.dev)
[![Laravel](https://img.shields.io/badge/Laravel-13-FF2D20.svg)](https://laravel.com)
[![Reverb](https://img.shields.io/badge/WebSocket-Reverb-2563EB.svg)](https://reverb.laravel.com)
[![Tailwind](https://img.shields.io/badge/Tailwind-v4-38BDF8.svg)](https://tailwindcss.com)

**React 19 · TypeScript · Vite · Tailwind CSS v4 · Laravel 13 · Sanctum · Reverb · Redis**

DineFlow POS adalah sistem Point of Sale restoran dengan **4 kanal pemesanan** — Kasir,
Pelayan, Kitchen Display System, dan Menu Pesan Mandiri lewat QR di meja — plus dashboard
Admin. Dibuat sebagai prototype/tugas PKL untuk **1 outlet restoran tunggal**, lengkap dari
antarmuka sampai API, pembayaran, dan real-time.

## Latar Belakang

Proyek ini adalah tugas PKL jurusan Rekayasa Perangkat Lunak yang saya bangun sendiri
sampai bisa dipakai end-to-end. Awalnya tampilan dibuat di **Google Stitch** (mockup HTML
statis), lalu seluruhnya dirombak menjadi aplikasi React yang terhubung ke backend.

Pengerjaannya dibagi dua fase:

- **Fase A — frontend murni.** Semua antarmuka (Kasir, Pelayan, KDS, menu QR, Admin) dibangun
  dengan React + TypeScript, data masih mock, ditambah auth, struk, dan simulasi QRIS.
- **Fase B — backend Laravel.** API asli, auth Sanctum, upload foto, transaksi database
  dengan row locking, dan siaran real-time Reverb + Redis menggantikan polling.

Catatan: warna dan tipografi tidak sembarangan — seluruh token diambil dari `docs/DESIGN.md`,
bukan hex baru per komponen.

## Fitur

**Alur pemesanan**

- **Bayar di muka (prepay)** di semua kanal: order dibuat `menunggu`, dibayar (Tunai atau
  QRIS), baru masuk dapur. Tombol konfirmasi manual tidak diperlukan lagi.
- **Empat kanal** — Kasir (input manual), Pelayan (dari meja, mobile/tablet), Menu QR
  (pelanggan pesan sendiri), Kitchen Display (layar besar).
- **Varian ukuran** (Original/Jumbo) dengan foto berbeda per varian, dan **level pedas 0–5**
  untuk menu pedas. Setiap kombinasi jadi baris sendiri di keranjang.
- **Dua metode pembayaran QRIS**: gambar QRIS statis milik resto (unggah dari Admin) atau
  gateway DOKU/Xendit. `PAYMENT_DRIVER=mock` membuat demo jalan tanpa kredensial.

**Operasional**

- **Real-time ≤ 2 detik** untuk status order, perubahan menu, dan pengaturan (Reverb + Redis).
- **Status meja otomatis** — order dine-in membuat meja terisi, pembayaran selesai membuat
  meja perlu dibersihkan. Data status meja: kosong, terisi, perlu dibersihkan.
- **Riwayat transaksi** tanpa batas waktu + cetak ulang struk (lebar ±80 mm, tinggi mengikuti isi).
- **Laporan penjualan** dengan filter periode (harian / 7 hari / bulan ini / semua) + menu
  terlaris + ekspor.
- **Void / batal pesanan** wajib alasan, tercatat di audit, dan meja otomatis dikosongkan.

**Ketahanan**

- **Anti order ganda** — idempotency key di backend (`X-Idempotency-Key`) + guard busy di
  frontend.
- **Anti bayar ganda** — checkout dalam transaksi + unique constraint `payments.order_id`.
- **Anti iseng self-order** — batas 5 order/jam per perangkat (`X-Device-Id`) dan 20/jam per IP,
  sedangkan pembatalan oleh pelanggan tetap bebas (dalam jendela 10 menit).
- **Race condition stok/pesanan** ditangani dengan database transaction + `lockForUpdate()`,
  bukan message broker.
- **Aksesibilitas** — label `aria-*` pada kontrol penting, fokus terlihat, dan target sentuh
  ≥ 44 px di alur pemesanan.

## Tech Stack

| Komponen | Teknologi |
|---|---|
| Frontend | React 19 (TypeScript), Vite, Tailwind CSS v4, React Router 7 |
| Backend | Laravel 13 (PHP 8.3+), Laravel Sanctum (token API) |
| Real-time | Laravel Broadcasting (Reverb) + Redis |
| Database | MySQL/MariaDB (lokal) — produksi PostgreSQL (Neon) |
| Pembayaran | QRIS statis, DOKU, Xendit, atau mock driver |
| Storage foto | Disk lokal `public` (dev) — S3/Supabase (produksi) |

## Struktur Proyek

```
resto_pos/
├── frontend/                       # React SPA (Kasir, Pelayan, KDS, Menu QR, Admin)
│   ├── public/                     # favicon & aset statis (termasuk tangkapan layar)
│   ├── src/
│   │   ├── pages/                  # kasir · pelayan · kitchen · menu · order · admin · auth
│   │   ├── components/             # komponen UI bersama (Button, Badge, ReceiptModal, …)
│   │   ├── services/               # httpApi (REST), echo (WebSocket), mockApi (tes)
│   │   ├── lib/                    # token desain, format, statusConfig, receipt, scan
│   │   ├── hooks/ · context/       # useCart, AuthContext, ToastContext
│   │   └── types/                  # tipe data bersama
│   ├── PROGRESS.md                 # progres, peta file, log keputusan
│   └── package.json
├── backend/                        # Laravel API + Broadcasting
│   ├── app/                        # Http/Controllers, Models, Resources, Events
│   ├── routes/api.php              # seluruh endpoint REST
│   ├── database/                   # migrations · seeders (data demo) · factories
│   ├── config/dinflow.php          # batas rate-limit & aturan self-order
│   └── composer.json
├── docs/                           # dokumen level proyek (lihat bagian Dokumentasi)
├── AGENTS.md                       # aturan kerja untuk AI coding assistant
├── LICENSE                         # MIT
└── README.md                       # dokumen ini
```

## Tangkapan Layar

| Kasir | Pelayan |
|---|---|
| ![Halaman Kasir](frontend/public/kasir.png) | ![Halaman Pelayan](frontend/public/Pelayan.png) |

| Kitchen Display | Admin |
|---|---|
| ![Kitchen Display](frontend/public/Dapur.png) | ![Admin](frontend/public/Admin.png) |

## Cara Menjalankan

### Prasyarat

- PHP 8.3+ dan Composer
- Node.js 20+ dan npm
- MySQL/MariaDB (lokal: Laragon) dan Redis

### Backend

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate:fresh --seed     # data demo: menu, meja, user, order
php artisan storage:link             # foto menu
php artisan serve                    # http://127.0.0.1:8000
php artisan reverb:start             # WebSocket, port 8080
```

### Frontend

```bash
cd frontend
npm install
npm run dev                          # http://localhost:5173
```

Proxy Vite sudah mengarahkan `/api` ke `127.0.0.1:8000`, jadi cukup buka satu alamat.

### Akun Demo

| Username | Role | Password |
|---|---|---|
| `admin` | Admin / Owner | `1234` |
| `kasir` | Kasir | `1234` |
| `pelayan` | Pelayan | `1234` |
| `dapur` | Staf Dapur | `1234` |

Halaman pelanggan (`/menu/:token` dan `/order/:orderNumber`) bisa dibuka tanpa login.

## Halaman

| Rute | Keterangan |
|---|---|
| `/kasir` | Input pesanan, keranjang, pembayaran tunai/QRIS, struk, riwayat transaksi |
| `/pelayan` | Peta meja (mobile-first), input pesanan dari meja, antar pesanan |
| `/kitchen` | Kitchen Display: grid ticket, update status per item, urut antrian |
| `/menu/:token` | Menu pesan mandiri (scan QR meja), keranjang, bayar, tracking |
| `/order/:orderNumber` | Tracking pesanan publik tanpa login (isi barcode "Bayar di Kasir") |
| `/admin` | Manajemen menu & varian, meja + QR, staf, laporan, riwayat, pengaturan |

## Verifikasi

```bash
# Frontend
cd frontend
npm run build      # tsc -b + vite build
npm run lint       # oxlint
npm test           # vitest

# Backend
cd backend
php artisan test
```

## Dokumentasi

Semua dokumen level proyek ada di folder `docs/`:

- **PRD** — `docs/prd.md`
- **Arsitektur** — `docs/architecture.md`
- **Desain (token warna/tipe)** — `docs/DESIGN.md`
- **Roadmap** — `docs/todo.md`
- **Alur kerja & upload** — `docs/workflow.md`
- **Uji manual per peran** — `docs/uji manual.md`
- **Panduan demo/presentasi** — `docs/presentasi-demo.md`
- **Deployment** — `docs/deployment.md`
- **Progres & peta file frontend** — `frontend/PROGRESS.md`

## Lisensi

Dirilis di bawah [MIT License](LICENSE).

## Kredit

Dibuat oleh **fadhilfaith48** — [github.com/fadhilfaith48/dineflow-pos](https://github.com/fadhilfaith48/dineflow-pos).

Tugas PKL Rekayasa Perangkat Lunak, SMKN 1 Mejayan.

# DineFlow POS — Resto POS Multi-Channel

Sistem Point of Sale (POS) restoran dengan **4 kanal pemesanan** (Kasir, Pelayan,
Self-order QR di meja, Kitchen Display System) + dashboard Admin. Prototype PKL untuk
1 outlet restoran tunggal.

## Fitur Utama

| Kanal | Fungsi |
|---|---|
| **Kasir** | Input pesanan manual, terima & konfirmasi pesanan masuk, bayar nota meja (tunai + QRIS simulasi), cetak/salin struk |
| **Pelayan** | Peta meja, input pesanan dari meja (dengan catatan khusus), tandai diantar |
| **Kitchen Display** | Grid ticket pesanan aktif, urut antrian waktu masuk, update status per item (baru/dimasak/siap) |
| **Menu Pesan Mandiri** | Pelanggan scan QR di meja → katalog → pesan → tracking status |
| **Admin** | Manajemen menu (kategori/harga/foto/habis), meja (+ QR per meja), staf & role, laporan penjualan (filter periode) + menu terlaris |

## Tech Stack

| Komponen | Teknologi |
|---|---|
| Frontend | React (TypeScript), Vite, Tailwind CSS v4 |
| Backend | Laravel (PHP) — REST API (fase B) |
| Real-time | Laravel Broadcasting (Reverb) + Redis (fase B) |
| Database | MySQL/MariaDB (fase B) |

## Struktur Repo

```
resto_pos/
├── frontend/          # React (Kasir, Pelayan, KDS, Menu QR, Admin) + PROGRESS.md
├── backend/           # Laravel API + Broadcasting (fase B)
├── docs/              # Dokumen level proyek (file ini, prd.md, architecture.md, dll)
└── AGENTS.md          # Aturan kerja untuk AI coding assistant (di root agar otomatis terbaca)
```

> Semua dokumen level proyek (PRD, arsitektur, desain, roadmap, dll) berada di folder
> `docs/`. `AGENTS.md` sengaja di root karena dibaca otomatis oleh AI coding assistant.

## Menjalankan (Dev)

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

Akun demo: username = `admin` / `kasir` / `pelayan` / `dapur`, password semua `1234`.

## Verifikasi

```bash
cd frontend
npm run build      # tsc + vite build
npm run lint       # oxlint
npm test           # vitest (18 tes: service layer & guard role)
```

## Status

- ✅ **Fase A (frontend murni) SELESAI** — semua antarmuka + auth + struk + simulasi QRIS.
- ✅ **Fase B (backend Laravel) SELESAI** — API asli, real-time Reverb + Redis, auth Sanctum,
  foto upload, race condition (`lockForUpdate`).
- ✅ **Upload repo ke GitHub SELESAI** — repo public `github.com/fadhilfaith48/dineflow-pos`.
- ✅ **Uji manual menyeluruh SELESAI** — `uji manual.md` §1–§7 semua lolos.
- ➡️ **Deployment (Vercel + Render)** — panduan siap pakai di `deployment.md`.
- Detail: `frontend/PROGRESS.md` dan `todo.md`.

## Dokumen Referensi (folder `docs/`)

- **PRD**: `prd.md` (kebutuhan fitur lengkap)
- **Arsitektur**: `architecture.md`
- **Desain**: `DESIGN.md`
- **Status & peta file frontend**: `frontend/PROGRESS.md`
- **Roadmap**: `todo.md`
- **Alur kerja & upload**: `workflow.md`
- **Panduan uji manual**: `uji manual.md`
- **Panduan demo/presentasi**: `presentasi-demo.md`
- **Panduan deployment**: `deployment.md`
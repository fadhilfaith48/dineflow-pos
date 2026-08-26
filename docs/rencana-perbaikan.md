# Rencana Perbaikan DineFlow POS

> Daftar kerja hasil analisis (19 Agu 2026). Centang saat selesai + sinkronkan dengan
> `todo.md` & `frontend/PROGRESS.md`.

## Langkah 1 — Opsi A: Order kasir lewat dapur
- [x] `OrderController::store`: order kasir langsung `diproses`
- [x] `KasirPage.tsx`: tombol keranjang → "Kirim ke Dapur" (create order, tanpa bayar)
- [x] Bayar via panel queue setelah `siap`
- [x] Uji alur: kasir kirim → KDS masak → siap → bayar → selesai (verifikasi build+lint+test)

## Langkah 2 — Keamanan & integritas backend
- [x] Harga/name item dari DB (abaikan input klien)
- [x] `source` ditentukan server sesuai role
- [x] Tolak kembalian negatif (cashReceived >= total)
- [x] Rate limit login (throttle)
- [x] Token Sanctum expire 8 jam
- [x] Endpoint POST /change-password
- [x] Logout aman (guard token null)
- [x] order_number & kode menu anti-race (lockForUpdate)
- [x] SalesSummary hanya order sudah dibayar (selesai)

## Langkah 3 — Otorisasi role (EnsureRole)
- [x] Middleware EnsureRole + alias di bootstrap/app.php
- [x] Menu/meja/staf/laporan → admin
- [x] GET /orders → kasir, pelayan, dapur, admin
- [x] confirm & payments → kasir, admin
- [x] updateItemStatus → dapur, pelayan, admin

## Langkah 4 — Resilience frontend
- [x] Error + loading state: Kasir, Kitchen, Menu, Pelayan, Admin, SalesReport
- [x] 401 → auto redirect ke login
- [x] Hilangkan flash "Meja tidak ditemukan"
- [x] Cegah double-submit pembayaran
- [x] Pelayan subscribe channel orders + menu
- [x] ErrorBoundary global

## Langkah 5 — Verifikasi
- [x] php artisan test (3/3 lolos)
- [x] npm run build + npm run lint (lolos)
- [x] Real-time Laporan Penjualan: `SalesReport` subscribe `orders`, refetch saat `action=paid` (fix sesi uji manual)
- [x] Cart Menu QR konsisten mobile: overlay + panel `max-w-md` (fix sesi uji manual)
- [x] Sesi login per-tab: `localStorage` → `sessionStorage` agar 4 role bisa login serentak (fix sesi uji manual)
- [x] Uji manual alur kasir→dapur (server lokal: MySQL + serve + Reverb + dev) — lolos penuh 26 Agu 2026, termasuk verifikasi fitur Riwayat Transaksi & struk thermal baru (lihat `docs/uji manual.md` §8)

## Setelah Langkah 1–5 (masih kurang)
- [ ] Deploy C2: Vercel + VPS (DuckDNS/Let's Encrypt) + Neon/Upstash/Supabase
- [ ] Putuskan jalur: A (VPS IDCloudHost Rp87rb), B (server sekolah), C (tunnel)
- [ ] Isi 7 rahasia di backend/.env
- [ ] Tes backend & frontend lebih lengkap
- [ ] Sinkronkan PROGRESS.md, todo.md, frontend/.env.example
- [ ] Commit & push perubahan (echo.ts, vite.config.ts, docs baru, cloudflared.exe)
## Langkah Berikutnya — Riwayat Transaksi Kasir & Admin (✅ SELESAI, dikerjakan 25 Agu 2026)

> Tujuan: audit trail transaksi — bila ada kekeliruan input produk/penjualan, bisa ditelusuri
> kembali. Batas data **unlimited** (database sudah menyimpan semua order selamanya;
> yang dibangun hanyalah jendela tampilannya). Semua keputusan desain sudah dikunci dengan
> pemilik proyek.

### Keputusan desain (terkunci)
- [x] Admin: **tab navbar baru** "Riwayat Transaksi" setelah Laporan Penjualan (bukan digabung)
- [x] Fitur **cetak ulang struk** dari riwayat (reuse `ReceiptModal`)
- [x] Kasir: cakupan awal **Hari ini** + toggle opsi "Semua"
- [x] Tidak menampilkan nama kasir di v1 (`payments.paid_by` berupa ID user, bukan teks)
- [x] Tanpa pagination/batas baris sesuai permintaan (skala 1 outlet aman)

### Backend (kecil, tanpa migrasi)
- [x] `OrderController::index`: eager load `payment` → `with(['table','items','payment'])`
- [x] `OrderResource`: tambah `'payment' => $this->whenLoaded('payment', fn () => new PaymentResource($this->payment))`
      sehingga frontend dapat `method`, `cashReceived`, `change`, `paidAt`
- [x] Tes backend: assertion `GET /orders` menyertakan data payment (perluas tes existing)

### Frontend bersama
- [x] `types/index.ts`: type Order tambah field opsional `payment`
- [x] Pindahkan `pages/kasir/ReceiptModal.tsx` → `components/ReceiptModal.tsx`
      (refactor import di KasirPage) agar dipakai lintas role

### Halaman Kasir
- [x] Panel kanan: dua tab pill "Pesanan Aktif" | "Riwayat"
- [x] Riwayat: filter hari-ini default + chip "Semua"; baris = jam, no.order, meja/sumber,
      total, badge metode; klik baris → buka ReceiptModal (cetak ulang)

### Halaman Admin
- [x] Tab baru `riwayat` di `AdminPage.tsx` (pola pill sama seperti tab lain)
- [x] Komponen baru `TransactionHistory.tsx`: daftar order `selesai` — tanggal+jam, no.order,
      meja/sumber, jumlah item, total, metode bayar
- [x] Filter client-side: rentang tanggal (pola sama dengan SalesReport), cari nomor order,
      dropdown metode (Semua/Tunai/QRIS)
- [x] Real-time: subscribe channel `orders`, action `paid` → daftar ikut bertambah

### Verifikasi
- [x] Tes backend lulus (9 tes), FE build+lint+18 tes
- [x] E2E curl: `GET /orders` mengandung `payment.method`
- [x] Uji manual: bayar 1 pesanan → muncul di riwayat Kasir & Admin tanpa refresh,
      cetak ulang struk berhasil

# Panduan Demo / Presentasi DineFlow POS (PKL)

Naskah demo singkat untuk sidang/presentasi. Data demo sudah di-*seed* (`migrate:fresh --seed`):
4 user, 19 menu, 8 meja (T1–T8), 3 order (ORD-0001/2 = `diproses`, ORD-0003 = `menunggu-konfirmasi`).

---

## 1. Prasyarat (sebelum demo)

- [ ] 5 layanan nyala: MySQL `3306`, Redis `6379`, backend `8000`, Reverb `8080`, Vite `5173`.
      Cek: `netstat -ano | grep -E ":(3306|6379|8000|8080|5173)"` harus ada yang `LISTENING`.
- [ ] DB demo segar: `php artisan migrate:fresh --seed` di `backend/`.
- [ ] Akun demo (password semua `1234`): `admin`, `kasir`, `pelayan`, `dapur`.

## 2. Alur Demo (urutan 15–20 menit)

| # | Peran / Halaman | Langkah | Poin yang ditonjolkan |
|---|---|---|---|
| 1 | **Login** | Buka `http://localhost:5173/login` → login `admin`/`1234` | Role dari server; arah halaman sesuai role |
| 2 | **Admin — Menu** | Tab Manajemen Menu: tambah/edit menu, upload **foto** file, tandai **Habis** | Foto disimpan di server (`/storage/...`); tanda Habis **real-time** hilang di Menu QR & panel Kasir tanpa refresh |
| 3 | **Admin — Meja** | Tambah meja, ubah status, **Lihat QR** → modal QR ke `/menu/:qr` | QR per meja; link ke halaman publik |
| 4 | **Admin — Staf** | Tambah staf + role | Bisa langsung login |
| 5 | **Admin — Laporan** | Filter Hari ini / 7 Hari / Bulan ini / Semua | Total, transaksi, menu terlaris sesuai periode |
| 6 | **Menu QR (publik)** | Tab baru `http://localhost:5173/menu/T1` **tanpa login** → pilih item + catatan → Kirim | Halaman publik; pesanan masuk ke Kasir `menunggu-konfirmasi` |
| 7 | **Kasir — Konfirmasi** | Login `kasir` (tab lain) → panel "Masuk" → **Konfirmasi** ORD baru | Order diteruskan ke dapur; KDS update **≤2s tanpa refresh** |
| 8 | **KDS (Dapur)** | Login `dapur` → /kitchen → **Mulai Masak** → **Siap Saji** | Ticket besar teks kontras; status item naik; pembaruan real-time |
| 9 | **Pelayan** | Login `pelayan` → pilih meja kosong → isi pesanan + catatan → Kirim → **Daftar Pesanan** → tandai **diantar** | Mobile-first; peta meja status |
| 10 | **Kasir — Bayar** | Kembali ke Kasir → tab "Nota" → **Bayar** → pilih **Tunai** (input uang, lihat kembalian) lalu **QRIS** (simulasi QR → Tandai Lunas) | Struk tampil + tombol **Cetak** & **Salin**; QRIS tanpa kembalian |
| 11 | **Uji negatif (singkat)** | Login `pelayan` lalu buka `/admin` | Ditolak, diarahkan ke `/pelayan` |

## 3. Poin Pembeda (highlight saat sidang)

1. **Multi-channel 1 sistem**: Kasir, Pelayan, Menu QR pelanggan, dan Kitchen Display
   memakai satu backend & satu sumber data (MySQL) — bukan 4 aplikasi terpisah.
2. **Real-time penuh** (Reverb + Redis): pesanan (Kasir→KDS→tracking pelanggan) dan
   semua perubahan menu (Habis/harga/foto) tampil tanpa refresh, ≤ 2 detik.
3. **Keamanan**: auth Sanctum, role dari server, token di-revoke saat logout,
   halaman Menu QR publik tanpa login, endpoint lain dilindungi.
4. **Integritas data**: pembayaran ganda ditolak (409) & stok/order dilindungi
   transaction + `lockForUpdate()` (bukan proses berlebihan).
5. **Upload foto menu** disimpan di server (bukan URL eksternal).

## 4. Teknologi & Arsitektur (untuk pertanyaan)

- **Frontend**: React + TypeScript + Vite + Tailwind (SPA, routing).
- **Backend**: Laravel (REST API + Sanctum auth).
- **Real-time**: Laravel Broadcasting **Reverb** + Redis, klien `laravel-echo` (protokol Pusher).
- **Database**: MySQL/MariaDB.
- **Arsitektur**: satu backend melayani 4 antarmuka; semua data lewat service layer
  `api.*`; detail di `docs/architecture.md`.

## 5. Catatan

- Semua angka/harga memakai font monospace & warna aksen biru `#2563EB` (token DESIGN.md).
- Reset DB kapan pun: `php artisan migrate:fresh --seed` di `backend/`.
- Kalau Reverb mati, halaman tetap bisa di-refresh manual (fallback sesuai NFR).

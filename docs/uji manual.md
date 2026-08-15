# UJI MANUAL.md - Panduan Uji Manual DineFlow POS

Skenario uji manual untuk memastikan semua alur sesuai PRD. **Jalankan berurutan** dan tandai ✅/❌ tiap kasus. Jika ada yang gagal, catat langkah yang gagal lalu laporkan ke `todo.md`.

> Akun demo: username = `admin` / `kasir` / `pelayan` / `dapur`, password semua `1234`.

---

## 0. Persiapan

- [ ] Jalankan `npm run dev` di `frontend/`, buka `http://localhost:5173/`.
- [ ] Pastikan tidak ada sesi lama: di DevTools console ketik `localStorage.removeItem('dineflow-user')` lalu refresh.

---

## 1. Login & Redirect Sesuai Role

| # | Langkah | Hasil yang diharapkan | ✅/❌ |
|---|---|---|---|
| 1.1 | Login `admin`/`1234` | Masuk ke **/admin** | |
| 1.2 | Logout, login `kasir`/`1234` | Masuk ke **/kasir** | |
| 1.3 | Logout, login `pelayan`/`1234` | Masuk ke **/pelayan** | |
| 1.4 | Logout, login `dapur`/`1234` | Masuk ke **/kitchen** | |
| 1.5 | Login password salah (mis. `0000`) | Muncul error "Username atau password salah", tetap di login | |
| 1.6 | Buka `/admin` saat belum login | Dialihkan ke `/login` | |
| 1.7 | Sebagai `pelayan`, coba buka `/admin` | Tidak bisa; diarahkan ke `/pelayan` | |

---

## 2. Kasir

| # | Langkah | Hasil yang diharapkan | ✅/❌ |
|---|---|---|---|
| 2.1 | Pilih kategori, tambah beberapa item ke keranjang | Item muncul di keranjang, subtotal/pajak/total benar (pajak 10%) | |
| 2.2 | Cari menu dengan kata kunci | Daftar menu terfilter | |
| 2.3 | Klik area meja → pilih **Take Away** | Label keranjang "Take Away" | |
| 2.4 | Pilih **meja** (mis. T1) | Label keranjang "Meja T1" | |
| 2.5 | Klik **Bayar** → pilih **Tunai** → input uang ≥ total | Muncul kembalian yang benar | |
| 2.6 | Bayar dengan uang < total | Tombol bayar nonaktif / error | |
| 2.7 | Setelah bayar | Struk tampil: kode order, item, total, metode bayar | |
| 2.8 | Klik **Cetak** | Dialog print browser terbuka | |
| 2.9 | Klik **Salin Struk** | Teks struk tersalin ke clipboard | |
| 2.10 | Bayar pakai **QRIS** | QR dinamis tampil dengan nominal; status "Menunggu pembayaran..."; klik **Simulasi Pembayaran Sukses** → status berubah "Pembayaran berhasil"; klik **Tandai Lunas** → struk tampil metode QRIS, tanpa kembalian | |

---

## 3. Pelayan

| # | Langkah | Hasil yang diharapkan | ✅/❌ |
|---|---|---|---|
| 3.1 | Buka `/pelayan` | Tampil peta meja dengan status (Kosong/Terisi/Perlu Dibersihkan) | |
| 3.2 | Klik meja kosong | Masuk tampilan input pesanan meja tsb | |
| 3.3 | Tambah item + isi **catatan** (mis. "tidak pedas") | Item masuk keranjang dengan catatan | |
| 3.4 | Kirim pesanan | Kembali ke daftar pesanan, pesanan muncul | |
| 3.5 | Tombol **Daftar Pesanan** → tandai **diantar** | Status item jadi diantar | |
| 3.6 | Navbar ada tombol **Keluar** | Klik → kembali ke `/login` | |

---

## 4. Kitchen Display (Dapur)

| # | Langkah | Hasil yang diharapkan | ✅/❌ |
|---|---|---|---|
| 4.1 | Login `dapur`, buka `/kitchen` | Grid ticket pesanan aktif tampil (teks besar, kontras) | |
| 4.2 | Tombol **Mulai Masak** pada item | Status item → Dimasak | |
| 4.3 | Tombol **Siap Saji** | Status item → Siap | |
| 4.4 | Konfirmasi order baru dari Kasir (tab lain) | Ticket muncul di KDS **tanpa refresh** ≤ 2 detik (real-time Reverb) | |
| 4.5 | Navbar tombol **Keluar** | Bisa logout | |

---

## 5. Pesan Mandiri (Menu QR)

| # | Langkah | Hasil yang diharapkan | ✅/❌ |
|---|---|---|---|
| 5.1 | Buka `http://localhost:5173/menu/T1` **tanpa login** | Katalog menu tampil dengan header meja T1 (halaman publik) | |
| 5.2 | Buka `/menu/MEJA_SALAH` (tidak ada) | Muncul "Meja tidak ditemukan" | |
| 5.3 | Tambah item ke keranjang, isi catatan, **Kirim Pesanan** | Pesanan masuk ke panel Kasir (status `menunggu-konfirmasi`); tracking tampil real-time. Setelah Kasir **Konfirmasi** → muncul di KDS ≤ 2 detik tanpa refresh | |
| 5.4 | Menu yang ditandai **Habis** di Admin | Tidak muncul di katalog ini | |

---

## 6. Admin

| # | Langkah | Hasil yang diharapkan | ✅/❌ |
|---|---|---|---|
| 6.1 | Tab **Manajemen Menu**: tambah menu baru (nama, harga, kategori, foto **upload file** PNG/JPG/WebP ≤ 2 MB) | Menu muncul di tabel & di menu pelanggan; foto tampil (URL dari server) | |
| 6.2 | Edit nama/kategori/deskripsi menu | Data berubah | |
| 6.3 | Ubah harga langsung di tabel (tombol Harga → Simpan) | Harga berubah | |
| 6.4 | Tandai **Habis** / **Tersedia** | Badge berubah; menu habis hilang dari Menu QR | |
| 6.5 | Hapus menu (dengan konfirmasi) | Menu hilang | |
| 6.6 | Tab **Manajemen Meja**: tambah meja | Meja muncul di peta | |
| 6.7 | Ubah status meja via dropdown | Status berubah | |
| 6.8 | Klik **Lihat QR** | Modal QR tampil, link ke `/menu/:qr` | |
| 6.9 | **Salin Link** | Link tersalin | |
| 6.10 | Tab **Manajemen Staf**: tambah staf (nama, username, role) | Staf muncul & bisa login | |
| 6.11 | Ubah role staf | Role berubah | |
| 6.12 | Tab **Laporan Penjualan**: pilih **Hari ini** | Total sesuai pesanan hari ini (bisa 0) | |
| 6.13 | Pilih **7 Hari** / **Bulan ini** / **Semua** | Angka & menu terlaris menyesuaikan periode | |

---

## 7. Uji Negatif / Keamanan

| # | Langkah | Hasil yang diharapkan | ✅/❌ |
|---|---|---|---|
| 7.1 | Login `pelayan` lalu akses `/kasir`, `/kitchen`, `/admin` | Ditolak, dialihkan ke `/pelayan` | |
| 7.2 | Login `kasir` lalu akses `/admin` | Ditolak, dialihkan ke `/kasir` | |
| 7.3 | Login `dapur` lalu akses `/kasir` | Ditolak, dialihkan ke `/kitchen` | |
| 7.4 | Buka `/menu/T1` tanpa login | Tetap bisa (halaman publik) | |
| 7.5 | Kirim pesanan self-order tanpa login | Berhasil (POST `/orders` publik) | |
| 7.6 | Login → logout → pakai token lama (cek via DevTools/network) | Request dengan token lama ditolak 401 (token di-revoke server) | |

---

## Catatan Penting

- **Real-time asli**: KDS, panel Kasir, & tracking pelanggan memakai Laravel Reverb + Redis (≤ 2 detik, tanpa refresh). Pastikan backend `8000`, `reverb:start` `8080`, Redis `6379`, MySQL `3306`, dan Vite `5173` menyala.
- **Data tersimpan di database MySQL** (`dineflow_pos`): perubahan tidak hilang saat refresh. Untuk reset ke data demo: `php artisan migrate:fresh --seed` di `backend/`.
- **Upload foto menu** disimpan di `backend/storage/app/public/menu-items` (URL `http://localhost:8000/storage/...`).
- Jika ditemukan bug → tulis langkah reproduksinya ke `todo.md` lalu kerjakan.
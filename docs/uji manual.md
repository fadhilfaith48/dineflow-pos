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
| 1.1 | Login `admin`/`1234` | Masuk ke **/admin** | ✅ |
| 1.2 | Logout, login `kasir`/`1234` | Masuk ke **/kasir** | ✅ |
| 1.3 | Logout, login `pelayan`/`1234` | Masuk ke **/pelayan** | ✅ |
| 1.4 | Logout, login `dapur`/`1234` | Masuk ke **/kitchen** | ✅ |
| 1.5 | Login password salah (mis. `0000`) | Muncul error "Username atau password salah", tetap di login | ✅ |
| 1.6 | Buka `/admin` saat belum login | Dialihkan ke `/login` | ✅ |
| 1.7 | Sebagai `pelayan`, coba buka `/admin` | Tidak bisa; diarahkan ke `/pelayan` | ✅ |

---

## 2. Kasir

| # | Langkah | Hasil yang diharapkan | ✅/❌ |
|---|---|---|---|
| 2.1 | Pilih kategori, tambah beberapa item ke keranjang | Item muncul di keranjang, subtotal/pajak/total benar (pajak 10%) | ✅ |
| 2.2 | Cari menu dengan kata kunci | Daftar menu terfilter | ✅ |
| 2.3 | Klik area meja → pilih **Take Away** | Label keranjang "Take Away" | ✅ |
| 2.4 | Pilih **meja** (mis. T1) | Label keranjang "Meja T1" | ✅ |
| 2.5 | Klik **Bayar** → pilih **Tunai** → input uang ≥ total | Muncul kembalian yang benar | ✅ |
| 2.6 | Bayar dengan uang < total | Tombol bayar nonaktif / error | ✅ |
| 2.7 | Setelah bayar | Struk tampil: kode order, item, total, metode bayar | ✅ |
| 2.8 | Klik **Cetak** | Dialog print browser terbuka | ✅ |
| 2.9 | Klik **Salin Struk** | Teks struk tersalin ke clipboard | ✅ |
| 2.10 | Bayar pakai **QRIS** | QR dinamis tampil dengan nominal; status "Menunggu pembayaran..."; klik **Simulasi Pembayaran Sukses** → status berubah "Pembayaran berhasil"; klik **Tandai Lunas** → struk tampil metode QRIS, tanpa kembalian | ✅ (2 bug difix: `cashReceived` undefined array key & halaman putih karena `change: null`) |

---

## 3. Pelayan

| # | Langkah | Hasil yang diharapkan | ✅/❌ |
|---|---|---|---|
| 3.1 | Buka `/pelayan` | Tampil peta meja dengan status (Kosong/Terisi/Perlu Dibersihkan) | ✅ |
| 3.2 | Klik meja kosong | Masuk tampilan input pesanan meja tsb | ✅ |
| 3.3 | Tambah item + isi **catatan** (mis. "tidak pedas") | Item masuk keranjang dengan catatan | ✅ |
| 3.4 | Kirim pesanan | Kembali ke daftar pesanan, pesanan muncul | ✅ |
| 3.5 | Tombol **Daftar Pesanan** → tandai **diantar** | Status item jadi diantar (badge item + label "Sudah diantar") | ✅ |
| 3.6 | Navbar ada tombol **Keluar** | Klik → kembali ke `/login` | ✅ |
| 3.7 | Kirim & Bayar QRIS → klik **"Saya Sudah Bayar (Demo)"** | Pindah ke **Daftar Pesanan** tanpa error/halaman putih; order `menunggu`→`diproses`, meja jadi terisi (real-time) | ⬜ |
| 3.7b | Kirim & Bayar QRIS → klik **"Batal"** (tutup overlay tanpa bayar) | Kembali ke **peta meja**, layar bersih (bukan tersangkut "Keranjang kosong"); order tetap `menunggu` dan muncul di tab **Masuk** kasir | ⬜ |

---

## 4. Kitchen Display (Dapur)

| # | Langkah | Hasil yang diharapkan | ✅/❌ |
|---|---|---|---|
| 4.1 | Login `dapur`, buka `/kitchen` | Grid ticket pesanan aktif tampil (teks besar, kontras) | ✅ |
| 4.2 | Tombol **Mulai Masak** pada item | Status item → Dimasak | ✅ |
| 4.3 | Tombol **Siap Saji** | Status item → Siap | ✅ |
| 4.4 | Konfirmasi order baru dari Kasir (tab lain) | Ticket muncul di KDS **tanpa refresh** ≤ 2 detik (real-time Reverb) | ✅ |
| 4.5 | Navbar tombol **Keluar** | Bisa logout | ✅ |

---

## 5. Pesan Mandiri (Menu QR)

| # | Langkah | Hasil yang diharapkan | ✅/❌ |
|---|---|---|---|
| 5.1 | Buka `http://localhost:5173/menu/T1` **tanpa login** | Katalog menu tampil dengan header meja T1 (halaman publik) | ✅ |
| 5.2 | Buka `/menu/MEJA_SALAH` (tidak ada) | Muncul "Meja tidak ditemukan" | ✅ |
| 5.3 | Tambah item ke keranjang, isi catatan, **Lanjut ke Pembayaran** | Layar **pilih metode** tampil dengan total tagihan: 2 kartu (**Bayar Langsung lewat HP (QRIS/E-Wallet)** & **Bayar di Kasir**); order jadi `menunggu` di panel Kasir | ✅ |
| 5.4 | Pilih **Bayar Langsung lewat HP** → klik **"Saya Sudah Bayar"** | QRIS tampil → otomatis ke tracking (`paid`), order ke dapur ≤ 2 detik tanpa refresh | ✅ |
| 5.5 | Pilih **Bayar di Kasir** | Barcode berisi URL `http://host/order/ORD-XXXX` + nomor besar tampil (**ditunjukkan ke kasir**, bukan di-scan pelanggan lain); order tetap `menunggu` (belum ke dapur) | ✅ |
| 5.6 | Pelanggan tetap di layar **Bayar di Kasir** (barcode + nomor besar); kasir membayar lewat tab Masuk (lihat 8.2b/8.2c) | Begitu `paid`, layar pelanggan **otomatis pindah ke halaman tracking** `diproses` **secara real-time tanpa refresh** | ⬜ |
| 5.7 | Menu yang ditandai **Habis** di Admin | Tidak muncul di katalog ini | ✅ |

---

## 6. Admin

| # | Langkah | Hasil yang diharapkan | ✅/❌ |
|---|---|---|---|
| 6.1 | Tab **Manajemen Menu**: tambah menu baru (nama, harga, kategori, foto **upload file** PNG/JPG/WebP ≤ 2 MB) | Menu muncul di tabel & di menu pelanggan; foto tampil (URL dari server) | ✅ |
| 6.2 | Edit nama/kategori/deskripsi menu | Data berubah | ✅ |
| 6.3 | Ubah harga langsung di tabel (tombol Harga → Simpan) | Harga berubah | ✅ |
| 6.4 | Tandai **Habis** / **Tersedia** | Badge berubah; menu habis hilang dari Menu QR | ✅ |
| 6.5 | Hapus menu (dengan konfirmasi) | Menu hilang | ✅ |
| 6.6 | Tab **Manajemen Meja**: tambah meja | Meja muncul di peta | ✅ |
| 6.7 | Ubah status meja via dropdown | Status berubah | ✅ |
| 6.8 | Klik **Lihat QR** | Modal QR tampil, link ke `/menu/:qr` | ✅ |
| 6.9 | **Salin Link** | Link tersalin | ✅ |
| 6.10 | Tab **Manajemen Staf**: tambah staf (nama, username, role) | Staf muncul & bisa login | ✅ |
| 6.11 | Ubah role staf | Role berubah | ✅ |
| 6.12 | Tab **Laporan Penjualan**: pilih **Hari ini** | Total sesuai pesanan hari ini (bisa 0) | ✅ |
| 6.13 | Pilih **7 Hari** / **Bulan ini** / **Semua** | Angka & menu terlaris menyesuaikan periode | ✅ |

---

## 7. Uji Negatif / Keamanan

| # | Langkah | Hasil yang diharapkan | ✅/❌ |
|---|---|---|---|
| 7.1 | Login `pelayan` lalu akses `/kasir`, `/kitchen`, `/admin` | Ditolak, dialihkan ke `/pelayan` | ✅ |
| 7.2 | Login `kasir` lalu akses `/admin` | Ditolak, dialihkan ke `/kasir` | ✅ |
| 7.3 | Login `dapur` lalu akses `/kasir` | Ditolak, dialihkan ke `/kitchen` | ✅ |
| 7.4 | Buka `/menu/T1` tanpa login | Tetap bisa (halaman publik) | ✅ |
| 7.5 | Kirim pesanan self-order tanpa login | Berhasil (POST `/orders` publik) | ✅ |
| 7.6 | Login → logout → pakai token lama (cek via DevTools/network) | Request dengan token lama ditolak 401 (token di-revoke server) | ✅ (verifikasi curl: `/api/me` 200 → logout → token lama 401) |

---

## 8. Riwayat Transaksi & Struk Thermal (fitur 25 Agu 2026)

> Prasyarat: layanan lengkap menyala (MySQL/Redis/serve/Reverb/Vite). Uji dilakukan 26 Agu 2026.

| # | Kasus | Hasil Diharapkan | Status |
|---|---|---|---|
| 8.1 | Order dari **Kasir** buat order → **Bayar di Muka** (Tunai) | Langsung masuk tab **Nota** (`diproses`) tanpa langkah konfirmasi; meja jadi `terisi`; struk tampil | ✅ |
| 8.2 | Order dari **Pelayan/Self-order** (bayar QRIS di muka) | Masuk "Masuk" (`menunggu`, blm lunas) → setelah **paid** (tombol demo/Saya Sudah Bayar) pindah ke Nota (`diproses`) | ✅ |
| 8.2b | **Scan barcode kasir**: pelanggan pilih **Bayar di Kasir** (barcode/nomor di HP) → kasir isi kotak scan di tab **Masuk** (scan barcode gun ATAU ketik `ORD-XXXX` ATAU kamera) | Order yang cocok otomatis membuka modal **Bayar** → tunai/QRIS → Nota (`diproses`); input tidak dikenali/tidak ketemu → pesan jelas tanpa crash | ⬜ |
| 8.2c | Modal **Scan Kamera** (tombol kamera di kotak scan) | Kamera terbuka, tombol ganti Belakang/Depan; barcode terbaca → modal Bayar terbuka; kamera ditutup setelah berhasil | ⬜ |
| 8.3 | Dapur proses ticket | Mulai Masak → Siap Saji; status item berubah real-time | ✅ |
| 8.4 | Bayar nota (tunai/QRIS) | Struk tampil: logo → nama restoran **di bawah logo** → alamat; lebar ±80mm, tinggi mengikuti jumlah item; pajak sesuai tarif terkini | ✅ |
| 8.5 | Tab **Riwayat** panel Kasir setelah bayar | Transaksi `selesai` muncul otomatis (real-time, action=paid) dengan jam, no.order, meja/sumber, total, badge metode (Tunai hijau / QRIS biru); filter chip Hari ini/Semua | ✅ |
| 8.6 | Klik baris riwayat | Cetak ulang struk dengan data pembayaran lengkap (method/cash/change/paidAt) | ✅ |
| 8.7 | Admin → **Riwayat Transaksi** | Tabel order selesai: filter rentang tanggal, cari no.order, dropdown metode, reset; klik baris → cetak ulang; bertambah real-time saat kasir bayar | ✅ |
| 8.8 | Admin ubah PPN/logo/nama restoran → buka Kasir **tanpa refresh** | Keranjang & struk memakai nilai baru instan (event `SettingsChanged`) | ✅ |
| 8.9 | Cetak fisik via printer thermal *(jika tersedia)* | Preview cetak: struk ramping 80mm terpusat atas kertas, tanpa judul halaman/URL browser | ✅ (preview) |

---

## 9. Menu Varian & Void Order (fitur baru)

> Prasyarat: seed data demo sudah punya varian untuk menu #M01 (Nasi Goreng), #M03 (Mie Ayam), #M08 (Es Teh), #M09 (Es Jeruk), dan satu order mock ORD-0004 berstatus `dibatalkan`.

### 9a. Menu Varian (Admin → Kasir/Pelayan/Menu QR)

| # | Kasus | Hasil Diharapkan | Status |
|---|---|---|---|
| 9.1 | Admin → **Manajemen Menu** → edit menu **Nasi Goreng** (#M01) | Muncul bagian **Varian** dengan 2 baris: Original / Jumbo, masing-masing punya nama, harga, toggle aktif, dan **foto varian** | ⬜ |
| 9.2 | Tambah varian baru (klik tombol tambah) | Baris varian kosong baru muncul | ⬜ |
| 9.3 | Isi nama (mis. "Jumbo") + harga, klik **Simpan** | Varian tersimpan; harga varian pertama ikut dijadikan harga dasar menu | ⬜ |
| 9.4 | Matikan toggle **aktif** pada satu varian, Simpan | Varian tidak bisa dipilih di Kasir/Pelayan/Menu QR (tidak tampil/disabled) | ⬜ |
| 9.5 | Hapus satu varian (tombol hapus), Simpan | Varian hilang dari daftar | ⬜ |
| 9.6 | Buka **Kasir** → kategori Makanan | Item Nasi Goreng menampilkan **pill varian** (Original/Jumbo) | ⬜ |
| 9.7 | Pilih varian **Jumbo**, tambah ke keranjang | Masuk keranjang sebagai baris terpisah dengan harga varian (lebih mahal dari Original), label "Jumbo" tampil | ⬜ |
| 9.8 | Tambah item sama dengan varian berbeda (Original + Jumbo) | Muncul sebagai **2 baris terpisah** di keranjang (bukan digabung) | ⬜ |
| 9.9 | Buka **Pelayan** → pilih meja → tambah item ber-varian | Pill varian muncul & pilihan berfungsi seperti di Kasir | ⬜ |
| 9.10 | Buka **Menu QR** (`/menu/T1`) → item ber-varian | Pill varian muncul; pilih varian → harga menyesuaikan → kirim pesanan | ⬜ |
| 9.11 | Lihat struk (Kasir) / OrderTicket (KDS) setelah order ber-varian | Nama item diikuti label varian (mis. "Nasi Goreng - Jumbo") di struk & ticket | ⬜ |

### 9b. Void / Cancel Order (Admin & Kasir)

| # | Kasus | Hasil Diharapkan | Status |
|---|---|---|---|
| 9.12 | Kasir buat order (belum dibayar) → muncul di panel Kasir | Tombol **Batalkan** tersedia di kartu order | ⬜ |
| 9.13 | Klik **Batalkan** → modal **Alasan Pembatalan** (dropdown preset / ketik bebas) → klik **Ya, Batalkan** | Order berstatus `dibatalkan`; badge "Batal" tampil; hilang dari daftar yang harus diproses/dibayar; alasan muncul di riwayat | ⬜ |
| 9.14 | Order tersebut terkait meja (bukan Take Away) | Meja kembali ke status **kosong** secara otomatis | ⬜ |
| 9.15 | Coba **Batalkan** order yang sudah `selesai` / `dibatalkan` | Tombol tidak tersedia / ditolak (tidak bisa void dua kali) | ⬜ |
| 9.16 | Coba **Batalkan** order dari role **pelayan** | Tidak ada tombol / tidak punya izin; role **admin, kasir, dapur** boleh void | ⬜ |
| 9.17 | Admin → **Riwayat Transaksi** / panel Riwayat Kasir, filter status **Dibatalkan** | Order yang di-void muncul dengan badge "Batal" | ⬜ |
| 9.18 | Order `dibatalkan` tidak dihitung di **Laporan Penjualan** | Total laporan tidak memasukkan order yang dibatalkan | ⬜ |
| 9.19 | Order dibatalkan tidak bisa dibayar | Klik bayar → ditolak / tidak tersedia (guard `dibatalkan`) | ⬜ |
| 9.20 | Void order via backend langsung (curl `PATCH /api/orders/{id}/void` sebagai kasir/admin) | Response sukses, status jadi `dibatalkan`; event `OrderStatusChanged` action=voided terkirim (bisa dicek listener WS) | ⬜ |

### 9c. Foto per Varian Ukuran (Original/Jumbo)

> Fitur foto berbeda per **ukuran** saja (keputusan user). Rasa "pedas" tetap level 0-5 tanpa foto terpisah. Foto varian diunggah oleh Admin; simpan otomatis ke `storage/menu-items/variants`.

| # | Kasus | Hasil Diharapkan | Status |
|---|---|---|---|
| 9.21 | Admin → edit **Nasi Goreng** → baris varian **Original** → pilih file foto (PNG/JPG/WebP ≤2 MB) → **Simpan** | Foto tersimpan untuk varian Original; tampil di preview baris varian & tabel halaman Admin | ⬜ |
| 9.22 | Ulangi untuk varian **Jumbo** dengan foto berbeda → Simpan | Kedua varian punya foto berbeda | ⬜ |
| 9.23 | **Kasir** → kategori Makanan → Nasi Goreng | Foto awal = varian pertama yang punya foto; klik pill **Jumbo** → foto kartu berganti foto Jumbo; klik **Original** → berganti foto Original | ⬜ |
| 9.24 | Sama di **Pelayan** & **Menu QR** (`/menu/T1`) | Thumbnail berganti mengikuti varian yang diklik (termasuk kartu unggulan/Featured) | ⬜ |
| 9.25 | Edit varian tanpa ganti foto, klik Simpan | Foto varian yang lama tetap ada (tidak hilang) | ⬜ |
| 9.26 | Menu ber-varian tanpa foto (item & varian kosong) | Thumbnail memakai placeholder SVG (bukan error gambar) | ⬜ |

## 10. Level Kepedasan 0-5, PPN Persisten, Void Alasan (fitur PRD batch 2)

> Prasyarat: seed demo menandai #M01 (Nasi Goreng Spesial), #M02 (Ayam Bakar), #M03 (Mie Ayam), #M07 (Nasi Uduk) sebagai item **pedas**. #M01 & #M03 juga ber-varian.

### 10a. Level Kepedasan (Kasir / Pelayan / Menu QR)

| # | Kasus | Hasil Diharapkan | Status |
|---|---|---|---|
| 10.1 | Buka **Kasir** → kategori Makanan → item **Ayam Bakar** (#M02, pedas tanpa varian) | Tampil pill **Level 0 1 2 3 4 5** (bukan tombol +) | ⬜ |
| 10.2 | Klik pill **Level 3** pada Ayam Bakar | Masuk keranjang sebagai baris dengan label "Level 3"; harga item dasar | ⬜ |
| 10.3 | Item pedas **Nasi Goreng** (#M01, pedas + ber-varian) | Pill varian (Original/Jumbo) tampil; klik varian → masuk keranjang (level diatur di keranjang) | ⬜ |
| 10.4 | Di keranjang, baris item pedas menampilkan stepper **Level Pedas − N +** | Klik **+** naik ke 4, **−** turun; batas 0-5 (tombol nonaktif di ujung) | ⬜ |
| 10.5 | Tambah Ayam Bakar Level 2 lalu tambah lagi Level 4 | Muncul **2 baris terpisah** (level berbeda = baris berbeda); tambah lagi Level 2 → digabung qty baris Level 2 | ⬜ |
| 10.6 | Kirim order ber-level ke dapur → buka **KDS** (`/kitchen`) | Item ditampilkan "Level N" jelas di ticket agar dapur tepat racik | ⬜ |
| 10.7 | **Menu QR** (`/menu/T1`) → item pedas tanpa varian (Ayam Bakar) | Pill Level tampil; pilih level → keranjang; kirim pesanan | ⬜ |
| 10.8 | Struk (Kasir) setelah order ber-level | Nama item diikuti "Level N" | ⬜ |
| 10.9 | Item **bukan** pedas (mis. Es Teh) | Tidak ada pill level, tetap tombol + / pill varian biasa | ⬜ |

### 10b. Admin: Toggle Item Pedas

| # | Kasus | Hasil Diharapkan | Status |
|---|---|---|---|
| 10.10 | Admin → **Manajemen Menu** → edit item | Ada checkbox **Item Pedas**; centang → **Simpan** | ⬜ |
| 10.11 | Setelah disimpan, menu tampilkan badge **Pedas** di tabel | Badge "Pedas" tampil di dekat nama item yang `isSpicy` | ⬜ |
| 10.12 | Item kini muncul pill Level di Kasir/Pelayan/Menu QR | Perubahan `is_spicy` tersimpan & berefek di semua antarmuka | ⬜ |

### 10c. Void Wajib Alasan + Role Dapur

| # | Kasus | Hasil Diharapkan | Status |
|---|---|---|---|
| 10.13 | Kasir/via KDS klik **Batalkan** tanpa mengisi alasan | Tombol "Ya, Batalkan" menampilkan pesan "Alasan pembatalan wajib diisi" (tidak melanjutkan) | ⬜ |
| 10.14 | Pilih alasan preset (dropdown) lalu **Ya, Batalkan** | Order `dibatalkan`; riwayat Kasir menampilkan alasan | ⬜ |
| 10.15 | Role **dapur** coba void via KDS (tombol Batalkan di ticket) | Berhasil void (role dapur kini boleh void sesuai PRD) | ⬜ |
| 10.16 | Cek backend: order yang di-void punya `void_reason` | `GET /api/orders` menampilkan `voidReason` pada order `dibatalkan` | ⬜ |

### 10d. PPN Persisten per-Transaksi

| # | Kasus | Hasil Diharapkan | Status |
|---|---|---|---|
| 10.17 | Bayar nota → struktur struk: Subtotal / Pajak X% / Total | Subtotal & Pajak tercetak sesuai tarif & dijumlahkan benar (subtotal = total ÷ (1+rate)) | ⬜ |
| 10.18 | Ubah tarif PPN admin → **cetak ulang struk** transaksi lama (riwayat) | Struk lama tetap pakai nilai PPN **saat transaksi** (persisten, tidak ikut tarif baru) | ⬜ |
| 10.19 | Backend `GET /api/orders` untuk transaksi ber-PPN | Payment menampilkan `subtotal`, `ppnAmount`, `total` | ⬜ |

---

## Catatan Penting

- **Real-time asli**: KDS, panel Kasir, & tracking pelanggan memakai Laravel Reverb + Redis (≤ 2 detik, tanpa refresh). Pastikan backend `8000`, `reverb:start` `8080`, Redis `6379`, MySQL `3306`, dan Vite `5173` menyala.
- **Menu juga real-time** (event `MenuChanged`, channel `menu`): perubahan menu dari Admin (Habis/Tersedia, nama, harga, deskripsi, foto, tambah/hapus) langsung tampil di halaman Menu QR & panel menu Kasir tanpa refresh.
- **Data tersimpan di database MySQL** (`dineflow_pos`): perubahan tidak hilang saat refresh. Untuk reset ke data demo: `php artisan migrate:fresh --seed` di `backend/`.
- **Upload foto menu** disimpan di `backend/storage/app/public/menu-items` (URL `http://localhost:8000/storage/...`).
- Jika ditemukan bug → tulis langkah reproduksinya ke `todo.md` lalu kerjakan.
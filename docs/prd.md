# PRODUCT REQUIREMENTS DOCUMENT

**Nama Produk**: Sistem Kasir & Manajemen Pesanan Restoran (Resto POS Multi-Channel)
**Nama Produk/Produk**: DineFlow POS
**Tanggal**: 6 Agustus 2026
**Penyusun**: Fadhil Faith Al Abrisam Dewanto

> Dokumen ini adalah versi markdown yang diekstrak dari dokumen Word asli
> (`_ PRODUCT REQUIREMENTS DOCUMENT (PRD).md`). Isi mengikuti naskah asli.

---

## 1. Ringkasan Eksekutif

Sistem Kasir & Manajemen Pesanan Restoran ini adalah platform POS (Point of Sale) yang mengintegrasikan seluruh alur operasional restoran — mulai dari pemesanan (baik oleh kasir, pelayan, maupun pelanggan sendiri via QR code di meja), dapur (kitchen display system), hingga pembayaran — dalam satu sistem terpusat dan real-time. Produk ini dilatarbelakangi oleh kebutuhan restoran modern yang harus melayani banyak channel pemesanan sekaligus (kasir konvensional, pelayan keliling dengan tablet, dan tren self-order dari meja lewat QR code), sementara proses manual (kertas order/nota tulis tangan yang dibawa ke dapur) rawan salah catat, lambat, dan sulit dilacak. Tujuan utama produk adalah menyatukan seluruh channel pemesanan dalam satu alur yang konsisten, mempercepat komunikasi antara pelanggan-pelayan-dapur-kasir secara real-time, mengurangi kesalahan pesanan, serta menyediakan data penjualan yang akurat bagi pemilik restoran.

### Informasi Produk

| Aspek | Keterangan |
|---|---|
| Jenis Produk | Sistem Point of Sale (POS) Restoran dengan Multi-Channel Order (Kasir, Pelayan, Pesan Mandiri dari Meja) dan Kitchen Display System |
| Platform | Web (Kasir & Admin), Aplikasi Web/PWA (Pelayan — tablet/HP), Web Publik (Pesan Mandiri via QR Code di Meja), Layar Dapur (Kitchen Display) |
| Framework | Laravel (Backend API & Broadcasting), React (Frontend — Kasir, Pelayan, Dapur, Menu Pesan Mandiri) |
| Database | MySQL/MariaDB, Redis (untuk broadcasting real-time status pesanan) |

---

## 2. Target Audiens & Persona Pengguna

### Kasir
- **Karakteristik**: Usia 20-35 tahun, bertugas menerima pembayaran dan mengelola transaksi harian.
- **Pain Points**: Pesanan dari pelayan sering ditulis manual di kertas dan diserahkan bolak-balik, rawan hilang atau salah baca tulisan, serta sulit merekap penjualan di akhir shift.

### Pelayan (Waitress/Waiter)
- **Karakteristik**: Usia 18-30 tahun, melayani pelanggan langsung di meja, mencatat pesanan, dan mengantar makanan.
- **Pain Points**: Harus bolak-balik ke dapur dan kasir untuk menyampaikan pesanan secara manual, dan sering lupa detail permintaan khusus pelanggan (misal "tidak pedas", "extra saus").

### Staf Dapur (Kitchen)
- **Karakteristik**: Usia 20-40 tahun, memasak sesuai pesanan yang masuk.
- **Pain Points**: Menerima kertas order yang tulisannya kadang tidak terbaca, tidak tahu urutan prioritas pesanan mana yang harus didahulukan, dan pesanan kadang terlewat atau tertukar.

### Pelanggan
- **Karakteristik**: Usia beragam, makan di restoran dan ingin memesan tanpa menunggu lama dipanggil pelayan.
- **Pain Points**: Harus menunggu pelayan datang untuk memesan atau menambah pesanan, dan tidak tahu estimasi berapa lama makanannya akan siap.

### Owner/Admin Restoran
- **Karakteristik**: Pemilik yang ingin memantau operasional dan penjualan restorannya.
- **Pain Points**: Sulit mendapatkan laporan penjualan akurat dan real-time tanpa rekap manual di akhir hari, serta tidak tahu menu mana yang paling laris atau jam sibuk restoran.

---

## 3. Ruang Lingkup Produk & Batasan

### Dalam Ruang Lingkup (In Scope — Fase Ini)
- Input pesanan oleh Kasir (walk-in langsung di kasir)
- Input pesanan oleh Pelayan (dari meja, via tablet/HP pelayan)
- Pesan mandiri oleh pelanggan via scan QR code di meja (self-order)
- Kitchen Display System (KDS) — tampilan real-time pesanan masuk untuk dapur, dengan update status per item
- Notifikasi status pesanan real-time ke semua pihak terkait (kasir, pelayan, pelanggan)
- Manajemen menu (kategori, harga, foto, status tersedia/habis)
- Manajemen meja (nomor meja, status meja: kosong/terisi/perlu dibersihkan)
- Proses pembayaran di kasir (tunai, kemungkinan QRIS/kartu sederhana)
- Cetak/kirim struk pesanan
- Laporan penjualan harian & menu terlaris untuk admin/owner

### Di Luar Ruang Lingkup (Out of Scope — Fase Ini)
- Integrasi payment gateway online penuh untuk pembayaran sebelum datang ke resto (fase awal fokus pembayaran di kasir saat di tempat)
- Sistem reservasi meja online (booking meja dari jauh-jauh hari) — fase lanjutan
- Program loyalty/membership pelanggan tetap
- Manajemen inventori bahan baku mendetail (fase awal cukup status "tersedia/habis" per menu, bukan tracking stok bahan mentah per gram/kg)
- Multi-cabang/multi-outlet dalam satu sistem terpusat (fase awal untuk 1 outlet/cabang)

---

## 4. Fitur Utama & Kebutuhan

### Input Pesanan Multi-Channel (Kasir)
- **Deskripsi**: Kasir dapat menginput pesanan langsung untuk pelanggan yang datang ke meja kasir (take away/dine-in tanpa pelayan).
- **Skenario Penggunaan**: Pelanggan datang langsung ke kasir, memesan 2 nasi goreng dan 1 es teh; kasir input langsung dan pesanan otomatis terkirim ke dapur.

### Input Pesanan oleh Pelayan (Tablet/HP)
- **Deskripsi**: Pelayan mencatat pesanan dari meja pelanggan melalui aplikasi di tablet/HP, lengkap dengan catatan khusus (level pedas, tanpa bawang, dll).
- **Skenario Penggunaan**: Pelayan mencatat pesanan meja nomor 5 — 1 ayam bakar (tidak pedas), 2 es jeruk — langsung terkirim ke dapur dan kasir tanpa perlu berjalan ke dapur.

### Pesan Mandiri via QR Code di Meja
- **Deskripsi**: Pelanggan memindai QR code unik di mejanya, muncul menu digital, pelanggan memilih dan mengirim pesanan sendiri yang otomatis tertaut ke nomor meja tersebut.
- **Skenario Penggunaan**: Pelanggan di meja nomor 8 memindai QR, memesan 1 mie ayam dan 1 jus alpukat lewat HP-nya sendiri tanpa menunggu pelayan; pesanan otomatis muncul di kasir untuk dikonfirmasi dan diteruskan ke dapur.

### Kitchen Display System (KDS)
- **Deskripsi**: Layar di dapur menampilkan seluruh pesanan masuk secara real-time, terurut berdasarkan waktu masuk, dengan status per item (baru/dimasak/siap).
- **Skenario Penggunaan**: Dapur melihat 5 pesanan aktif di layar, menandai item "Ayam Bakar meja 5" sebagai "Sedang Dimasak", lalu "Siap Saji" setelah selesai — status ini otomatis terlihat oleh pelayan dan kasir.

### Notifikasi Real-Time Lintas Channel
- **Deskripsi**: Begitu status pesanan berubah (di dapur, kasir, atau pelayan), seluruh pihak terkait mendapat pembaruan otomatis tanpa perlu refresh manual.
- **Skenario Penggunaan**: Begitu dapur menandai pesanan meja 8 "Siap Saji", pelayan menerima notifikasi di HP-nya untuk segera mengantar, dan pelanggan di meja 8 juga melihat status "Makanan Anda sedang diantar" di HP-nya.

### Manajemen Meja
- **Deskripsi**: Admin/kasir dapat melihat status seluruh meja (kosong, terisi, perlu dibersihkan), dan setiap meja memiliki QR code unik untuk self-order.
- **Skenario Penggunaan**: Kasir melihat peta meja; meja 3 dan 7 berstatus "kosong", meja 5 "terisi — sedang makan", sehingga bisa mengarahkan pelanggan baru ke meja yang kosong.

### Proses Pembayaran & Struk
- **Deskripsi**: Kasir menerima pembayaran (tunai/QRIS sederhana) untuk pesanan yang sudah selesai, lalu mencetak atau mengirim struk digital.
- **Skenario Penggunaan**: Pelanggan di meja 5 selesai makan; kasir memanggil detail pesanan meja 5, menerima pembayaran tunai, mencetak struk, dan menandai meja 5 sebagai "perlu dibersihkan".

### Manajemen Menu
- **Deskripsi**: Admin mengelola daftar menu, kategori (makanan/minuman/dessert), harga, foto, dan status ketersediaan yang bisa ditandai "habis" secara instan.
- **Skenario Penggunaan**: Menu "Ayam Bakar" habis di tengah jam sibuk; admin/kasir menandai status "Habis" dan menu otomatis tidak muncul lagi di aplikasi pesan mandiri pelanggan.

### Laporan Penjualan & Menu Terlaris
- **Deskripsi**: Dashboard bagi owner untuk melihat total penjualan harian/mingguan/bulanan serta menu apa yang paling laris.
- **Skenario Penggunaan**: Owner membuka laporan mingguan dan melihat "Nasi Goreng" adalah menu terlaris dengan 120 porsi terjual, sehingga memutuskan menambah stok bahan baku untuk menu tersebut.

---

## 5. Alur Pengguna & Navigasi

### Kasir
Login lalu buka sesi kasir, terima pesanan (input manual atau lihat pesanan masuk dari pelayan/meja), konfirmasi pesanan ke dapur, terima pembayaran, cetak/kirim struk, dan tutup sesi kasir di akhir shift.

### Pelayan
Login, pilih meja yang dilayani, input pesanan pelanggan di meja tersebut, kirim pesanan ke dapur dan kasir, pantau status pesanan, antar makanan ke meja, lalu perbarui status menjadi "sudah diantar".

### Pelanggan (Pesan Mandiri via QR di Meja)
Scan QR code di meja, lihat menu digital, pilih menu dan jumlah, submit pesanan, pantau status pesanan dari HP sendiri, dan bayar di kasir saat selesai.

### Dapur (Kitchen)
Login ke Kitchen Display, terima pesanan masuk secara real-time (urut antrian), perbarui status per item (diterima, dimasak, siap saji), dan notifikasi otomatis terkirim ke pelayan/kasir saat siap.

### Admin/Owner
Login, kelola menu (kategori, harga, status ketersediaan), kelola meja (jumlah, nomor, QR code), kelola staf beserta hak aksesnya, dan lihat laporan penjualan serta performa restoran.

---

## 6. Kebutuhan Data & Arsitektur

### Entitas Data Utama
- **Users** (kasir, pelayan, dapur, admin/owner) dengan role dan hak akses berbeda
- **Tables/Meja** — nomor meja, status (kosong/terisi/perlu dibersihkan), QR code unik
- **MenuItems** — nama, kategori, harga, foto, status ketersediaan
- **Orders** — relasi ke Table (jika dine-in), sumber pesanan (kasir/pelayan/self-order), status keseluruhan, waktu dibuat
- **OrderItems** — item per pesanan (menu, jumlah, catatan khusus), status per item (baru/dimasak/siap/diantar)
- **Payments** — detail pembayaran per Order (metode, jumlah, waktu, kasir yang memproses)
- **DailySalesSummary** — agregasi data penjualan harian untuk laporan cepat owner

### Catatan Arsitektur
Arsitektur menggunakan Laravel sebagai backend tunggal yang melayani empat jenis antarmuka frontend berbeda (Kasir, Pelayan, Kitchen Display, dan halaman publik Pesan Mandiri) — semuanya dibangun dengan React sebagai aplikasi/halaman terpisah yang mengonsumsi API yang sama. Update status pesanan secara real-time ke seluruh channel (kasir, pelayan, dapur, pelanggan) ditangani menggunakan Laravel Broadcasting (Reverb) dengan Redis sebagai message layer, sehingga begitu status sebuah item pesanan berubah di satu titik (misal dapur menandai "siap saji"), seluruh antarmuka lain yang relevan langsung menerima pembaruan tanpa perlu polling/refresh manual. Setiap meja memiliki QR code unik yang mengarah ke URL halaman menu publik dengan parameter nomor meja tertanam, sehingga pesanan self-order otomatis terhubung ke meja yang benar.

---

## 7. Teknologi & Integrasi

| Lapisan | Teknologi |
|---|---|
| Frontend | React (TypeScript) untuk empat antarmuka berbeda (Kasir, Pelayan, Kitchen Display, Menu Pesan Mandiri publik), Tailwind CSS |
| Backend | Laravel (PHP) sebagai REST API, Laravel Broadcasting (Reverb) untuk update status pesanan real-time ke seluruh channel |
| Database / Infra | MySQL/MariaDB untuk data transaksional, Redis untuk mendukung broadcasting real-time |

### Kebutuhan Integrasi
- Generator QR Code (dapat memakai pustaka open-source, tidak memerlukan layanan berbayar pihak ketiga) untuk membuat QR unik tiap meja
- Printer thermal (opsional, via koneksi lokal/USB atau layanan cetak jaringan) untuk mencetak struk fisik
- Payment gateway sederhana (opsional, mis. QRIS statis/dinamis dari penyedia lokal) apabila ingin mendukung pembayaran non-tunai selain tunai manual

---

## 8. Kebutuhan Non-Fungsional (NFR)

| Aspek | Kebutuhan |
|---|---|
| Keamanan | Akses ke Kitchen Display dan aplikasi Kasir/Pelayan dibatasi hanya untuk staf dengan akun terverifikasi (role-based access); halaman pesan mandiri publik tidak memerlukan login namun dibatasi hanya bisa memesan untuk meja yang QR code-nya dipindai. |
| Performa | Pembaruan status pesanan harus tersampaikan ke seluruh channel terkait dalam waktu maksimal 2 detik agar koordinasi dapur-pelayan-kasir tetap lancar saat jam sibuk. |
| Skalabilitas | Sistem harus mampu menangani puluhan meja aktif dengan pesanan bersamaan tanpa keterlambatan notifikasi, sesuai kapasitas restoran skala kecil-menengah. |
| Keandalan | Sistem harus tetap mencatat pesanan dengan benar meski terjadi lonjakan pesanan bersamaan (jam makan siang/malam ramai), tanpa ada pesanan yang hilang atau tertukar antar meja. |
| Usability | Antarmuka Kitchen Display harus dapat dibaca dengan jelas dari jarak agak jauh (ukuran teks besar, warna status kontras), mengingat staf dapur sering melihat sambil memasak. |

---

## 9. Asumsi & Ketergantungan

### Asumsi
- Restoran memiliki koneksi internet/WiFi lokal yang stabil untuk mendukung komunikasi real-time antar perangkat (kasir, tablet pelayan, layar dapur, HP pelanggan)
- Setiap meja dapat diberi label fisik QR code (dicetak/ditempel) tanpa kendala
- Staf (kasir, pelayan, dapur) memiliki perangkat yang memadai (tablet/HP/komputer) untuk mengakses sistem masing-masing
- Restoran beroperasi sebagai satu outlet/cabang tunggal pada fase awal ini

### Dependencies
- Perangkat keras pendukung: tablet/HP untuk pelayan, layar/monitor untuk Kitchen Display, printer thermal (opsional) di kasir
- Jaringan WiFi lokal restoran yang stabil dan mencakup seluruh area (dapur, kasir, area meja pelanggan)
- Percetakan label QR code fisik untuk ditempel di tiap meja

---

## 10. Rencana Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Koneksi WiFi restoran tidak stabil, terutama saat jam sibuk | Notifikasi status pesanan terlambat/tidak sampai, menyebabkan miskomunikasi dapur-pelayan-kasir | Sediakan mekanisme fallback (tampilan tetap bisa di-refresh manual jika notifikasi real-time gagal) dan rekomendasikan router WiFi yang memadai untuk kapasitas restoran |
| Pelanggan salah memindai QR code atau QR code meja tertukar/rusak | Pesanan self-order salah terhubung ke meja yang tidak sesuai | Verifikasi nomor meja ditampilkan jelas di halaman pesan mandiri sebelum submit, serta staf dapat mengoreksi manual dari sisi kasir jika ada kesalahan |
| Staf dapur/pelayan belum terbiasa dengan sistem digital | Adopsi sistem lambat, staf kembali ke cara manual | Sediakan onboarding sederhana dan antarmuka yang seminimal mungkin langkahnya (idealnya semudah mencatat di kertas, bahkan lebih cepat) |

---

## 11. Indikator Keberhasilan

- Waktu rata-rata dari pesanan dibuat hingga sampai ke dapur di bawah 5 detik (dibanding proses manual yang bisa memakan waktu 1-2 menit)
- Tingkat kesalahan pesanan (salah menu/salah meja) menurun signifikan dibanding proses pencatatan manual sebelumnya
- Minimal 30% dari total pesanan berasal dari fitur self-order QR code dalam 2 bulan pertama penggunaan
- Waktu rekap laporan penjualan harian oleh owner berkurang dari manual (bisa puluhan menit) menjadi instan/real-time

---

## 12. Milestone & Perkiraan Waktu

| Fase | Deliverable |
|---|---|
| Fase 1 — Discovery & Desain | Pemetaan alur operasional resto (kasir, pelayan, dapur), wireframe tiap antarmuka |
| Fase 2 — Backend Inti (Menu, Meja, Order) | API menu, meja, order, autentikasi staf berbasis role |
| Fase 3 — Antarmuka Kasir & Pelayan | Halaman input pesanan kasir dan pelayan (tablet/HP) |
| Fase 4 — Kitchen Display & Broadcasting Real-Time | Layar dapur real-time, notifikasi status lintas channel (Laravel Reverb) |
| Fase 5 — Halaman Pesan Mandiri (QR Code) & Pembayaran | Menu publik via QR, generator QR per meja, proses pembayaran & struk |
| Fase 6 — QA & Deployment | Pengujian alur end-to-end lintas channel, rilis & pelatihan staf resto |
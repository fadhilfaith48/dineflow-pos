# PROGRESS.md - DineFlow POS Frontend

Dokumen progres & roadmap pengembangan frontend. **Baca di awal setiap sesi**, update checklist & log setelah menyelesaikan step baru.

## 1. Status Keseluruhan

| # | Step | Status | Catatan |
|---|---|---|---|
| 1 | Scaffold proyek (Vite + React + TS + Tailwind) | ✅ Selesai | Token DESIGN.md di `src/index.css`, alias `@` terpasang |
| 2 | Kasir `/kasir` | ✅ Selesai | 2 kolom, keranjang, pembayaran tunai/QRIS |
| 3 | Pelayan `/pelayan` | ✅ Selesai | Mobile-first: pilih meja → input → kirim → daftar pesanan |
| 4 | Kitchen Display `/kitchen` | ✅ Selesai | Grid ticket, update status per item, polling 5s (simulasi real-time) |
| 5 | Pesan Mandiri QR `/menu/:table` | ✅ Selesai | Katalog, keranjang, tracking status pesanan |
| 6 | Admin `/admin` | ✅ Selesai | 4 tab: Manajemen Menu, Meja (+QR), Staf, Laporan (filter periode) |
| 7 | Sambungkan ke API Laravel | ⬜ Belum | Ganti `MockApi` di `src/services/mockApi.ts` dengan fetch/axios, UI tidak berubah |
| 8 | Real-time Laravel Reverb + Redis | ⬜ Belum | Ganti polling 5s (KDS, tracking QR) dengan Laravel Echo |
| 9 | Auth & role (kasir/pelayan/dapur/admin) | ✅ Selesai (mock) | Login + guard role + logout, akun demo (password 1234). Auth nyata (Sanctum) tetap di rencana B |
| 10 | Generator QR per meja + cetak struk | ✅ Selesai | QR per meja di Admin → link `/menu/:qr`; struk di Kasir (ReceiptModal: cetak + salin) |
| 11 | Fitur lanjutan (laporan periode, stok otomatis) | ⬜ Belum | Stok otomatis belum; laporan periode ✅ (lihat step 17) |
| 12 | Admin: kelola meja & QR | ✅ Selesai | Tambah/hapus meja, atur status, QR per meja → link `/menu/:meja` |
| 13 | Admin: kelola menu lengkap + foto | ✅ Selesai | Tambah/hapus menu, ubah nama/kategori/deskripsi, foto via URL (tampil di menu pelanggan) |
| 14 | Admin: kelola staf | ✅ Selesai | Daftar user + role (tambah, ubah role, hapus) |
| 15 | Kasir: pilih meja / take-away | ✅ Selesai | Pilih meja dine-in / take-away sebelum bayar (TablePickerModal) |
| 16 | Cetak/kirim struk (Kasir) | ✅ Selesai | ReceiptModal: tampil setelah sukses bayar, tombol Cetak + Salin Struk |
| 17 | Laporan filter periode (Admin) | ✅ Selesai | Harian / 7 hari / bulan ini / semua |
| 18 | Kasir: pesanan masuk & konfirmasi | ✅ Selesai | Panel "Pesanan Masuk": order pelayan/self-order status `menunggu-konfirmasi`, tombol Konfirmasi → `diproses` (tampil di KDS), badge jumlah (polling 5s) |
| 19 | Kasir: bayar nota meja yang sudah ada | ✅ Selesai | Tab "Nota" di panel queue Kasir: daftar order `diproses` per meja, tombol Bayar (tunai/QRIS) → struk; `processPayment` → order `selesai` + meja `perlu dibersihkan` |
| 20 | Status meja otomatis | ✅ Selesai | `createOrder` dine-in → meja `terisi`; `processPayment` → `perlu dibersihkan`; admin tetap bisa ubah manual. Pelayan & Kasir refresh status meja |
| 21 | KDS urut waktu masuk | ✅ Selesai | `activeOrders` diurutkan by `createdAt` naik (tertua dulu = antrian) |
| 22 | Tes otomatis | ✅ Selesai | Vitest + React Testing Library + jest-dom (18 tes): service layer (`mockApi` login/createOrder/getSalesSummary) & guard/redirect (ProtectedRoute, login → roleHome). Jalankan `npm test` |
| 23 | Simulasi QRIS di PaymentModal | ✅ Selesai | Metode QRIS kini menampilkan QR dinamis (EMVCo, nominal total) + status "Menunggu pembayaran..." → tombol "Simulasi Pembayaran Sukses" → status "Pembayaran berhasil" → "Tandai Lunas" baru memanggil `onConfirm` |

## 2. Cara Kerja (konvensi wajib)

- **Bertahap**: kerjakan satu fitur/step per batch, bukan semuanya sekaligus.
- **Verifikasi wajib** tiap selesai: `npm run build` (tsc), `npm run lint` (oxlint), lalu `npm test` (vitest) di folder `frontend/`.
- **Warna wajib dari token DESIGN.md** (`src/index.css`) — jangan tambah hex baru di luar tabel token. Aksen biru `#2563EB` hanya untuk elemen aksi utama.
- **Angka/harga/kode order** pakai font monospace (`font-num`).
- **Semua data lewat service layer** (`api.*` dari `src/services/api.ts`) — komponen UI tidak boleh memanggil mock/fetch langsung, supaya gampang ditukar ke backend Laravel.
- **Race condition / transaksi**: aturan AGENTS.md = database transaction + `lockForUpdate()` di backend Laravel, BUKAN Golang/Kafka.
- **Real-time**: Laravel Echo + Reverb + Redis, BUKAN websocket/Node terpisah.
- **Mockup Stitch** (`resto-pos-frontendstitch-export-*`) = panduan LAYOUT; warna/komponen mengikuti DESIGN.md (keputusan: putih/bersih, bukan gaya industrial).

## 3. Peta File (`frontend/src/`)

| File | Fungsi |
|---|---|
| `App.tsx` | Router: `/` → `/kasir`, plus `/kitchen`, `/pelayan`, `/menu/:table`, `/admin`, `/login`, `*` |
| `main.tsx` | Entry point React |
| `index.css` | Token Tailwind v4 (`@theme`) dari DESIGN.md: warna, font, radius, shadow |
| `types/index.ts` | Tipe data PRD: User, DiningTable, MenuCategory, MenuItem, Order, OrderItem, Payment, SalesSummary, SalesPeriod |
| `services/api.ts` | **Kontrak API** (`Api` interface) + payload types — target implementasi Laravel |
| `services/mockData.ts` | Data tiruan (menu, meja, order awal) + `TAX_RATE` (10%) |
| `services/mockApi.ts` | Implementasi `Api` in-memory (state module-level agar lintas halaman berbagi data) |
| `services/mockApi.test.ts` | Tes service layer: login, createOrder (status + pajak), confirmOrder, processPayment (meja), getSalesSummary |
| `context/AuthContext.tsx` | Sesi login (mock), simpan user aktif di localStorage |
| `hooks/useCart.ts` | State keranjang bersama (Kasir, Pelayan, Menu QR): add/increment/decrement/note/clear + summary |
| `lib/format.ts` | `formatRupiah()` |
| `lib/roles.ts` | Label & aturan role (`roleLabel`, role yang boleh akses tiap halaman) |
| `components/Button.tsx` | Tombol primary/outline/danger, ukuran sm/md/lg |
| `components/Card.tsx` | Kartu dasar (radius 12, shadow level 1) |
| `components/StatusBadge.tsx` | Badge pill status (new/cooking/ready/done/danger/neutral), bg 15% + teks warna solid |
| `components/CategoryTabs.tsx` | Tab kategori menu (aktif = biru) |
| `components/TopNavBar.tsx` | Navbar atas (Kasir/Admin): logo + link halaman + indikator online |
| `components/ProtectedRoute.tsx` | Guard rute: cek login + role, redirect ke `/login` |
| `components/guard.test.tsx` | Tes guard & redirect: ProtectedRoute (login/role), LoginPage → `roleHome`, mapping `roleHome` |
| `components/HomeRedirect.tsx` | Redirect `/` sesuai role user (login → dashboard role, belum → `/login`) |
| `pages/PlaceholderPage.tsx` | Halaman kosong untuk rute placeholder/404 |
| `pages/auth/LoginPage.tsx` | Halaman login mock (username = role, password 1234) |
| `pages/kasir/KasirPage.tsx` | Orkestrasi Kasir (load data, filter, bayar nota/cart, struk, polling pesanan masuk + konfirmasi) |
| `pages/kasir/KasirQueuePanel.tsx` | Panel queue Kasir ber-tab: "Masuk" (order `menunggu-konfirmasi` + Konfirmasi) & "Nota" (order `diproses` + Bayar), badge jumlah |
| `pages/kasir/MenuPanel.tsx` | Kolom kiri Kasir: kategori + cari + daftar menu |
| `pages/kasir/CartPanel.tsx` | Kolom kanan Kasir: keranjang nota + subtotal/pajak/total + Hold/Bayar |
| `pages/kasir/PaymentModal.tsx` | Modal pembayaran tunai (input uang + kembalian) / QRIS (simulasi QR dinamis EMVCo + status menunggu → sukses) |
| `pages/kasir/TablePickerModal.tsx` | Pilih meja / take-away sebelum bayar (status per meja) |
| `pages/kasir/ReceiptModal.tsx` | Struk digital setelah bayar: cetak printer + salin teks struk |
| `pages/pelayan/PelayanPage.tsx` | Orkestrasi Pelayan: view tables → order → orders, dengan `TopNavBar` (logout/navigasi) |
| `pages/pelayan/TableSelect.tsx` | Peta meja (status Kosong/Terisi/Perlu Dibersihkan) |
| `pages/pelayan/WaiterOrder.tsx` | Input pesanan mobile + bottom sheet keranjang + kirim ke dapur |
| `pages/pelayan/OrderList.tsx` | Daftar pesanan + tandai diantar |
| `pages/kitchen/KitchenPage.tsx` | KDS: grid ticket + polling 5s, dengan `TopNavBar` (logout/navigasi) |
| `pages/kitchen/OrderTicket.tsx` | Kartu ticket besar, border kiri warna status, tombol Mulai Masak/Siap Saji |
| `pages/menu/MenuPage.tsx` | Pesan mandiri publik: katalog, keranjang, tracking, validasi meja |
| `pages/admin/AdminPage.tsx` | Tab Manajemen Menu / Meja / Staf / Laporan Penjualan |
| `pages/admin/MenuManagement.tsx` | Kelola menu: tambah/hapus, edit nama/kategori/deskripsi/foto, ubah harga, tandai tersedia/habis |
| `pages/admin/TableManagement.tsx` | Kelola meja: tambah/hapus, atur status, lihat QR per meja |
| `pages/admin/StaffManagement.tsx` | Kelola staf: tambah, ubah role, hapus |
| `pages/admin/SalesReport.tsx` | Laporan: kartu total/transaksi/rata-rata + menu terlaris, filter periode (harian/7 hari/bulan ini/semua) |

Catatan: `mockApi.ts` memakai state module-level (`orders`, `menuItems`) sehingga pesanan baru dari satu halaman ikut terlihat di halaman lain dalam 1 sesi browser. Saat pindah ke Laravel, ini menjadi data server.

## 4. Rencana Langkah Berikutnya (urutan saran)

Urutan dibagi dua: **A) fitur frontend murni (tidak butuh backend, bisa dikerjakan sekarang)** dan **B) tergantung backend Laravel**.

### A. Frontend murni (bisa dikerjakan sekarang)

1. ✅ **Login & guard role**: halaman login, guard per role, protect `/kasir`, `/kitchen`, `/pelayan`, `/admin`. `/menu/:table` publik. Akun demo (username = role, password `1234`), sesi tersimpan di localStorage.
2. ✅ **Admin: kelola meja & QR**: daftar meja, tambah/hapus, atur status, tampilkan QR per meja (link ke `/menu/:meja`).
3. ✅ **Admin: kelola menu lengkap**: tambah/hapus menu, ubah nama/kategori/deskripsi, foto via URL (tampil di menu pelanggan sesuai DESIGN.md).
4. ✅ **Admin: kelola staf**: daftar user + tambah + ubah role + hapus.
5. ✅ **Kasir: pilih meja / take-away**: pilih meja saat dine-in di kasir (sekarang `tableId` terisi sesuai pilihan).
6. ✅ **Cetak/kirim struk**: struk digital (`ReceiptModal`) dengan tombol Cetak + Salin, muncul setelah bayar berhasil.
7. ✅ **Laporan filter periode**: harian / 7 hari / bulan ini / semua (`SalesReport`).
8. ✅ **Tes otomatis (A5)**: Vitest + React Testing Library + jest-dom; 18 tes (service layer + guard/redirect). Jalankan `npm test`.

> ✅ **Fase A (frontend murni) SELESAI.** Semua fitur fase A selesai; lanjut ke fase B (backend Laravel) — lihat bagian B di bawah.

### B. Tergantung backend Laravel

1. **API Laravel**: implement `Api` interface dengan fetch/axios ke endpoint backend (base URL di `.env`). Setup CORS backend.
2. **Real-time Reverb**: ganti polling 5s di `KitchenPage` & `MenuPage` (tracking) dengan `laravel-echo` subscribe ke channel pesanan. NFR: notifikasi ≤ 2 detik.
3. **Auth nyata**: ganti mock login dengan endpoint auth Laravel (Sanctum) + role dari server.

## 5. Log Keputusan

- **Desain**: layout ikuti mockup Stitch, tetapi warna/komponen wajib dari DESIGN.md (putih + aksen biru `#2563EB`) — bukan gaya industrial mockup (diputuskan user).
- **Struktur app**: satu SPA React dengan routing, bukan 4 aplikasi terpisah (user pilih rekomendasi).
- **Sumber data**: mock dulu via `MockApi`, service layer siap ditukar ke Laravel (user pilih).
- **Lokasi kode**: dibangun di folder `frontend/` di dalam repo ini, nanti digabung ke folder utama `resto-pos/` bersama `backend/`.
- **PRD asli**: file `_ PRODUCT REQUIREMENTS DOCUMENT (PRD).md` adalah dokumen Word (.docx) ber-ekstensi `.md` — isi sudah dibaca & disarikan di sini.
- **Cetak struk (Kasir)**: setelah bayar sukses langsung tampil `ReceiptModal` (bukan modal sukses statis). Tombol Cetak pakai `window.print()` dengan area `#print-area` khusus; tombol Salin Struk menyalin teks struk ke clipboard.
- **Filter laporan**: `Api.getSalesSummary(period)` menerima `SalesPeriod` (`harian`/`mingguan`/`bulanan`/`semua`). Implementasi mock memfilter `order.createdAt`; saat ke Laravel cukup ganti jadi query tanggal di backend.
- **Foto menu**: pakai URL gambar (belum upload file). Ketika backend siap, ganti ke upload + penyimpanan URL dari server (lihat catatan step 13).
- **Navbar di semua halaman role**: `TopNavBar` kini dipakai di Kasir, Admin, Pelayan, dan Kitchen (sebelumnya Pelayan & Kitchen tampil full-screen tanpa logout/navigasi → user "terjebak"). Setiap role melihat link sesuai hak aksesnya + tombol Keluar; admin melihat semua link (Kasir/Dapur/Pelayan/Admin). Akses antar role tetap diatur `ProtectedRoute` (mis. pelayan tidak bisa ke `/admin`).
- **Alur pesanan masuk Kasir (A1)**: ditambah status order `menunggu-konfirmasi`. `createOrder` dari source `pelayan`/`self-order` → `menunggu-konfirmasi` (belum tampil di dapur); Kasir mengonfirmasi lewat `api.confirmOrder(orderId)` → `diproses` (aktif di KDS). KDS kini hanya menampilkan `diproses` (bukan semua kecuali selesai/dibatalkan). Panel "Pesanan Masuk" di Kasir memakai polling 5s (sama seperti KDS) sebagai simulasi real-time; saat fase B polling diganti Laravel Echo.
- **Bayar nota meja (A2)**: panel queue Kasir diubah jadi ber-tab "Masuk"/"Nota" (`KasirQueuePanel`, menggantikan `PendingOrdersPanel`). Tab "Nota" menampilkan order `diproses` per meja → tombol Bayar → `PaymentModal` (total dari `order.total`) → struk. `processPayment` kini juga menandai meja order dine-in jadi `perlu dibersihkan`.
- **Konsistensi total pesanan**: `createOrder` kini menghitung `order.total` SUDAH termasuk pajak 10% (`Math.round(subtotal * 1.1)`), sama seperti `cart.summary.total`. Total mock order 1 & 2 diperbarui (30800 & 39600) dan ditambah mock order 3 status `menunggu-konfirmasi` (demo panel "Masuk"). Sebelumnya `order.total` = subtotal tanpa pajak (tidak konsisten dengan tagihan yang dibayar).
- **Status meja otomatis (A3)**: `createOrder` dengan `tableId` langsung menandai meja `terisi` di `mockApi`; `processPayment` menandai `perlu dibersihkan` (sudah di A2). Admin tetap bisa ubah manual. `PelayanPage` & `KasirPage` kini me-refresh status meja (setelah submit order / ikut polling 5s) agar peta meja & pemilih meja akurat.
- **Tes otomatis (A5)**: setup Vitest 4 (jsdom) via `vitest.config.ts` + `src/test/setup.ts` (import jest-dom/vitest, `afterEach` cleanup + clear localStorage). Skrip `npm test` (sekali jalan) & `npm run test:watch`. `globals: true` agar auto-cleanup RTL jalan. Konfigurasi test terpisah dari `vite.config.ts` (plugin react + alias `@` saja, tanpa tailwind). Tes mencakup service layer (`mockApi`: login, createOrder status+pajak, confirmOrder, processPayment+meja, getSalesSummary) dan guard (`ProtectedRoute` login/role, LoginPage → `roleHome`, mapping `roleHome`).
- **Simulasi QRIS (Kasir)**: `PaymentModal` metode QRIS menampilkan QR dinamis EMVCo (fungsi lokal `buildQrisPayload` + CRC16-CCITT di `PaymentModal.tsx`) berisi nominal total, bukan teks statis. Alur simulasi: "Menunggu pembayaran..." (animasi ping) → klik "Simulasi Pembayaran Sukses" → status "Pembayaran berhasil" → klik "Tandai Lunas" baru memanggil `onConfirm({ method: 'qris' })`. Merchant fiktif `ID.CO.DINEFLOW.QRIS`; saat fase B QR asli dari penyedia payment gateway.

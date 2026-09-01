# TODO.md - DineFlow POS (Roadmap Pekerjaan)

Daftar tugas proyek DineFlow POS. **Sumber kebenaran pekerjaan** selain `PROGRESS.md`. Centang (`- [x]`) setiap item setelah selesai & terverifikasi (build + lint), lalu sinkronkan dengan `PROGRESS.md`.

---

## Ringkasan Status

- ✅ **Fase A (frontend murni) SELESAI**: Kasir (pesanan masuk + konfirmasi + bayar nota meja), Pelayan, KDS (urut waktu), Menu QR, Admin (menu/meja/staf/laporan + filter periode), Auth mock (4 role), QR per meja, struk, navbar di semua halaman role, status meja otomatis, tes otomatis Vitest (18 tes).
- ✅ **Fase B (backend Laravel) SELESAI**: API asli (data layer + endpoints + httpApi), real-time Reverb + Redis (≤ 2 detik), auth Sanctum (role dari server, akses publik Menu QR, logout revoke token), foto menu upload, race condition transaction + `lockForUpdate()`. Tes backend (3 tes fitur). Lihat detail B0–B5.
- ✅ **Upload ke GitHub SELESAI**: gabung folder utama `resto_pos/`, bersihkan `.gitignore`, init+commit+push → repo **public** `github.com/fadhilfaith48/dineflow-pos` (branch `main`). Lihat C1.
- ✅ **Uji manual menyeluruh SELESAI**: semua kasus §1–§7 di `docs/uji manual.md` lolos (Opsi A). 2 bug ditemukan & difix: bayar QRIS "undefined array key `cashReceived`", dan halaman putih setelah Tandai Lunas karena `change: null`.
- ✅ **Enhancement real-time menu (pasca B5)**: event `MenuChanged` (channel `menu`, `ShouldBroadcastNow`) + subscribe Echo di `MenuPage` & panel menu `KasirPage` → setiap perubahan menu (**Habis**/Tersedia, ubah nama/harga/deskripsi/foto, tambah/hapus menu) langsung tampil real-time di halaman Menu QR & Kasir tanpa refresh (PRD "otomatis tidak muncul lagi").
- ✅ **Responsif HP + WebSocket same-origin (uji HP asli, pasca uji manual)**: TopNavBar responsif mobile (nav tersembunyi, avatar inisial, tombol ikon, hamburger admin); fix label meja "Perlu Dibersihkan" meluber (`TableSelect` + preventif `TablePickerModal`); `echo.ts` WS kini same-origin lewat proxy `/app` Vite (identik pola produksi wss:443 Nginx) → ganti WiFi/IP tak merusak real-time, port 8080 tak perlu dibuka. Bug backend ikut ditemukan & difix saat uji: tabel `settings` belum dimigrasi (order 500) dan order tanpa field `tableId` → error (fix `?? null`). Deployment DITUNDA (keputusan pengguna): jalur tersedia di `deployment.md` §0.
- ✅ **Audit keamanan menyeluruh + fix izin kasir baca settings**: bug 403 — kasir tak bisa `GET /settings` untuk PPN struk (fallback diam-diam 10%) → route dibuka `role:kasir,admin` (PUT/logo tetap admin). Audit bersih: `npm audit` & `composer audit` 0 kerentanan, `.env`/DB tak pernah ter-commit sejak komit pertama (nilai APP_KEY asli tidak ada di riwayat git), tanpa raw SQL, throttle login/order, upload tervalidasi, semua model `#[Fillable]`. Aturan rotasi secret + hardening WS private channel dicatat di `deployment.md` §7.
- ✅ **Laporan penjualan: rincian per metode bayar + rentang tanggal custom**: kartu "Per Metode Bayar" (Tunai/QRIS: omzet + jumlah transaksi; revenue pakai total termasuk PPN = uang benar-benar diterima) + dua date-picker custom (startDate/endDate) dengan tombol reset, digabung di halaman Laporan Penjualan yang sama. Backend `SalesSummaryController` refactor: filter bersama `applyFilters()` untuk index & export, respons baru `paymentBreakdown`. Tanpa migrasi DB. Tes backend baru `SalesSummaryTest` (breakdown metode + filter rentang) → 7/7 lulus; FE build/lint/18 tes lulus; E2E curl terverifikasi.
- ✅ **Pengaturan real-time + restrukturisasi struk (pasca fitur riwayat)**: bug — perubahan pengaturan admin (PPN/logo/nama) tidak berpengaruh ke struk Kasir tanpa refresh (settings hanya di-load sekali di mount). Fix: event `SettingsChanged` (channel publik `settings`, pola `MenuChanged`) di-dispatch saat `update()` & `uploadLogo()` dengan payload bersama `payload()` (bentuk = respons GET /settings); `KasirPage` & `TransactionHistory` subscribe + `leaveChannel`. Struk dirapikan standar resto: lebar tetap ±80mm (300px) seperti kertas thermal, **tinggi mengikuti jumlah item**, font/padding dirapatkan, header = logo → nama restoran di bawah logo → alamat; CSS cetak: `@page margin:0` (tanpa judul/URL bawaan browser) + area struk 302px terpusat horizontal di atas kertas. Verifikasi: 9 tes backend, build/lint/18 tes FE, E2E listener WS menerima `SettingsChanged`.
- ✅ **Menu Varians + Void Order (fitur baru)**: Dua fitur dari `docs/prd.md` — varian menu (Reguler/Besar) dan pembatalan pesanan (void). **Backend**: migrasi `menu_item_variants` (name, price, available, position FK) + `variant_name` di `order_items`; model `MenuItemVariant` (belongsTo MenuItem); `MenuItemResource` eager-load variants (via `whenLoaded`); `MenuItemController` store/update sinkron varian (delete+recreate); `OrderController::store` terima `variantName`, resolve harga varian + cek available; `OrderController::void()` PATCH `/orders/{order}/void` (role admin+kasir), set status `dibatalkan`, kembalikan meja `kosong`, dispatch event `OrderStatusChanged` action=voided; seeder varian untuk #M01 (Nasi Goreng Reguler/Besar), #M03 (Mie Ayam), #M08 (Es Teh), #M09 (Es Jeruk) + mock ORD-0004 status `dibatalkan`. **Frontend**: `useCart` key compound `menuItemId-variantName` (item sama dgn varian berbeda = baris terpisah); pill varian di MenuPanel, WaiterOrder, MenuPage; CartPanel tampilkan varian di antara nama & kuantitas; MenuManagement modal edit tambah bagian CRUD varian (nama, harga, aktif); `OrderTicket` tampilkan varian; `receipt.ts` sertakan varian; `StatusBadge` tambah varian `cancelled` (bg danger); `KasirQueuePanel` tombol "Batalkan" + badge "Batal" di riwayat + opsi void; `TransactionHistory` filter status (Semua/Selesai/Dibatalkan) + badge dibatalkan + listen action=voided; `httpApi.voidOrder()` PATCH; `handleVoidOrder` di KasirPage dengan konfirmasi window. Verifikasi: 15 tes backend, build/lint/18 tes FE, `migrate:fresh --seed` sukses |
- ✅ **PPN otomatis persisten per-transaksi + Export CSV + Struk Logo + Void wajib alasan + Level Kepedasan (fitur PRD batch 2)**: Menuntaskan 5 fitur dari `docs/prd.md` (§6.4-6.7). **(1) PPN otomatis persisten** — migrasi `payments` + kolom `subtotal`/`ppn_amount`/`total`; `PaymentController::store` hitung & simpan (`subtotal = round(total/(1+rate))`, `ppn = total - subtotal`); `PaymentResource` expose; `lib/receipt.ts` pakai nilai tersimpan bila ada (fallback). **(2) Struk Logo** — sudah ada (logo di struk thermal). **(3) Export CSV** — sudah ada (`exportSalesReport`). **(4) Void wajib alasan + role dapur** — kolom `void_reason`/`voided_by` di `orders`; route `PATCH /orders/{order}/void` role `kasir,admin,dapur`; `OrderController::void` terima `reason` (wajib) + simpan + meja→kosong + event; frontend `VoidOrderModal` (alasan preset/teks, divalidasi) di Kasir & Kitchen, alasan tampil di riwayat. **(5) Level Kepedasan 0-5** — kolom `is_spicy` di `menu_items` + `spice_level` di `order_items`; `OrderController::store` validasi 0-5 + wajib utk menu `is_spicy`; frontend pill `SpicePills` 0-5 di MenuPanel/WaiterOrder/MenuPage (item pedas tanpa varian), atur level di keranjang (item pedas ber-varian), `useCart` key `menuItemId-variantName-spiceLevel` + `setSpiceLevel` stepper; tampil di ticket/receipt/tracking/OrderCard; Admin toggle "Item Pedas". Verifikasi: 15 tes backend (40 assertion), build/lint/18 tes FE, `tsc -b` ✓, `vite build` ✓ |
- ✅ **Konversi 3 mockup Stitch (Table Map, Menu Ordering, Active Orders, Customer Self-Order) ke React + durasi duduk**: Menyesuaikan beberapa komponen frontend agar tampilannya mengikuti mockup terbaru (Google Stitch), dengan **warna tetap token `DESIGN.md`** (tanpa hex baru), **Bahasa Indonesia**, harga **Rupiah** (`formatRupiah`), ikon **SVG inline** (bukan Material Symbols), dan **tanpa** sidebar desktop / bottom-nav (tetap `TopNavBar`). **(1) TableSelect (Peta Meja Pelayan)** — kartu persegi (`aspect-square`) + ikon + "N Pax" + **durasi duduk** untuk meja `terisi` (hit mm:ss, auto-refresh 30s, dari order aktif terawal per meja; `PelayanPage` menghitung `seatedAt`). **(2) WaiterOrder (input pesanan Pelayan)** — kartu menu vertikal → **horizontal** (thumbnail foto kiri + info kanan + tombol `+`), fallback placeholder bila tanpa `imageUrl`. **(3) OrderList (daftar pesanan Pelayan)** — **garis status** warna di tepi kiri kartu, **elapsed time** (`mm:ss`, auto-refresh), **note item** jadi badge merah gaya "No Croutons", tombol "Tandai Diantar" → "Antarkan". **(4) MenuPage (Menu QR pelanggan)** — grid 2 kolom → **kartu horizontal** + overlay "Habis". **(5) DRY** — `formatElapsed` dipindah ke `lib/format.ts` (dipakai TableSelect & OrderList). Backend: seeder `created_at` order aktif diubah ke relatif `now()` agar durasi duduk tidak puluhan jam (ORD-0004 `dibatalkan` tetap di masa lalu utk data laporan). Verifikasi: build ✓, lint ✓ (warning lama saja), 18/18 tes FE ✓, `migrate:fresh --seed` ✓ |
- ✅ **Pendalaman 4 layar mendekati mockup Stitch (sesi lanjutan)**: Setelah user merasa hasil awal "perubahannya sedikit", dilakukan perbandingan langsung HTML mockup Stitch (di `resto-pos-frontend/`) vs komponen React, lalu menambah elemen mockup yang belum teradopsi. **Keputusan**: skip **floor tabs** & tombol **Filter** (aplikasi single-outlet tanpa data floor); tombol OrderList tetap satu **"Antarkan"** (tanpa View Details/Add Note); Featured Card di MenuPage pakai **menu pertama kategori aktif** (tanpa flag `featured` backend). Perubahan: **(1) TableSelect** — nomor meja besar (`text-heading`, accent utk terisi) + label status jadi **pill** (`rounded-full bg-status-*/15`) di bawah kartu via `mt-auto` (anti-meluber). **(2) OrderList** — **ikon jam** SVG di samping `Meja X · durasi`. **(3) WaiterOrder** — Review Order bar sticky (jumlah item + total + "Lihat & Kirim") **sudah ada**, tanpa perubahan. **(4) MenuPage** — komponen `FeaturedCard` baru (gambar besar h-48 + badge harga kanan atas + nama + deskripsi + tombol "Tambah ke Pesanan" lebar; menangani varian & item pedas via `SpicePills`; overlay "Habis"); daftar reguler `slice(1)` agar unggulan tak duplikat.     Verifikasi: build ✓, lint ✓ (warning lama saja), 18/18 tes FE ✓ |
- ⏳ **(RENCANA) Bayar di Muka Wajib Semua Kanal — DOKU QRIS + Tunai Kasir**: Keputusan user (**revisi**: semua kanal, bukan self-order saja) — bayar di muka Wajib di **self-order, kasir, pelayan**; order dibuat `menunggu`, baru ke dapur (`diproses`) setelah `paid`; **Konfirmasi kasir dihapus** (prepay otomatis ke dapur); meja `terisi` saat `paid`. **Self-order & Pelayan** → QRIS DOKU dinamis (QR di layar HP/tablet pelayan utk discan); **Kasir** → Tunai ATAU QRIS DOKU di muka (bayar segera setelah buat order). Vendor **DOKU** (sandbox demo PKL); pola **B (QRIS di aplikasi + polling)**. Abstraksi `PaymentGateway` (`DokuGateway` + `MockQrisGateway`, pilih via `PAYMENT_DRIVER`), kolom baru `payments` (`reference`/`status`/`gateway`/`paid_via`). Langkah detail: **Fase D** di bawah. *Belum ada kode — update dokumen ini saja oleh user.* |

---

## Fase A - Frontend Murni (bisa dikerjakan sekarang)

### A1. Alur Kasir: pesanan masuk & konfirmasi (Prioritas: P1)
- [x] Halaman/panel "Pesanan Masuk" di Kasir: daftar order baru dari Pelayan & Self-order (status `menunggu-konfirmasi`).
- [x] Aksi **Konfirmasi** dari Kasir → pesanan diteruskan ke dapur (status jadi `diproses`, tampil di KDS sebagai aktif).
- [x] Indikator jumlah pesanan masuk yang belum dikonfirmasi (badge di header panel).

### A2. Kasir: buka nota meja untuk pembayaran (Prioritas: P1)
- [x] Kasir bisa memilih meja → melihat pesanan (order) yang sedang aktif di meja itu (tab "Nota" di panel queue Kasir).
- [x] Proses pembayaran pesanan yang SUDAH ADA (bukan hanya dari keranjang sendiri): pilih metode tunai/QRIS → struk.
- [x] Setelah bayar: status pesanan `selesai` dan meja otomatis jadi `perlu dibersihkan`.

### A3. Status meja otomatis di mock (Prioritas: P2)
- [x] `createOrder` dengan `tableId` (dine-in) → meja jadi `terisi`.
- [x] `processPayment` order dine-in → meja jadi `perlu dibersihkan` (dikerjakan bersama A2).
- [x] Admin tetap bisa mengubah status meja manual (dropdown di Manajemen Meja, sudah ada sebelumnya).

### A4. KDS urut berdasarkan waktu masuk (Prioritas: P2)
- [x] `KitchenPage`: urutkan `activeOrders` berdasarkan `createdAt` (tertua dulu = antrian).

### A5. Tes otomatis (Prioritas: P3)
- [x] Setup Vitest + React Testing Library.
- [x] Contoh test service layer (`mockApi`: login, createOrder, getSalesSummary per periode).
- [x] Contoh test komponen/guard (login → redirect sesuai role, ProtectedRoute).

---

## Fase B - Tergantung Backend Laravel

### B0. Setup infrastruktur backend (Prioritas: P1)
- [x] Aktifkan MySQL 8.4 & Redis 5.0 di Laragon (`D:/laragon`); MySQL via GUI Start All, Redis via `redis-server` (Windows tanpa daemonize → `Start-Process`).
- [x] Buat database `dineflow_pos` (utf8mb4_unicode_ci).
- [x] Ubah `.env` backend: MySQL (`dineflow_pos`, root tanpa password), `REDIS_CLIENT=predis` (DLL phpredis tidak tersedia di PHP Laragon 8.3), `QUEUE/CACHE/SESSION=redis`, `BROADCAST_CONNECTION=reverb` + key Reverb.
- [x] Install `laravel/sanctum`, `laravel/reverb`, `predis/predis` (composer via PHP 8.3 Laragon, bukan XAMPP 8.2).
- [x] Publish config Sanctum & Reverb (`config/sanctum.php`, `config/reverb.php`); migrate dasar + `personal_access_tokens` sukses.
- [x] Verifikasi: Redis `cache()->put/get` OK; `migrate:status` semua Ran; `artisan list` ada `reverb:*`.

### B1. Implementasi API Laravel (Prioritas: P1)
- [x] Data layer: migrasi + model + seeder (meniru `mockData.ts`) — B1a.
- [x] API endpoints + Controller + Resource (camelCase) + CORS — B1b.
- [x] `httpApi.ts` (fetch) menggantikan `mockApi.ts` + token di `AuthContext` — B1c. UI tidak berubah; tes guard diadaptasi dengan stub fetch.
- [x] Setup CORS backend Laravel (done di B1b, verifikasi via proxy Vite di B1c).
- [x] Sinkronkan payload/response agar sama dengan tipe data `frontend/src/types/index.ts`.
- [x] UI tidak boleh berubah (service layer menukar implementasi di balik layar).

### B2. Real-time Reverb + Redis (Prioritas: P1)
- [x] Event `OrderStatusChanged` (ShouldBroadcastNow) disebar saat order dibuat, dikonfirmasi, status item berubah, & dibayar (`docs/architecture.md` §4; channel `orders` + `order.{orderNumber}`).
- [x] Ganti polling 5s di `KitchenPage` dengan `laravel-echo` subscribe channel pesanan.
- [x] Ganti polling tracking di `MenuPage` (status pesanan pelanggan) dengan Echo.
- [x] Panel pesanan masuk & nota Kasir (`KasirPage`) ikut real-time via channel `orders`.
- [x] Broadcast memakai Reverb + Redis (BROADCAST_CONNECTION=reverb); `reverb:start` jalan di port 8080.
- [x] NFR: pembaruan status ke semua channel ≤ 2 detik (terverifikasi: order baru terima ≤2s tanpa refresh).
- [x] **Bug fix real-time (B2 lanjutan)**: laravel-echo v2.4 default `namespace: "App.Events"` membuat event dibind sebagai `App.Events\OrderStatusChanged` (tidak cocok dengan `broadcastAs()` server yang mengirim `OrderStatusChanged`) → client tidak pernah menerima event meski WS connect & subscribe OK. Solusi: `namespace: ''` di `frontend/src/services/echo.ts`. Setelah fix, uji 2 browser (Kasir Konfirmasi → KDS tampil ≤2s tanpa refresh) LOLOS.

### B3. Auth nyata (Sanctum) (Prioritas: P1)
- [x] Ganti mock login (`AuthContext` + `mockApi.login`) dengan endpoint auth Laravel (Sanctum) — dikerjakan bersama B1c.
- [x] Role dari server (bukan dari localStorage/demo) — via `UserResource`.
- [x] **Bug fix (B3 Opsi A) — akses publik**: GET `/categories`, GET `/menu-items`, GET `/tables`, dan POST `/orders` (self-order) keluar dari grup `auth:sanctum` di `routes/api.php`; sisanya tetap auth. `MenuPage` `/menu/:table` kini bisa diakses tanpa login (katalog tampil, kirim pesanan jalan). Verifikasi curl: tanpa token katalog/menu/meja/order-self = 200, GET `/orders` tetap 401.
- [x] **Bug fix (B3 Opsi A) — logout revoke token server**: tambah `Api.logout()` (POST `/logout` + `clearToken`) di `httpApi.ts`, stub di `mockApi.ts`, dan `AuthContext.logout` memanggil `api.logout()` best-effort (`.catch(() => {})`). Verifikasi curl: login → logout → token lama = 401.

### B4. Foto menu upload (Prioritas: P2)
- [x] Ganti input URL gambar dengan upload file ke server — backend `MenuItemController` terima field `image` (multipart, PNG/JPG/WebP max 2 MB) di `store` & `update`; simpan ke disk `public/menu-items` + `storage:link`; `imageUrl` string lama tetap didukung. Frontend: input URL → `<input type=file>` + preview di `MenuManagement`, kirim FormData via `httpApi` (update pakai method spoofing `_method=PUT` karena PHP tidak mengisi `$_FILES` untuk multipart PUT).
- [x] Simpan URL dari server & tampilkan di menu pelanggan — `image_url` berisi URL absolut `APP_URL/storage/...` yang dikembalikan `MenuItemResource` → tampil di tabel Admin & katalog `MenuPage`.

### B5. Race condition stok/order (Prioritas: P2)
- [x] Di backend: database transaction + `lockForUpdate()` untuk order & stok bersamaan (aturan AGENTS.md, BUKAN Golang/Kafka) — sudah terimplementasi sejak B1b: `OrderController::store` (transaction + `lockForUpdate()` pada tabel & menu item, cek ketersediaan) dan `PaymentController::store` (transaction + `lockForUpdate()` pada order, cegah bayar ganda → 409). Ditambah tes fitur `OrderPaymentTest` (pembayaran dua kali → 409).

### B6. Riwayat Transaksi Kasir & Admin (Prioritas: P1)
- [x] Backend: `GET /orders` eager load `payment` (`with(['table','items','payment'])`) + `OrderResource` expose `payment` via `PaymentResource` (frontend dapat `method`, `cashReceived`, `change`, `paidAt`). Tanpa migrasi.
- [x] Bug fix menyertakan perbaikan data riwayat: deteksi role di `OrderController::store` memakai `$request->user()` yang selalu null sejak rute POST /orders jadi publik (B3) → order kasir/pelayan tercatat sebagai `self-order`; fix dengan `auth('sanctum')->user()`.
- [x] Frontend bersama: type `Order.payment?`, pindahkan `ReceiptModal` ke `components/`, helper bersama `lib/receipt.ts` (`orderToReceipt`) untuk cetak struk & cetak ulang.
- [x] Kasir: panel queue ber-tab pill "Pesanan Aktif" (sub-tab Masuk/Nota tetap) | "Riwayat"; riwayat = chip filter Hari ini (default)/Semua, baris jam+no.order+meja/sumber+total+badge metode, klik baris → cetak ulang struk.
- [x] Admin: tab navbar baru "Riwayat Transaksi" (setelah Laporan Penjualan); komponen `TransactionHistory.tsx`: daftar order `selesai` (tanggal+jam, no.order, meja/sumber, jumlah item, total, metode), filter client-side rentang tanggal + cari no.order + dropdown metode, klik baris → cetak ulang; real-time subscribe `orders` action=`paid`.
- [x] Tanpa nama kasir di v1 (`paid_by` ID user), tanpa pagination/batas baris.
- [x] Verifikasi: tes backend 9/9 lulus (termasuk assertion payment di `/orders`), FE build+lint+18 tes, E2E curl bayar→GET /orders mengandung payment.method, DB reset demo.

---

## Fase C - Repo & Deployment

### C1. Upload repo ke GitHub (Prioritas: P2)
- [x] Gabung frontend + backend ke folder utama `resto_pos/` (frontend/ + backend/ + docs/ + AGENTS.md).
- [x] Bersihkan `.gitignore` backend: pastikan `.env`, `/vendor`, `database/database.sqlite` tidak ikut.
- [x] Update referensi path di `AGENTS.md` & `docs/*.md` (dokumen sudah pindah ke `docs/`).
- [x] `git init` → `git add -A` → `git commit`.
- [x] Verifikasi `git ls-files`: `.env`, `vendor/`, `node_modules/`, `dist/`, `database.sqlite` TIDAK muncul.
- [x] Buat repo **public** di github.com (manual, tanpa README) → `https://github.com/fadhilfaith48/dineflow-pos.git`.
- [x] `git remote add origin <URL>` → `git push -u origin main`.

> Langkah detail: `workflow.md` §8.

---

## Fase D - (RENCANA) Bayar di Muka Wajib — Semua Kanal (DOKU QRIS + Tunai Kasir)

> **Status: RENCANA — belum diimplementasikan.** Keputusan user yang sudah disepakati
> (**revisi** dari "self-order saja" → **semua kanal**):
> - Bayar di muka **wajib di semua kanal**: self-order (scan QR), pelayan (HP/tablet), dan kasir.
> - Order baru dibuat status `menunggu` (BELUM ke dapur); baru `diproses` → dapur setelah pembayaran `paid`.
> - **Self-order & Pelayan** → **QRIS DOKU dinamis**; QR tampil di layar pelanggan/layan pelayan utk discan.
> - **Kasir** → bayar **segera setelah buat order** (before dapur), boleh **Tunai ATAU QRIS DOKU** di muka.
> - **Tombol "Konfirmasi" kasir DIHAPUS** — prepay otomatis ke dapur (tanpa konfirmasi manual).
> - Meja jadi `terisi` pada saat order `paid` & mulai dimasak.
> - Vendor **DOKU** (sandbox untuk demo/penilaian PKL; production/uang asli bila operasional → butuh dokumen + rekening bank/DANA Bisnis).
> - Pola **B (QRIS tampil di aplikasi + polling)**: pelanggan tidak pindah ke web DOKU; layar menampilkan QRIS, menunggu, lalu otomatis lanjut saat `paid`.
> - Abstraksi `PaymentGateway` (interface) + dua driver: `DokuGateway` + `MockQrisGateway` (cadangan demo tanpa akun/internet), dipilih via `PAYMENT_DRIVER` di `.env`.
> - Settlement production: DANA Premium **tidak bisa** jadi tujuan dana; butuh rekening bank atau **DANA Bisnis**. (Tidak relevan utk sandbox/Opsi A.)

### D0. Persiapan akun DOKU Sandbox (di sisi DOKU, bukan kode)
- [ ] Login `sandbox.doku.com` → pastikan Business/merchant aktif (atasi error `Business not found`).
- [ ] Ambil **Client ID + Secret Key** dari Settings → API Keys (mode sandbox).

### D1. Backend — kerangka payment & endpoint (Prioritas: P1)
- [ ] Migrasi: tambah kolom `reference` (unique), `status` (`pending|paid|failed|expired|cancelled`), `gateway`, `paid_via` pada `payments`.
- [ ] `app/Services/Payment/PaymentGateway` (interface) + `DokuGateway` + `MockQrisGateway`.
- [ ] `config/payment.php` + binding di `AppServiceProvider` (driver dari `PAYMENT_DRIVER`, default `mock`).
- [ ] `PaymentController`: `POST /orders/{id}/checkout` (buat QRIS via gateway utk self/pelayan/kasir, simpan `payments` status pending) + `GET /payments/{reference}/status` (polling) + `POST /payments/{reference}/mock-paid` (hanya Mock, non-production).
- [ ] `OrderController::store`: **semua kanal** status awal `menunggu` (belum ke dapur); tanpa Konfirmasi; baru `diproses` + broadcast + meja `terisi` setelah pembayaran `paid`.
- [ ] `PaymentController::store` (tunai kasir di muka): validasi order `menunggu`, set `paid`, lanjutkan order ke dapur + meja `terisi`.
- [ ] Guard kasir: order `menunggu` (belum bayar) tidak masuk dapur; order prepay tak bisa dibayar ganda; `paid` tampil "Lunas" (tombol Bayar nonaktif).
- [ ] `.env.example` + `OrderStatusChanged`/`OrderResource`/`PaymentResource` expose status pembayaran.
- [ ] Feature tests backend.

### D2. Frontend — alur bayar di muka (Prioritas: P1)
- [ ] `types` + `httpApi`/`api`: `checkoutOrder`, `getPaymentStatus`, `markMockPaid`.
- [ ] `MenuPage`: tambah view `payment` — tampilkan QRIS; polling `getPaymentStatus` (doku) / tombol "Saya Sudah Bayar" (mock); otomatis lanjut ke tracking saat `paid`.
- [ ] `WaiterOrder` (pelayan): setelah kirim order → tampilkan QRIS DOKU di layar → polling → paid → ke dapur.
- [ ] `PaymentModal` (kasir): bayar segera setelah buat order — Tunai (seperti sekarang) ATAU QRIS DOKU (checkout → QR → polling → paid).
- [ ] Hapus tombol "Konfirmasi" dari `KasirQueuePanel`/flow kasir — semua otomatis ke dapur saat `paid`.
- [ ] `KasirQueuePanel`: Nota tampil badge "Lunas", tombol "Bayar" nonaktif utk yang sudah prepay.
- [ ] Ganti teks "bayar di kasir" → "pembayaran di muka".
- [ ] Verifikasi: `npm run build` + `lint` + `npm test`.

### D3. Deployment online untuk penilaian PKL (Opsi A — DOKU Sandbox)
- [ ] Ikuti `docs/deployment.md` (Vercel frontend + VPS backend + DuckDNS + SSL) atau pilih jalur §0.
- [ ] `.env` server: `PAYMENT_DRIVER=doku`, `DOKU_CLIENT_ID`/`DOKU_SECRET_KEY` (sandbox), `DOKU_SANDBOX=true`.
- [ ] Uji dari HP asli: scan QR meja → pilih → QRIS DOKU tampil → bayar (simulasi) → otomatis ke dapur.
- [ ] Update `PROGRESS.md`, `jurnal-pkl.md`; commit & push.

---

## Catatan Konvensi

- Kerjakan **satu item per batch**, jelaskan tiap langkah.
- Verifikasi wajib tiap selesai: `npm run build` (tsc) lalu `npm run lint` (oxlint) di `frontend/`.
- Semua data lewat service layer (`api.*`), warna dari token `DESIGN.md`, angka pakai `font-num`.
- Update `todo.md` dan `PROGRESS.md` setelah satu item selesai.

## Catatan Teknis Masa Depan (hasil audit 25–26 Agu 2026)

Temuan yang **disengaja dibiarkan** untuk skala prototype (aman sekarang), tapi wajib ditangani bila data/trafik tumbuh:

1. **Agregasi laporan masih in-PHP** — `SalesSummaryController` memuat SEMUA order + items ke memori lalu dirangkum di PHP; ekspor CSV juga pre-build semua baris (bukan streaming). → Saat order >±10 ribu: ganti ke SQL `GROUP BY` / agregasi query builder, dan streaming response untuk CSV.
2. **`GET /orders` unlimited tanpa pagination** (keputusan v1, terdokumentasi di kode) — Riwayat memuat semua order. → Saat data besar: tambah pagination (limit/cursor) + filter tanggal di sisi server.
3. **Code splitting frontend belum dikerjakan** (temuan P2 audit) — bundle tunggal 433 KB karena `App.tsx` mengimpor semua halaman secara statis; pelanggan Menu QR ikut mengunduh halaman Kasir/Kitchen/Admin. → Terapkan `React.lazy()` + `Suspense` per halaman (estimasi bundle awal turun >50%).

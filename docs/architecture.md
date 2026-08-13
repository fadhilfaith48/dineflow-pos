# ARCHITECTURE.md — Arsitektur DineFlow POS

Dokumen arsitektur sistem DineFlow POS: komponen, alur data, dan peta file.
Mencakup kondisi **sekarang (Fase A — frontend murni dengan mock)** dan **target
(Fase B — Laravel + real-time)**. Referensi lengkap fitur: `prd.md`.

---

## 1. Ringkasan

DineFlow POS adalah aplikasi POS restoran **1 outlet tunggal** dengan 4 antarmuka
pemesanan (Kasir, Pelayan, Self-order QR, Kitchen Display) + dashboard Admin.
Satu backend (Laravel) melayani semua channel lewat satu REST API yang sama;
update status pesanan disebarkan real-time ke semua channel via broadcasting.

```
                    ┌────────────────────────────────────────────┐
                    │              LARAVEL (backend)             │
                    │   REST API + Broadcasting (Reverb) + Redis │
                    └───────┬──────────────┬─────────────┬───────┘
                            │              │             │
              ┌─────────────┴──┐    ┌───────┴──────┐   ┌──┴──────────┐
              │  React (SPA)   │    │  laravel-echo│   │   Redis     │
              │  4 antarmuka   │    │ (real-time)  │   │ (message    │
              │  + admin       │    │              │   │  layer)     │
              └────────────────┘    └──────────────┘   └─────────────┘
```

- **Frontend**: React + TypeScript + Vite + Tailwind v4 (satu SPA, routing per role).
- **Backend** (Fase B): Laravel REST API + Sanctum (auth) + Reverb (real-time).
- **Data**: MySQL/MariaDB (transaksional), Redis (broadcasting).
- **Kontrak**: semua akses data lewat interface `Api` di
  `frontend/src/services/api.ts` — UI tidak pernah memanggil mock/fetch langsung.

---

## 2. Antarmuka & Rute

| Antarmuka | Rute | Role | Deskripsi |
|---|---|---|---|
| Kasir | `/kasir` | kasir | Input pesanan manual, pesanan masuk & konfirmasi, bayar nota, struk |
| Pelayan | `/pelayan` | pelayan | Peta meja → input pesanan → kirim → tandai diantar |
| Kitchen Display | `/kitchen` | dapur | Grid ticket, urut antrian, update status per item |
| Pesan Mandiri | `/menu/:table` | publik | Katalog → keranjang → kirim → tracking status |
| Admin | `/admin` | admin | Menu, meja (+QR), staf, laporan penjualan |
| Login | `/login` | — | Auth mock (Fase A) / Sanctum (Fase B) |

Routing di `frontend/src/App.tsx`, proteksi per role di
`frontend/src/components/ProtectedRoute.tsx`.

---

## 3. Arsitektur Frontend

### 3.1 Pola Service Layer (kunci)

Semua data lewat interface `Api` (`frontend/src/services/api.ts`). Implementasi
saat ini: `mockApi.ts` (in-memory, state module-level agar lintas halaman berbagi data
dalam 1 sesi browser). Saat Fase B: ganti ke `httpApi.ts` (fetch ke Laravel) **tanpa
mengubah komponen UI**.

```
Komponen UI (pages/*) → api.* (kontrak) → MockApi (sekarang) / HttpApi (Fase B)
```

### 3.2 State & Alur Data

- **Keranjang**: `hooks/useCart.ts` (state bersama Kasir, Pelayan, Menu QR).
- **Sesi login**: `context/AuthContext.tsx` (mock, disimpan di localStorage).
- **Real-time (simulasi)**: polling 5 detik di `KitchenPage`, `MenuPage` (tracking),
  dan panel pesanan masuk Kasir. Fase B → ganti dengan `laravel-echo` + Reverb.
- **Data status meja**: `createOrder` dine-in → meja `terisi`; `processPayment` → meja
  `perlu dibersihkan`; admin tetap bisa ubah manual.

### 3.3 Peta File Penting (`frontend/src/`)

| Area | File |
|---|---|
| Router & guard | `App.tsx`, `components/ProtectedRoute.tsx`, `components/HomeRedirect.tsx` |
| Service layer | `services/api.ts` (kontrak), `services/mockApi.ts`, `services/mockData.ts` |
| Tipe data | `types/index.ts` (kontrak PRD) |
| Kasir | `pages/kasir/*` (KasirPage, MenuPanel, CartPanel, PaymentModal, ReceiptModal, TablePickerModal, KasirQueuePanel) |
| Pelayan | `pages/pelayan/*` (PelayanPage, TableSelect, WaiterOrder, OrderList) |
| Dapur | `pages/kitchen/*` (KitchenPage, OrderTicket) |
| Pesan Mandiri | `pages/menu/MenuPage.tsx` |
| Admin | `pages/admin/*` (AdminPage, MenuManagement, TableManagement, StaffManagement, SalesReport) |

---

## 4. Arsitektur Backend (Fase B — target)

### 4.1 Struktur

Backend dikerjakan di folder `backend/` di repo utama `resto_pos/`
(sudah ada fresh install Laravel). Nanti digabung ke repo utama `resto-pos/` = `frontend/` + `backend/`.

- **Auth**: Sanctum (token), role dari server (ganti mock login).
- **API**: resource controllers untuk Menu, Meja, Order, Payment, User, Laporan.
- **Real-time**: Laravel Reverb + Redis; broadcast saat status item/order berubah
  ke channel yang relevan (kasir, pelayan, dapur, pelanggan).
- **Race condition**: database transaction + `lockForUpdate()` untuk order/stok
  bersamaan (aturan `AGENTS.md`, bukan Golang/Kafka).

### 4.2 Entitas Data (dari `prd.md`)

| Entitas | Kolom penting |
|---|---|
| `users` | name, username, password, role |
| `tables` | number, seats, status (kosong/terisi/perlu-dibersihkan), qr_code |
| `menu_categories` | name |
| `menu_items` | name, description, price, category_id, available, image_url |
| `orders` | table_id (nullable), source (kasir/pelayan/self-order), status, total, timestamps |
| `order_items` | order_id, menu_item_id, name, price, quantity, note, status per item |
| `payments` | order_id, method (tunai/qris), amount, cash_received, change, paid_by, paid_at |

### 4.3 Peta Endpoint (kontrak `api.ts` → Laravel)

| `api.*` frontend | Endpoint Laravel |
|---|---|
| `login` | `POST /api/login` (Sanctum) |
| `getCategories` | `GET /api/categories` |
| `getMenuItems` | `GET /api/menu-items` |
| `getTables` / create / update / delete | CRUD `/api/tables` |
| `getOrders` | `GET /api/orders` |
| `createOrder` | `POST /api/orders` (transaction + lockForUpdate) |
| `confirmOrder` | `PATCH /api/orders/{id}/confirm` |
| `updateItemStatus` | `PATCH /api/orders/{id}/items/{itemId}` (+ broadcast) |
| `processPayment` | `POST /api/orders/{id}/payments` (transaction) |
| CRUD menu-item | CRUD `/api/menu-items` |
| CRUD user (admin) | CRUD `/api/users` |
| `getSalesSummary` | `GET /api/sales-summary?period=` |

---

## 5. Alur Kunci (end-to-end)

### 5.1 Pesanan dari Pelayan / Self-order
```
Pelayan/MenuQR → api.createOrder (status: menunggu-konfirmasi)
  → Kasir: panel "Masuk" (badge) → api.confirmOrder (status: diproses)
  → KDS: tampil sebagai ticket aktif (urut waktu masuk)
  → Dapur update status per item (baru → dimasak → siap) [broadcast]
  → Pelayan tandai diantar; Pelanggan lihat status di tracking [broadcast]
```

### 5.2 Pembayaran & Struk
```
Kasir → PaymentModal (tunai: uang+kembalian / QRIS: simulasi QR + sukses)
  → api.processPayment (order → selesai; meja → perlu-dibersihkan)
  → ReceiptModal: Cetak (window.print #print-area) / Salin Struk (clipboard)
```

---

## 6. Status Migrasi

| Lapisan | Sekarang (Fase A) | Target (Fase B) |
|---|---|---|
| Sumber data | `mockApi.ts` (in-memory) | `httpApi.ts` → Laravel |
| Auth | Mock (username = role, password 1234) | Sanctum, role dari server |
| Real-time | Polling 5s | `laravel-echo` + Reverb + Redis (≤ 2 detik) |
| Database | Memori browser | MySQL/MariaDB |
| Foto menu | URL gambar | Upload file ke server |

Progress & log keputusan: `frontend/PROGRESS.md`.

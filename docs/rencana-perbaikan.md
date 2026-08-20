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
- [ ] Uji manual alur kasir→dapur (server lokal: MySQL + serve + Reverb + dev)

## Setelah Langkah 1–5 (masih kurang)
- [ ] Deploy C2: Vercel + VPS (DuckDNS/Let's Encrypt) + Neon/Upstash/Supabase
- [ ] Putuskan jalur: A (VPS IDCloudHost Rp87rb), B (server sekolah), C (tunnel)
- [ ] Isi 7 rahasia di backend/.env
- [ ] Tes backend & frontend lebih lengkap
- [ ] Sinkronkan PROGRESS.md, todo.md, frontend/.env.example
- [ ] Commit & push perubahan (echo.ts, vite.config.ts, docs baru, cloudflared.exe)
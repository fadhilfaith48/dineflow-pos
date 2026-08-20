# Catatan Presentasi Progress PKL — DineFlow POS

> Untuk presentasi progress 5–10 menit (share screen + diskusi, tanpa PPT).
> Sumber: sesi kerja + status nyata proyek.

## 🎤 Script Presentasi

**Pembukaan (30 detik)**
> "Assalamualaikum. Nama saya [nama], dari [sekolah]. Saya mau presentasi progress proyek PKL saya: **DineFlow POS** — sistem Point of Sale restoran dengan 4 kanal pemesanan: Kasir, Pelayan, Self-order QR di meja, dan Kitchen Display System."

**1. Yang sudah selesai (2–3 menit)**
> "Kode Tahap 0 sudah selesai semua:
> - **Kasir** — input pesanan manual, keranjang, pembayaran tunai & QRIS, cetak struk.
> - **Pelayan** (mobile) — pilih meja, input pesanan, tandai antar.
> - **Menu Pesan Mandiri** — pelanggan scan QR di meja, pesan sendiri, lihat status pesanan real-time.
> - **Kitchen Display** — pesanan tampil real-time, dapur geser status: baru → dimasak → siap.
> - **Admin** — manajemen menu, meja (QR), staf, dan laporan penjualan.
> - Semua antarmuka sudah **tersambung ke backend Laravel** (API nyata, bukan mock), pembayaran pakai **QRIS simulasi** karena masih tahap prototype.
> - Real-time jalan pakai **Laravel Reverb + Redis**: kalau kasir konfirmasi pesanan, KDS dan pelanggan langsung dapat update tanpa refresh."

*(Demo live: kasir pesan → KDS muncul → bayar → struk. Ini paling berkesan.)*

**2. Yang sedang dikerjakan (1–2 menit)**
> "Sekarang saya sedang di dua hal:
> 1. **Penguatan keamanan & logika bisnis** — otorisasi per role (kasir/pelayan/dapur/admin), validasi harga dari database supaya tidak bisa dimanipulasi, dan alur order kasir yang juga lewat dapur biar konsisten dengan PRD.
> 2. **Persiapan deployment** — supaya bisa diakses online untuk demo, bukan cuma di komputer lokal."

**3. Kendala & rencana (1 menit)**
> "Kendala utama saya di deployment: hosting yang bisa dipakai **tanpa kartu kredit**, karena saya belum punya kartu. Saya sudah riset: pilihan paling cocok **VPS Indonesia yang bisa bayar pakai e-wallet** (mis. IDCloudHost, sekitar Rp87 ribu/bulan — atau DomaiNesia mulai Rp43 ribu/bulan), atau memanfaatkan **server sekolah** kalau bapak/ibu ada yang bisa dibantu. Frontend gratis di Vercel, backend di VPS.
> Target: sistem online siap demo di sesi berikutnya."

**Penutup (30 detik)**
> "Kurang lebih itu progress saya. Kalau ada saran terutama soal deployment VPS, saya sangat terbuka. Terima kasih."

## 💡 Persiapan Sebelum Presentasi

- Nyalakan di Laragon: **MySQL**, **backend** (`php artisan serve`), **Reverb**, **Redis**, lalu **frontend** (`npm run dev`) supaya demo live siap saat share screen.
- Siapkan data demo (menu 19 item + 8 meja sudah ada di seeder).

## ❓ Pertanyaan Potensial & Jawaban

| Pertanyaan | Jawaban |
|---|---|
| Teknologi apa? | Frontend React (TypeScript), backend Laravel, real-time Laravel Reverb + Redis, DB MySQL/PostgreSQL. |
| Kenapa QRIS simulasi? | Integrasi QRIS asli (sandbox) ada di fase berikutnya PRD; prototype fokus alur dulu. |
| Berapa lama pengerjaan? | Sesuai roadmap fase A/B/C di `docs/todo.md`. |
| Bagaimana real-time bekerja? | Backend broadcast event → Reverb (WebSocket) → frontend subscribe channel. |
| Kapan online? | Target sesi berikutnya, tergantung keputusan VPS/server sekolah. |

## ❓ Pertanyaan yang Bisa Diajukan ke Pembimbing

### 1. QRIS produksi — perorangan atau badan usaha?
1. "Untuk QRIS produksi, lebih baik daftar sebagai **perorangan** atau **badan usaha**? Untuk tugas PKL, apakah **perorangan (KTP + NPWP pribadi)** sudah cukup?"
2. "Apakah sekolah punya **badan usaha/NPWP** yang bisa dipakai untuk mendaftar QRIS merchant? Atau lebih baik pakai nama pribadi?"
3. "Apakah perlu **rekening bank atas nama sendiri** dulu untuk daftar QRIS?"
4. "Apakah untuk pengembangan cukup pakai **sandbox Midtrans** (gratis, tanpa dokumen), baru daftar QRIS produksi nanti?"

### 2. Deployment — VPS gratis atau bayar?
5. "Apakah sekolah bisa menyediakan **server/VPS gratis**? Kalau iya, speknya bagaimana dan ada akses SSH/root?"
6. "Kalau tidak ada, apakah boleh saya **sewa VPS IDCloudHost (Rp87 ribu/bln, bayar e-wallet)** untuk sisa masa PKL? Biaya pribadi atau dibantu sekolah?"
7. "Apakah ada alternatif **hosting gratis** yang direkomendasikan sekolah (server lab, akun educational)?"
8. "Apakah **port 80/443** terbuka dan boleh pakai **domain + SSL**? Berapa lama server bisa dipakai (sampai PKL selesai)?"
8b. "Apakah sekolah bisa mendaftarkan saya ke **Oracle Academy**? Kalau bisa, saya bisa dapat server Oracle Always Free **tanpa kartu** (24GB RAM, gratis selamanya) untuk semua proyek saya."
8c. "Salah satu teman saya memakai AWS Free Tier untuk deploy Laravel. Apakah sekolah menyarankan pakai AWS, atau ada aturan khusus untuk itu?"

### 3. Penilaian/arahan tugas
9. "Apakah ada fitur/prioritas yang perlu diperbaiki atau ditambah sebelum selesai PKL?"
10. "Kapan batas akhir PKL dan target minimal yang harus tercapai?"

> **Catatan:** server sekolah = paling murah (Rp0); VPS IDCloudHost = paling stabil
> (Rp87 ribu/bln, bayar e-wallet, tanpa kartu kredit, muat 1–2 proyek); Oracle Always
> Free via Oracle Academy = paling besar & gratis selamanya (24GB RAM). Frontend gratis
> di Vercel/Cloudflare. Sistem ±90% jalan lokal; yang kurang hanya deploy online +
> keputusan hosting. Rincian lengkap: `docs/deployment.md`.
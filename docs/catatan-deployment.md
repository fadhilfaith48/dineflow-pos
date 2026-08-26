# Catatan Deployment DineFlow POS (18 Agustus 2026, diperbarui 20 Agustus)

> Catatan ringkas keputusan & rencana deployment. **Rujukan final ada di `docs/deployment.md`**
> (panduan berjenjang). Catatan ini hanya histori/checklist eksekusi.

## 1. Status proyek
- **Aplikasi:** DineFlow POS (Kasir, Pelayan, KDS/dapur, Menu QR self-order, Admin).
- **Teknologi:** Laravel (backend) + React/TS (frontend) + Reverb/Redis (real-time).
- **Kode sudah siap** (Tahap 0 selesai: tes hijau, foto menu siap S3, config env-driven, commit `e0daf66`, `8be7e5c`, `6708ff0`).

## 2. Masalah utama yang sedang dihadapi
- **Tidak punya kartu kredit/debit** → banyak host cloud (Render, Railway, Koyeb, Oracle, dll.) minta kartu.
- **E-wallet (OVO/GoPay/DANA) tidak bisa** dipakai untuk host luar negeri.
- Jadwal demo PKL **belum pasti** → opsi berbatas waktu berisiko.

## 3. Pilihan yang sudah dibahas

| Jalur | Biaya | Plus | Minus | Status |
|---|---|---|---|---|
| **A. VPS Indonesia** (IDCloudHost 2GB) | **Rp87.000/bln** (bayar OVO/GoPay) | Cloud murni, 24 jam, muat 1–2 proyek, upgrade mudah | bayar tiap bulan | **jalur produksi utama** |
| **A2. VPS murah** (DomaiNesia Lite 1GB) | **Rp43.200/bln** (promo, bayar 1 tahun) | paling murah | muat 1 proyek saja | alternatif hemat |
| **B. Server sekolah** (guru nawarin VPS) | gratis | 24 jam, gratis | tergantung sekolah | tanya guru dulu |
| **C. Jalur B (PC + tunnel)** | gratis | sudah 50% siap | PC harus nyala | cadangan |
| **D. Railway trial** | gratis $5/30 hari | no kartu | cuma sementara | uji coba |
| **E. Laravel Cloud** | gratis 14 hari | cloud murni, no kartu | kredit habis 14 hari → mati | dicoret |

## 4. Penjelasan "kok teman bisa" (DeltaJalan)
- Teman punya **VPS sendiri** → backend Laravel di `/var/www/deltajalan` via **GitHub Actions** (`deploy-backend.yml`), frontend di **Vercel** (`delta-jalan.vercel.app`).
- Pengguna cuma lihat **1 URL** (frontend). Backend punya alamat sendiri yang **tersembunyi**.
- Kita akan **meniru pola ini 100%**.

## 5. Rencana jalur A (VPS) — sudah disusun
1. **Beli VPS**: IDCloudHost 2 Core/2GB/20GB (Rp87.000/bln, billing per jam, bayar OVO/GoPay — tanpa kartu). Alternatif hemat: DomaiNesia Lite 1GB Rp43.200/bln (promo `CLOUDVPSHEMAT`, bayar 1 tahun). OS **Ubuntu 24.04**.
2. **Domain gratis**: `dineflow.duckdns.org` → A record ke IP VPS. (Domain `fadhilfaith.my.id` **tidak dipakai** — sudah untuk proyek lain.)
3. **Setup server** via SSH (puTTY): Nginx + PHP-FPM + Redis + supervisor (Reverb).
4. **Deploy**: `/var/www/dineflow-pos` + GitHub Actions `deploy-backend.yml` (persis temanmu); frontend ke Vercel (`dineflow-pos.vercel.app`).
5. **SSL gratis**: Let's Encrypt untuk DuckDNS.
6. **Data**: Neon (DB), Supabase (foto), Upstash/Redis — nilai 7 baris rahasia di `backend/.env`.
7. **Verifikasi + update docs** (`deployment.md`, `PROGRESS.md`, `workflow.md`).

## 6. Hal yang masih menggantung (belum dijawab)
- [ ] Sudah **tanya guru** soal penawaran VPS sekolah? (nyala 24 jam? boleh install? OS apa? + daftarkan ke **Oracle Academy**?)
- [ ] Sudah **pilih** jalur final: A (VPS IDCloudHost Rp87rb) / B (server sekolah) / C (tunnel)?
- [ ] Isi 7 nilai rahasia di `backend/.env` (Neon `DB_URL`, Upstash `REDIS_URL`, Supabase `AWS_*`) — tersimpan di password manager.

## 7. Yang SUDAH selesai disiapkan
- ✅ `backend/.env` diubah ke struktur cloud (placeholder rahasia) + `pdo_pgsql` diaktifkan di PHP Laragon.
- ✅ Frontend di-build; `echo.ts` & `vite.config.ts` (proxy `/api` + WS `/app`) siap.
- ✅ cloudflared terunduh (`cloudflared.exe`) — cadangan Jalur B.
- ✅ Kredensial cloud: Upstash, Neon, Supabase (di password manager).

## 8. Keputusan Arsitektur Hosting Multi-Proyek (25 Agustus 2026)

Keputusan pemilik proyek untuk rencana 3–4 proyek ke depan: **VPS HANYA untuk backend**, sisanya layanan gratis; komponen yang tak bisa gratis dipindah ke VPS.

| Komponen | Hosting | Biaya | Catatan |
|---|---|---|---|
| Backend Laravel + Reverb (WS) | VPS (dipakai bersama semua proyek) | ±Rp87rb/bln | Satu-satunya yang wajib server persisten |
| Frontend (React) | Vercel | Gratis | Build otomatis tiap push |
| Database | Neon (PostgreSQL) | Gratis | Free tier tidur setelah ±5 hari idle → cold start; buka app sebelum demo |
| Redis | Upstash | Gratis | Pantau kuota command harian |
| Foto menu/logo | Supabase Storage | Gratis | Pause setelah 7 hari idle → resume manual |

- Beban VPS per proyek ≈ PHP-FPM ±250–300 MB + Reverb ±80 MB → **satu VPS 2 GB cukup untuk backend 3–4 proyek**.
- Aturan cadangan: MySQL/MariaDB & Redis dapat diinstal langsung di VPS (+±400 MB RAM, tetap muat di 2 GB) — config env-driven (Tahap 0) → pindah cukup edit `.env` tanpa ubah kode.
- Prinsip multi-proyek: mulai **1 VPS saja** (BUKAN 1 VPS per proyek), resize naik saat sempit; pisahkan ke VPS sendiri hanya jika ada proyek trafik besar / klien resmi.

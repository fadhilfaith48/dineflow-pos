# Catatan Deployment DineFlow POS (18 Agustus 2026)

> Catatan ringkas keputusan & rencana deployment. Baca sebelum lanjut sesi berikutnya.

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
| **A. VPS Indonesia** (DomaiNesia 1GB) | **Rp53.280/bln** (bayar OVO/GoPay) | Cloud murni, 24 jam, seperti teman | bayar tiap bulan | **≈ terpilih** |
| **B. Server sekolah** (guru nawarin VPS) | gratis | 24 jam, gratis | tergantung sekolah | tanya guru dulu |
| **C. Jalur B (PC + tunnel)** | gratis | sudah 50% siap | PC harus nyala | cadangan |
| **D. Laravel Cloud** | gratis 14 hari | cloud murni, no kartu | kredit habis 14 hari → mati | dicoret |

## 4. Penjelasan "kok teman bisa" (DeltaJalan)
- Teman punya **VPS sendiri** → backend Laravel di `/var/www/deltajalan` via **GitHub Actions** (`deploy-backend.yml`), frontend di **Vercel** (`delta-jalan.vercel.app`).
- Pengguna cuma lihat **1 URL** (frontend). Backend punya alamat sendiri yang **tersembunyi**.
- Kita akan **meniru pola ini 100%**.

## 5. Rencana jalur A (VPS) — sudah disusun
1. **Beli VPS**: DomaiNesia Lite 1GB, bulanan Rp53.280, Jakarta, **Ubuntu 24.04** (jangan pilih template), daftar pakai NIK.
2. **Domain gratis**: `dineflow.duckdns.org` → A record ke IP VPS. (Domain `fadhilfaith.my.id` **tidak dipakai** — sudah untuk proyek lain.)
3. **Setup server** via SSH (puTTY): Nginx + PHP-FPM + Redis + supervisor (Reverb).
4. **Deploy**: `/var/www/dineflow-pos` + GitHub Actions `deploy-backend.yml` (persis temanmu); frontend ke Vercel (`dineflow-pos.vercel.app`).
5. **SSL gratis**: Let's Encrypt untuk DuckDNS.
6. **Data**: Neon (DB), Supabase (foto), Upstash/Redis — nilai 7 baris rahasia di `backend/.env`.
7. **Verifikasi + update docs** (`deployment.md`, `PROGRESS.md`, `workflow.md`).

## 6. Hal yang masih menggantung (belum dijawab)
- [ ] Apakah setuju daftar DomaiNesia pakai **NIK**?
- [ ] Setelah VPS aktif: kirim **IP + password root** ke saya, atau user yang jalanin pakai panduan?
- [ ] Sudah **tanya guru** soal penawaran VPS sekolah? (nyala 24 jam? boleh install? OS apa?)
- [ ] Sudah **pilih** jalur final: A (VPS sewa) / B (server sekolah) / C (tunnel)?
- [ ] Isi 7 nilai rahasia di `backend/.env` (Neon `DB_URL`, Upstash `REDIS_URL`, Supabase `AWS_*`) — tersimpan di password manager.

## 7. Yang SUDAH selesai disiapkan
- ✅ `backend/.env` diubah ke struktur cloud (placeholder rahasia) + `pdo_pgsql` diaktifkan di PHP Laragon.
- ✅ Frontend di-build; `echo.ts` & `vite.config.ts` (proxy `/api` + WS `/app`) siap.
- ✅ cloudflared terunduh (`cloudflared.exe`) — cadangan Jalur B.
- ✅ Kredensial cloud: Upstash, Neon, Supabase (di password manager).
# Panduan Deployment DineFlow POS (Multi-Jalur)

Runbook men-deploy DineFlow POS ke production, disusun **berjenjang** sesuai kondisi
pengguna (pelajar tanpa kartu kredit, tanpa penghasilan). Dokumen ini juga menjadi
**acuan tetap** untuk proyek-proyek berikutnya: setup sekali, tinggal tambah proyek.

> Status: **sistem ±90% jalan lokal**; deploy online menunggu keputusan hosting
> (tanya server sekolah dulu → baru VPS). Repo: `github.com/fadhilfaith48/dineflow-pos`
> (branch `main`).

---

## §0 Tabel Keputusan Berjenjang

Pilih jalur sesuai kondisi — urutan dari yang paling hemat:

| # | Jalur | Biaya | Kartu? | Muat Reverb/Redis? | Keterangan |
|---|---|---|---|---|---|
| 1 | **Server Sekolah** | Rp0 | Tidak | ✅ | Tanya pembimbing dulu (lihat §2) |
| 2 | **VPS IDCloudHost 2GB** | Rp87.000/bln | Tidak (GoPay/OVO) | ✅ | **Jalur produksi utama** (lihat §1) |
| 3 | **Railway** (trial 30 hari) | $5 credit sekali | Tidak | ⚠️ sementara | Coba-coba / bukti deploy (lihat §3) |
| ✗ | diskon.com / InfinityFree (backend) | Rp0 | Tidak | ❌ | Shared hosting: tanpa Reverb/Redis → KDS mati |
| ✗ | Oracle / Render / AWS | Rp0 | **Wajib** | ✅ | Blokir tanpa kartu; AWS hanya 12 bln (lihat §4) |

**Inti masalah:** DineFlow butuh **Reverb (WebSocket) + Redis** untuk Kitchen Display
real-time. Itu hanya bisa di server dengan kontrol penuh (VPS / server sekolah) — bukan
shared hosting. Bukan karena Laravel berat.

---

## §1 JALUR UTAMA — VPS IDCloudHost (Rp87.000/bln)

**Spesifikasi:** 2 Core / 2GB RAM / 20GB NVMe, "Pay as You Grow" (billing per jam, cap
bulanan ±Rp87.000). Bayar **GoPay/OVO** (tanpa kartu). Upgrade CPU/RAM **langsung dari
console tanpa migrasi** (data aman).

> **Estimasi kapasitas:** nyaman untuk **1–2 proyek skala DineFlow** (tiap proyek
> ±700–900MB RAM) atau 2–3 proyek kecil. Untuk 3+ proyek, upgrade ke 4GB (±Rp225.000).
> Biaya **flat** Rp87.000 — tidak naik per proyek selama muat di 2GB.
>
> **Alternatif lebih murah:** DomaiNesia Cloud VPS Lite 1GB — Rp43.200/bln (promo
> `CLOUDVPSHEMAT`, wajib bayar 1 tahun ±Rp518rb, GoPay/OVO). Muat 1 proyek saja.

### 1.1 Prasyarat
- Akun [IDCloudHost](https://console.idcloudhost.com) (daftar, verifikasi, siapkan
  GoPay/OVO) — harga final cek di console saat checkout.
- Repo di-push ke GitHub `fadhilfaith48/dineflow-pos` (public).
- `backend/.env` mencontoh produksi (`APP_KEY` via `php artisan key:generate`).
- `frontend/.env` menyiapkan `VITE_API_URL`, `VITE_REVERB_HOST`, dst (lihat §1.5).

### 1.2 Setup Server (sekali untuk banyak proyek)
1. **Launch VPS** → OS **Ubuntu 24.04** → SSH ke server.
2. **Instal dasar:** `nginx`, `php8.3-fpm` + ekstensi (`php8.3-mbstring xml curl
   pgsql zip bcmath gd intl`), `composer`, `postgresql`, `redis-server`, `git`.
3. **PostgreSQL:** buat database `dineflow_pos` + user khusus.
4. **Redis:** aktifkan service; untuk broadcast dipakai channel default.
5. **PHP-FPM + Nginx:** konfigurasi `server` untuk tiap proyek (lihat §1.3).

### 1.3 Deploy DineFlow di VPS
1. `git clone https://github.com/fadhilfaith48/dineflow-pos.git` → `backend/`.
2. `composer install --optimize-autoloader --no-dev`.
3. Salin `.env.example` → `.env`; isi sesuai tabel env di Lampiran A.
4. `php artisan key:generate`.
5. `php artisan migrate --force && php artisan db:seed --force` (data demo: admin/1234,
   19 menu, 8 meja).
6. **Nginx** (root ke `backend/public`, `try_files` ke `index.php`, proxy PHP-FPM).
7. **Reverb sebagai systemd service** (agar selalu jalan):
   ```
   php artisan reverb:start --host=0.0.0.0 --port=8080
   ```
   Buat unit `systemd` dengan `Restart=always` (persis pola §2.7 di dokumen temanmu).
8. **Foto menu:** simpan lokal di `storage/app/public` + `php artisan storage:link`
   (VPS bersifat persisten, tidak ephemeral seperti PaaS).
9. **Frontend:** build `npm run build` → arahkan Nginx (atau deploy ke Vercel/Cloudflare
   Workers secara terpisah, lihat §1.5).

### 1.4 Tambah Proyek Baru (5–10 menit)
Tiap proyek berikutnya cukup:
1. Upload/buka folder project baru di server.
2. Buat config Nginx baru (`/etc/nginx/sites-available/<proyek>` → symlink ke
   `sites-enabled`).
3. Buat database PostgreSQL baru.
4. `systemctl reload nginx`.
> Redis, PHP, dan Nginx sudah terpasang — tidak perlu instal ulang.

### 1.5 Frontend
Frontend React bisa gratis di salah satu:
- **Vercel** (build `npm run build`, preset Vite; env `VITE_*` dibaca saat build — set
  sebelum build pertama), atau
- **Cloudflare Workers** (butuh Wrangler), atau
- **InfinityFree** (upload statis via FTP) — paling sederhana tapi manual.

Env frontend (Vercel contoh):
| Var | Nilai |
|---|---|
| `VITE_API_URL` | `https://<domain-vps>/api` |
| `VITE_REVERB_APP_KEY` | `dinflow-pos-key` (sama dengan backend) |
| `VITE_REVERB_HOST` | `<domain-vps>` |
| `VITE_REVERB_PORT` | `443` |
| `VITE_REVERB_SCHEME` | `https` |

---

## §2 JALUR SEKOLAH — Server Sekolah / Oracle Academy (Rp0)

1. **Tanya pembimbing** (pertanyaan sudah ada di `docs/catatan-presentasi.md`): apakah
   sekolah menyediakan server/VPS gratis, speknya, dan ada akses SSH/root?
2. Kalau ya → setup sama persis dengan §1 (nginx + PHP + PostgreSQL + Redis + Reverb),
   hanya di komputer sekolah.
3. **URL publik tanpa IP statis/port forwarding:** pakai **cloudflared tunnel**
   (gratis) → dapat URL `https://xxx.trycloudflare.com`. Syarat: server harus nyala
   saat demo.
4. **Oracle Academy:** kalau sekolah mau mendaftarkan kamu ke Oracle Academy, kamu bisa
   dapat **Oracle Always Free tanpa kartu** (lihat §4.1) — server 24GB RAM gratis
   selamanya, paling besar di antara semua opsi.

---

## §3 OPSI SEMENTARA — Railway (trial 30 hari, tanpa kartu)

- Daftar **tanpa kartu**, dapat $5 credit untuk 30 hari.
- Support Docker + PostgreSQL + Redis → DineFlow bisa jalan.
- **Catatan penting:** credit $5 **tidak cukup** untuk 4 service permanen
  (API + Reverb + DB + Redis) — habis dalam hitungan hari. Cocok untuk **uji coba /
  bukti deploy di laporan**, bukan hosting tetap.

---

## §4 CATATAN "TIDAK BISA / BELUM"

### 4.1 Oracle Always Free
- Free tier **paling besar**: server Arm 4 OCPU / **24GB RAM** + 200GB storage, **gratis
  selamanya** (tidak ada batas 12 bulan), muat banyak proyek.
- **Penghalang:** wajib **kartu kredit** saat daftar (hanya verifikasi, tidak di-charge
  selama dalam kuota free). Jangan sentuh layanan berbayar, jangan biarkan akun idle
  >30 hari (bisa diterminasi).
- **Tanpa kartu:** lewat **Oracle Academy** (kamu terdaftar sebagai siswa) → tanyakan ke
  pembimbing.

### 4.2 Render
- Mewajibkan **kartu kredit** untuk akun baru (free tidak tersedia lagi) → **belum bisa**
  untukmu. Dulu jalur utama dokumen ini adalah Vercel+Render+Neon+Upstash+Supabase —
  detail teknisnya tetap dipakai sebagai referensi di Lampiran A.

### 4.3 AWS (Free Tier)
- Wajib **kartu kredit**; free tier **hanya 12 bulan**; setelah itu **tagihan otomatis**
  ke kartu (±$15–25/bln per proyek). Proyek ke-2+ langsung berbayar sejak dibuat.
  Tidak direkomendasikan untuk pelajar tanpa penghasilan.

### 4.4 diskon.com / InfinityFree (dan shared hosting lain)
- **Tidak bisa jadi backend DineFlow:** shared hosting **melarang proses jangka panjang**
  → **Reverb/WebSocket tidak mungkin** dan **Redis tidak bisa di-install**. Tanpa
  keduanya, Kitchen Display real-time mati.
- **Bisa** dipakai untuk: **frontend statis** (upload build React via FTP), blog,
  WordPress, landing page.
- Catatan keamanan: tautan diskon.com yang beredar biasanya **link afiliasi** (kode
  reseller orang lain).

---

## Lampiran A — Tabel Env Backend (berlaku untuk semua jalur VPS/server)

| Var | Nilai | Catatan |
|---|---|---|
| `APP_ENV` | `production` | |
| `APP_DEBUG` | `false` | |
| `APP_URL` | `https://<domain>` | URL backend |
| `APP_KEY` | hasil `key:generate` | jangan bocor |
| `DB_CONNECTION` | `pgsql` | PostgreSQL |
| `DB_HOST` / `DB_PORT` / `DB_DATABASE` / `DB_USERNAME` / `DB_PASSWORD` | dari server | |
| `BROADCAST_CONNECTION` | `reverb` | |
| `QUEUE_CONNECTION` | `sync` | prototype; `redis` bila pakai queue |
| `CACHE_STORE` | `redis` | |
| `SESSION_DRIVER` | `redis` (atau `database`) | |
| `REDIS_CLIENT` | `phpredis` / `predis` | sesuaikan instalasi |
| `REDIS_HOST` / `REDIS_PORT` | `127.0.0.1` / `6379` | Redis lokal VPS |
| `REVERB_APP_ID` | `dinflow-pos` | **sama** dengan `VITE_REVERB_APP_KEY` |
| `REVERB_APP_KEY` | `dinflow-pos-key` | **sama** di semua service |
| `REVERB_APP_SECRET` | rahasia | |
| `REVERB_SERVER_HOST` | `0.0.0.0` | |
| `REVERB_SERVER_PORT` | `8080` | |
| `REVERB_SERVER_HOSTNAME` | domain VPS, **tanpa** `wss://` | |
| `REVERB_SERVER_SCHEME` | `https` | |
| `FILESYSTEM_DISK` / `PHOTO_DISK` | `public` (VPS) atau `s3` | lokal VPS = `public` + `storage:link` |
| `FRONTEND_URL` | `https://<fe>.vercel.app` | origin CORS |
| `TRUSTED_PROXIES` | `*` | bila di belakang proxy/cloudflare |

### CORS (back-end → frontend)
Di `backend/config/cors.php`, pastikan `allowed_origins` berisi URL frontend:
```php
'allowed_origins' => [
    env('FRONTEND_URL', 'http://localhost:5173'),
],
```

### Origin WebSocket
Di `backend/config/reverb.php`, bagian `apps[0].allowed_origins` / `allowed_hosts`
tambahkan domain frontend + hostname reverb.

---

## Lampiran B — Referensi Lama (Vercel + Render + Neon + Upstash + Supabase)

Runbook lama untuk jalur multi-layanan gratis **tetap valid secara teknis** (Dockerfile
`backend/Dockerfile`: PHP 8.3 + `pdo_pgsql` + `pcntl`; env tabel di atas; Neon §5.1,
Upstash §5.2, Supabase §6, Vercel §7, checklist verifikasi §8). Referensi tersebut
tersimpan di riwayat commit repo. Halangan utamanya: **Render kini wajib kartu kredit**
untuk akun baru → jalur ini tidak lagi "tanpa kartu".

---

## §9 Checklist Verifikasi Pasca-Deploy (universal)

1. **API**: `curl https://<domain>/api/categories` → 200 JSON.
2. **Login**: POST `/api/login` (admin/1234) → dapat token.
3. **Akses publik**: GET `/api/menu-items` tanpa token → 200.
4. **Foto**: upload menu → URL foto dapat diakses (200).
5. **WebSocket real-time**: buka Menu Pesan Mandiri di browser, DevTools → Network → WS
   koneksi `connected`; tab lain: Kasir Konfirmasi order → KDS tampil tanpa refresh.
6. **CORS**: request dari domain frontend tidak error CORS.

## Catatan Umum

- **Jangan pernah** menaruh `.env` di repo; semua rahasia lewat env vars platform/file
  server.
- **Demo lokal dulu, deploy setelah presentasi.** Sistem ±90% jalan lokal.
- Setelah deploy, update `frontend/PROGRESS.md` & `docs/jurnal-pkl.md`.

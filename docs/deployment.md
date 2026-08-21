# Panduan Deployment DineFlow POS — 5 Jalur

> **Tujuan**: Men-deploy DineFlow POS (Laravel + React + Reverb + Redis) ke production.
> Status: **belum deploy** — dokumen ini panduan keputusan.
> Repo: `github.com/fadhilfaith48/dineflow-pos` (branch `main`, public).

---

## §0. Tabel Keputusan Berjenjang

Pilih jalur berdasarkan kondisi Anda:

| # | Kondisi Anda | Jalur yang Dipilih | Biaya | Catatan |
|---|---|---|---|---|
| 1 | Punya **server sekolah** / akses Oracle Academy | **§2 — Jalur Sekolah** | Rp0 | Prioritas #1 jika tersedia |
| 2 | Ingin **VPS permanen** tanpa kartu kredit | **§1 — Jalur Utama (VPS)** | Rp43rb–87rb/bln | Bayar pakai e-wallet (GoPay/OVO) |
| 3 | Butuh **hosting gratis sementara** (demo PKL) | **§3 — Opsi Sementara** | Rp0 (trial) | Railway 30 hari / Tencent 3 bulan |
| 4 | Tidak bisa bayar & tidak ada server sekolah | **§4 — Tidak Bisa** | — | Cari pinjaman VPS teman / tunggu |

> **Rekomendasi**: Coba **§2** dulu (tanya guru), kalau tidak ada → **§1** (DomaiNesia paling murah), kalau butuh gratis segera → **§3** (Tencent trial).

---

## §1. JALUR UTAMA — VPS Tanpa Kartu Kredit

VPS (Virtual Private Server) adalah solusi paling stabil untuk Laravel + Reverb + Redis.
Semua opsi di bawah **bisa bayar pakai e-wallet (GoPay/OVO/DANA)** — tanpa kartu kredit.

### Arsitektur Target (berlaku untuk semua opsi VPS)

```
Browser
  ├─ https://<domain>.vercel.app        → React SPA (Vercel, gratis)
  │     ├─ API     → https://<ip-vps>   (Laravel, VPS)
  │     └─ WS      → wss://<ip-vps>    (Reverb, VPS)
  └─ (upload foto → API endpoint)

VPS (1 server, semua layanan):
  ├─ Nginx (reverse proxy, SSL Let's Encrypt)
  ├─ PHP-FPM 8.3 (Laravel API)
  ├─ PostgreSQL / MySQL (database)
  ├─ Redis (broadcasting + cache)
  └─ Supervisor (Reverb WebSocket, auto-restart)
```

**Catatan**: Database & Redis bisa dipasang di VPS sendiri ( hemat, setup sekali) ATAU pakai managed gratis (Neon/Upstash) kalau VPS spek kecil.

---

### Opsi A: IDCloudHost

| Aspek | Detail |
|---|---|
| **Paket** | 2 vCPU / 2GB RAM / 20GB SSD |
| **Harga** | ~Rp87.000/bulan (**billing per jam** — bayar sesuai pemakaian) |
| **Pembayaran** | GoPay, OVO, DANA, VA bank (tanpa kartu kredit) |
| **Region** | Indonesia (Jakarta) — latency rendah |
| **Control Panel** | `console.idcloudhost.com` |
| **OS** | Ubuntu 22.04 / 24.04 (pilih saat ordering) |
| **Catatan** | Harga "simulasi" — cek final saat checkout; billing per jam artinya kalau server mati 3 jam, tetap bayar 3 jam |

**Langkah:**
1. Daftar di `console.idcloudhost.com` (bisa pakai Google/email).
2. Buat VPS baru → pilih **Ubuntu 24.04**, 2 vCPU / 2GB RAM.
3. Login via SSH: `ssh root@<ip-vps>` (password dari dashboard).
4. Lanjut ke **Setup Server** di bawah.

---

### Opsi B: DomaiNesia (Paling Murah)

| Aspek | Detail |
|---|---|
| **Paket** | Lite 1 vCPU / 1GB RAM / 25GB SSD |
| **Harga** | **Rp43.200/bulan** (promo code `CLOUDVPSHEMAT`) — bayar 1 tahun = ~Rp518.400 |
| **Pembayaran** | GoPay, OVO, DANA, VA bank (tanpa kartu kredit) |
| **Region** | Indonesia (Jakarta) |
| **Control Panel** | `domaiNesia.com/clientarea` |
| **OS** | Ubuntu 24.04 |
| **Catatan** | Harga promo untuk **1 tahun pembelian baru**; perpanjangan harga normal. NIK untuk verifikasi. |

**Langkah:**
1. Buka `domainesia.com/vps-murah/` → pilih **VPS Z** (1GB).
2. Pilih **Ubuntu 24.04**, durasi 1 tahun, masukkan promo `CLOUDVPSHEMAT`.
3. Daftar pakai **NIK** (KTP) + bayar via GoPay/OVO.
4. Terima email: IP VPS + password root.
5. Login: `ssh root@<ip-vps>`.
6. Lanjut ke **Setup Server** di bawah.

---

### Opsi C: Tencent Cloud Lighthouse (Gratis 3 Bulan Trial)

| Aspek | Detail |
|---|---|
| **Paket** | 1 vCPU / 1GB RAM / 25GB SSD (specs trial bervariasi) |
| **Harga** | **Gratis selama 3 bulan** (free trial new user) |
| **Pembayaran** | Tidak perlu kartu kredit untuk daftar (coba region Singapore/Hong Kong) |
| **Region** | **Singapore (ap-singapore)** atau **Hong Kong (ap-hongkong)** — JANGAN China mainland |
| **Control Panel** | `console.cloud.tencent.com/lighthouse` |
| **OS** | Ubuntu (pilih saat ordering) |
| **Catatan** | Setelah 3 bulan habis → data hilang / harus bayar. Cocok untuk demo PKL. |

**Catatan penting:**
- **Jangan klik "ADP 4.0"** — itu produk AI agent, bukan VPS. Yang dicari = **Lighthouse**.
- Daftar pakai **Google Account** (aman, tidak perlu password baru).
- Jika diminta **kartu kredit** atau **verifikasi identitas** → skip, pilih opsi lain.

**Langkah:**
1. Buka `console.cloud.tencent.com/lighthouse` → **Sign Up with Google**.
2. Pilih region **Singapore** atau **Hong Kong**.
3. Buat **Lighthouse** instance baru → pilih Ubuntu 24.04.
4. Login: `ssh root@<ip-vps>` (password dari dashboard Lighthouse).
5. Lanjut ke **Setup Server** di bawah.

---

### Setup Server (Semua Opsi VPS)

Setelah punya VPS + akses SSH, jalankan langkah berikut **berurutan**:

#### 1. Update & Install Dependencies
```bash
apt update && apt upgrade -y
apt install -y nginx php8.3-fpm php8.3-cli php8.3-pgsql php8.3-redis \
  php8.3-mbstring php8.3-xml php8.3-curl php8.3-zip php8.3-bcmath \
  postgresql redis-server git unzip supervisor
```

#### 2. Setup PostgreSQL
```bash
sudo -u postgres createuser -P dineflow   # password: (buat sendiri)
sudo -u postgres createdb -O dineflow dineflow_pos
```
Catat `DB_HOST=127.0.0.1`, `DB_PORT=5432`, `DB_DATABASE=dineflow_pos`, `DB_USERNAME=dineflow`, `DB_PASSWORD=(yang dibuat)`.

#### 3. Setup Redis
Redis sudah jalan setelah install. Cek: `redis-cli ping` → harus `PONG`.
Jika ingin password: edit `/etc/redis/redis.conf` → `requirepass <password>` → restart: `systemctl restart redis-server`.

#### 4. Deploy Laravel
```bash
cd /var/www
git clone https://github.com/fadhilfaith48/dineflow-pos.git
cd dineflow-pos/backend

# Install dependencies
composer install --optimize-autoloader --no-dev

# Setup environment
cp .env.example .env
php artisan key:generate

# Edit .env (isi nilai produksi):
# APP_ENV=production
# APP_DEBUG=false
# APP_URL=https://<domain-atau-ip>
# DB_CONNECTION=pgsql
# DB_HOST=127.0.0.1
# DB_PORT=5432
# DB_DATABASE=dineflow_pos
# DB_USERNAME=dineflow
# DB_PASSWORD=<password-db>
# REDIS_CLIENT=predis
# REDIS_URL=redis://127.0.0.1:6379
# BROADCAST_CONNECTION=reverb
# QUEUE_CONNECTION=sync
# CACHE_STORE=redis
# SESSION_DRIVER=redis
# FILESYSTEM_DISK=public   # atau 's3' kalau pakai Supabase
# PHOTO_DISK=public
# REVERB_APP_ID=<buat-acak>
# REVERB_APP_KEY=<buat-acak>
# REVERB_APP_SECRET=<buat-acak>

# Migrate & seed
php artisan migrate --force
php artisan db:seed

# Storage link (foto menu)
php artisan storage:link
```

#### 5. Setup Supervisor (Reverb WebSocket)
```bash
cat > /etc/supervisor/conf.d/reverb.conf << 'EOF'
[program:reverb]
process_name=%(program_name)s
command=php /var/www/dineflow-pos/backend/artisan reverb:start --host=0.0.0.0 --port=8080
autostart=true
autorestart=true
user=www-data
redirect_stderr=true
stdout_logfile=/var/www/dineflow-pos/backend/storage/logs/reverb.log
stopwaitsecs=3600
EOF

supervisorctl reread
supervisorctl update
supervisorctl start reverb
```

#### 6. Setup Nginx
```bash
cat > /etc/nginx/sites-available/dineflow << 'EOF'
server {
    listen 80;
    server_name <domain-atau-ip>;

    # Laravel API
    location / {
        root /var/www/dineflow-pos/backend/public;
        try_files $uri $uri/ /index.php?$query_string;
    }

    # PHP-FPM
    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.3-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    # WebSocket (Reverb)
    location /app {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }

    # Storage (foto menu)
    location /storage {
        alias /var/www/dineflow-pos/backend/storage/app/public;
    }
}
EOF

ln -s /etc/nginx/sites-available/dineflow /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

#### 7. SSL (opsional, untuk domain)
```bash
apt install certbot python3-certbot-nginx -y
certbot --nginx -d <domain>
# Auto-renew: crontab → 0 12 * * * certbot renew --quiet
```

#### 8. Deploy Frontend ke Vercel
1. Vercel → Add New → Project → import `dineflow-pos`.
2. Root Directory: `frontend`.
3. Env Vars:
   - `VITE_API_URL` = `https://<domain-atau-ip>/api`
   - `VITE_REVERB_APP_KEY` = (sama dengan backend)
   - `VITE_REVERB_HOST` = `<domain-atau-ip>`
   - `VITE_REVERB_PORT` = `443` (atau `80` kalau belum SSL)
   - `VITE_REVERB_SCHEME` = `https` (atau `http` kalau belum SSL)
4. Deploy → URL `https://<fe>.vercel.app`.

#### 9. Verifikasi
```bash
# API
curl https://<domain>/api/categories → 200 JSON

# Login
curl -X POST https://<domain>/api/login -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"1234"}' → token

# WebSocket
# Buka DevTools → Network → WS → check koneksi ke wss://<domain>/app
```

---

## §2. JALUR SEKOLAH — Server Sekolah / Oracle Academy (Rp0)

**Opsi paling murah: Rp0.** Minta izin pakai server milik sekolah (lab komputer / server guru) atau lewat program Oracle Academy.

### A. Server Sekolah (guru nawarin VPS)
1. Tanya guru/bimbingan: **"Apakah sekolah punya server yang bisa dipinjam untuk hosting aplikasi?"**
2. Kalau iya, minta:
   - IP address + port SSH
   - Username + password (atau SSH key)
   - OS (Linux/Ubuntu)
3. Jalankan **Setup Server** (langkah 1–9 di §1) di server sekolah.
4. Catatan: server sekolah biasanya **di belakang firewall** → mungkin perlu **cloudflared tunnel** (lihat §2.C).

### B. Oracle Academy (gratis selamanya)
Oracle Academy menyediakan **Oracle Cloud Free Tier** (24GB RAM, 4 core, gratis selamanya) untuk siswa/guru yang terdaftar.
1. Cek apakah sekolah Anda **terdaftar di Oracle Academy** (tanya guru mata pelajaran IT/TI).
2. Kalau iya, minta guru membuat akun untuk Anda → akses `cloud.oracle.com`.
3. Buat **VM instance** Ubuntu di Oracle Cloud → jalankan Setup Server.
4. **Catatan**: Oracle Cloud Free Tier **wajib kartu kredit** untuk verifikasi, TAPI lewat Oracle Academy biasanya **bisa tanpa kartu**.

### C. Cloudflared Tunnel (untuk server di belakang firewall)
Jika server sekolah tidak punya IP publik / port 80 terblokir:
```bash
# Install cloudflared di server
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /usr/local/bin/cloudflared
chmod +x /usr/local/bin/cloudflared

# Tunnel ke port 80
cloudflared tunnel --url http://localhost:80
```
→ Dapat URL publik `https://xxx.trycloudflare.com` → pakai sebagai `APP_URL`.

**Catatan**: URL berubah setiap restart cloudflared. Untuk demo PKL cukup; untuk permanen, beli domain + cloudflare tunnel tetap (gratis).

---

## §3. OPSI SEMENTARA — Trial Gratis

Opsi ini **tidak permanen** — cocok untuk demo PKL sementara, bukan deployment akhir.

### A. Railway (30 hari, $5 credit)

| Aspek | Detail |
|---|---|
| **Trial** | 30 hari, $5 credit (tanpa kartu) |
| **Masalah** | **Tidak cukup** untuk 4 service permanen (API + Reverb + DB + Redis) — credit habis sekitar 7–10 hari |
| **Pembayaran** | Butuh kartu kredit untuk upgrade ke paid |
| **Cocok untuk** | Demo 1–2 minggu saja |

**Langkah:**
1. Daftar di `railway.app` (pakai GitHub).
2. Deploy backend dari repo GitHub.
3. Tambah PostgreSQL + Railway plugin.
4. Deploy frontend ke Vercel.
5. **Warning**: $5 credit habis cepat untuk always-on service.

### B. Tencent Cloud Lighthouse (3 bulan gratis)

| Aspek | Detail |
|---|---|
| **Trial** | 3 bulan gratis (new user) |
| **Specs** | 1 vCPU / 1GB RAM / 25GB SSD (trial) |
| **Pembayaran** | Tanpa kartu (coba region Singapore/HK) |
| **Cocok untuk** | Demo PKL + beberapa minggu setelahnya |
| **Masalah** | Setelah 3 bulan → data hilang atau bayar |

**Langkah**: Sama seperti §1 Opsi C (Tencent Cloud Lighthouse) — lihat di atas.

---

## §4. TIDAK BISA / BELUM — Catatan Opsi yang Tersingkirkan

Berikut opsi yang **tidak cocok** untuk DineFlow POS, beserta alasannya:

### Render (Backend)
- **Masalah**: Mewajibkan **kartu kredit** untuk membuat Redis & PostgreSQL (free sudah tidak tersedia untuk akun baru).
- **Alternatif**: Pakai managed gratis (Neon DB, Upstash Redis) → tapi tetap butuh kartu untuk membuat Web Service di Render.
- **Verdict**: ❌ Tidak bisa tanpa kartu.

### Oracle Always Free (Cloud)
- **Masalah**: Gratis selamanya (24GB RAM!), TAPI **wajib kartu kredit** untuk verifikasi saat membuat akun.
- **Alternatif**: Lewat **Oracle Academy** (§2.B) bisa tanpa kartu.
- **Verdict**: ❌ Tanpa kartu tidak bisa; ✅ lewat Oracle Academy bisa.

### AWS Free Tier
- **Masalah**: Hanya 12 bulan gratis, **wajib kartu kredit**, tagihan otomatis per resource (EC2, RDS, ElastiCache) setelah free tier habis. Proyek ke-2+ langsung berbayar.
- **Verdict**: ❌ Terlalu berisiko untuk pelajar tanpa kartu.

### diskon.com / InfinityFree (Shared Hosting)
- **Masalah**: Shared hosting **tidak support WebSocket** → Laravel Reverb + Redis **tidak bisa jalan** → KDS real-time mati.
- **Alternatif**: InfinityFree bisa untuk **frontend statis** saja (deploy build React), tapi backend tetap butuh VPS.
- **Verdict**: ❌ Tidak cocok untuk DineFlow (butuh real-time).

### Laravel Cloud
- **Masalah**: Gratis 14 hari, **wajib kartu kredit** untuk daftar.
- **Verdict**: ❌ Tidak bisa tanpa kartu.

---

## §5. Layanan Managed Gratis (Berlaku untuk Semua Jalur)

Untuk menghemat spesifikasi VPS, gunakan layanan managed gratis untuk beberapa komponen:

| Layanan | Fungsi | Gratis? | Catatan |
|---|---|---|---|
| **Neon** (neon.tech) | PostgreSQL database | ✅ Free tier, auto-wake | Tidak perlu install PostgreSQL di VPS |
| **Upstash** (upstash.com) | Redis | ✅ Free tier | Tidak perlu install Redis di VPS |
| **Supabase** (supabase.com) | Foto menu (S3 storage) | ✅ 1GB free | Pause setelah 7 hari idle → Resume manual |
| **Vercel** (vercel.com) | Frontend React SPA | ✅ Free tier | Deploy dari GitHub |
| **DuckDNS** (duckdns.org) | Domain gratis | ✅ Gratis | A record ke IP VPS |

**Rekomendasi combo hemat VPS:**
- VPS kecil (1 vCPU / 512MB–1GB) → hanya jalankan Laravel + Nginx + Reverb
- Database → Neon (gratis)
- Redis → Upstash (gratis)
- Foto → Supabase (gratis)
- Frontend → Vercel (gratis)
- Domain → DuckDNS (gratis)

Atau pasang **semua di VPS** (PostgreSQL + Redis + Laravel + Reverb) → hemat biaya managed, tapi butuh VPS ≥ 2GB RAM.

---

## §6. Checklist Sebelum Deploy

- [ ] Pilih jalur (§0 → §1/2/3/4).
- [ ] Buat akun di provider yang dipilih.
- [ ] Siapkan environment variables (lihat langkah 4 di §1).
- [ ] Isi nilai rahasia: `APP_KEY`, `DB_PASSWORD`, `REVERB_*`, `AWS_*` (kalau pakai Supabase).
- [ ] Deploy backend ke VPS.
- [ ] Deploy frontend ke Vercel.
- [ ] Verifikasi: API, login, WebSocket, foto menu.
- [ ] Update `frontend/PROGRESS.md` & `docs/jurnal-pkl.md` dengan hasil deploy.
- [ ] Commit & push perubahan dokumentasi.

---

> **Status**: Dokumen ini disusun ulang pada 20 Agustus 2026. Pilih jalur sesuai kondisi
> Anda di §0. Jika ada pertanyaan, tanyakan ke pembimbing PKL.

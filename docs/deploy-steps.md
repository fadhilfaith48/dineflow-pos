# PANDUAN DEPLOY DineFlow POS (Step-by-Step)

> File ini dibuat dari hasil sesi deploy yang sudah berjalan. Tujuannya: supaya pekerjaan
> tidak hilang walau sesi SSH putus / terminal ditutup. Ikuti urut, satu baris per langkah,
> tunggu selesai (prompt `root@localhost:#` muncul lagi) sebelum lanjut ke baris berikutnya.

---

## DATA YANG SUDAH DIGALI (isi sendiri yang rahasia)

| Item | Nilai | Status |
|---|---|---|
| IP VPS | `163.61.58.129` | ✅ |
| Password root VPS | *(password yang dibuat saat order Nevacloud)* | kamu yang tahu |
| Neon Host (direct, tanpa `-pooler`) | `ep-falling-tooth-azkqvz0d.c-3.ap-southeast-1.aws.neon.tech` | ✅ |
| Neon Database | `neondb` | ✅ |
| Neon User | `neondb_owner` | ✅ |
| Neon Password | *(dari dashboard Neon, saran: reset karena sempat bocor)* | **ISI_SENDIRI** |
| Upstash REDIS_URL | `rediss://...` | **ISI_SENDIRI** |
| Supabase AWS key/secret/region/bucket/endpoint | *(dari dashboard Supabase)* | **ISI_SENDIRI** |
| DuckDNS subdomain | `dineflow.duckdns.org` (+ token) | **ISI_SENDIRI** |
| URL Frontend Vercel | `https://<nama-proyek>.vercel.app` | nanti |

> **ATURAN PENTING:** Jangan pernah menulis password/rahasia di chat/GitHub.
> Saat mengisi `.env`, ketik langsung di editor `nano` dari catatan pribadi kamu.

---

## BAGIAN 0 — Anti Koneksi Putus (SSH Keepalive)

Cegah SSH putus karena idle (lakukan SEKALI di Git Bash LOKAL, sebelum ssh):

```bash
mkdir -p ~/.ssh
echo -e "Host *\n  ServerAliveInterval 60\n  ServerAliveCountMax 3" >> ~/.ssh/config
```

## BAGIAN 1 — Login SSH ke VPS

1. Buka Git Bash (lokal) → sampai muncul `user@FAITH MINGW64 ~ (main)`
2. Ketik (ganti dengan IP-nya):
```bash
ssh root@163.61.58.129
```
3. `yes` → Enter (kalau diminta)
4. Ketik password root → Enter (huruf tidak terlihat, normal)
5. Berhasil jika muncul: `root@localhost:~#` dan pesan `Welcome to Ubuntu 24.04...`

---

## BAGIAN 2 — Install Dependency (URUT, SATU-SATU)

### Baris 1 — update daftar paket
```bash
apt update
```

### Baris 2 — upgrade paket (kalau muncul layar config, pilih "keep the local version")
```bash
apt upgrade -y
```

### Baris 3 — install aplikasi (paling lama; kalau muncul layar config SSH, pilih "keep local version")
```bash
apt install -y nginx php8.3-fpm php8.3-cli php8.3-pgsql php8.3-mbstring php8.3-xml php8.3-curl php8.3-zip php8.3-bcmath git unzip curl supervisor
```

> Catatan: TIDAK install `php8.3-redis` (pakai Upstash via predis) dan TIDAK install
> PostgreSQL/Redis lokal (hemat RAM 1GB).

### Install Composer
```bash
cd /tmp
curl -sS https://getcomposer.org/installer -o composer-setup.php
php composer-setup.php --install-dir=/usr/local/bin --filename=composer
composer --version
```
`composer --version` harus muncul angka versi.

---

## BAGIAN 3 — Clone & Persiapan Laravel

```bash
mkdir -p /var/www && cd /var/www
git clone https://github.com/fadhilfaith48/dineflow-pos.git
cd dineflow-pos/backend
composer install --no-dev --optimize-autoloader
cp .env.example .env
php artisan key:generate
```
```
INFO  Application key set successfully.
```

---

## BAGIAN 4 — Edit `.env` (PALING PENTING)

### Buka editor
```bash
nano .env
```

### Cara pindah baris
- Panah ↑/↓ untuk geser
- `Ctrl` + `W` untuk cari (ketik kata lalu Enter)
- Simpan & keluar: `Ctrl` + `X` → `Y` → `Enter`

### 4A. Bagian ATAS — ubah baris ini satu per satu

(⚠️ `.env` dibaca dari atas ke bawah; nilai pertama yang dipakai. Maka edit bagian ATAS, bukan blok template bawah.)

| Baris sekarang | Ubah jadi |
|---|---|
| `APP_ENV=local` | `APP_ENV=production` |
| `APP_DEBUG=true` | `APP_DEBUG=false` |
| `APP_URL=http://localhost:8000` | `APP_URL=https://dineflow.duckdns.org` |
| `FRONTEND_URL=http://localhost:5173` | `FRONTEND_URL=https://<nama-proyek>.vercel.app` |
| `DB_CONNECTION=sqlite` | `DB_CONNECTION=pgsql` |
| `# DB_HOST=127.0.0.1` | `DB_HOST=ep-falling-tooth-azkqvz0d.c-3.ap-southeast-1.aws.neon.tech` (direct host, **TANPA `-pooler`**) |
| `# DB_PORT=3306` | `DB_PORT=5432` |
| `# DB_DATABASE=laravel` | `DB_DATABASE=neondb` |
| `# DB_USERNAME=root` | `DB_USERNAME=neondb_owner` |
| `# DB_PASSWORD=` | `DB_PASSWORD=<ISI_SENDIRI_di_nano>` |
| *(tambah baris baru)* | `DB_SSLMODE=require` |
| `SESSION_DRIVER=database` | `SESSION_DRIVER=redis` |
| `BROADCAST_CONNECTION=log` | `BROADCAST_CONNECTION=reverb` |
| `QUEUE_CONNECTION=database` | `QUEUE_CONNECTION=sync` |
| `CACHE_STORE=database` | `CACHE_STORE=redis` |
| `REDIS_CLIENT=phpredis` | `REDIS_CLIENT=predis` |
| `FILESYSTEM_DISK=local` | `FILESYSTEM_DISK=s3` |
| `PHOTO_DISK=public` | `PHOTO_DISK=s3` |

### 4B. Tambahkan baris baru setelah blok REDIS (Upstash)

```
REDIS_URL=rediss://<ISI_SENDIRI_dari_Upstash>
REDIS_DB=0
REDIS_CACHE_DB=0
```

> ⚠️ **WAJIB**: Upstash (gratis) hanya mendukung database `0`. Laravel default memakai
> `REDIS_CACHE_DB=1` → throttle/login gagal dengan error
> `ERR Only 0th database is supported! Selected DB: 1`. Pastikan kedua baris di atas ada.
> Tes cepat: `php artisan tinker --execute="dump(Cache::has('probe'));"` → harus `false` (bukan error).

### 4C. Tambahkan baris Reverb (WebSocket)

```
REVERB_SERVER_HOST=0.0.0.0
REVERB_SERVER_PORT=8080
REVERB_SERVER_HOSTNAME=dineflow.duckdns.org
REVERB_SERVER_SCHEME=https
REVERB_SERVER_DEBUG=false
REVERB_HOST=dineflow.duckdns.org
REVERB_PORT=443
REVERB_SCHEME=https
REVERB_ALLOWED_ORIGINS=https://<nama-proyek>.vercel.app
```

### 4D. Tambahkan baris AWS/Supabase (foto menu)

```
AWS_ACCESS_KEY_ID=<ISI_SENDIRI>
AWS_SECRET_ACCESS_KEY=<ISI_SENDIRI>
AWS_DEFAULT_REGION=<ISI_SENDIRI>
AWS_BUCKET=menu-photos
AWS_ENDPOINT=https://<project-ref>.supabase.co/storage/v1/s3
AWS_URL=<ISI_SENDIRI>
AWS_USE_PATH_STYLE_ENDPOINT=true
```

Simpan: `Ctrl` + `X` → `Y` → `Enter`.

### 4E. Selesai edit — generate ulang key & migrasi
```bash
php artisan config:clear
php artisan key:generate
php artisan migrate --force
php artisan db:seed
```
> Kalau `DB_PASSWORD` Neon sudah di-reset ulang, pastikan sudah benar di `.env` sebelum migrate.

> ⚠️ **Penting — pakai direct host, JANGAN `-pooler`.** Host `-pooler` (PgBouncer transaction pooling)
> tidak cocok untuk migrasi **dan juga** untuk transaksi runtime yang memakai row lock
> (`lockForUpdate()` / `select ... for update`). Di pooler, dua statement `FOR UPDATE` dalam SAMA
> transaksi memicu `SQLSTATE[25P02] current transaction is aborted` → `POST /orders` 500 dan
> browser menampilkan "Failed to fetch" di halaman pembayaran (resp. error tanpa header CORS).
> **Solusi tetap**: gunakan **direct host** (host yang sama TANPA akhiran `-pooler`) di `DB_HOST`
> untuk aplikasi sehari-hari. Kalau migrasi sempat gagal, pastikan `DB_HOST` tanpa `-pooler`, lalu
> `php artisan config:clear` dan `php artisan migrate:fresh --force` — jangan dikembalikan ke `-pooler`.

---

## BAGIAN 5 — Supervisor (Reverb auto-restart)

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
supervisorctl status
```

---

## BAGIAN 6 — Nginx

```bash
cat > /etc/nginx/sites-available/dineflow << 'EOF'
server {
    listen 80;
    server_name dineflow.duckdns.org;

    root /var/www/dineflow-pos/backend/public;
    index index.php;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

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
}
EOF

ln -s /etc/nginx/sites-available/dineflow /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

---

## BAGIAN 7 — DuckDNS + SSL (agar backend `https://` + WebSocket `wss://`)

1. Buka `https://www.duckdns.org` → login Google/GitHub
2. Buat subdomain `dineflow` → dapat `dineflow.duckdns.org` + token
3. Set **A record** `dineflow` → IP `163.61.58.129`
4. Di VPS pasang SSL:
```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d dineflow.duckdns.org
```
5. Auto-renew:
```bash
crontab -e
```
tambah baris:
```
0 12 * * * certbot renew --quiet
```

---

## BAGIAN 8 — Deploy Frontend ke Vercel

1. Vercel → Add New → Project → import `dineflow-pos`
2. Root Directory: `frontend`
3. Env Vars:
   - `VITE_API_URL` = `https://dineflow.duckdns.org/api`
   - `VITE_REVERB_APP_KEY` = (sama dengan `.env` backend `REVERB_APP_KEY`)
   - `VITE_REVERB_HOST` = `dineflow.duckdns.org`
   - `VITE_REVERB_PORT` = `443`
   - `VITE_REVERB_SCHEME` = `https`
4. Deploy → URL `https://<nama-proyek>.vercel.app`
5. Catat URL-nya → isi `FRONTEND_URL` & `REVERB_ALLOWED_ORIGINS` di `.env` backend → `php artisan config:clear`

---

## BAGIAN 9 — Verifikasi

```bash
curl https://dineflow.duckdns.org/api/categories
# → harus 200 JSON

curl -X POST https://dineflow.duckdns.org/api/login -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"1234"}'
# → harus mengembalikan token
```

- WebSocket: buka DevTools → Network → WS → cek koneksi `wss://dineflow.duckdns.org/app`
- Uji real-time: buat order dari Menu QR → KDS tampil tanpa refresh ≤2 detik

---

## BAGIAN 10 — Tips Perlindungan

- Saldo Nevacloud Rp100.000 cukup untuk ±1 bulan Nevalite (Rp48.000/bln). Tambah saldo kalau mau lanjut.
- Supabase free tier bisa **pause setelah 7 hari idle** → resume manual di dashboard.
- Nyalakan **SSH keepalive** (Bagian 0) untuk kurangi koneksi putus.
- Jangan pernah commit `.env` ke GitHub.
- Reset password Neon (karena sempat tampil di chat pada sesi deploy).
# Panduan Deployment DineFlow POS (Vercel + Render)

Runbook men-deploy **keduanya** ke production:
- **Frontend** (React SPA) → **Vercel**
- **Backend** (Laravel API + Reverb) → **Render**
- Database & Redis → layanan managed (lihat §5)

> Status: **deploy sedang berjalan** (Tahap 0 kode selesai `e0daf66`; provider disesuaikan saat eksekusi).
> Repo: `github.com/fadhilfaith48/dineflow-pos` (branch `main`).
>
> **Penyesuaian saat eksekusi (sesi deploy):** Render mewajibkan kartu kredit untuk
> membuat Redis & PostgreSQL (free sudah tidak tersedia untuk akun baru) → Redis dipakai
> **Upstash** (gratis) dan PostgreSQL dipakai **Neon** (gratis). Storage foto = **Supabase**
> (S3-compatible). Rincian di §5–§6.

---

## 1. Arsitektur Target

```
Browser
  ├─ https://<fe>.vercel.app        → React SPA (Vercel)
  │     ├─ API     → https://<api>.onrender.com   (Laravel, Render Web Service A)
  │     └─ WS      → wss://<reverb>.onrender.com  (Reverb, Render Web Service B)
  └─ (upload foto → https://<api>.onrender.com/api/menu-items)

Render Web Service A (Laravel API)
  ├─ PostgreSQL (Neon, external) — database
  ├─ Redis (Upstash, external) — broadcast + cache + queue
  └─ Foto menu → Supabase Storage (S3-compatible)

Render Web Service B (Reverb WebSocket)
  └─ Redis yang sama (Upstash) — Reverb memakai Redis channel
```

**Penting**: Reverb harus **service terpisah** yang selalu menyala (WebSocket bersifat
persisten). Jangan dijalankan di dalam proses `php artisan serve` API.

---

## 2. Prasyarat

- Akun [Vercel](https://vercel.com) & [Render](https://render.com).
- Repo sudah di-push ke GitHub `fadhilfaith48/dineflow-pos` (public).
- Di `backend/`: `.env` mencontoh produksi (isi `APP_KEY` via `php artisan key:generate`).
- Di `frontend/`: `package.json` (build script `vite build`) sudah benar.

---

## 3. Render — Web Service A (Laravel API)

### 3.1 Buat Web Service
> **Penting:** Render **tidak menyediakan runtime PHP** di dropdown Language (hanya
> Node/Python/Go/Ruby/dll + **Docker**). Laravel di-deploy via **runtime Docker**:
> gunakan `backend/Dockerfile` (PHP 8.3-cli + `pdo_pgsql` untuk Neon + `pcntl` untuk
> Reverb + composer).

1. Render → **New** → **Web Service** → pilih repo GitHub `dineflow-pos`.
2. **Root Directory**: `backend`
3. **Language / Environment**: **Docker** (Render membaca `Dockerfile`).
4. **Build Command**: kosong (semua di `Dockerfile`).
5. **Start Command**:
   ```
   php artisan migrate --force --no-interaction && php artisan serve --host 0.0.0.0 --port $PORT
   ```
   - Migrate dijalankan tiap start (idempotent) supaya skema selalu terkini.
   - Foto menu via **Supabase S3** (lihat §6) — `storage:link` TIDAK diperlukan.
   - **Health Check Path**: kosongkan (app tidak punya route `/healthz`).

### 3.2 Env (tab Environment)
| Var | Nilai produksi | Catatan |
|---|---|---|
| `APP_ENV` | `production` | |
| `APP_DEBUG` | `false` | |
| `APP_URL` | `https://<api>.onrender.com` | URL service ini |
| `APP_KEY` | hasil `key:generate` | jangan bocor |
| `DB_CONNECTION` | `pgsql` | via Neon (lihat §5.1) |
| `DB_HOST` / `DB_PORT` / `DB_DATABASE` / `DB_USERNAME` / `DB_PASSWORD` | dari Neon | |
| `BROADCAST_CONNECTION` | `reverb` | |
| `QUEUE_CONNECTION` | `sync` | prototype tanpa worker; `redis` bila pakai queue |
| `CACHE_STORE` | `redis` | |
| `SESSION_DRIVER` | `redis` (atau `database`) | |
| `REDIS_CLIENT` | `predis` | |
| `REDIS_URL` | `tls://default:<token>@<host>:<port>` | dari **Upstash** (menggantikan REDIS_HOST/PORT/PASSWORD) |
| `REVERB_APP_ID` | mis. `dinflow-pos` | **sama** dengan service Reverb & `VITE_REVERB_APP_KEY` |
| `REVERB_APP_KEY` | `dinflow-pos-key` | **sama** di semua service |
| `REVERB_APP_SECRET` | rahasia | **sama** di semua service |
| `FILESYSTEM_DISK` | `s3` | foto menu di Supabase |
| `PHOTO_DISK` | `s3` | disk penyimpanan foto (`public` untuk lokal) |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | dari Supabase S3 Access Keys | |
| `AWS_DEFAULT_REGION` | region project Supabase | mis. `ap-southeast-1` |
| `AWS_BUCKET` | `menu-photos` | nama bucket Supabase |
| `AWS_ENDPOINT` | `https://<projectref>.supabase.co/storage/v1/s3` | endpoint S3 Supabase |
| `AWS_URL` | `https://<projectref>.supabase.co/storage/v1/object/public/menu-photos` | URL publik foto |
| `AWS_USE_PATH_STYLE_ENDPOINT` | `true` | wajib untuk Supabase S3 |
| `FRONTEND_URL` | `https://<fe>.vercel.app` | origin CORS |
| `TRUSTED_PROXIES` | `*` | Render di belakang proxy |

### 3.3 CORS (back-end → Vercel)
Di `backend/config/cors.php`, pastikan `allowed_origins` berisi URL Vercel:
```php
'allowed_origins' => [
    env('FRONTEND_URL', 'http://localhost:5173'),
],
```
Lalu set env `FRONTEND_URL` = `https://<fe>.vercel.app` pada service API.

---

## 4. Render — Web Service B (Reverb WebSocket)

1. Render → **New** → **Web Service** → repo yang sama.
2. **Root Directory**: `backend`
3. **Language / Environment**: **Docker** (image yang sama dengan API).
4. **Build Command**: kosong. **Start Command**:
   ```
   php artisan reverb:start --host=0.0.0.0 --port=$PORT
   ```

### 4.1 Env
| Var | Nilai | Catatan |
|---|---|---|
| `APP_ENV` | `production` | |
| `APP_KEY` | sama dengan API | Reverb butuh app key yang sama |
| `BROADCAST_CONNECTION` | `reverb` | |
| `REDIS_CLIENT` | `predis` | Redis yang sama (Upstash) |
| `REDIS_URL` | `tls://default:<token>@<host>:<port>` | dari **Upstash**, sama dengan API |
| `REVERB_SERVER_HOST` | `0.0.0.0` | |
| `REVERB_SERVER_PORT` | `$PORT` | Render memberi port acak |
| `REVERB_SERVER_HOSTNAME` | `https://<reverb>.onrender.com` | hostname publik, **tanpa** `wss://` |
| `REVERB_SERVER_SCHEME` | `https` | |
| `REVERB_SERVER_DEBUG` | `false` | |
| `REVERB_SERVER_ID` | `reverb` | |
| `REVERB_APP_ID` | sama dengan API | |
| `REVERB_APP_KEY` / `REVERB_APP_SECRET` | sama dengan API | |

### 4.2 Origin WebSocket
Di `backend/config/reverb.php`, bagian `apps[0].allowed_origins` / `allowed_hosts`
tambahkan domain Vercel, contoh:
```php
'allowed_origins' => ['https://<fe>.vercel.app'],
'allowed_hosts' => ['localhost:8080', '<reverb>.onrender.com'],
```

---

## 5. Database & Redis

> **Catatan:** Render kini **mewajibkan kartu kredit** untuk membuat Redis/PostgreSQL
> (free sudah tidak tersedia untuk akun baru) → pakai penyedia gratis berikut.

### 5.1 Database — PostgreSQL via Neon (gratis, tanpa kartu)
1. Daftar di `neon.tech` → **New Project** `dineflow` → Region **Singapore**.
2. Database pertama dibuat otomatis (`neondb`). Klik **Connect** → salin
   **Connection String** (`postgres://user:password@host/neondb`).
3. Set `DB_CONNECTION=pgsql` + pecah URL jadi `DB_HOST/PORT/DATABASE/USERNAME/PASSWORD`.
   - Keunggulan Neon: free tier, **auto-wake** saat ada koneksi (tidak perlu resume manual).
   - Alternatif bila ada kartu: PostgreSQL managed Render (`DB_CONNECTION=pgsql`).

### 5.2 Redis — Upstash (gratis, tanpa kartu)
1. Daftar di `upstash.com` → **Create Database** → type **Redis** → name `dineflow-redis`
   → Region **Singapore**.
2. Salin **host**, **port**, dan **token** dari halaman database.
3. Set di **kedua** service (API & Reverb): `REDIS_CLIENT=predis` dan
   `REDIS_URL=tls://default:<token>@<host>:<port>` (TLS via predis).

---

## 6. Penyimpanan Foto Menu — Supabase Storage (S3-compatible)

Filesystem Render bersifat **ephemeral** (hilang saat restart/deploy), jadi foto menu
disimpan di **Supabase Storage** (gratis 1GB):
1. Buat project di `supabase.com` → menu **Storage** → bucket publik `menu-photos`.
2. **Project Settings → Storage → S3 Access Keys** → buat access key → salin
   **Access Key ID** & **Secret**.
3. Catat **Project Reference** (`<projectref>`) & **Region** (mis. `ap-southeast-1`).
4. Isi env service API:
   | Var | Nilai |
   |---|---|
   | `FILESYSTEM_DISK` / `PHOTO_DISK` | `s3` |
   | `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | dari S3 Access Keys |
   | `AWS_DEFAULT_REGION` | region project |
   | `AWS_BUCKET` | `menu-photos` |
   | `AWS_ENDPOINT` | `https://<projectref>.supabase.co/storage/v1/s3` |
   | `AWS_URL` | `https://<projectref>.supabase.co/storage/v1/object/public/menu-photos` |
   | `AWS_USE_PATH_STYLE_ENDPOINT` | `true` |
5. Paket `league/flysystem-aws-s3-v3` sudah terpasang (Tahap 0, commit `e0daf66`).
   `MenuItemController::resolveImageUrl` memakai disk dari `PHOTO_DISK`.
   - **Catatan pause:** free tier Supabase di-pause setelah **7 hari tanpa aktivitas** →
     sebelum demo buka dashboard & klik **Resume** (data aman).

> Alternatif tidak pause: Cloudflare R2 (endpoint `https://<accountid>.r2.cloudflarestorage.com`,
> `AWS_USE_PATH_STYLE_ENDPOINT=true`, bucket publik via custom domain).

---

## 7. Vercel — Frontend

1. Vercel → **Add New** → **Project** → import repo `dineflow-pos`.
2. **Root Directory**: `frontend`
3. **Framework Preset**: `Vite` (otomatis: build `npm run build`, output `dist`).
4. **Env Vars** (Project Settings → Environment Variables):
   | Var | Nilai |
   |---|---|
   | `VITE_API_URL` | `https://<api>.onrender.com/api` |
   | `VITE_REVERB_APP_KEY` | `dinflow-pos-key` (sama dengan backend) |
   | `VITE_REVERB_HOST` | `<reverb>.onrender.com` |
   | `VITE_REVERB_PORT` | `443` |
   | `VITE_REVERB_SCHEME` | `https` |
5. Deploy → URL `https://<fe>.vercel.app`.

> `VITE_*` dibaca saat build — set env **sebelum** build pertama. Perubahan env → rebuild.

---

## 8. Verifikasi Pasca-Deploy

1. **API**: `curl https://<api>.onrender.com/api/categories` → 200 JSON.
2. **Login**: POST `/api/login` (admin/1234) → dapat token.
3. **Akses publik**: GET `/api/menu-items` tanpa token → 200.
4. **Foto**: upload menu → URL `/storage/...` dapat diakses (200).
5. **WebSocket real-time**:
   - Buka `/menu/T1` (Vercel) di browser, buka DevTools → Network → WS.
   - Koneksi ke `wss://<reverb>.onrender.com` harus `connected`, subscribe channel `orders`.
   - Tab lain: Kasir Konfirmasi order → KDS tampil tanpa refresh.
6. **CORS**: request dari domain Vercel tidak error CORS.

---

## 9. Catatan & Batasan

- **Render meminta kartu untuk Redis/PostgreSQL** (free sudah tidak tersedia untuk akun
  baru) → dipakai **Upstash (Redis)** & **Neon (PostgreSQL)**. Web Service free biasanya
  tetap bisa dibuat tanpa kartu; jika diminta kartu, gunakan alternatif gratis (mis. Koyeb).
- **Free tier**: instance tidur saat idle (cold start beberapa detik); Reverb yang
  tidur akan memutus WebSocket — untuk demo live sebaiknya instance berbayar / keep-alive.
- **Neon free**: compute auto-pause tapi **auto-wake** saat ada koneksi (aman).
- **Supabase free**: project **di-pause setelah 7 hari tanpa aktivitas** → Resume manual
  di dashboard sebelum demo (data aman).
- **`php artisan serve`** dipakai karena satu root (bukan nginx virtual host) — cukup untuk
  prototype; untuk production lebih baik pakai nginx/octane (di luar scope).
- **Migrate di Start Command** aman untuk prototype; untuk skala lebih besar gunakan
  satu-off job migrasi.
- **Jangan pernah** menaruh `.env` di repo; semua rahasia lewat env vars platform.
- Setelah deploy, update `frontend/PROGRESS.md` & `docs/jurnal-pkl.md` dengan hasilnya.

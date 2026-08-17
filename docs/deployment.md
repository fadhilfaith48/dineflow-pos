# Panduan Deployment DineFlow POS (Vercel + Render)

Runbook men-deploy **keduanya** ke production:
- **Frontend** (React SPA) → **Vercel**
- **Backend** (Laravel API + Reverb) → **Render**
- Database & Redis → layanan managed (lihat §5)

> Status: **panduan siap pakai** (sesuai keputusan user, akan benar-benar di-deploy).
> Repo: `github.com/fadhilfaith48/dineflow-pos` (branch `main`).

---

## 1. Arsitektur Target

```
Browser
  ├─ https://<fe>.vercel.app        → React SPA (Vercel)
  │     ├─ API     → https://<api>.onrender.com   (Laravel, Render Web Service A)
  │     └─ WS      → wss://<reverb>.onrender.com  (Reverb, Render Web Service B)
  └─ (upload foto → https://<api>.onrender.com/api/menu-items)

Render Web Service A (Laravel API)
  ├─ MySQL / PostgreSQL (managed, eksternal)
  └─ Redis (managed) — broadcast + cache + queue

Render Web Service B (Reverb WebSocket)
  └─ Redis yang sama (Reverb memakai Redis channel)
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
1. Render → **New** → **Web Service** → pilih repo GitHub `dineflow-pos`.
2. **Root Directory**: `backend`
3. **Environment**: `PHP` (Build Pack) → pilih versi PHP **8.3**.
4. **Build Command**: `composer install --no-dev --optimize-autoloader`
   (Render menjalankan ini otomatis; biarkan kosong bila memakai default).
5. **Start Command**:
   ```
   php artisan migrate --force --no-interaction && php artisan serve --host 0.0.0.0 --port $PORT
   ```
   - Migrate dijalankan tiap start (idempotent) supaya skema selalu terkini.
   - Foto menu: tambahkan `php artisan storage:link` bila memakai persistent disk (lihat §6).

### 3.2 Env (tab Environment)
| Var | Nilai produksi | Catatan |
|---|---|---|
| `APP_ENV` | `production` | |
| `APP_DEBUG` | `false` | |
| `APP_URL` | `https://<api>.onrender.com` | URL service ini |
| `APP_KEY` | hasil `key:generate` | jangan bocor |
| `DB_CONNECTION` | `mysql` atau `pgsql` | lihat §5.1 |
| `DB_HOST` / `DB_PORT` / `DB_DATABASE` / `DB_USERNAME` / `DB_PASSWORD` | dari penyedia DB | |
| `BROADCAST_CONNECTION` | `reverb` | |
| `QUEUE_CONNECTION` | `sync` | prototype tanpa worker; `redis` bila pakai queue |
| `CACHE_STORE` | `redis` | |
| `SESSION_DRIVER` | `redis` (atau `database`) | |
| `REDIS_CLIENT` | `predis` | |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` | dari Redis managed | |
| `REVERB_APP_ID` | mis. `dinflow-pos` | **sama** dengan service Reverb & `VITE_REVERB_APP_KEY` |
| `REVERB_APP_KEY` | `dinflow-pos-key` | **sama** di semua service |
| `REVERB_APP_SECRET` | rahasia | **sama** di semua service |
| `FILESYSTEM_DISK` | `public` (persistent disk) atau `s3` | lihat §6 |
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
3. **Environment**: `PHP` 8.3. **Build Command**: kosong (composer sudah di-install).
4. **Start Command**:
   ```
   php artisan reverb:start --host=0.0.0.0 --port=$PORT
   ```

### 4.1 Env
| Var | Nilai | Catatan |
|---|---|---|
| `APP_ENV` | `production` | |
| `APP_KEY` | sama dengan API | Reverb butuh app key yang sama |
| `BROADCAST_CONNECTION` | `reverb` | |
| `REDIS_CLIENT` | `predis` | Redis yang sama dengan API |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` | dari Redis managed | |
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

### 5.1 Database
Render **tidak menyediakan MySQL managed**. Pilih salah satu:
- **Opsi 1 (disarankan) — PostgreSQL managed Render**: buat instance PostgreSQL di
  Render, set `DB_CONNECTION=pgsql`. Migrasi proyek memakai tipe kolom standar
  (string/integer/boolean/timestamps) → kompatibel. Verifikasi: `php artisan migrate`.
- **Opsi 2 — MySQL eksternal**: penyedia MySQL terkelola (mis. Aiven, Railway,
  Clever Cloud), isi `DB_CONNECTION=mysql` + kredensial dari sana.

### 5.2 Redis (broadcast Reverb + cache)
Gunakan **Redis managed** (Render menyediakan Redis). Isi `REDIS_*` di **kedua** service
(API & Reverb) dengan instance Redis yang **sama**.

---

## 6. Penyimpanan Foto Menu (penting)

Filesystem Render bersifat **ephemeral** (hilang saat restart/deploy). Untuk foto menu:
- **Opsi A (sederhana) — Persistent Disk**: di Web Service A → **Disks** → tambah disk
  (mis. mount ke `/var/www/storage`), lalu jalankan `php artisan storage:link` di Start
  Command & set `FILESYSTEM_DISK=public`. Catatan: persistent disk hanya tersedia di
  instance berbayar.
- **Opsi B (skalabel) — Object Storage**: `FILESYSTEM_DISK=s3` (mis. S3 / Supabase /
  Cloudflare R2) + install `composer require league/flysystem-aws-s3-v3`; env `AWS_*`
  diisi kredensial penyedia. Foto tidak lagi bergantung pada disk server.

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

- **Free tier**: instance tidur saat idle (cold start beberapa detik); Reverb yang
  tidur akan memutus WebSocket — untuk demo live sebaiknya instance berbayar / keep-alive.
- **`php artisan serve`** dipakai karena satu root (bukan nginx virtual host) — cukup untuk
  prototype; untuk production lebih baik pakai nginx/octane (di luar scope).
- **Migrate di Start Command** aman untuk prototype; untuk skala lebih besar gunakan
  satu-off job migrasi.
- **Jangan pernah** menaruh `.env` di repo; semua rahasia lewat env vars platform.
- Setelah deploy, update `frontend/PROGRESS.md` & `docs/jurnal-pkl.md` dengan hasilnya.

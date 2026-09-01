# Panduan VPS DomaiNesia — DineFlow POS

## 1. Spesifikasi VPS

| Aspek | Detail |
|---|---|
| Paket | Cloud VPS Lite 1GB |
| Harga normal | Rp48.000/bulan |
| Diskon 10% (baru) | Rp43.200/bulan |
| Harga perpanjangan | Rp48.000/bulan (tanpa diskon) |
| + PPN 11% | ~Rp5.280 |
| **Total/bulan** | **~Rp48.000** |
| CPU | 1 Core |
| RAM | 1 GB |
| Storage | 20 GB SSD NVMe |
| Bandwidth | Unlimited |
| IP | Dedicated IP (tetap) |
| Pembayaran | GoPay, OVO, DANA, VA bank (tanpa kartu kredit) |

### Upgrade Nanti (Kalau Butuh Lebih)

| Paket | RAM | Harga (sebelum diskon) |
|---|---|---|
| Lite 1GB | 1 GB | Rp48.000/bulan |
| Lite 2GB | 2 GB | Rp100.000/bulan |
| Lite 4GB | 4 GB | Rp192.000/bulan |

> Upgrade kapan saja via panel DomaiNesia → pilih VPS → Upgrade → bayar selisih → restart. Data tidak hilang.

---

## 2. Arsitektur Deployment

```
Browser
  ├─ https://yourapp.vercel.app        → React SPA (Vercel, GRATIS)
  │     ├─ API  → https://ip-vps       → Laravel API (VPS)
  │     └─ WS   → wss://ip-vps         → Reverb WebSocket (VPS)
  └─ Foto menu → upload ke VPS storage

VPS DomaiNesia (1GB — backend only):
  ├─ Nginx          (reverse proxy)
  ├─ PHP-FPM 8.3    (Laravel API)
  ├─ PostgreSQL     (database)
  ├─ Redis          (broadcasting + cache)
  └─ Supervisor     (Reverb WebSocket, auto-restart)
```

### Pemakaian RAM Estimasi

| Service | RAM |
|---|---|
| Ubuntu OS | ~200MB |
| Nginx | ~10MB |
| PHP-FPM (Laravel) | ~100MB |
| PostgreSQL | ~120MB |
| Redis | ~30MB |
| Reverb (WebSocket) | ~80MB |
| **Total** | **~540MB** |
| **Sisa** | **~460MB** |

> 1GB cukup untuk backend saja (frontend di Vercel gratis).

### Alternatif: Pakai Managed DB/Redis (Hemat RAM)

| Layanan | Fungsi | Biaya |
|---|---|---|
| Neon (neon.tech) | PostgreSQL | Gratis |
| Upstash (upstash.com) | Redis | Gratis |
| Vercel | Frontend React | Gratis |

> Kalau pakai Neon + Upstash, VPS hanya jalankan Nginx + PHP + Reverb ≈ 400MB. Sisa 600MB sangat lega.

---

## 3. Masa Jatuh Tempo

### Cara Kerja Billing

| Istilah | Arti |
|---|---|
| Billing cycle | Per bulan (Rp48rb) |
| Invoice | Tagihan datang setiap bulan |
| **Jatuh tempo** | **Tanggal harus bayar perpanjangan** (biasanya sehari sebelum expired) |
| Grace period | Waktu toleransi setelah jatuh tempo (~3-7 hari) |
| Suspend | VPS dimatikan sementara kalau belum bayar (data masih ada) |
| Terminate | Data hilang permanen kalau terlalu lama tidak bayar |

### Contoh Timeline

| Tanggal | Peristiwa |
|---|---|
| 1 September | Beli VPS → aktif |
| 30 September | Invoice perpanjangan datang (Rp48rb) |
| 1 Oktober | **Jatuh tempo** — harus bayar |
| 2-7 Oktober | Grace period — VPS masih jalan, bisa bayar |
| 8 Oktober | **Suspend** — VPS mati, data masih tersimpan |
| 30+ hari tidak bayar | **Terminate** — data hilang permanen |

### Tips Agar Tidak Gangguan

1. **Bayar sebelum jatuh tempo** — setiap bulan tagihan datang, langsung bayar
2. **Aktifkan auto-renew** di panel DomaiNesia supaya otomatis bayar (kalau saldo GoPay/OVO cukup)
3. **Backup berkala** ke GitHub (kode) + export database (SQL) — kalau terjadi sesuatu, tinggal deploy ulang
4. **Catat tanggal jatuh tempo** — cek di panel DomaiNesia → Billing / Invoice

---

## 4. Membeli VPS

### Langkah-langkah

1. Buka `domainesia.com/vps-murah/`
2. Pilih **Cloud VPS Lite 1GB**
3. Pilih OS: **Ubuntu 24.04**
4. Masukkan promo code `CLOUDVPSHEMAT` (diskon 10%, kalau masih berlaku)
5. Daftar pakai **NIK** (KTP)
6. Bayar pakai **GoPay/OVO/DANA**
7. Terima email: **IP VPS** + **password root**
8. Login: `ssh root@<ip-vps>`

### Yang Diterima Setelah Beli

| Info | Digunakan untuk |
|---|---|
| IP Address | SSH login + Nginx config + .env backend |
| Password root | SSH login |
| Panel login | Manage VPS (reboot, upgrade, backup, billing) |

---

## 5. Backup & Recovery

### Backup yang Harus Dilakukan Secara Berkala

| What | How | Frequency |
|---|---|---|
| Kode sumber | Git push ke GitHub | Setiap commit |
| Database PostgreSQL | `pg_dump` → file .sql | Seminggu sekali / sebelum deploy besar |
| Foto menu | Sudah ada di VPS `/storage/app/public` | Ikut backup VPS |
| Konfigurasi .env | Simpan di password manager | Sekali (update kalau ada perubahan) |

### Recovery (Kalau VPS Ter-Suspend/Terminate)

1. Beli VPS baru
2. `git clone` dari GitHub
3. Install dependencies (PHP, PostgreSQL, Redis, Nginx, Supervisor)
4. Copy `.env` dari backup
5. `composer install --no-dev`
6. `php artisan migrate --force && php artisan db:seed`
7. `php artisan storage:link`
8. Setup Nginx + Supervisor
9. Deploy frontend ke Vercel (sudah ter-connect ke GitHub)
10. Verifikasi semua fitur

> Estimasi recovery: 30-60 menit kalau sudah paham, atau ikuti panduan deploy.

---

## 6. Kontak & Bantuan

| Kebutuhan | Link |
|---|---|
| Panel DomaiNesia | `domainesia.com/clientarea` |
| Knowledge base | `domainesia.com/knowledgebase` |
| Live chat support | Via website (jam kerja) |
| Ticket support | Via panel |

> **Catatan**: Dokumen ini disusun pada 26 Agustus 2026. Harga dan ketentuan dapat berubah. Selalu cek website resmi DomaiNesia untuk info terkini.

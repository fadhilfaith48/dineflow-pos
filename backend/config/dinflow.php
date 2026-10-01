<?php

return [

    /*
    |------------------------------------------------------------------
    | Konfigurasi aplikasi DineFlow POS
    |------------------------------------------------------------------
    */

    // Password awal staf baru & hasil reset oleh admin (ubah via .env produksi).
    'default_password' => env('DINFLOW_DEFAULT_PASSWORD', '1234'),

    /*
    |------------------------------------------------------------------
    | Pembatalan pesanan self-order (publik)
    |------------------------------------------------------------------
    */

    // Jendela waktu (menit) sejak pesanan dibuat untuk pelanggan membatalkan
    // sendiri sebelum bayar. Lewat batas ini, hanya kasir/dapur/pelayan yang
    // bisa void (lewat role-gate) untuk membersihkan pesanan menunggu.
    'self_order_cancel_minutes' => (int) env('SELF_ORDER_CANCEL_MINUTES', 10),

    /*
    | Payment QRIS yang menggantung
    |
    | Gateway punya masa berlaku QR sendiri, tapi status di sisi kita hanya
    | berubah saat ada yang polling. Kalau pelanggan menutup halaman setelah
    | scan, payment menggantung 'pending' selamanya dan ordernya tidak bisa
    | ditutup. Setelah ambang ini, perintah payments:expire menandainya
    | 'expired' (dijadwalkan tiap menit — butuh cron `schedule:run`).
    */

    'payment_expire_minutes' => (int) env('PAYMENT_EXPIRE_MINUTES', 15),

    /*
    |------------------------------------------------------------------
    | Pembatasan anti-mainan endpoint publik (self-order)
    |------------------------------------------------------------------
    | Mencegah orang iseng membuat order berulang kali tanpa mengganggu
    | pelanggan normal: buat order max X kali per jam per PERANGKAT (header
    | X-Device-Id dari localStorage) + cadangan X kali per jam per IP untuk
    | klien tanpa header (mis. baru hapus data browser / menyerang via API).
    | Catatan: pembatalan (batal) TIDAK dibatasi — tiap tekan batal dalam
    | jendela 10 menit selalu berhasil & order langsung hilang dari antrean
    | kasir; iseng batal praktis mustahil karena harus ada order dulu
    | (terbatas oleh kuota buat di atas).
    | Pelayan/Kasir (login) TIDAK terkena pembatasan ini.
    */

    'self_order_create_per_device_per_hour' => (int) env('SELF_ORDER_CREATE_PER_DEVICE_PER_HOUR', 5),
    'self_order_create_per_ip_per_hour' => (int) env('SELF_ORDER_CREATE_PER_IP_PER_HOUR', 20),

    /*
    |------------------------------------------------------------------
    | Pembayaran (bayar di muka) & gateway
    |------------------------------------------------------------------
    */

    // Driver pembayaran: 'mock' (demo tanpa akun), 'doku' (DOKU SNAP QRIS),
    // atau 'xendit' (Xendit QRIS). Bila kredensial driver tidak lengkap,
    // aplikasi otomatis jatuh ke mock agar demo tetap jalan.
    'payment_driver' => env('PAYMENT_DRIVER', 'mock'),

    /*
    | Endpoint pembayaran palsu (mock-paid / simulate-payment) terbuka ke
    | publik dan hanya dilindungi nilai PAYMENT_DRIVER. Kalau instalasi lupa
    | menyetel PAYMENT_DRIVER, endpoint itu aktif untuk siapa pun. Karena itu
    | ada flag kedua yang harus DINYALAKAN secara sengaja: demo tetap jalan
    | dengan ALLOW_MOCK_PAYMENT=true, tapi tidak aktif diam-diam di produksi.
    | Biarkan false di produksi sungguhan.
    |
    | Default-nya mengikuti APP_ENV supaya tidak harus diisi manual di tiap
    | mesin dev: APP_ENV=local (atau testing) otomatis menyalakan, sedangkan
    | produksi — yang default Laravel adalah 'production' — otomatis mematikan
    | walau flag tidak pernah diisi. Override manual tetap menang.
    */

    'allow_mock_payment' => (bool) env(
        'ALLOW_MOCK_PAYMENT',
        env('APP_ENV', 'production') !== 'production'
    ),

    'doku' => [
        'client_id' => env('DOKU_CLIENT_ID', ''),
        'secret_key' => env('DOKU_SECRET_KEY', ''),
        'private_key_file' => env('DOKU_PRIVATE_KEY_FILE'),
        'merchant_id' => env('DOKU_MERCHANT_ID', ''),
        'terminal_id' => env('DOKU_TERMINAL_ID', ''),
        'postal_code' => env('DOKU_POSTAL_CODE', ''),
        'channel_id' => env('DOKU_CHANNEL_ID', 'H2H'),
        'sandbox' => env('DOKU_SANDBOX', true),
        'host' => env(
            'DOKU_HOST',
            config('app.env') === 'production'
                ? 'https://api.doku.com'
                : 'https://api-sandbox.doku.com'
        ),
    ],

    'xendit' => [
        'secret_key' => env('XENDIT_SECRET_KEY', ''),
        'host' => env('XENDIT_HOST', 'https://api.xendit.co'),
        'callback_url' => env('XENDIT_CALLBACK_URL', ''),

        // Token callback webhook. Tanpa ini POST /api/xendit/callback selalu 401
        // (pembayaran masih terdeteksi lewat polling, tapi tidak real-time).
        'callback_token' => env('XENDIT_CALLBACK_TOKEN', ''),
    ],

];

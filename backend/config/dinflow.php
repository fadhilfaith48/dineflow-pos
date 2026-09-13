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
    |------------------------------------------------------------------
    | Pembatasan anti-mainan endpoint publik (self-order)
    |------------------------------------------------------------------
    | Mencegah orang iseng membuka/membatalkan order berulang kali tanpa
    | mengganggu pelanggan normal:
    |   - batal: max X kali per window menit per MEJA (aksi batal melekat
    |     ke meja, fallback IP bila pesanan tanpa meja);
    |   - buat order: max X kali per jam per PERANGKAT (header X-Device-Id
    |     dari localStorage) + cadangan X kali per jam per IP untuk klien
    |     tanpa header (mis. baru hapus data browser / menyerang via API).
    | Pelayan/Kasir (login) TIDAK terkena pembatasan ini.
    */

    'self_order_cancel_per_table' => (int) env('SELF_ORDER_CANCEL_PER_TABLE', 3),
    'self_order_cancel_per_table_minutes' => (int) env('SELF_ORDER_CANCEL_PER_TABLE_MINUTES', 10),
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
    ],

];

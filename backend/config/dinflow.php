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

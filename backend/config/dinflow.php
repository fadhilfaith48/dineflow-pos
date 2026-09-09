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
    | Pembayaran (bayar di muka) & gateway
    |------------------------------------------------------------------
    */

    // Driver pembayaran: 'mock' (demo tanpa akun) atau 'doku' (sandbox).
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

];

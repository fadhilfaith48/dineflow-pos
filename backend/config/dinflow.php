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
        'sandbox' => env('DOKU_SANDBOX', true),
        'host' => env(
            'DOKU_HOST',
            config('app.env') === 'production'
                ? 'https://api.doku.com'
                : 'https://api-sandbox.doku.com'
        ),
    ],

];

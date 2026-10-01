<?php

use App\Console\Commands\ExpireStalePayments;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Payment QRIS yang menggantung perlu jadi 'expired' supaya ordernya tidak
// terkunci selamanya. Butuh cron di server yang memanggil `php artisan
// schedule:run` tiap menit — lihat docs/deploy-steps.md bagian cron.
Schedule::command(ExpireStalePayments::class)->everyMinute();

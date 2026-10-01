<?php

namespace App\Console\Commands;

use App\Models\Payment;
use Illuminate\Console\Command;

/**
 * Tandai pembayaran QRIS yang menggantung sebagai 'expired'.
 *
 * Motors: gateway (DOKU/Xendit) punya masa berlaku QR, tapi status di sisi kita
 * hanya berubah saat ada yang polling. Kalau pelanggan menutup halaman setelah
 * scan dan tidak pernah kembali, payment menggantung 'pending' selamanya —
 * order tidak bisa di-void, tidak bisa dibayar ulang, dan laporan tidak pernah
 * bersih.
 *
 * Dijadwalkan tiap menit lewat routes/console.php, jadi butuh cron di server:
 *   * * * * * cd /path/backend && php artisan schedule:run >> /dev/null 2>&1
 */
class ExpireStalePayments extends Command
{
    protected $signature = 'payments:expire
                            {--minutes= : Umur pending (menit) sebelum dianggap expired}
                            {--dry-run : Hanya tampilkan berapa yang akan di-expired, tanpa mengubah data}';

    protected $description = "Tandai pembayaran QRIS yang menggantung lebih dari ambang waktu sebagai 'expired'";

    public function handle(): int
    {
        $minutes = (int) ($this->option('minutes')
            ?: config('dinflow.payment_expire_minutes', 15));

        $query = Payment::where('status', 'pending')
            ->where('created_at', '<', now()->subMinutes($minutes));

        // --dry-run dipakai buat cek berapa payment yang akan kena scheduler
        // setelah cron dipasang, tanpa mengubah status apa pun.
        if ($this->option('dry-run')) {
            $count = (clone $query)->count();
            $this->info("Dry-run: {$count} pembayaran pending lebih dari {$minutes} menit akan di-expired.");

            return self::SUCCESS;
        }

        $expired = $query->update(['status' => 'expired']);

        $this->info("Expire: {$expired} pembayaran pending lebih dari {$minutes} menit.");

        return self::SUCCESS;
    }
}

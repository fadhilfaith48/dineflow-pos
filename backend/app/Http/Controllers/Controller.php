<?php

namespace App\Http\Controllers;

use App\Events\OrderStatusChanged;
use App\Models\Order;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Log;

abstract class Controller
{
    /**
     * Dispatch broadcast secara aman. Jika Reverb mati atau
     * terjadi BroadcastException, transaksi DB tetap sukses.
     */
    protected function safeBroadcastOrderChange(Order $order, string $action): void
    {
        try {
            OrderStatusChanged::dispatch($order, $action);
        } catch (\Exception $e) {
            Log::warning('Broadcast OrderStatusChanged gagal: '.$e->getMessage());
        }
    }

    /**
     * True HANYA bila QueryException benar-benar pelanggaran UNIQUE.
     *
     * Versi lama hanya mengecek awalan SQLSTATE '23', yang juga dipakai
     * pelanggaran foreign key, not-null, dan check constraint. Akibatnya
     * semua error integritas salah diterjemahkan jadi "Pesanan sudah dibayar"
     * (409), menutupi bug yang sebenarnya.
     *
     * PENTING: jangan panggil $e->getConnection(). Illuminate\Database\QueryException
     * tidak punya method itu (hanya getConnectionName() & getConnectionDetails()),
     * sehingga pemanggilannya melempar Error fatal di dalam blok catch — yang
     * membuat guard anti-duplikat justru gagal total saat bentroknya benar-benar
     * terjadi. Daripada menebak nama driver, kode errornya dibaca langsung dari
     * errorInfo, yang terisi oleh PDO apa pun drivernya.
     */
    protected function isUniqueViolation(QueryException $e): bool
    {
        $sqlState = (string) ($e->errorInfo[0] ?? '');
        $driverCode = $e->errorInfo[1] ?? null;

        // MySQL/MariaDB: SQLSTATE 23000 + kode 1062 (ER_DUP_ENTRY).
        if ($sqlState === '23000' && (int) $driverCode === 1062) {
            return true;
        }

        // PostgreSQL: SQLSTATE 23505 (unique_violation).
        if ($sqlState === '23505') {
            return true;
        }

        // SQLite tidak mengisi errorInfo dengan kode yang berguna.
        return str_contains($e->getMessage(), 'UNIQUE constraint failed');
    }
}

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

    /** True bila QueryException berasal dari pelanggaran constraint (unique, dst). */
    protected function isUniqueViolation(QueryException $e): bool
    {
        $sqlState = (string) ($e->errorInfo[0] ?? '');

        return str_starts_with($sqlState, '23');
    }
}

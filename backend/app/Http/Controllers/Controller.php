<?php

namespace App\Http\Controllers;

use App\Events\OrderStatusChanged;
use App\Models\Order;
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
}

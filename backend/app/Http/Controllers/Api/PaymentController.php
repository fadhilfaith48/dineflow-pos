<?php

namespace App\Http\Controllers\Api;

use App\Events\OrderStatusChanged;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaymentResource;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Table;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PaymentController extends Controller
{
    public function store(Request $request, Order $order): PaymentResource
    {
        $validated = $request->validate([
            'method' => ['required', 'in:tunai,qris'],
            'cashReceived' => ['nullable', 'integer', 'min:0'],
        ]);

        [$order, $payment] = DB::transaction(function () use ($validated, $order, $request) {
            $order = Order::lockForUpdate()->findOrFail($order->id);

            if ($order->payment()->exists()) {
                abort(409, 'Pesanan sudah dibayar');
            }

            if ($validated['method'] === 'tunai' && ($validated['cashReceived'] ?? 0) < $order->total) {
                throw ValidationException::withMessages([
                    'cashReceived' => ['Uang yang diterima kurang dari total pembayaran'],
                ]);
            }

            $order->status = 'selesai';
            $order->save();

            if ($order->table_id) {
                $table = Table::find($order->table_id);
                if ($table) {
                    $table->status = 'perlu-dibersihkan';
                    $table->save();
                }
            }

            $cashReceived = $validated['cashReceived'] ?? null;

            $payment = Payment::create([
                'order_id' => $order->id,
                'method' => $validated['method'],
                'amount' => $order->total,
                'cash_received' => $cashReceived,
                'change' => $cashReceived !== null
                    ? $cashReceived - $order->total
                    : null,
                'paid_by' => $request->user()?->id,
                'paid_at' => now(),
            ]);

            return [$order, $payment];
        });

        OrderStatusChanged::dispatch($order, 'paid');

        return new PaymentResource($payment);
    }
}
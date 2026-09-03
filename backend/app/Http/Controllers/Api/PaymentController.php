<?php

namespace App\Http\Controllers\Api;

use App\Events\OrderStatusChanged;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaymentResource;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Setting;
use App\Models\Table;
use App\Services\Payment\PaymentGateway;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PaymentController extends Controller
{
    /**
     * Bayar di muka — kasir Tunai (langsung lunas, order lanjut ke dapur).
     */
    public function store(Request $request, Order $order): JsonResponse
    {
        $validated = $request->validate([
            'method' => ['required', 'in:tunai,qris'],
            'cashReceived' => ['nullable', 'integer', 'min:0'],
        ]);

        DB::transaction(function () use ($validated, $order, $request) {
            $order = Order::lockForUpdate()->findOrFail($order->id);

            if ($order->payment()->exists()) {
                abort(409, 'Pesanan sudah dibayar');
            }

            if ($order->status !== 'menunggu') {
                abort(422, 'Pesanan tidak dalam status menunggu pembayaran');
            }

            if ($validated['method'] === 'tunai' && ($validated['cashReceived'] ?? 0) < $order->total) {
                throw ValidationException::withMessages([
                    'cashReceived' => ['Uang yang diterima kurang dari total pembayaran'],
                ]);
            }

            $cashReceived = $validated['cashReceived'] ?? null;
            $subtotal = $this->subtotalOf($order->total);

            Payment::create([
                'order_id' => $order->id,
                'method' => $validated['method'],
                'status' => 'paid',
                'paid_via' => $validated['method'],
                'amount' => $order->total,
                'subtotal' => $subtotal,
                'ppn_amount' => $order->total - $subtotal,
                'total' => $order->total,
                'cash_received' => $cashReceived,
                'change' => $cashReceived !== null ? $cashReceived - $order->total : null,
                'paid_by' => $request->user()?->id,
                'paid_at' => now(),
            ]);

            $this->moveToKitchen($order);
        });

        $order->refresh();

        return (new PaymentResource($order->payment))->response()->setStatusCode(HttpResponse::HTTP_CREATED);
    }

    /**
     * Bayar di muka — QRIS: buat transaksi di gateway, simpan status pending.
     * Dipakai self-order, pelayan, dan kasir (QRIS).
     */
    public function checkout(Request $request, Order $order): JsonResponse
    {
        if ($order->payment()->exists()) {
            abort(409, 'Pesanan sudah dibayar');
        }

        if ($order->status !== 'menunggu') {
            abort(422, 'Pesanan tidak dalam status menunggu pembayaran');
        }

        $gateway = app(PaymentGateway::class);
        $info = $gateway->createPayment($order->order_number, $order->total, 'qris');
        $subtotal = $this->subtotalOf($order->total);

        $payment = Payment::create([
            'order_id' => $order->id,
            'reference' => $info['reference'],
            'method' => 'qris',
            'status' => 'pending',
            'gateway' => $info['gateway'],
            'paid_via' => 'qris',
            'amount' => $order->total,
            'subtotal' => $subtotal,
            'ppn_amount' => $order->total - $subtotal,
            'total' => $order->total,
        ]);

        return response()->json([
            'reference' => $info['reference'],
            'gateway' => $info['gateway'],
            'qrContent' => $info['qrContent'],
            'status' => 'pending',
            'orderId' => $order->id,
            'orderNumber' => $order->order_number,
            'payment' => new PaymentResource($payment),
        ]);
    }

    /**
     * Polling status pembayaran. Bila gateway mengembalikan 'paid',
     * konfirmasi otomatis lalu order lanjut ke dapur.
     */
    public function status(Request $request, string $reference): JsonResponse
    {
        $payment = Payment::where('reference', $reference)->with('order')->firstOrFail();

        if ($payment->status !== 'paid') {
            $gateway = app(PaymentGateway::class);
            $gatewayStatus = $gateway->getStatus($reference, $payment->order->order_number);

            if ($gatewayStatus === 'paid') {
                $this->confirmPaid($payment);
            }
        }

        return response()->json([
            'status' => $payment->fresh()->status,
            'orderNumber' => $payment->order->order_number,
        ]);
    }

    /**
     * Tandai lunas manual — hanya driver Mock (demo/non-production).
     */
    public function mockPaid(Request $request, string $reference): JsonResponse
    {
        if (config('dinflow.payment_driver') !== 'mock') {
            abort(403, 'Endpoint markPaid hanya tersedia pada driver mock.');
        }

        $payment = Payment::where('reference', $reference)->with('order')->firstOrFail();
        $this->confirmPaid($payment);

        return response()->json([
            'status' => $payment->fresh()->status,
            'orderNumber' => $payment->order->order_number,
        ]);
    }

    /**
     * Konfirmasi pembayaran QRIS lunas: simpan status paid, order lanjut ke dapur.
     */
    private function confirmPaid(Payment $payment): void
    {
        DB::transaction(function () use ($payment) {
            $payment = Payment::lockForUpdate()->findOrFail($payment->id);

            if ($payment->status === 'paid') {
                return;
            }

            $payment->status = 'paid';
            $payment->paid_at = now();
            $payment->save();

            $this->moveToKitchen($payment->order);
        });
    }

    /**
     * Setelah pembayaran di muka lunas: order -> diproses (masuk dapur), meja -> terisi.
     */
    private function moveToKitchen(Order $order): void
    {
        $order = Order::lockForUpdate()->findOrFail($order->id);

        if ($order->status === 'menunggu') {
            $order->status = 'diproses';
            $order->save();
        }

        if ($order->table_id) {
            $table = Table::find($order->table_id);
            if ($table && $table->status === 'kosong') {
                $table->status = 'terisi';
                $table->save();
            }
        }

        OrderStatusChanged::dispatch($order, 'created');
    }

    private function subtotalOf(int $total): int
    {
        $taxRate = ((int) Setting::getValue('tax_rate', '10')) / 100;

        return (int) round($total / (1 + $taxRate));
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PaymentResource;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Setting;
use App\Models\Table;
use App\Services\Payment\PaymentGateway;
use Illuminate\Database\QueryException;
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

            // P1#5: ketersediaan dicek ulang SAAT bayar, bukan hanya saat order
            // dibuat. Menu yang tadinya tersedia bisa jadi habis/sold out di
            // antara; kalau begitu, kasir dikonfirmasi dulu sebelum uang masuk.
            $this->assertItemsAvailable($order);

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
        try {
            return DB::transaction(function () use ($order) {
                // Kunci baris order agar dua checkout untuk order yang sama
                // berjalan serial: yang kedua menunggu commit yang pertama lalu
                // kedapatan 'sudah dibayar' (409) — bukan membuat payment ganda.
                $order = Order::lockForUpdate()->findOrFail($order->id);

                if ($order->payment()->exists()) {
                    abort(409, 'Pesanan sudah dibayar');
                }

                if ($order->status !== 'menunggu') {
                    abort(422, 'Pesanan tidak dalam status menunggu pembayaran');
                }

                // P1#5: cek ulang ketersediaan sebelum meminta pembayaran QRIS.
                $this->assertItemsAvailable($order);

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
            });
        } catch (QueryException $e) {
            // Backstop: unik order_id di tabel payments menolak inseran kedua
            // (seharusnya tak terjadi karena lock di atas, tapi tetap aman).
            if ($this->isUniqueViolation($e)) {
                abort(409, 'Pesanan sudah dibayar');
            }

            throw $e;
        }
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
     * Simulasi pembayaran QRIS masuk — hanya driver Xendit (endpoint test mode).
     * Dipakai demo: tombol "Simulasi Pembayaran" -> Xendit sandbox benar-benar
     * mencatat payment SUCCEEDED -> polling selanjutnya mendeteksi 'paid'.
     */
    public function simulate(Request $request, string $reference): JsonResponse
    {
        if (config('dinflow.payment_driver') !== 'xendit') {
            abort(403, 'Endpoint simulasi hanya tersedia pada driver xendit.');
        }

        $payment = Payment::where('reference', $reference)->with('order')->firstOrFail();

        if ($payment->status !== 'paid') {
            $gateway = app(PaymentGateway::class);
            $gatewayStatus = $gateway->simulatePayment($reference);

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

        $this->safeBroadcastOrderChange($order, 'created');
    }

    private function subtotalOf(int $total): int
    {
        $taxRate = ((int) Setting::getValue('tax_rate', '10')) / 100;

        return (int) round($total / (1 + $taxRate));
    }

    /**
     * Reject bila ada item pesanan yang menunya sudah tidak tersedia.
     * Memakai error key 'items' agar frontend menampilkan pesan yang sama
     * dengan kegagalan saat pembuatan order.
     */
    private function assertItemsAvailable(Order $order): void
    {
        $unavailable = $order->items()
            ->with('menuItem')
            ->get()
            ->filter(fn ($item) => $item->menuItem && ! $item->menuItem->available)
            ->pluck('name')
            ->unique()
            ->values();

        if ($unavailable->isNotEmpty()) {
            throw ValidationException::withMessages([
                'items' => ['Menu "'.implode('", "', $unavailable->all()).'" sudah tidak tersedia. Tukar/menyesuaikan pesanan dulu sebelum bayar.'],
            ]);
        }
    }
}

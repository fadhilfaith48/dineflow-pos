<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PaymentResource;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Setting;
use App\Services\TableStatusService;
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
        // Hanya 'tunai'. Endpoint ini milik kasir yang uangnya ada di tangan.
        // 'qris' TIDAK boleh diterima di sini: tanpa gateway, kode lama membuat
        // payment berstatus 'paid' seketika — kasir bisa menandai pesanan lunas
        // tanpa uang masuk sama sekali. QRIS hanya lewat endpoint checkout()
        // yang benar-benar memanggil gateway.
        $validated = $request->validate([
            'method' => ['required', 'in:tunai'],
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
        $order->loadMissing('items');

        // Endpoint publik (dipakai pelanggan tanpa login). Tanpa token Sanctum,
        // HANYA order self-order boleh di-checkout. Sebelumnya route ini sama
        // sekali terbuka: siapa pun yang menebak id order kasir/pelayan bisa
        // membuat payment pending — lalu kasir tidak bisa membayar (409) dan
        // order itu terkunci.
        if (auth('sanctum')->user() === null && $order->source !== 'self-order') {
            abort(403, 'Pesanan ini tidak bisa dibayar lewat halaman pelanggan.');
        }

        // Endpoint ini PUBLIK (pelanggan tanpa login), jadi penjaga peran tidak
        // bisa dipasang lewat middleware 'role:' — middleware itu menolak
        // 403 sebelum controller sempat membedakan tamu dan staf. Yang dijaga
        // di sini hanya kasus tanpa token; untuk staf, perannya dikunci di
        // bawah. Tanpa penguncian ini akun dapur bisa membuat payment pending
        // di order kasir/pelayan, sehingga kasir lalu mendapat 409 "sudah
        // dibayar" padahal uang belum masuk — order terkunci tanpa sebab.
        $user = auth('sanctum')->user();

        if ($user !== null && ! in_array($user->role, ['kasir', 'pelayan', 'admin'], true)) {
            abort(403, 'Peran ini tidak dapat memulai pembayaran QRIS.');
        }

        // Cek cepat di luar transaksi supaya order yang jelas tidak valid
        // (sudah dibayar / bukan status menunggu) langsung ditolak tanpa
        // sempat memanggil gateway sama sekali.
        if ($order->payment()->exists()) {
            abort(409, 'Pesanan sudah dibayar');
        }

        if ($order->status !== 'menunggu') {
            abort(422, 'Pesanan tidak dalam status menunggu pembayaran');
        }

        $this->assertItemsAvailable($order);

        // Panggilan HTTP ke gateway DILAKUKAN DI LUAR transaksi DB. Sebelumnya
        // seluruh blok ini ada di dalam DB::transaction yang memegang
        // lockForUpdate pada order — selama 2-5 detik sambil menunggu respons
        // DOKU/Xendit. Selama itu order terkunci, sehingga void/cancel/complete
        // untuk order tersebut ikut menggantung.
        $gateway = app(PaymentGateway::class);
        $info = $gateway->createPayment($order->order_number, $order->total, 'qris');
        $subtotal = $this->subtotalOf($order->total);

        try {
            return DB::transaction(function () use ($order, $info, $subtotal) {
                // Kunci baris order. Dua checkout untuk order yang sama
                // berjalan serial: yang kedua menunggu commit yang pertama,
                // lalu mendapati pembayaran sudah ada (409) — bukan membuat
                // payment ganda.
                $order = Order::lockForUpdate()->findOrFail($order->id);

                if ($order->payment()->exists()) {
                    abort(409, 'Pesanan sudah dibayar');
                }

                if ($order->status !== 'menunggu') {
                    abort(422, 'Pesanan tidak dalam status menunggu pembayaran');
                }

                // P1#5: cek ulang ketersediaan (order bisa saja berubah status
                // selama menunggu respons gateway tadi).
                $this->assertItemsAvailable($order->loadMissing('items'));

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

        if ($payment->status === 'pending') {
            $gateway = app(PaymentGateway::class);
            $gatewayStatus = $gateway->getStatus($reference, $payment->order->order_number);

            if ($gatewayStatus === 'paid') {
                $this->confirmPaid($payment);
            } elseif (in_array($gatewayStatus, ['failed', 'expired', 'cancelled'], true)) {
                // Simpan status akhir dari gateway. Sebelumnya status 'failed'
                // dan 'expired' sama sekali diabaikan, sehingga payment tetap
                // 'pending' selamanya dan frontend tidak pernah tahu kalau
                // transaksi sudah gagal atau kadaluarsa.
                $payment->status = $gatewayStatus;
                $payment->save();
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
        $this->assertMockEndpointAllowed('markPaid');

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
        $this->assertMockEndpointAllowed('simulasi', 'xendit');

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
     * Webhook Xendit. Tanpa ini, pembayaran hanya terdeteksi kalau pelanggan
     * masih membuka halaman dan polling —utup tab setelah scan berarti uang
     * masuk tapi order tidak pernah jalan.
     *
     * Keamanan: signature `x-callback-token` diverifikasi terhadap
     * XENDIT_CALLBACK_TOKEN, jadi orang luar tidak bisa men forging "lunas".
     */
    public function xenditCallback(Request $request): JsonResponse
    {
        $expected = (string) config('dinflow.xendit.callback_token', '');

        if ($expected === '' || ! hash_equals($expected, (string) $request->header('x-callback-token', ''))) {
            abort(401, 'Token callback tidak valid.');
        }

        $payload = $request->all();
        $status = strtoupper((string) ($payload['status'] ?? ''));

        $payment = $this->findPaymentForCallback($payload);

        if ($payment) {
            match ($status) {
                'PAID', 'SUCCEEDED', 'COMPLETED' => $this->confirmPaid($payment),
                // Status terminal HANYA boleh menimpa payment yang masih
                // pending. Callback bersifat bisa datang terlambat/berulang,
                // jadi EXPIRED seusai pembayaran sukses akan memunculkan ulang
                // QR yang sudah lunas dan membukukan order jadi belum dibayar.
                'EXPIRED' => $this->markIfPending($payment, 'expired'),
                'FAILED' => $this->markIfPending($payment, 'failed'),
                default => null,
            };
        }

        return response()->json(['ok' => true]);
    }

    /**
     * Cari payment yang dimaksud webhook.
     *
     * Nilai yang kita simpan di payments.reference adalah ID QR dari Xendit
     * (prefix `qr_`), sedangkan `reference_id` yang dikirim Xendit adalah
     * nomor order kita (ORD-0008). Hanya membaca reference_id lalu mencocokkan
     * ke payments.reference — seperti versi lama — tidak akan pernah cocok,
     * sehingga webhook selalu balas "ok" tapi tidak mengubah apa pun.
     *
     * Bentuk payload yang dicoba berurutan:
     *   1. qr_code.id / qr_code_id  -> id QR, sama dengan payments.reference
     *   2. reference_id             -> dicocokkan langsung ke payments.reference
     *                                    (beberapa gateway meng-echo reference)
     *   3. reference_id             -> nomor order, dicari lewat relasi order
     */
    private function findPaymentForCallback(array $payload): ?Payment
    {
        $qrId = data_get($payload, 'qr_code.id') ?? $payload['qr_code_id'] ?? null;
        $referenceId = (string) (
            $payload['reference_id']
            ?? data_get($payload, 'qr_code.reference_id')
            ?? ''
        );

        foreach (array_filter([$qrId, $referenceId]) as $candidate) {
            $payment = Payment::where('reference', $candidate)->first();
            if ($payment) {
                return $payment;
            }
        }

        if ($referenceId === '') {
            return null;
        }

        return Payment::whereHas(
            'order',
            fn ($q) => $q->where('order_number', $referenceId)
        )->first();
    }

    /**
     * Tandai payment jadi status terminal, tapi hanya dari status pending.
     * Payment yang sudah paid/expired/failed/cancelled tidak ditimpa.
     */
    private function markIfPending(Payment $payment, string $status): ?Payment
    {
        if ($payment->status !== 'pending') {
            return null;
        }

        return tap($payment, fn ($p) => $p->update(['status' => $status]));
    }

    /**
     * Endpoint pembayaran palsu (mock / simulasi gateway) terbuka ke publik dan
     * hanya dilindungi oleh nilai PAYMENT_DRIVER. Itu tidak cukup: .env.example
     * bernilai 'mock', jadi instalasi yang lupa menyetelnya bisa membiarkan
     * siapa pun menandai pembayaran lunas tanpa uang. Karena itu perlu flag
     * kedua yang harus DINYALAKAN secara sengaja di produksi (ALLOW_MOCK_PAYMENT),
     * sehingga demo tetap bisa jalan tanpa jadi celah yang aktif diam-diam.
     *
     * 404 (bukan 403) supaya endpoint tidak terlihat ada di domain publik.
     */
    private function assertMockEndpointAllowed(string $label, string $driver = 'mock'): void
    {
        if (config('dinflow.payment_driver') !== $driver) {
            abort(403, "Endpoint {$label} hanya tersedia pada driver {$driver}.");
        }

        if (! config('dinflow.allow_mock_payment')) {
            abort(404);
        }
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

            // Order hanya boleh dilanjut ke dapur kalau masih 'menunggu'.
            // Tanpa cek ini, pelanggan yang membatalkan pesanan lalu tetap
            // membayar QRIS-nya akan membuat order 'dibatalkan' terkirim ke
            // dapur dan meja ikut ditandai 'terisi' — uang hilang tanpa pesanan.
            $order = $payment->order()->lockForUpdate()->firstOrFail();

            if ($order->status !== 'menunggu') {
                return;
            }

            $payment->status = 'paid';
            $payment->paid_at = now();
            $payment->save();

            $this->moveToKitchen($order);
        });
    }

    /**
     * Setelah pembayaran di muka lunas: order -> diproses (masuk dapur), meja -> terisi.
     */
    private function moveToKitchen(Order $order): void
    {
        $order = Order::lockForUpdate()->findOrFail($order->id);

        // Cadangan kedua untuk confirmPaid(): kalau order sudah dibatalkan
        // atau selesai, jangan ubah apa pun.
        if ($order->status !== 'menunggu') {
            return;
        }

        $order->status = 'diproses';
        $order->save();

        TableStatusService::syncForOrder($order);

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

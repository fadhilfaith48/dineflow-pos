<?php

namespace App\Services\Payment;

use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Driver Xendit QRIS (QR Codes V1 — dynamic QR MPM).
 *
 * Memakai generasi API "2022-07-31" (header api-version) agar berperilaku
 * konsisten & mendukung endpoint simulasi test-mode:
 *  1. createPayment()    -> POST /qr_codes          (Basic auth Secret Key, JSON),
 *                           body reference_id/type/amount/currency/callback_url;
 *                           respons memuat "id" (qr_...) sebagai reference lokal
 *                           dan "qr_string" sebagai payload QR untuk frontend.
 *  2. getStatus()        -> GET /qr_codes/{reference}/payments  (query by QR id),
 *                           lunas bila ada payment berstatus COMPLETED/SUCCEEDED.
 *  3. simulatePayment()  -> POST /qr_codes/{reference}/payments/simulate
 *                           (Khusus TEST MODE: mensimulasikan pembayaran masuk
 *                           sehingga alur polling penuh bisa diuji/demokan.)
 *
 * Catatan sandbox: di test mode qr_string = "some-random-qr-string" (stub
 * Xendit, tidak scannable) dan pembayaran hanya bisa "masuk" lewat simulasi.
 *
 * Bila kredensial Xendit belum diisi, driver otomatis bertindak sebagai
 * MockQrisGateway agar demo tetap jalan.
 *
 * Membutuhkan di .env:
 *   PAYMENT_DRIVER=xendit
 *   XENDIT_SECRET_KEY=<xnd_development_... / xnd_production_...>
 *   XENDIT_CALLBACK_URL=<URL absolut webhook, opsional — dipakai polling>
 */
class XenditGateway implements PaymentGateway
{
    private const API_VERSION = '2022-07-31';

    private array $config;

    public function __construct()
    {
        $this->config = config('dinflow.xendit');
    }

    /**
     * Apakah kredensial Xendit lengkap untuk integrasi sungguhan.
     */
    private function usable(): bool
    {
        return trim((string) ($this->config['secret_key'] ?? '')) !== '';
    }

    public function createPayment(string $orderNumber, int $amount, string $paidVia): array
    {
        if (! $this->usable()) {
            return $this->fallback()->createPayment($orderNumber, $amount, $paidVia);
        }

        $response = Http::baseUrl($this->baseUrl())
            ->withBasicAuth($this->config['secret_key'], '')
            ->withHeaders(['api-version' => self::API_VERSION])
            ->asJson()
            ->post('/qr_codes', [
                'reference_id' => $orderNumber,
                'type' => 'DYNAMIC',
                'amount' => $amount,
                'currency' => 'IDR',
                'callback_url' => $this->config['callback_url']
                    ?? rtrim((string) config('app.url'), '/').'/api/xendit/callback',
            ]);

        if ($response->failed()) {
            throw new RuntimeException('Xendit gagal membuat QRIS: '.$response->body());
        }

        $out = $response->json() ?? [];
        $reference = $out['id'] ?? null;
        $qrContent = $out['qr_string'] ?? null;

        if (! is_string($reference) || $reference === '' || ! is_string($qrContent) || $qrContent === '') {
            throw new RuntimeException('Xendit tidak mengembalikan id/qr_string: '.$response->body());
        }

        return [
            'reference' => $reference,
            'qrContent' => $qrContent,
            'gateway' => 'xendit',
        ];
    }

    public function getStatus(string $reference, string $invoiceNumber): string
    {
        if (! $this->usable()) {
            return $this->fallback()->getStatus($reference, $invoiceNumber);
        }

        $response = Http::baseUrl($this->baseUrl())
            ->withBasicAuth($this->config['secret_key'], '')
            ->withHeaders(['api-version' => self::API_VERSION])
            ->acceptJson()
            ->get('/qr_codes/'.$reference.'/payments?limit=1');

        if ($response->failed()) {
            return 'pending';
        }

        return $this->mapStatus($response);
    }

    public function simulatePayment(string $reference): string
    {
        if (! $this->usable()) {
            throw new RuntimeException('Kredensial Xendit belum lengkap.');
        }

        $response = Http::baseUrl($this->baseUrl())
            ->withBasicAuth($this->config['secret_key'], '')
            ->withHeaders(['api-version' => self::API_VERSION])
            ->acceptJson()
            ->asJson()
            ->post('/qr_codes/'.$reference.'/payments/simulate', (object) []);

        if ($response->failed()) {
            throw new RuntimeException('Xendit gagal mensimulasikan pembayaran: '.$response->body());
        }

        return strtoupper((string) ($response->json('status') ?? '')) === 'SUCCEEDED' ? 'paid' : 'pending';
    }

    public function markPaid(string $reference): string
    {
        throw new RuntimeException('markPaid hanya tersedia untuk driver Mock.');
    }

    private function mapStatus(Response $response): string
    {
        $payments = (array) ($response->json('payments', $response->json('data')) ?: []);

        foreach ($payments as $payment) {
            $status = strtoupper((string) ($payment['status'] ?? ''));

            return match ($status) {
                'COMPLETED', 'SUCCEEDED' => 'paid',
                'FAILED' => 'failed',
                default => 'pending',
            };
        }

        return 'pending';
    }

    private function baseUrl(): string
    {
        return rtrim((string) ($this->config['host'] ?? 'https://api.xendit.co'), '/');
    }

    private function fallback(): MockQrisGateway
    {
        return new MockQrisGateway;
    }
}

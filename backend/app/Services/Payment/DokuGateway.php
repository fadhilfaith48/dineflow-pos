<?php

namespace App\Services\Payment;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Driver sungguhan DOKU QRIS (mode sandbox untuk demo PKL).
 *
 * Membutuhkan kredensial di .env: DOKU_CLIENT_ID, DOKU_SECRET_KEY,
 * dan DOKU_SANDBOX=true untuk memakai API sandbox.
 */
class DokuGateway implements PaymentGateway
{
    private string $clientId;

    private string $secretKey;

    private bool $sandbox;

    public function __construct()
    {
        $this->clientId = (string) config('payment.doku.client_id', '');
        $this->secretKey = (string) config('payment.doku.secret_key', '');
        $this->sandbox = (bool) config('payment.doku.sandbox', true);

        if ($this->clientId === '' || $this->secretKey === '') {
            throw new RuntimeException('Kredensial DOKU belum diatur (DOKU_CLIENT_ID / DOKU_SECRET_KEY).');
        }
    }

    public function createPayment(string $orderNumber, int $amount, string $paidVia): array
    {
        $reference = 'DOKU-'.strtoupper(Str::random(12));

        $response = $this->http()->post('/payment/v1/payment/qris', [
            'order' => [
                'invoice_number' => $orderNumber,
                'line_items' => [],
                'amount' => (string) $amount,
                'currency' => 'IDR',
            ],
            'payment' => [
                'payment_due_date' => now()->addHour()->format('c'),
                'channel' => 'QRIS',
            ],
            'customer' => ['name' => 'Pelanggan'],
        ]);

        if ($response->failed()) {
            throw new RuntimeException('DOKU gagal membuat QRIS: '.$response->body());
        }

        $body = $response->json() ?? [];

        return [
            'reference' => $reference,
            'qrContent' => $body['response']['qrString'] ?? $body['qrString'] ?? null,
            'gateway' => 'doku',
        ];
    }

    public function getStatus(string $reference): string
    {
        $response = $this->http()->post('/payment/v1/payment/direct', [
            'order' => [
                'invoice_number' => $reference,
                'amount' => null,
                'currency' => 'IDR',
            ],
        ]);

        if ($response->failed()) {
            return 'pending';
        }

        $status = strtolower((string) ($response->json('transaction_status') ?? 'PENDING'));

        return match ($status) {
            'SUCCESS', 'CAPTURED' => 'paid',
            'FAILED' => 'failed',
            'EXPIRED' => 'expired',
            default => 'pending',
        };
    }

    public function markPaid(string $reference): string
    {
        throw new RuntimeException('markPaid hanya tersedia untuk driver Mock.');
    }

    private function http(): PendingRequest
    {
        return Http::baseUrl(config('payment.doku.host'))
            ->withHeaders([
                'Client-Id' => $this->clientId,
                'Request-Id' => (string) Str::uuid(),
                'Request-Timestamp' => now()->toIso8601String(),
                'Content-Type' => 'application/json',
            ]);
    }
}

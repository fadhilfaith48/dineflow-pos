<?php

namespace App\Services\Payment;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Driver DOKU QRIS (SNAP QRIS MPM — generate + query).
 *
 * Alur:
 *  1. accessToken()  -> B2B token (RSA-SHA256 signature), di-cache ~14 menit.
 *  2. createPayment() -> POST /snap-adapter/b2b/v1.0/qr/qr-mpm-generate,
 *                        QR ditampilkan lewat payload "qrContent" (frontend polling).
 *  3. getStatus()     -> POST /snap-adapter/b2b/v1.0/qr/qr-mpm-query,
 *                        konfirmasi lunas via latestTransactionStatus "00".
 *
 * Bila kredensial DOKU belum lengkap (proyek PKL tanpa aktivasi bisnis),
 * driver otomatis bertindak seperti MockQrisGateway agar demo tetap jalan.
 *
 * Membutuhkan di .env:
 *   PAYMENT_DRIVER=doku
 *   DOKU_CLIENT_ID, DOKU_SECRET_KEY, DOKU_PRIVATE_KEY_FILE,
 *   DOKU_MERCHANT_ID, DOKU_TERMINAL_ID, DOKU_SANDBOX=true
 */
class DokuGateway implements PaymentGateway
{
    private const TOKEN_PATH = '/authorization/v1/access-token/b2b';

    private const GENERATE_PATH = '/snap-adapter/b2b/v1.0/qr/qr-mpm-generate';

    private const QUERY_PATH = '/snap-adapter/b2b/v1.0/qr/qr-mpm-query';

    private const SERVICE_CODE_QRIS = '47';

    private array $config;

    public function __construct()
    {
        $this->config = config('dinflow.doku');
    }

    /**
     * Apakah kredensial DOKU lengkap untuk integrasi sungguhan.
     */
    private function usable(): bool
    {
        $required = ['client_id', 'secret_key', 'private_key_file', 'merchant_id', 'terminal_id'];

        foreach ($required as $key) {
            if (trim((string) ($this->config[$key] ?? '')) === '') {
                return false;
            }
        }

        return true;
    }

    public function createPayment(string $orderNumber, int $amount, string $paidVia): array
    {
        if (! $this->usable()) {
            return $this->fallback()->createPayment($orderNumber, $amount, $paidVia);
        }

        $timestamp = $this->timestamp();

        $body = [
            'partnerReferenceNo' => $orderNumber,
            'amount' => [
                'value' => (string) $amount,
                'currency' => 'IDR',
            ],
            'merchantId' => $this->config['merchant_id'],
            'terminalId' => $this->config['terminal_id'],
            'additionalInfo' => [
                'postalCode' => $this->config['postal_code'] ?? '',
            ],
        ];

        $token = $this->accessToken();

        // X-EXTERNAL-ID dipakai juga sebagai reference lokal untuk polling status.
        $reference = $this->externalId();

        $response = $this->request(
            method: 'POST',
            path: self::GENERATE_PATH,
            body: $body,
            token: $token,
            timestamp: $timestamp,
            externalId: $reference,
        )->post($this->baseUrl().self::GENERATE_PATH, $body);

        if ($response->failed()) {
            throw new RuntimeException('DOKU gagal membuat QRIS: '.$response->body());
        }

        $out = $response->json() ?? [];
        $qrContent = $out['qrCode']['qrContent'] ?? null;

        if (! is_string($qrContent) || $qrContent === '') {
            throw new RuntimeException('DOKU tidak mengembalikan qrContent: '.$response->body());
        }

        return [
            'reference' => (string) $reference,
            'qrContent' => $qrContent,
            'gateway' => 'doku',
        ];
    }

    public function getStatus(string $reference, string $invoiceNumber): string
    {
        if (! $this->usable()) {
            return $this->fallback()->getStatus($reference, $invoiceNumber);
        }

        $timestamp = $this->timestamp();

        $body = [
            'originalReferenceNo' => $reference,
            'originalPartnerReferenceNo' => $invoiceNumber,
            'serviceCode' => self::SERVICE_CODE_QRIS,
            'merchantId' => $this->config['merchant_id'],
        ];

        $response = $this->request(
            method: 'POST',
            path: self::QUERY_PATH,
            body: $body,
            token: $this->accessToken(),
            timestamp: $timestamp,
            externalId: $this->externalId(),
        )->post($this->baseUrl().self::QUERY_PATH, $body);

        if ($response->failed()) {
            return 'pending';
        }

        $status = (string) ($response->json('latestTransactionStatus') ?: '');

        return match ($status) {
            '00' => 'paid',
            '06' => 'failed',
            '07' => 'cancelled',
            '08' => 'expired',
            default => 'pending',
        };
    }

    public function markPaid(string $reference): string
    {
        throw new RuntimeException('markPaid hanya tersedia untuk driver Mock.');
    }

    /**
     * B2B access token via RSA-SHA256, di-cache hingga expiresIn - 60 detik.
     */
    private function accessToken(): string
    {
        $cached = Cache::get('doku_access_token');

        if (is_string($cached) && $cached !== '') {
            return $cached;
        }

        $timestamp = $this->timestamp();
        $signature = $this->symmetricSignatureForToken($timestamp);

        $response = Http::baseUrl($this->baseUrl())->withHeaders([
            'X-CLIENT-KEY' => $this->config['client_id'],
            'X-TIMESTAMP' => $timestamp,
            'X-SIGNATURE' => $signature,
            'Content-Type' => 'application/json',
        ])->post(self::TOKEN_PATH, ['grantType' => 'client_credentials']);

        if ($response->failed()) {
            throw new RuntimeException('DOKU gagal mendapat access token: '.$response->body());
        }

        $token = (string) ($response->json('accessToken') ?: '');

        if ($token === '') {
            throw new RuntimeException('DOKU tidak mengembalikan accessToken: '.$response->body());
        }

        $expiresIn = max(60, (int) ($response->json('expiresIn') ?: 900)) - 60;

        Cache::put('doku_access_token', $token, now()->addSeconds($expiresIn));

        return $token;
    }

    /**
     * HTTP client ber-headers SNAP + signature simetris (HMAC-SHA512).
     *
     * @param  string  $externalId  X-EXTERNAL-ID (numerik, unik per request)
     */
    private function request(string $method, string $path, array $body, string $token, string $timestamp, string $externalId): PendingRequest
    {
        return Http::baseUrl($this->baseUrl())->withHeaders([
            'Content-Type' => 'application/json',
            'Authorization' => 'Bearer '.$token,
            'X-PARTNER-ID' => $this->config['client_id'],
            'X-EXTERNAL-ID' => $externalId,
            'CHANNEL-ID' => (string) ($this->config['channel_id'] ?: 'H2H'),
            'X-TIMESTAMP' => $timestamp,
            'X-SIGNATURE' => $this->symmetricSignature($method, $path, $token, $body, $timestamp),
        ]);
    }

    /**
     * Tanda tangan asimetris untuk B2B token: Base64(RSA-SHA256("clientId|timestamp")).
     */
    private function symmetricSignatureForToken(string $timestamp): string
    {
        $stringToSign = $this->config['client_id'].'|'.$timestamp;

        $key = $this->privateKey();

        if (! openssl_sign($stringToSign, $signature, $key, OPENSSL_ALGO_SHA256)) {
            throw new RuntimeException('Gagal membuat tanda tangan RSA untuk token DOKU.');
        }

        return base64_encode($signature);
    }

    /**
     * Tanda tangan simetris SNAP:
     * Base64(HMAC-SHA512(secret, "METHOD:path:token:sha256hex(minify(body)):timestamp")).
     */
    private function symmetricSignature(string $method, string $path, string $token, array $body, string $timestamp): string
    {
        $minified = (string) json_encode($body, JSON_UNESCAPED_SLASHES);
        $digest = strtolower(hash('sha256', $minified));
        $stringToSign = $method.':'.$path.':'.$token.':'.$digest.':'.$timestamp;

        return base64_encode(hash_hmac('sha512', $stringToSign, $this->config['secret_key'], true));
    }

    /**
     * Baca kunci privat PEM. Menerima path absolut, atau relatif ke storage/
     * (mis. "doku/private_key.pem" -> backend/storage/doku/private_key.pem).
     */
    private function privateKey(): \OpenSSLAsymmetricKey
    {
        $path = (string) ($this->config['private_key_file'] ?? '');

        if ($path === '') {
            throw new RuntimeException('DOKU_PRIVATE_KEY_FILE belum diatur.');
        }

        if (! is_file($path)) {
            $candidate = storage_path($path);
            if (is_file($candidate)) {
                $path = $candidate;
            }
        }

        $key = openssl_pkey_get_private((string) file_get_contents($path));

        if ($key === false) {
            throw new RuntimeException('Gagal membaca kunci privat DOKU: '.openssl_error_string());
        }

        return $key;
    }

    private function baseUrl(): string
    {
        return rtrim((string) ($this->config['host'] ?? 'https://api-sandbox.doku.com'), '/');
    }

    private function timestamp(): string
    {
        return now()->utc()->format('Y-m-d\TH:i:s\Z');
    }

    /**
     * X-EXTERNAL-ID syarat DOKU: numerik, unik, maks. 64 karakter.
     */
    private function externalId(): string
    {
        return date('YmdHis').sprintf('%09d', mt_rand(0, 999999999));
    }

    private function fallback(): MockQrisGateway
    {
        return new MockQrisGateway;
    }
}

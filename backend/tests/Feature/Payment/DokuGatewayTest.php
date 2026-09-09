<?php

namespace Tests\Feature\Payment;

use App\Services\Payment\DokuGateway;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class DokuGatewayTest extends TestCase
{
    private const HOST = 'https://api-sandbox.doku.com';

    private const TOKEN_URL = self::HOST.'/authorization/v1/access-token/b2b';

    private const GENERATE_URL = self::HOST.'/snap-adapter/b2b/v1.0/qr/qr-mpm-generate';

    private const QUERY_URL = self::HOST.'/snap-adapter/b2b/v1.0/qr/qr-mpm-query';

    private string $privateKeyFile;

    protected function setUp(): void
    {
        parent::setUp();

        Cache::flush();

        $options = ['private_key_bits' => 2048, 'private_key_type' => OPENSSL_KEYTYPE_RSA];

        foreach (['C:/xampp/apache/conf/openssl.cnf', 'D:/laragon/etc/openssl.cnf', '/etc/ssl/openssl.cnf'] as $cnf) {
            if (is_file($cnf)) {
                $options['config'] = $cnf;
                break;
            }
        }

        $key = openssl_pkey_new($options);
        $this->assertNotFalse($key, 'Tidak dapat membuat pasangan kunci RSA uji.');
        openssl_pkey_export($key, $pem, null, $options);

        $this->privateKeyFile = tempnam(sys_get_temp_dir(), 'doku-test-');
        file_put_contents($this->privateKeyFile, $pem);

        config()->set('dinflow.payment_driver', 'doku');
        config()->set('dinflow.doku', [
            'client_id' => 'BRN-100-1001-XYTEST',
            'secret_key' => 'test-secret-key',
            'private_key_file' => $this->privateKeyFile,
            'merchant_id' => '1013900121008',
            'terminal_id' => 'TF001',
            'postal_code' => '50128',
            'channel_id' => 'H2H',
            'sandbox' => true,
            'host' => self::HOST,
        ]);
    }

    protected function tearDown(): void
    {
        if (is_file($this->privateKeyFile)) {
            @unlink($this->privateKeyFile);
        }

        parent::tearDown();
    }

    public function test_create_payment_returns_qr_content_and_snap_headers(): void
    {
        Http::fake([
            self::TOKEN_URL => Http::response([
                'responseCode' => '2007300',
                'responseMessage' => 'Successful',
                'accessToken' => 'TEST-ACCESS-TOKEN',
                'tokenType' => 'Bearer',
                'expiresIn' => 900,
            ]),
            self::GENERATE_URL => Http::response([
                'responseCode' => '2006100',
                'responseMessage' => 'Request has been processed successfully',
                'qrCode' => [
                    'qrContent' => '0002010102112612DNS.DOKU.COM15ID103149999',
                    'qrValue' => '0002010102112612DNS.DOKU.COM15ID103149999',
                ],
            ]),
        ]);

        $result = (new DokuGateway)->createPayment('ORD-1', 100000, 'qris');

        $this->assertSame('doku', $result['gateway']);
        $this->assertStringStartsWith('000201', $result['qrContent']);
        $this->assertMatchesRegularExpression('/^\d+$/', $result['reference']);

        Http::assertSent(function ($request) {
            return $request->url() === self::GENERATE_URL
                && $request->hasHeader('X-PARTNER-ID', 'BRN-100-1001-XYTEST')
                && $request->hasHeader('X-EXTERNAL-ID')
                && $request->hasHeader('X-TIMESTAMP')
                && $request->hasHeader('X-SIGNATURE')
                && $request->hasHeader('CHANNEL-ID', 'H2H')
                && $request->hasHeader('Authorization', 'Bearer TEST-ACCESS-TOKEN')
                && $request->data()['partnerReferenceNo'] === 'ORD-1'
                && $request->data()['amount']['value'] === '100000'
                && $request->data()['merchantId'] === '1013900121008'
                && $request->data()['terminalId'] === 'TF001';
        });
    }

    public function test_access_token_is_cached_between_requests(): void
    {
        Http::fake([
            self::TOKEN_URL => Http::response([
                'responseCode' => '2007300',
                'accessToken' => 'TEST-ACCESS-TOKEN',
                'expiresIn' => 900,
            ]),
            self::GENERATE_URL => Http::response([
                'responseCode' => '2006100',
                'qrCode' => ['qrContent' => '0002010102112612DNS.DOKU.COM15ID103149999'],
            ]),
        ]);

        $gateway = new DokuGateway;
        $gateway->createPayment('ORD-1', 10000, 'qris');
        $gateway->createPayment('ORD-2', 20000, 'qris');

        $tokenHits = count(Http::recorded(fn ($request) => str_contains($request->url(), '/access-token/b2b')));

        $this->assertSame(1, $tokenHits);
    }

    public function test_get_status_maps_paid(): void
    {
        Http::fake([
            self::TOKEN_URL => Http::response([
                'responseCode' => '2007300',
                'accessToken' => 'TEST-ACCESS-TOKEN',
                'expiresIn' => 900,
            ]),
            self::QUERY_URL => Http::response([
                'responseCode' => '2004200',
                'responseMessage' => 'Get payment status successful',
                'latestTransactionStatus' => '00',
            ]),
        ]);

        $status = (new DokuGateway)->getStatus('2026090912300000001', 'ORD-1');

        $this->assertSame('paid', $status);

        Http::assertSent(function ($request) {
            return $request->url() === self::QUERY_URL
                && $request->hasHeader('X-SIGNATURE')
                && $request->data()['originalPartnerReferenceNo'] === 'ORD-1'
                && $request->data()['serviceCode'] === '47';
        });
    }

    public function test_get_status_maps_pending_failed_and_expired(): void
    {
        Http::fake([
            self::TOKEN_URL => Http::response([
                'responseCode' => '2007300',
                'accessToken' => 'TEST-ACCESS-TOKEN',
                'expiresIn' => 900,
            ]),
            self::QUERY_URL => Http::sequence()
                ->push(['responseCode' => '2004200', 'latestTransactionStatus' => '01'])
                ->push(['responseCode' => '2004200', 'latestTransactionStatus' => '06'])
                ->push(['responseCode' => '2004200', 'latestTransactionStatus' => '07'])
                ->push(['responseCode' => '2004200', 'latestTransactionStatus' => '08'])
                ->whenEmpty(Http::response([], 500)),
        ]);

        $gateway = new DokuGateway;

        foreach (['01' => 'pending', '06' => 'failed', '07' => 'cancelled', '08' => 'expired'] as $code => $expected) {
            $status = $gateway->getStatus('2026090912300000001', 'ORD-1');

            $this->assertSame($expected, $status);
        }
    }

    public function test_falls_back_to_local_mock_when_credentials_missing(): void
    {
        config()->set('dinflow.doku', [
            'client_id' => '',
            'secret_key' => '',
            'private_key_file' => '',
            'merchant_id' => '',
            'terminal_id' => '',
            'postal_code' => '',
            'channel_id' => 'H2H',
            'host' => self::HOST,
        ]);

        $gateway = new DokuGateway;
        $result = $gateway->createPayment('ORD-1', 10000, 'qris');

        $this->assertSame('mock', $result['gateway']);
        $this->assertStringStartsWith('MOCK-', $result['reference']);
        $this->assertSame('pending', $gateway->getStatus($result['reference'], 'ORD-1'));

        Http::assertNothingSent();
    }
}

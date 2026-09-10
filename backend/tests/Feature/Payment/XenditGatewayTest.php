<?php

namespace Tests\Feature\Payment;

use App\Services\Payment\XenditGateway;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class XenditGatewayTest extends TestCase
{
    private const HOST = 'https://api.xendit.co';

    private const CREATE_URL = self::HOST.'/qr_codes';

    private const QR_ID = 'qr_123-456-789';

    private const PAYMENTS_URL = self::HOST.'/qr_codes/'.self::QR_ID.'/payments?limit=1';

    private const SIMULATE_URL = self::HOST.'/qr_codes/'.self::QR_ID.'/payments/simulate';

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('dinflow.payment_driver', 'xendit');
        config()->set('dinflow.xendit', [
            'secret_key' => 'xnd_development_tes',
            'host' => self::HOST,
        ]);
    }

    public function test_create_payment_returns_qr_string_with_reference_and_basic_auth(): void
    {
        Http::fake([
            self::CREATE_URL => Http::response([
                'id' => self::QR_ID,
                'reference_id' => 'ORD-1',
                'type' => 'DYNAMIC',
                'amount' => 100000,
                'status' => 'ACTIVE',
                'qr_string' => '0002010102112612DXND.CO.ID15ID103149999',
            ]),
        ]);

        $result = (new XenditGateway)->createPayment('ORD-1', 100000, 'qris');

        $this->assertSame('xendit', $result['gateway']);
        $this->assertSame(self::QR_ID, $result['reference']);
        $this->assertStringStartsWith('000201', $result['qrContent']);

        Http::assertSent(function ($request) {
            return $request->url() === self::CREATE_URL
                && $request->hasHeader('Authorization', 'Basic '.base64_encode('xnd_development_tes:'))
                && $request->hasHeader('api-version', '2022-07-31')
                && $request['type'] === 'DYNAMIC'
                && $request['amount'] === 100000
                && $request['reference_id'] === 'ORD-1';
        });
    }

    public function test_get_status_maps_paid_from_succeeded_payment(): void
    {
        Http::fake([
            self::PAYMENTS_URL => Http::response([
                'data' => [
                    ['id' => 'qrpy_1', 'status' => 'SUCCEEDED', 'amount' => 100000],
                ],
                'has_more' => false,
            ]),
        ]);

        $status = (new XenditGateway)->getStatus(self::QR_ID, 'ORD-1');

        $this->assertSame('paid', $status);

        Http::assertSent(function ($request) {
            return $request->url() === self::PAYMENTS_URL
                && $request->hasHeader('api-version', '2022-07-31');
        });
    }

    public function test_get_status_maps_pending_when_no_payment_yet(): void
    {
        Http::fake([
            self::PAYMENTS_URL => Http::response(['data' => [], 'has_more' => false]),
        ]);

        $status = (new XenditGateway)->getStatus(self::QR_ID, 'ORD-1');

        $this->assertSame('pending', $status);
    }

    public function test_simulate_payment_marks_paid_on_succeeded(): void
    {
        Http::fake([
            self::SIMULATE_URL => Http::response([
                'id' => 'qrpy_1',
                'status' => 'SUCCEEDED',
                'qr_id' => self::QR_ID,
                'reference_id' => 'ORD-1',
            ]),
        ]);

        $status = (new XenditGateway)->simulatePayment(self::QR_ID);

        $this->assertSame('paid', $status);

        Http::assertSent(function ($request) {
            return $request->url() === self::SIMULATE_URL
                && $request->method() === 'POST'
                && $request->hasHeader('api-version', '2022-07-31');
        });
    }

    public function test_falls_back_to_local_mock_when_secret_key_missing(): void
    {
        config()->set('dinflow.xendit', [
            'secret_key' => '',
            'host' => self::HOST,
        ]);

        $gateway = new XenditGateway;
        $result = $gateway->createPayment('ORD-1', 10000, 'qris');

        $this->assertSame('mock', $result['gateway']);
        $this->assertStringStartsWith('MOCK-', $result['reference']);
        $this->assertSame('pending', $gateway->getStatus($result['reference'], 'ORD-1'));

        Http::assertNothingSent();
    }
}

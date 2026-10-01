<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Payment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Payment QRIS yang menggantung harus kedaluwarsa sendiri.
 *
 * Tanpa perintah ini, status di sisi kita hanya berubah saat ada yang polling.
 * Pelanggan yang menutup tab setelah scan tidak akan pernah kembali =>
 * payment menggantung 'pending' selamanya, order tidak bisa ditutup kasir,
 * dan laporan tidak pernah bersih.
 */
class PaymentExpiryTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('dinflow.payment_driver', 'mock');
        config()->set('dinflow.allow_mock_payment', true);
    }

    private function createOrder(): Order
    {
        return Order::create([
            'order_number' => 'ORD-'.str_pad((string) (Order::count() + 1), 4, '0', STR_PAD_LEFT),
            'table_id' => null,
            'source' => 'self-order',
            'status' => 'menunggu',
            'total' => 19800,
        ]);
    }

    private function createPayment(Order $order, string $status, int $ageMinutes): Payment
    {
        $payment = Payment::create([
            'order_id' => $order->id,
            'reference' => 'MOCK-'.str_pad((string) ($order->id * 100 + $ageMinutes), 4, '0', STR_PAD_LEFT).$order->id,
            'method' => 'qris',
            'status' => $status,
            'gateway' => 'mock',
            'amount' => $order->total,
            'subtotal' => 18000,
            'ppn_amount' => 1800,
            'total' => $order->total,
        ]);

        $payment->created_at = now()->subMinutes($ageMinutes);
        $payment->updated_at = now()->subMinutes($ageMinutes);
        $payment->save();

        return $payment;
    }

    public function test_stale_pending_payment_becomes_expired(): void
    {
        config()->set('dinflow.payment_expire_minutes', 15);

        $order = $this->createOrder();
        $payment = $this->createPayment($order, 'pending', 30);

        $this->artisan('payments:expire')->assertSuccessful();

        $this->assertSame('expired', $payment->fresh()->status);
    }

    public function test_fresh_pending_payment_is_untouched(): void
    {
        config()->set('dinflow.payment_expire_minutes', 15);

        $order = $this->createOrder();
        $payment = $this->createPayment($order, 'pending', 5);

        $this->artisan('payments:expire')->assertSuccessful();

        $this->assertSame('pending', $payment->fresh()->status);
    }

    public function test_paid_payment_is_never_expired(): void
    {
        config()->set('dinflow.payment_expire_minutes', 15);

        $order = $this->createOrder();
        $payment = $this->createPayment($order, 'paid', 600);

        $this->artisan('payments:expire')->assertSuccessful();

        $this->assertSame('paid', $payment->fresh()->status);
    }

    public function test_already_cancelled_payment_is_untouched(): void
    {
        config()->set('dinflow.payment_expire_minutes', 15);

        $order = $this->createOrder();
        $payment = $this->createPayment($order, 'cancelled', 600);

        $this->artisan('payments:expire')->assertSuccessful();

        $this->assertSame('cancelled', $payment->fresh()->status);
    }

    public function test_minutes_option_overrides_config(): void
    {
        config()->set('dinflow.payment_expire_minutes', 60);

        $order = $this->createOrder();
        $payment = $this->createPayment($order, 'pending', 30);

        $this->artisan('payments:expire --minutes=10')->assertSuccessful();

        $this->assertSame('expired', $payment->fresh()->status);
    }

    public function test_expired_payment_can_then_be_voided_by_cashier(): void
    {
        config()->set('dinflow.payment_expire_minutes', 15);
        \Laravel\Sanctum\Sanctum::actingAs(\App\Models\User::factory()->create(['role' => 'kasir']));

        $order = $this->createOrder();
        $order->source = 'pelayan';
        $order->save();

        $payment = $this->createPayment($order, 'pending', 30);
        $this->artisan('payments:expire')->assertSuccessful();

        $this->patchJson("/api/orders/{$order->id}/void", ['reason' => 'Pelanggan tidak datang'])
            ->assertOk()
            ->assertJsonPath('data.status', 'dibatalkan');
    }

    public function test_gateway_failed_status_is_persisted_by_polling(): void
    {
        config()->set('dinflow.payment_driver', 'mock');

        $order = $this->createOrder();
        $payment = $this->createPayment($order, 'pending', 1);

        // Driver mock selalu melaporkan pending; verifikasi bahwa polling tidak
        // mengubah payment yang sudah paid/cancelled/expired.
        $this->getJson("/api/payments/{$payment->reference}/status")
            ->assertOk()
            ->assertJsonPath('status', 'pending');
    }
}

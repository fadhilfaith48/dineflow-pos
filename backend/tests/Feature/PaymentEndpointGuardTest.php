<?php

namespace Tests\Feature;

use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Table;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Penjaga endpoint pembayaran.
 *
 * Semua endpoint ini berada di grup PUBLIK (karena halaman Menu Pesan Mandiri
 * tidak punya login), jadi proteksinya harus benar-benar ditegakkan:
 *  - kasir tidak boleh 'method=qris' (kasir tidak punya uang elektronik; kode
 *    lama membuat payment 'paid' seketika tanpa uang masuk)
 *  - mock-paid / simulate-payment harus mati kecuali ALLOW_MOCK_PAYMENT=true
 *  - checkout publik hanya boleh untuk order source self-order
 */
class PaymentEndpointGuardTest extends TestCase
{
    use RefreshDatabase;

    private function makeMenu(): MenuItem
    {
        $category = MenuCategory::firstOrCreate(['name' => 'Makanan'], ['order' => 1]);

        return MenuItem::firstOrCreate(
            ['code' => '#M01'],
            ['name' => 'Nasi Goreng', 'price' => 18000, 'category_id' => $category->id, 'available' => true],
        );
    }

    private function createOrder(string $source = 'self-order', ?Table $table = null): Order
    {
        $menu = $this->makeMenu();

        $order = Order::create([
            'order_number' => 'ORD-'.str_pad((string) (Order::count() + 1), 4, '0', STR_PAD_LEFT),
            'table_id' => $table?->id,
            'source' => $source,
            'status' => 'menunggu',
            'total' => 19800,
        ]);

        $order->items()->create([
            'menu_item_id' => $menu->id,
            'name' => 'Nasi Goreng',
            'price' => 18000,
            'quantity' => 1,
            'status' => 'baru',
        ]);

        return $order;
    }

    private function createPendingPayment(Order $order, string $reference = 'MOCK-GUARD001'): Payment
    {
        return Payment::create([
            'order_id' => $order->id,
            'reference' => $reference,
            'method' => 'qris',
            'status' => 'pending',
            'gateway' => 'mock',
            'amount' => $order->total,
            'subtotal' => 18000,
            'ppn_amount' => 1800,
            'total' => $order->total,
        ]);
    }

    public function test_cashier_cannot_mark_qris_paid_without_gateway(): void
    {
        config()->set('dinflow.payment_driver', 'mock');
        Sanctum::actingAs(User::factory()->create(['role' => 'kasir']));

        $order = $this->createOrder('kasir');

        $this->postJson("/api/orders/{$order->id}/payments", ['method' => 'qris'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('method');

        $this->assertNull(Payment::where('order_id', $order->id)->first());
    }

    public function test_cashier_cash_still_works(): void
    {
        config()->set('dinflow.payment_driver', 'mock');
        Sanctum::actingAs(User::factory()->create(['role' => 'kasir']));

        $order = $this->createOrder('kasir');

        $this->postJson("/api/orders/{$order->id}/payments", [
            'method' => 'tunai',
            'cashReceived' => 20000,
        ])->assertCreated();

        $this->assertSame('paid', Payment::where('order_id', $order->id)->value('status'));
    }

    public function test_mock_paid_is_404_when_flag_disabled(): void
    {
        config()->set('dinflow.payment_driver', 'mock');
        config()->set('dinflow.allow_mock_payment', false);

        $order = $this->createOrder();
        $this->createPendingPayment($order);

        $this->postJson('/api/payments/MOCK-GUARD001/mock-paid')->assertNotFound();

        $this->assertSame('pending', Payment::where('reference', 'MOCK-GUARD001')->value('status'));
    }

    public function test_mock_paid_works_when_flag_explicitly_enabled(): void
    {
        config()->set('dinflow.payment_driver', 'mock');
        config()->set('dinflow.allow_mock_payment', true);

        $order = $this->createOrder();
        $this->createPendingPayment($order);

        $this->postJson('/api/payments/MOCK-GUARD001/mock-paid')->assertOk();

        $this->assertSame('paid', Payment::where('reference', 'MOCK-GUARD001')->value('status'));
    }

    public function test_mock_paid_is_403_when_another_driver_active(): void
    {
        config()->set('dinflow.payment_driver', 'doku');
        config()->set('dinflow.allow_mock_payment', true);

        $this->postJson('/api/payments/MOCK-GUARD001/mock-paid')->assertForbidden();
    }

    public function test_simulate_is_404_when_flag_disabled(): void
    {
        config()->set('dinflow.payment_driver', 'xendit');
        config()->set('dinflow.allow_mock_payment', false);

        $this->postJson('/api/payments/MOCK-GUARD001/simulate-payment')->assertNotFound();
    }

    public function test_public_checkout_cannot_lock_a_cashier_order(): void
    {
        config()->set('dinflow.payment_driver', 'mock');
        config()->set('dinflow.allow_mock_payment', true);

        $order = $this->createOrder('kasir');

        $this->postJson("/api/orders/{$order->id}/checkout")->assertForbidden();

        $this->assertNull(Payment::where('order_id', $order->id)->first());
    }

    public function test_public_checkout_still_works_for_self_order(): void
    {
        config()->set('dinflow.payment_driver', 'mock');
        config()->set('dinflow.allow_mock_payment', true);

        $order = $this->createOrder('self-order');

        $this->postJson("/api/orders/{$order->id}/checkout")->assertOk();

        $this->assertSame('pending', Payment::where('order_id', $order->id)->value('status'));
    }

    public function test_logged_in_cashier_may_checkout_cashier_order(): void
    {
        config()->set('dinflow.payment_driver', 'mock');
        config()->set('dinflow.allow_mock_payment', true);

        Sanctum::actingAs(User::factory()->create(['role' => 'kasir']));

        $order = $this->createOrder('kasir');

        $this->postJson("/api/orders/{$order->id}/checkout")->assertOk();
    }

    public function test_kitchen_role_cannot_lock_a_cashier_order_via_checkout(): void
    {
        config()->set('dinflow.payment_driver', 'mock');
        config()->set('dinflow.allow_mock_payment', true);

        Sanctum::actingAs(User::factory()->create(['role' => 'dapur']));

        $order = $this->createOrder('kasir');

        // Dapur tidak memegang uang dan tidak memicu QRIS. Kalau tidak
        // ditolak, order kasir terkunci oleh payment pending sehingga kasir
        // mendapat 409 "sudah dibayar" padahal belum ada uang masuk.
        $this->postJson("/api/orders/{$order->id}/checkout")->assertForbidden();

        $this->assertNull(Payment::where('order_id', $order->id)->first());
    }

    public function test_kitchen_role_may_not_checkout_self_order_either(): void
    {
        config()->set('dinflow.payment_driver', 'mock');
        config()->set('dinflow.allow_mock_payment', true);

        Sanctum::actingAs(User::factory()->create(['role' => 'dapur']));

        $order = $this->createOrder('self-order');

        $this->postJson("/api/orders/{$order->id}/checkout")->assertForbidden();

        $this->assertNull(Payment::where('order_id', $order->id)->first());
    }

    public function test_waiter_role_may_still_checkout(): void
    {
        config()->set('dinflow.payment_driver', 'mock');
        config()->set('dinflow.allow_mock_payment', true);

        Sanctum::actingAs(User::factory()->create(['role' => 'pelayan']));

        $order = $this->createOrder('pelayan');

        $this->postJson("/api/orders/{$order->id}/checkout")->assertOk();
    }

    public function test_xendit_callback_rejects_missing_token(): void
    {
        config()->set('dinflow.xendit.callback_token', 'rahasia-token');

        $this->postJson('/api/xendit/callback', ['status' => 'PAID', 'reference_id' => 'qr_1'])
            ->assertUnauthorized();
    }

    public function test_xendit_callback_marks_payment_paid_with_valid_token(): void
    {
        config()->set('dinflow.payment_driver', 'mock');
        config()->set('dinflow.allow_mock_payment', true);
        config()->set('dinflow.xendit.callback_token', 'rahasia-token');

        $order = $this->createOrder();
        $this->createPendingPayment($order, 'qr_webhook_1');

        $this->postJson('/api/xendit/callback', [
            'status' => 'PAID',
            'reference_id' => 'qr_webhook_1',
        ], ['x-callback-token' => 'rahasia-token'])->assertOk();

        $this->assertSame('paid', Payment::where('reference', 'qr_webhook_1')->value('status'));
        $this->assertSame('diproses', $order->fresh()->status);
    }

    public function test_xendit_callback_persists_expired_status(): void
    {
        config()->set('dinflow.payment_driver', 'mock');
        config()->set('dinflow.xendit.callback_token', 'rahasia-token');

        $order = $this->createOrder();
        $this->createPendingPayment($order, 'qr_webhook_2');

        $this->postJson('/api/xendit/callback', [
            'status' => 'EXPIRED',
            'reference_id' => 'qr_webhook_2',
        ], ['x-callback-token' => 'rahasia-token'])->assertOk();

        $this->assertSame('expired', Payment::where('reference', 'qr_webhook_2')->value('status'));
    }
}

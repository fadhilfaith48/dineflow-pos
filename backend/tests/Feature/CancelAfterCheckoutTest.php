<?php

namespace Tests\Feature;

use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Table;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Regresi untuk bug kehilangan uang: pelanggan membuat QRIS, lalu membatalkan
 * pesanan, lalu tetap membayar di m-banking.
 *
 * Sebelum perbaikan:
 *  1. cancel() tidak memeriksa payment sama sekali -> order jadi 'dibatalkan'
 *     sementara payment masih 'pending' beserta QR-nya masih berlaku.
 *  2. confirmPaid() tidak memeriksa status order -> payment jadi 'paid',
 *     moveToKitchen() tetap mengubah meja jadi 'terisi'.
 * Hasilnya: uang masuk kas, tidak ada pesanan yang dimasak.
 */
class CancelAfterCheckoutTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('dinflow.payment_driver', 'mock');
        config()->set('dinflow.allow_mock_payment', true);
    }

    private function makeMenu(): MenuItem
    {
        $category = MenuCategory::firstOrCreate(['name' => 'Makanan'], ['order' => 1]);

        return MenuItem::firstOrCreate(
            ['code' => '#M01'],
            ['name' => 'Nasi Goreng', 'price' => 18000, 'category_id' => $category->id, 'available' => true],
        );
    }

    private function createOrder(?Table $table = null, string $status = 'menunggu'): Order
    {
        $menu = $this->makeMenu();

        $order = Order::create([
            'order_number' => 'ORD-'.str_pad((string) (Order::count() + 1), 4, '0', STR_PAD_LEFT),
            'table_id' => $table?->id,
            'source' => 'self-order',
            'status' => $status,
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

    public function test_cancel_after_qris_marks_payment_cancelled_and_keeps_table_free(): void
    {
        $table = Table::create(['number' => 'T1', 'seats' => 2, 'status' => 'kosong', 'qr_code' => 'abc12345']);
        $order = $this->createOrder($table);

        $reference = $this->postJson("/api/orders/{$order->id}/checkout")
            ->assertOk()
            ->json('reference');

        $this->assertSame('pending', Payment::where('reference', $reference)->value('status'));

        $this->postJson("/api/orders/{$order->id}/cancel")
            ->assertOk()
            ->assertJsonPath('data.status', 'dibatalkan');

        $this->assertSame('cancelled', Payment::where('reference', $reference)->value('status'));
        $this->assertSame('kosong', $table->fresh()->status);
    }

    public function test_mock_paid_after_cancel_does_not_mark_payment_paid_or_occupy_table(): void
    {
        $table = Table::create(['number' => 'T1', 'seats' => 2, 'status' => 'kosong', 'qr_code' => 'abc12345']);
        $order = $this->createOrder($table);

        $reference = $this->postJson("/api/orders/{$order->id}/checkout")->assertOk()->json('reference');

        $this->postJson("/api/orders/{$order->id}/cancel")->assertOk();

        // Pelanggan terlanjur scan / menekan tombol demo setelah membatalkan.
        $this->postJson("/api/payments/{$reference}/mock-paid")->assertOk();

        $payment = Payment::where('reference', $reference)->first();
        $this->assertNotSame('paid', $payment->status, 'Payment order yang sudah dibatalkan tidak boleh jadi paid.');
        $this->assertNull($payment->paid_at);

        $this->assertSame('dibatalkan', $order->fresh()->status, 'Order tidak boleh kembali jadi diproses.');
        $this->assertSame('kosong', $table->fresh()->status, 'Meja tidak boleh terisi untuk order yang dibatalkan.');
    }

    public function test_polling_status_after_cancel_reports_cancelled(): void
    {
        $order = $this->createOrder();

        $reference = $this->postJson("/api/orders/{$order->id}/checkout")->assertOk()->json('reference');

        $this->postJson("/api/orders/{$order->id}/cancel")->assertOk();

        $this->getJson("/api/payments/{$reference}/status")
            ->assertOk()
            ->assertJsonPath('status', 'cancelled');
    }

    public function test_cancel_is_rejected_when_payment_already_paid(): void
    {
        $user = \App\Models\User::factory()->create(['role' => 'kasir']);
        \Laravel\Sanctum\Sanctum::actingAs($user);

        $order = $this->createOrder();
        $order->source = 'self-order';

        Payment::create([
            'order_id' => $order->id,
            'reference' => 'MOCK-PAID001',
            'method' => 'tunai',
            'status' => 'paid',
            'gateway' => 'mock',
            'amount' => $order->total,
            'subtotal' => 18000,
            'ppn_amount' => 1800,
            'total' => $order->total,
            'paid_at' => now(),
        ]);

        $this->postJson("/api/orders/{$order->id}/cancel")
            ->assertStatus(422)
            ->assertJsonValidationErrors('order');
    }
}

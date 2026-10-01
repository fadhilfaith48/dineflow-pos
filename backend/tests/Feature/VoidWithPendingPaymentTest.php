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
 * Regresi untuk order nyangkut selamanya.
 *
 * Sebelum perbaikan: void() menolak order selama payment apa pun ada, termasuk
 * yang masih 'pending'. Akibatnya order QRIS yang pelanggan tidak pernah bayar:
 *   - tidak bisa dibayar lagi  (checkout -> 409 "sudah dibayar")
 *   - tidak bisa dibatalkan    (void     -> 422 "sudah dibayar")
 *   - tidak bisa diselesaikan  (complete -> butuh status diproses)
 * Tidak ada satukan jalan keluar untuk kasir.
 */
class VoidWithPendingPaymentTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('dinflow.payment_driver', 'mock');
        config()->set('dinflow.allow_mock_payment', true);

        Sanctum::actingAs(User::factory()->create(['role' => 'kasir']));
    }

    private function makeMenu(): MenuItem
    {
        $category = MenuCategory::firstOrCreate(['name' => 'Makanan'], ['order' => 1]);

        return MenuItem::firstOrCreate(
            ['code' => '#M01'],
            ['name' => 'Nasi Goreng', 'price' => 18000, 'category_id' => $category->id, 'available' => true],
        );
    }

    private function createOrder(?Table $table = null): Order
    {
        $menu = $this->makeMenu();

        $order = Order::create([
            'order_number' => 'ORD-'.str_pad((string) (Order::count() + 1), 4, '0', STR_PAD_LEFT),
            'table_id' => $table?->id,
            'source' => 'pelayan',
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

    public function test_void_succeeds_when_payment_still_pending_and_cancels_it(): void
    {
        $order = $this->createOrder();

        $reference = $this->postJson("/api/orders/{$order->id}/checkout")->assertOk()->json('reference');

        $this->patchJson("/api/orders/{$order->id}/void", ['reason' => 'Pelanggan pergi'])
            ->assertOk()
            ->assertJsonPath('data.status', 'dibatalkan');

        $this->assertSame('cancelled', Payment::where('reference', $reference)->value('status'));
    }

    public function test_void_succeeds_when_payment_was_expired(): void
    {
        $order = $this->createOrder();

        Payment::create([
            'order_id' => $order->id,
            'reference' => 'MOCK-EXPIRED01',
            'method' => 'qris',
            'status' => 'expired',
            'gateway' => 'mock',
            'amount' => $order->total,
            'subtotal' => 18000,
            'ppn_amount' => 1800,
            'total' => $order->total,
        ]);

        $this->patchJson("/api/orders/{$order->id}/void", ['reason' => 'QR kedaluwarsa'])
            ->assertOk()
            ->assertJsonPath('data.status', 'dibatalkan');
    }

    public function test_void_still_rejected_when_payment_already_paid(): void
    {
        $order = $this->createOrder();

        Payment::create([
            'order_id' => $order->id,
            'reference' => 'MOCK-PAID0001',
            'method' => 'tunai',
            'status' => 'paid',
            'gateway' => 'mock',
            'amount' => $order->total,
            'subtotal' => 18000,
            'ppn_amount' => 1800,
            'total' => $order->total,
            'paid_at' => now(),
        ]);

        $this->patchJson("/api/orders/{$order->id}/void", ['reason' => 'Salah input'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('order');
    }

    public function test_void_releases_table_when_no_other_active_order(): void
    {
        $table = Table::create(['number' => 'T1', 'seats' => 2, 'status' => 'terisi', 'qr_code' => 'abc12345']);
        $order = $this->createOrder($table);

        $this->postJson("/api/orders/{$order->id}/checkout")->assertOk();

        $this->patchJson("/api/orders/{$order->id}/void", ['reason' => 'Dibatalkan kasir'])->assertOk();

        $this->assertSame('kosong', $table->fresh()->status);
    }

    public function test_void_keeps_table_occupied_when_another_order_still_active(): void
    {
        $table = Table::create(['number' => 'T1', 'seats' => 2, 'status' => 'terisi', 'qr_code' => 'abc12345']);
        $orderA = $this->createOrder($table);
        $orderB = $this->createOrder($table);
        $orderB->status = 'diproses';
        $orderB->save();

        $this->patchJson("/api/orders/{$orderA->id}/void", ['reason' => 'Salah input'])->assertOk();

        $this->assertSame('terisi', $table->fresh()->status, 'Meja masih dipakai pesanan lain yang aktif.');
    }

    public function test_waiter_role_can_void_own_unpaid_order(): void
    {
        $order = $this->createOrder();
        $order->source = 'pelayan';
        $order->save();

        Sanctum::actingAs(User::factory()->create(['role' => 'pelayan']));

        // Pelayan punya tombol "Batalkan Pesanan" di tabletnya (PelayanPage).
        // Void di sini hanya berlaku untuk pesanan yang BELUM dibayar, jadi
        // pelayan bisa mengoreksi pesanannya sendiri tanpa menunggu kasir.
        $this->patchJson("/api/orders/{$order->id}/void", ['reason' => 'Pesanan salah'])->assertOk();

        $this->assertSame('dibatalkan', $order->fresh()->status);
    }

    public function test_kitchen_role_can_still_void(): void
    {
        $order = $this->createOrder();

        Sanctum::actingAs(User::factory()->create(['role' => 'dapur']));

        $this->patchJson("/api/orders/{$order->id}/void", ['reason' => 'Bahan habis'])->assertOk();

        $this->assertSame('dibatalkan', $order->fresh()->status);
    }
}

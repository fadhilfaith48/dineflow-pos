<?php

namespace Tests\Feature;

use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\Payment;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Regresi untuk P1#4: race checkout QRIS. Dua permintaan checkout untuk
 * order yang sama (mis. kasir & pelanggan menekan tombol bersamaan) tidak
 * boleh menghasilkan dua baris payment — enamonya punya unique order_id.
 */
class CheckoutRaceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('dinflow.payment_driver', 'mock');
    }

    private function makeMenu(): MenuItem
    {
        $category = MenuCategory::firstOrCreate(['name' => 'Makanan', 'order' => 1]);

        return MenuItem::firstOrCreate(
            ['code' => '#M01'],
            ['name' => 'Nasi Goreng', 'price' => 18000, 'category_id' => $category->id, 'available' => true],
        );
    }

    private function createOrder(): Order
    {
        $menu = $this->makeMenu();
        $order = Order::create([
            'order_number' => 'ORD-'.str_pad((string) (Order::count() + 1), 4, '0', STR_PAD_LEFT),
            'table_id' => null,
            'source' => 'self-order',
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

    public function test_double_checkout_same_order_creates_only_one_payment(): void
    {
        $order = $this->createOrder();

        $first = $this->postJson("/api/orders/{$order->id}/checkout")->assertOk();
        $second = $this->postJson("/api/orders/{$order->id}/checkout")->assertStatus(409);

        $this->assertNotNull($first->json('reference'));
        $this->assertDatabaseCount('payments', 1);
        $this->assertDatabaseHas('payments', [
            'order_id' => $order->id,
            'reference' => $first->json('reference'),
            'status' => 'pending',
        ]);
    }

    public function test_unique_orders_index_blocks_second_payment_row(): void
    {
        $order = $this->createOrder();
        $this->postJson("/api/orders/{$order->id}/checkout")->assertOk();

        try {
            Payment::create([
                'order_id' => $order->id,
                'reference' => 'MOCK-XXX2',
                'method' => 'qris',
                'status' => 'pending',
                'amount' => $order->total,
            ]);
            $this->fail('Inseran payment kedua untuk order yang sama harus ditolak.');
        } catch (QueryException $e) {
            $this->assertTrue(str_starts_with((string) ($e->errorInfo[0] ?? ''), '23'));
        }

        $this->assertDatabaseCount('payments', 1);
    }

    public function test_checkout_different_orders_both_succeed(): void
    {
        $orderA = $this->createOrder();
        $orderB = $this->createOrder();

        $this->postJson("/api/orders/{$orderA->id}/checkout")->assertOk();
        $this->postJson("/api/orders/{$orderB->id}/checkout")->assertOk();

        $this->assertDatabaseCount('payments', 2);
    }

    public function test_checkout_rejected_when_order_already_paid_by_cashier(): void
    {
        $user = \App\Models\User::factory()->create(['role' => 'kasir']);
        \Laravel\Sanctum\Sanctum::actingAs($user);

        $order = $this->createOrder();
        $this->postJson("/api/orders/{$order->id}/payments", [
            'method' => 'tunai',
            'cashReceived' => 20000,
        ])->assertStatus(201);

        $this->postJson("/api/orders/{$order->id}/checkout")->assertStatus(409);
        $this->assertDatabaseCount('payments', 1);
    }
}
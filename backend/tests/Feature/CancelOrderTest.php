<?php

namespace Tests\Feature;

use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\Table;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CancelOrderTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('dinflow.payment_driver', 'mock');
        config()->set('dinflow.self_order_cancel_minutes', 10);
    }

    private function makeSelfOrder(string $status = 'menunggu', ?Table $table = null): Order
    {
        $category = MenuCategory::create(['name' => 'Makanan', 'order' => 1]);
        $menu = MenuItem::create([
            'code' => '#M01',
            'name' => 'Nasi Goreng',
            'price' => 18000,
            'category_id' => $category->id,
            'available' => true,
        ]);

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

    public function test_self_order_can_be_cancelled_publicly_within_window(): void
    {
        $table = Table::create(['number' => 'T1', 'seats' => 2, 'status' => 'kosong', 'qr_code' => 'T1']);
        $order = $this->makeSelfOrder('menunggu', $table);

        $this->postJson("/api/orders/{$order->id}/void")
            ->assertOk()
            ->assertJsonPath('data.status', 'dibatalkan')
            ->assertJsonPath('data.voidReason', 'Dibatalkan pelanggan sebelum bayar');

        $this->assertEquals('dibatalkan', $order->fresh()->status);
        $this->assertNull($order->fresh()->voided_by);
        $this->assertEquals('kosong', $table->fresh()->status);
    }

    public function test_cancel_after_window_is_rejected(): void
    {
        $order = $this->makeSelfOrder('menunggu');
        $order->created_at = now()->subMinutes(11);
        $order->save();

        $this->postJson("/api/orders/{$order->id}/void")
            ->assertStatus(422)
            ->assertJsonValidationErrors('order');

        $this->assertEquals('menunggu', $order->fresh()->status);
    }

    public function test_cancel_rejected_for_non_self_order_source(): void
    {
        $order = Order::create([
            'order_number' => 'ORD-1001',
            'table_id' => null,
            'source' => 'kasir',
            'status' => 'menunggu',
            'total' => 19800,
        ]);

        $this->postJson("/api/orders/{$order->id}/void")
            ->assertStatus(422)
            ->assertJsonValidationErrors('order');

        $this->assertEquals('menunggu', $order->fresh()->status);
    }

    public function test_cancel_rejected_when_order_not_waiting_payment(): void
    {
        $order = $this->makeSelfOrder('diproses');

        $this->postJson("/api/orders/{$order->id}/void")
            ->assertStatus(422)
            ->assertJsonValidationErrors('order');

        $this->assertEquals('diproses', $order->fresh()->status);
    }

    public function test_payment_rejected_after_order_cancelled(): void
    {
        $order = $this->makeSelfOrder('menunggu');

        $this->postJson("/api/orders/{$order->id}/void")->assertOk();

        $user = User::factory()->create(['role' => 'kasir']);
        Sanctum::actingAs($user);

        $this->postJson("/api/orders/{$order->id}/payments", ['method' => 'tunai', 'cashReceived' => 20000])
            ->assertStatus(422);
    }
}
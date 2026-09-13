<?php

namespace Tests\Feature;

use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\Table;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

class SelfOrderLimitTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('dinflow.payment_driver', 'mock');
        config()->set('dinflow.self_order_cancel_minutes', 10);
        config()->set('dinflow.self_order_cancel_per_table', 3);
        config()->set('dinflow.self_order_cancel_per_table_minutes', 10);
        config()->set('dinflow.self_order_create_per_device_per_hour', 5);
        config()->set('dinflow.self_order_create_per_ip_per_hour', 20);

        RateLimiter::clear('self-order-cancel:table:1');
        RateLimiter::clear('self-order-cancel:table:2');
        RateLimiter::clear('self-order-cancel:ip:127.0.0.1');
        RateLimiter::clear('self-order-create:device-a');
        RateLimiter::clear('self-order-create:device-b');
        RateLimiter::clear('self-order-create-ip:127.0.0.1');

        Table::create(['id' => 1, 'number' => 'M0', 'seats' => 2, 'status' => 'kosong', 'qr_code' => 'M0']);
    }

    private ?MenuItem $menuItem = null;

    private function menu(): MenuItem
    {
        if ($this->menuItem === null) {
            $category = MenuCategory::create(['name' => 'Makanan', 'order' => 1]);
            $this->menuItem = MenuItem::create([
                'code' => '#M01',
                'name' => 'Nasi Goreng',
                'price' => 18000,
                'category_id' => $category->id,
                'available' => true,
            ]);
        }

        return $this->menuItem;
    }

    private function makeSelfOrder(string $status = 'menunggu', ?Table $table = null): Order
    {
        $menu = $this->menu();

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

    private function createPayload(MenuItem $menu): array
    {
        return [
            'tableId' => 1,
            'source' => 'self-order',
            'items' => [['menuItemId' => $menu->id, 'quantity' => 1]],
        ];
    }

    public function test_cancel_limited_to_3_per_10_minutes_per_table(): void
    {
        $table = Table::create(['number' => 'T1', 'seats' => 2, 'status' => 'kosong', 'qr_code' => 'T1']);

        for ($i = 0; $i < 3; $i++) {
            $order = $this->makeSelfOrder('menunggu', $table);
            $this->postJson("/api/orders/{$order->id}/void")->assertOk();
        }

        $blocked = $this->makeSelfOrder('menunggu', $table);
        $this->postJson("/api/orders/{$blocked->id}/void")->assertStatus(429);
        $this->assertEquals('menunggu', $blocked->fresh()->status);
    }

    public function test_cancel_limit_does_not_affect_other_table(): void
    {
        $t1 = Table::create(['number' => 'T1', 'seats' => 2, 'status' => 'kosong', 'qr_code' => 'T1']);
        $t2 = Table::create(['number' => 'T2', 'seats' => 2, 'status' => 'kosong', 'qr_code' => 'T2']);

        for ($i = 0; $i < 3; $i++) {
            $order = $this->makeSelfOrder('menunggu', $t1);
            $this->postJson("/api/orders/{$order->id}/void")->assertOk();
        }

        $other = $this->makeSelfOrder('menunggu', $t2);
        $this->postJson("/api/orders/{$other->id}/void")
            ->assertOk()
            ->assertJsonPath('data.status', 'dibatalkan');
    }

    public function test_create_limited_to_5_per_hour_per_device(): void
    {
        $menu = $this->menu();

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/orders', $this->createPayload($menu), ['X-Device-Id' => 'device-a'])->assertStatus(201);
        }

        $this->postJson('/api/orders', $this->createPayload($menu), ['X-Device-Id' => 'device-a'])
            ->assertStatus(429);
    }

    public function test_create_limit_does_not_affect_other_device(): void
    {
        $menu = $this->menu();

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/orders', $this->createPayload($menu), ['X-Device-Id' => 'device-a'])->assertStatus(201);
        }

        $this->postJson('/api/orders', $this->createPayload($menu), ['X-Device-Id' => 'device-b'])
            ->assertStatus(201)
            ->assertJsonPath('data.source', 'self-order');
    }

    public function test_create_ip_backstop_without_device_header(): void
    {
        config()->set('dinflow.self_order_create_per_ip_per_hour', 4);
        RateLimiter::clear('self-order-create-ip:127.0.0.1');

        $menu = $this->menu();

        for ($i = 0; $i < 4; $i++) {
            $this->postJson('/api/orders', $this->createPayload($menu))->assertStatus(201);
        }

        $this->postJson('/api/orders', $this->createPayload($menu))->assertStatus(429);
    }
}
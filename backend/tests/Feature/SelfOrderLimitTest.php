<?php

namespace Tests\Feature;

use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\Table;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

/**
 * Pembatasan anti-mainan hanya untuk MEMBUAT order (self-order publik).
 * Pembatalan (batal) tidak dibatasi — tiap tekan batal selalu berhasil.
 */
class SelfOrderLimitTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('dinflow.payment_driver', 'mock');
        config()->set('dinflow.self_order_create_per_device_per_hour', 5);
        config()->set('dinflow.self_order_create_per_ip_per_hour', 20);

        RateLimiter::clear('self-order-create:device-a');
        RateLimiter::clear('self-order-create:device-b');
        RateLimiter::clear('self-order-create-ip:127.0.0.1');

        Table::create(['id' => 1, 'number' => 'T1', 'seats' => 2, 'status' => 'kosong', 'qr_code' => 'T1']);
    }

    private function menu(): MenuItem
    {
        $category = MenuCategory::create(['name' => 'Makanan', 'order' => 1]);

        return MenuItem::create([
            'code' => '#M01',
            'name' => 'Nasi Goreng',
            'price' => 18000,
            'category_id' => $category->id,
            'available' => true,
        ]);
    }

    private function createPayload(MenuItem $menu): array
    {
        return [
            'tableId' => 1,
            'source' => 'self-order',
            'items' => [['menuItemId' => $menu->id, 'quantity' => 1]],
        ];
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
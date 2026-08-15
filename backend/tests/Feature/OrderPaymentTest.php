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

class OrderPaymentTest extends TestCase
{
    use RefreshDatabase;

    public function test_order_cannot_be_paid_twice(): void
    {
        $user = User::factory()->create(['role' => 'kasir']);
        Sanctum::actingAs($user);

        $category = MenuCategory::create(['name' => 'Makanan', 'order' => 1]);
        $menu = MenuItem::create([
            'code' => '#M01',
            'name' => 'Nasi Goreng',
            'price' => 18000,
            'category_id' => $category->id,
            'available' => true,
        ]);
        $table = Table::create([
            'number' => 'T1',
            'seats' => 2,
            'status' => 'kosong',
            'qr_code' => 'T1',
        ]);

        $order = Order::create([
            'order_number' => 'ORD-0001',
            'table_id' => $table->id,
            'source' => 'kasir',
            'status' => 'baru',
            'total' => 19800,
        ]);
        $order->items()->create([
            'menu_item_id' => $menu->id,
            'name' => 'Nasi Goreng',
            'price' => 18000,
            'quantity' => 1,
            'status' => 'baru',
        ]);

        $payload = ['method' => 'tunai', 'cashReceived' => 20000];

        $this->postJson("/api/orders/{$order->id}/payments", $payload)->assertStatus(201);
        $this->postJson("/api/orders/{$order->id}/payments", $payload)->assertStatus(409);
    }
}
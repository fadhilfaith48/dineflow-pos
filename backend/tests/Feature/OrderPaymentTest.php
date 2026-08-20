<?php

namespace Tests\Feature;

use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\Table;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
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

    public function test_admin_can_reset_staff_password(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);

        $staff = User::factory()->create(['role' => 'kasir', 'password' => Hash::make('rahasia')]);

        $this->postJson("/api/users/{$staff->id}/reset-password")
            ->assertOk()
            ->assertJson(['message' => 'Password staf berhasil direset ke 1234']);

        $this->assertTrue(Hash::check('1234', $staff->fresh()->password));
    }

    public function test_non_admin_cannot_reset_staff_password(): void
    {
        $kasir = User::factory()->create(['role' => 'kasir']);
        Sanctum::actingAs($kasir);

        $staff = User::factory()->create(['role' => 'pelayan']);

        $this->postJson("/api/users/{$staff->id}/reset-password")->assertForbidden();
    }
}
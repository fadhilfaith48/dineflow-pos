<?php

namespace Tests\Feature;

use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\Payment;
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

        $payload = ['method' => 'tunai', 'cashReceived' => 20000];

        $this->postJson("/api/orders/{$order->id}/payments", $payload)->assertStatus(201);
        $this->postJson("/api/orders/{$order->id}/payments", $payload)->assertStatus(409);
    }

    public function test_orders_index_includes_payment_data(): void
    {
        $user = User::factory()->create(['role' => 'kasir']);
        Sanctum::actingAs($user);

        $order = Order::create([
            'order_number' => 'ORD-0001',
            'table_id' => null,
            'source' => 'kasir',
            'status' => 'selesai',
            'total' => 19800,
        ]);
        $paidAt = now();
        Payment::create([
            'order_id' => $order->id,
            'method' => 'tunai',
            'amount' => 19800,
            'cash_received' => 20000,
            'change' => 200,
            'paid_by' => $user->id,
            'paid_at' => $paidAt,
        ]);

        $response = $this->getJson('/api/orders')
            ->assertOk()
            ->assertJsonPath('data.0.status', 'selesai')
            ->assertJsonPath('data.0.payment.method', 'tunai')
            ->assertJsonPath('data.0.payment.amount', 19800)
            ->assertJsonPath('data.0.payment.cashReceived', 20000)
            ->assertJsonPath('data.0.payment.change', 200)
            ->assertJsonPath('data.0.payment.paidBy', $user->id);

        $this->assertNotNull($response->json('data.0.payment.paidAt'));
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

    public function test_admin_cannot_delete_self(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);

        $this->deleteJson("/api/users/{$admin->id}")
            ->assertStatus(422)
            ->assertJsonValidationErrors('user');

        $this->assertDatabaseHas('users', ['id' => $admin->id]);
    }

    public function test_admin_can_delete_other_user(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);

        $staff = User::factory()->create(['role' => 'kasir']);

        $this->deleteJson("/api/users/{$staff->id}")
            ->assertOk()
            ->assertJson(['message' => 'Staf dihapus']);

        $this->assertDatabaseMissing('users', ['id' => $staff->id]);
    }
}
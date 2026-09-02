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

class PrepayTest extends TestCase
{
    use RefreshDatabase;

    private function makeMenu(): MenuItem
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

    private function createOrder(string $status = 'menunggu'): Order
    {
        $menu = $this->makeMenu();
        $order = Order::create([
            'order_number' => 'ORD-'.str_pad((string) (Order::count() + 1), 4, '0', STR_PAD_LEFT),
            'table_id' => null,
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

    public function test_new_order_is_waiting_payment_and_not_in_kitchen(): void
    {
        $order = $this->createOrder();

        $this->assertEquals('menunggu', $order->status);
    }

    public function test_cashier_tunai_prepay_moves_order_to_kitchen(): void
    {
        $user = User::factory()->create(['role' => 'kasir']);
        Sanctum::actingAs($user);

        $table = Table::create(['number' => 'T1', 'seats' => 2, 'status' => 'kosong', 'qr_code' => 'T1']);
        $order = $this->createOrder();
        $order->table_id = $table->id;
        $order->save();

        $this->postJson("/api/orders/{$order->id}/payments", [
            'method' => 'tunai',
            'cashReceived' => 20000,
        ])->assertStatus(201)
            ->assertJsonPath('data.method', 'tunai')
            ->assertJsonPath('data.status', 'paid')
            ->assertJsonPath('data.total', 19800)
            ->assertJsonPath('data.change', 200);

        $order->refresh();
        $table->refresh();

        $this->assertEquals('diproses', $order->status);
        $this->assertEquals('terisi', $table->status);
        $this->assertDatabaseHas('payments', [
            'order_id' => $order->id,
            'method' => 'tunai',
            'status' => 'paid',
            'paid_via' => 'tunai',
            'cash_received' => 20000,
            'change' => 200,
        ]);
    }

    public function test_qris_checkout_creates_pending_payment_with_reference(): void
    {
        $order = $this->createOrder();

        $response = $this->postJson("/api/orders/{$order->id}/checkout")->assertOk();

        $reference = $response->json('reference');
        $this->assertNotNull($reference);
        $this->assertEquals('mock', $response->json('gateway'));
        $this->assertEquals('pending', $response->json('status'));

        $this->assertDatabaseHas('payments', [
            'order_id' => $order->id,
            'reference' => $reference,
            'method' => 'qris',
            'status' => 'pending',
            'gateway' => 'mock',
            'paid_via' => 'qris',
        ]);
    }

    public function test_qris_mock_paid_moves_order_to_kitchen_and_table(): void
    {
        $table = Table::create(['number' => 'T1', 'seats' => 2, 'status' => 'kosong', 'qr_code' => 'T1']);
        $order = $this->createOrder();
        $order->table_id = $table->id;
        $order->save();

        $reference = $this->postJson("/api/orders/{$order->id}/checkout")->json('reference');

        $this->postJson("/api/payments/{$reference}/mock-paid")->assertOk();

        $order->refresh();
        $table->refresh();
        $payment = Payment::where('reference', $reference)->first();

        $this->assertEquals('paid', $payment->status);
        $this->assertEquals('diproses', $order->status);
        $this->assertEquals('terisi', $table->status);
        $this->assertNotNull($payment->paid_at);
    }

    public function test_payment_status_reflects_mock_paid(): void
    {
        $order = $this->createOrder();
        $reference = $this->postJson("/api/orders/{$order->id}/checkout")->json('reference');

        $this->postJson("/api/payments/{$reference}/mock-paid")->assertOk();
        $this->getJson("/api/payments/{$reference}/status")
            ->assertOk()
            ->assertJsonPath('status', 'paid');
    }

    public function test_cannot_pay_order_already_paid(): void
    {
        $user = User::factory()->create(['role' => 'kasir']);
        Sanctum::actingAs($user);

        $order = $this->createOrder();
        $this->postJson("/api/orders/{$order->id}/payments", ['method' => 'tunai', 'cashReceived' => 20000])->assertStatus(201);

        $this->postJson("/api/orders/{$order->id}/payments", ['method' => 'tunai', 'cashReceived' => 20000])
            ->assertStatus(409);
    }

    public function test_public_tracking_endpoint_returns_order_without_auth(): void
    {
        $order = $this->createOrder('diproses');

        $this->getJson("/api/order-status/{$order->order_number}")
            ->assertOk()
            ->assertJsonPath('data.orderNumber', $order->order_number)
            ->assertJsonPath('data.status', 'diproses')
            ->assertJsonCount(1, 'data.items');

        $this->getJson('/api/order-status/ORD-9999')->assertNotFound();
    }

    public function test_complete_marks_order_selesai_and_releases_table(): void
    {
        $user = User::factory()->create(['role' => 'kasir']);
        Sanctum::actingAs($user);

        $table = Table::create(['number' => 'T1', 'seats' => 2, 'status' => 'terisi', 'qr_code' => 'T1']);
        $order = $this->createOrder('diproses');
        $order->table_id = $table->id;
        $order->save();

        $this->patchJson("/api/orders/{$order->id}/complete")->assertOk();

        $order->refresh();
        $table->refresh();

        $this->assertEquals('selesai', $order->status);
        $this->assertEquals('perlu-dibersihkan', $table->status);
    }
}

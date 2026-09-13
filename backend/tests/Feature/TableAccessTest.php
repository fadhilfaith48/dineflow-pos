<?php

namespace Tests\Feature;

use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\Table;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Proteksi meja self-order: URL /menu/{token} anti-tebak (token acak 8
 * karakter per meja) + pembatalan hanya dari perangkat pembuat.
 */
class TableAccessTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('dinflow.payment_driver', 'mock');
        config()->set('dinflow.self_order_cancel_minutes', 10);
    }

    private function makeTable(string $token = 'x7k2p9m4'): Table
    {
        return Table::create(['number' => 'T1', 'seats' => 2, 'status' => 'kosong', 'qr_code' => $token]);
    }

    private function makeSelfOrder(?string $deviceId = null): Order
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
            'table_id' => $this->makeTable()->id,
            'source' => 'self-order',
            'device_id' => $deviceId,
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

    public function test_public_tables_index_does_not_expose_qr_code(): void
    {
        $this->makeTable();

        $this->getJson('/api/tables')
            ->assertOk()
            ->assertJsonPath('data.0.qrCode', null)
            ->assertJsonPath('data.0.number', 'T1');
    }

    public function test_authenticated_tables_index_exposes_qr_code(): void
    {
        $this->makeTable('x7k2p9m4');
        $user = User::factory()->create(['role' => 'admin']);
        $token = $user->createToken('test')->plainTextToken;

        $this->withToken($token)
            ->getJson('/api/tables')
            ->assertOk()
            ->assertJsonPath('data.0.qrCode', 'x7k2p9m4');
    }

    public function test_resolve_table_by_qr_slug(): void
    {
        $this->makeTable('x7k2p9m4');

        $this->getJson('/api/tables/x7k2p9m4')
            ->assertOk()
            ->assertJsonPath('data.number', 'T1');
    }

    public function test_resolve_rejects_table_number_and_unknown_slug(): void
    {
        $this->makeTable('x7k2p9m4');

        $this->getJson('/api/tables/T1')->assertNotFound();
        $this->getJson('/api/tables/asaltebak')->assertNotFound();
        $this->getJson('/api/tables/1')->assertNotFound();
    }

    public function test_create_self_order_stores_device_id(): void
    {
        $table = $this->makeTable('x7k2p9m4');
        $category = MenuCategory::create(['name' => 'Makanan', 'order' => 1]);
        $menu = MenuItem::create([
            'code' => '#M01',
            'name' => 'Nasi Goreng',
            'price' => 18000,
            'category_id' => $category->id,
            'available' => true,
        ]);

        $this->postJson('/api/orders', [
            'tableId' => $table->id,
            'items' => [['menuItemId' => $menu->id, 'quantity' => 1]],
        ], ['X-Device-Id' => 'device-a'])
            ->assertCreated()
            ->assertJsonPath('data.source', 'self-order');

        $this->assertEquals('device-a', Order::latest('id')->first()->device_id);
    }

    public function test_cancel_self_order_with_different_device_is_rejected(): void
    {
        $order = $this->makeSelfOrder('device-a');

        $this->postJson("/api/orders/{$order->id}/void", headers: ['X-Device-Id' => 'device-b'])
            ->assertStatus(403);

        $this->assertEquals('menunggu', $order->fresh()->status);
    }

    public function test_cancel_self_order_with_same_device_allowed(): void
    {
        $order = $this->makeSelfOrder('device-a');

        $this->postJson("/api/orders/{$order->id}/void", headers: ['X-Device-Id' => 'device-a'])
            ->assertOk()
            ->assertJsonPath('data.status', 'dibatalkan');
    }
}
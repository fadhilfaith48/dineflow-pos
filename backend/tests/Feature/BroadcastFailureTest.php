<?php

namespace Tests\Feature;

use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\Table;
use App\Models\User;
use Illuminate\Broadcasting\BroadcastException;
use Illuminate\Contracts\Broadcasting\Broadcaster;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Broadcast;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Regresi untuk P1#2: transaksi DB harus tetap sukses meski broadcast
 * OrderStatusChanged gagal (mis. server Reverb mati). Sebelumnya event
 * didispatch tanpa try-catch sehingga BroadcastException menjadi 500
 * padahal data (order/payment) sudah tersimpan di database.
 */
class BroadcastFailureTest extends TestCase
{
    use RefreshDatabase;

    /** Broadcaster tiruan yang selalu gagal — mensimulasikan Reverb mati. */
    private function registerFailingBroadcaster(): void
    {
        config(['broadcasting.default' => 'boom']);

        Broadcast::extend('boom', fn (): Broadcaster => new class implements Broadcaster
        {
            public function auth(Request $request)
            {
                throw new BroadcastException('Reverb mati (simulasi)');
            }

            public function validAuthenticationResponse(Request $request, $result)
            {
                throw new BroadcastException('Reverb mati (simulasi)');
            }

            public function broadcast(array $channels, $event, array $payload = []): void
            {
                throw new BroadcastException('Reverb mati (simulasi)');
            }
        });
    }

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

    public function test_order_store_succeeds_even_when_broadcast_fails(): void
    {
        $this->registerFailingBroadcaster();

        $menu = $this->makeMenu();

        $this->postJson('/api/orders', [
            'items' => [
                ['menuItemId' => $menu->id, 'quantity' => 1],
            ],
        ])->assertCreated();

        $this->assertDatabaseCount('orders', 1);
        $this->assertEquals('menunggu', Order::first()->status);
    }

    public function test_cashier_tunai_payment_succeeds_even_when_broadcast_fails(): void
    {
        $this->registerFailingBroadcaster();

        $user = User::factory()->create(['role' => 'kasir']);
        Sanctum::actingAs($user);

        $menu = $this->makeMenu();
        $table = Table::create(['number' => 'T1', 'seats' => 2, 'status' => 'kosong', 'qr_code' => 'T1']);

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

        $this->postJson("/api/orders/{$order->id}/payments", [
            'method' => 'tunai',
            'cashReceived' => 20000,
        ])->assertStatus(201)
            ->assertJsonPath('data.status', 'paid');

        $order->refresh();

        $this->assertEquals('diproses', $order->status);
        $this->assertEquals('terisi', $table->fresh()->status);
    }
}
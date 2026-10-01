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

/**
 * Regresi status item:_END. Sebelumnya updateItemStatus() menerima status
 * bebas, sehingga:
 *  - PelayanPage menandai item berstatus 'baru' (belum dimasak) jadi 'diantar'.
 *  - Dapur bisa melompat 'baru' -> 'siap' tanpa pernah menandainya dimasak.
 *  - Order 'dibatalkan'/'selesai' masih bisa dihidupkan lewat panel dapur.
 */
class ItemStatusStateMachineTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Sanctum::actingAs(User::factory()->create(['role' => 'dapur']));
    }

    private function createOrder(string $status = 'diproses', string $source = 'pelayan', ?Table $table = null): Order
    {
        $category = MenuCategory::firstOrCreate(['name' => 'Makanan'], ['order' => 1]);
        $menu = MenuItem::firstOrCreate(
            ['code' => '#M01'],
            ['name' => 'Nasi Goreng', 'price' => 18000, 'category_id' => $category->id, 'available' => true],
        );

        $order = Order::create([
            'order_number' => 'ORD-'.str_pad((string) (Order::count() + 1), 4, '0', STR_PAD_LEFT),
            'table_id' => $table?->id,
            'source' => $source,
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

    private function itemId(Order $order): int
    {
        return $order->items()->firstOrFail()->id;
    }

    public function test_full_forward_sequence_is_allowed(): void
    {
        $order = $this->createOrder();
        $itemId = $this->itemId($order);

        foreach (['dimasak', 'siap'] as $status) {
            $this->patchJson("/api/orders/{$order->id}/items/{$itemId}", ['status' => $status])
                ->assertOk();
        }

        $this->assertSame('siap', $order->items()->firstOrFail()->status);
    }

    public function test_same_status_is_idempotent(): void
    {
        $order = $this->createOrder();
        $itemId = $this->itemId($order);

        $this->patchJson("/api/orders/{$order->id}/items/{$itemId}", ['status' => 'baru'])
            ->assertOk()
            ->assertJsonPath('data.items.0.status', 'baru');
    }

    public function test_skipping_stage_is_rejected(): void
    {
        $order = $this->createOrder();
        $itemId = $this->itemId($order);

        // 'baru' -> 'siap' melompati tahap 'dimasak'
        $this->patchJson("/api/orders/{$order->id}/items/{$itemId}", ['status' => 'siap'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('status');

        $this->assertSame('baru', $order->items()->firstOrFail()->status);
    }

    public function test_going_backwards_is_rejected(): void
    {
        $order = $this->createOrder();
        $itemId = $this->itemId($order);

        $this->patchJson("/api/orders/{$order->id}/items/{$itemId}", ['status' => 'dimasak'])->assertOk();
        $this->patchJson("/api/orders/{$order->id}/items/{$itemId}", ['status' => 'siap'])->assertOk();

        $this->patchJson("/api/orders/{$order->id}/items/{$itemId}", ['status' => 'dimasak'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('status');
    }

    public function test_delivering_uncooked_item_is_rejected(): void
    {
        // Kasus yang dulu terjadi setiap kali pelayan menekan "Tandai diantar".
        $order = $this->createOrder();
        $itemId = $this->itemId($order);

        $this->patchJson("/api/orders/{$order->id}/items/{$itemId}", ['status' => 'diantar'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('status');
    }

    public function test_cancelled_order_items_cannot_be_changed(): void
    {
        $order = $this->createOrder(status: 'dibatalkan');
        $itemId = $this->itemId($order);

        $this->patchJson("/api/orders/{$order->id}/items/{$itemId}", ['status' => 'dimasak'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('order');
    }

    public function test_waiting_payment_order_items_cannot_be_changed(): void
    {
        $order = $this->createOrder(status: 'menunggu');
        $itemId = $this->itemId($order);

        $this->patchJson("/api/orders/{$order->id}/items/{$itemId}", ['status' => 'dimasak'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('order');
    }

    public function test_served_order_accepts_late_delivery_mark_without_changing_status(): void
    {
        // Order self-order auto-selesai saat semua item 'siap'. Pelayan boleh
        // menandai 'diantar' belakangan tanpa error, dan status tetap selesai.
        $order = $this->createOrder(status: 'selesai', source: 'self-order');
        $item = $order->items()->firstOrFail();
        $item->status = 'siap';
        $item->save();

        $this->patchJson("/api/orders/{$order->id}/items/{$item->id}", ['status' => 'diantar'])
            ->assertOk();

        $this->assertSame('diantar', $item->fresh()->status);
        $this->assertSame('selesai', $order->fresh()->status);
    }
}

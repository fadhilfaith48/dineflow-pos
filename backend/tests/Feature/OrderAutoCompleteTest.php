<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Auto-complete: begitu semua item terlayani, pesanan tidak perlu menunggu
 * kasir menekan "Tandai Selesai". Ini menutup celah di mana order sudah
 * disaji tapi tetap menggantung 'diproses' dan mejanya tidak pernah ditandai
 * perlu dibersihkan.
 */
class OrderAutoCompleteTest extends TestCase
{
    use RefreshDatabase;

    private function createOrder(string $source, ?int $tableId = null, array $itemStatuses = ['dimasak']): Order
    {
        $order = Order::create([
            'order_number' => 'ORD-'.str_pad((string) (Order::count() + 1), 4, '0', STR_PAD_LEFT),
            'table_id' => $tableId,
            'source' => $source,
            'status' => 'diproses',
            'total' => 19800,
        ]);

        foreach ($itemStatuses as $index => $status) {
            OrderItem::create([
                'order_id' => $order->id,
                'menu_item_id' => null,
                'name' => 'Menu '.($index + 1),
                'price' => 18000,
                'quantity' => 1,
                'status' => $status,
            ]);
        }

        return $order;
    }

    private function markItem(Order $order, int $index, string $status): void
    {
        $item = $order->items()->orderBy('id')->skip($index)->firstOrFail();

        $this->patchJson("/api/orders/{$order->id}/items/{$item->id}", ['status' => $status])
            ->assertOk();
    }

    public function test_order_completes_when_last_item_is_delivered(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'dapur']));

        $order = $this->createOrder('pelayan', null, ['siap', 'siap']);

        $this->markItem($order, 0, 'diantar');
        $this->assertSame('diproses', $order->fresh()->status, 'Masih ada item yang belum diantar.');

        $this->markItem($order, 1, 'diantar');
        $this->assertSame('selesai', $order->fresh()->status);
    }

    public function test_self_order_completes_when_last_item_is_ready(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'dapur']));

        $order = $this->createOrder('self-order', null, ['dimasak', 'dimasak']);

        $this->markItem($order, 0, 'siap');
        $this->assertSame('diproses', $order->fresh()->status);

        $this->markItem($order, 1, 'siap');
        $this->assertSame('selesai', $order->fresh()->status, 'Self-order tidak ada pelayan yang menandai diantar.');
    }

    public function test_non_self_order_does_not_complete_at_ready_stage(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'dapur']));

        $order = $this->createOrder('pelayan', null, ['dimasak']);

        $this->markItem($order, 0, 'siap');

        $this->assertSame('diproses', $order->fresh()->status, 'Pelayan masih harus menandai diantar.');
    }

    public function test_autocomplete_marks_table_needs_cleaning(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'dapur']));

        $table = \App\Models\Table::create([
            'number' => 'T1', 'seats' => 2, 'status' => 'terisi', 'qr_code' => 'abc12345',
        ]);

        $order = $this->createOrder('pelayan', $table->id, ['siap']);

        $this->markItem($order, 0, 'diantar');

        $this->assertSame('selesai', $order->fresh()->status);
        $this->assertSame('perlu-dibersihkan', $table->fresh()->status);
    }

    public function test_autocomplete_keeps_table_occupied_when_other_order_active(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'dapur']));

        $table = \App\Models\Table::create([
            'number' => 'T1', 'seats' => 2, 'status' => 'terisi', 'qr_code' => 'abc12345',
        ]);

        $finishing = $this->createOrder('pelayan', $table->id, ['siap']);
        $this->createOrder('pelayan', $table->id, ['baru']);

        $this->markItem($finishing, 0, 'diantar');

        $this->assertSame('selesai', $finishing->fresh()->status);
        $this->assertSame('terisi', $table->fresh()->status);
    }

    public function test_manual_complete_still_works_as_fallback(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'kasir']));

        $order = $this->createOrder('pelayan');

        $this->patchJson("/api/orders/{$order->id}/complete")->assertOk();

        $this->assertSame('selesai', $order->fresh()->status);
    }

    public function test_paid_order_enters_kitchen_not_completed(): void
    {
        $order = $this->createOrder('pelayan', null, ['baru']);

        Payment::create([
            'order_id' => $order->id,
            'reference' => 'MOCK-AUTO001',
            'method' => 'tunai',
            'status' => 'paid',
            'gateway' => 'mock',
            'amount' => $order->total,
            'subtotal' => 18000,
            'ppn_amount' => 1800,
            'total' => $order->total,
            'paid_at' => now(),
        ]);

        $this->assertSame('diproses', $order->fresh()->status);
    }
}

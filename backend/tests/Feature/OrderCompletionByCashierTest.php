<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\Table;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Penutup pesanan hanya boleh lewat aksi kasir "Tandai Selesai". Dulu
 * backend menutup order otomatis begitu semua item berstatus "diantar"
 * (atau "siap" untuk self-order), sehingga pesanan langsung hilang dari
 * layar Pelayan, Dapur, dan Kasir tanpa pernah adaKasir yang menutup nota.
 * Sekarang menandai diantar hanya mengubah status item; order tetap
 * "diproses" sampai kasir menutupnya.
 */
class OrderCompletionByCashierTest extends TestCase
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

    private function createTable(string $number, string $qrCode, string $status = 'terisi'): Table
    {
        return Table::create([
            'number' => $number,
            'seats' => 2,
            'status' => $status,
            'qr_code' => $qrCode,
        ]);
    }

    public function test_order_stays_processed_when_every_item_is_delivered(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'dapur']));

        $order = $this->createOrder('pelayan', null, ['siap', 'siap']);

        $this->markItem($order, 0, 'diantar');
        $this->assertSame('diproses', $order->fresh()->status, 'Masih ada item yang belum diantar.');

        $this->markItem($order, 1, 'diantar');

        $this->assertSame('diproses', $order->fresh()->status, 'Menandai diantar tidak boleh menutup pesanan.');
        $this->assertSame('diantar', $order->items()->orderBy('id')->skip(1)->firstOrFail()->status);
    }

    public function test_table_stays_occupied_while_order_waits_for_cashier(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'dapur']));

        $table = $this->createTable('T1', 'abc12345');
        $order = $this->createOrder('pelayan', $table->id, ['siap']);

        $this->markItem($order, 0, 'diantar');

        $this->assertSame('diproses', $order->fresh()->status);
        $this->assertSame('terisi', $table->fresh()->status, 'Meja belum dilepas sebelum kasir menutup pesanan.');
    }

    public function test_self_order_stays_processed_when_every_item_is_ready(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'dapur']));

        $order = $this->createOrder('self-order', null, ['dimasak', 'dimasak']);

        $this->markItem($order, 0, 'siap');
        $this->assertSame('diproses', $order->fresh()->status);

        $this->markItem($order, 1, 'siap');

        $this->assertSame('diproses', $order->fresh()->status, 'Self-order juga ditutup kasir lewat "Tandai Selesai".');
    }

    public function test_non_self_order_does_not_complete_at_ready_stage(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'dapur']));

        $order = $this->createOrder('pelayan', null, ['dimasak']);

        $this->markItem($order, 0, 'siap');

        $this->assertSame('diproses', $order->fresh()->status, 'Pelayan masih harus menandai diantar.');
    }

    public function test_cashier_complete_closes_order_and_frees_table(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'kasir']));

        $table = $this->createTable('T1', 'abc12345');
        $order = $this->createOrder('pelayan', $table->id, ['diantar']);

        $this->patchJson("/api/orders/{$order->id}/complete")->assertOk();

        $this->assertSame('selesai', $order->fresh()->status);
        $this->assertSame('perlu-dibersihkan', $table->fresh()->status);
    }

    public function test_table_kept_occupied_when_another_order_still_active(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'kasir']));

        $table = $this->createTable('T1', 'abc12345');

        $finishing = $this->createOrder('pelayan', $table->id, ['diantar']);
        $this->createOrder('pelayan', $table->id, ['baru']);

        $this->patchJson("/api/orders/{$finishing->id}/complete")->assertOk();

        $this->assertSame('selesai', $finishing->fresh()->status);
        $this->assertSame('terisi', $table->fresh()->status, 'Masih ada pesanan aktif di meja ini.');
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

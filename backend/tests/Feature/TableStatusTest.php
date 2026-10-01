<?php

namespace Tests\Feature;

use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\Table;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Regresi status meja.
 *
 * Sebelum ada TableStatusService, tiap aksi menulis status meja dengan syaratnya
 * sendiri sehingga saling bertentangan:
 *  - moveToKitchen() hanya mengubah 'kosong' -> 'terisi', jadi meja berstatus
 *    'perlu-dibersihkan' TIDAK PERNAH kembali 'terisi' ketika pembayaran
 *    pesanan berikutnya masuk.
 *  - complete() menandai 'perlu-dibersihkan' walau masih ada pesanan 'diproses'
 *    lain di meja yang sama.
 */
class TableStatusTest extends TestCase
{
    use RefreshDatabase;

    private function createOrder(?Table $table, string $status, string $source = 'pelayan'): Order
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

    public function test_payment_returns_dirty_table_to_occupied(): void
    {
        // Meja selesai Dilayani lalu ditandai perlu dibersihkan, pelanggan
        // berikutnya memesan dan membayar.
        $table = Table::create(['number' => 'T1', 'seats' => 2, 'status' => 'perlu-dibersihkan', 'qr_code' => 'abc12345']);
        $this->createOrder($table, 'selesai');

        $new = $this->createOrder($table, 'menunggu');
        $new->status = 'diproses';
        $new->save();

        \App\Services\TableStatusService::syncById($table->id);

        $this->assertSame('terisi', $table->fresh()->status);
    }

    public function test_active_order_keeps_table_occupied_after_another_order_completes(): void
    {
        $table = Table::create(['number' => 'T1', 'seats' => 2, 'status' => 'terisi', 'qr_code' => 'abc12345']);

        $finishing = $this->createOrder($table, 'diproses');
        $stillRunning = $this->createOrder($table, 'diproses');

        $finishing->status = 'selesai';
        $finishing->save();

        \App\Services\TableStatusService::syncById($table->id);

        $this->assertSame('terisi', $table->fresh()->status, 'Masih ada pesanan diproses di meja ini.');
        $this->assertSame('diproses', $stillRunning->fresh()->status);
    }

    public function test_table_becomes_free_when_last_active_order_is_cancelled(): void
    {
        $table = Table::create(['number' => 'T1', 'seats' => 2, 'status' => 'terisi', 'qr_code' => 'abc12345']);
        $order = $this->createOrder($table, 'diproses');

        $order->status = 'dibatalkan';
        $order->save();

        \App\Services\TableStatusService::syncById($table->id);

        $this->assertSame('kosong', $table->fresh()->status);
    }

    public function test_table_needs_cleaning_when_last_order_finished(): void
    {
        $table = Table::create(['number' => 'T1', 'seats' => 2, 'status' => 'terisi', 'qr_code' => 'abc12345']);
        $order = $this->createOrder($table, 'diproses');

        $order->status = 'selesai';
        $order->save();

        \App\Services\TableStatusService::syncById($table->id);

        $this->assertSame('perlu-dibersihkan', $table->fresh()->status);
    }

    public function test_waiting_payment_order_occupies_table(): void
    {
        $table = Table::create(['number' => 'T1', 'seats' => 2, 'status' => 'kosong', 'qr_code' => 'abc12345']);
        $this->createOrder($table, 'menunggu', source: 'self-order');

        \App\Services\TableStatusService::syncById($table->id);

        $this->assertSame('terisi', $table->fresh()->status);
    }

    public function test_cancelled_then_finished_history_does_not_leave_table_dirty(): void
    {
        $table = Table::create(['number' => 'T1', 'seats' => 2, 'status' => 'terisi', 'qr_code' => 'abc12345']);
        $cancelled = $this->createOrder($table, 'menunggu');
        $cancelled->status = 'dibatalkan';
        $cancelled->save();

        \App\Services\TableStatusService::syncById($table->id);

        $this->assertSame('kosong', $table->fresh()->status);
    }

    public function test_sync_all_recalculates_every_table_with_orders(): void
    {
        $tableA = Table::create(['number' => 'T1', 'seats' => 2, 'status' => 'perlu-dibersihkan', 'qr_code' => 'abc12345']);
        $tableB = Table::create(['number' => 'T2', 'seats' => 2, 'status' => 'terisi', 'qr_code' => 'zyxwvu98']);

        $this->createOrder($tableA, 'menunggu');
        $b = $this->createOrder($tableB, 'diproses');
        $b->status = 'selesai';
        $b->save();

        $changed = \App\Services\TableStatusService::syncAll();

        $this->assertSame(2, $changed);
        $this->assertSame('terisi', $tableA->fresh()->status);
        $this->assertSame('perlu-dibersihkan', $tableB->fresh()->status);
    }
}

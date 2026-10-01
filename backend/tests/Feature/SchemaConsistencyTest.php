<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Table;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * Migrasi konsistensi skema.
 *
 * Dua migrasi ini memperbaiki data yang sudah ada, jadi yang diuji bukan hanya
 * skema akhirnya tapi juga jalur data bentrok:
 *  - tables.qr_code jadi unique; token yang bentrok harus dipisah, bukan
 *    menggagalkan migrasi di server.
 *  - orders.status default diselaraskan ke 'menunggu' (kosakata yang benar-benar
 *    dipakai aplikasi), termasuk baris lama yang masih 'baru'.
 */
class SchemaConsistencyTest extends TestCase
{
    use RefreshDatabase;

    public function test_order_status_default_matches_application_vocabulary(): void
    {
        $order = Order::create([
            'order_number' => 'ORD-9999',
            'table_id' => null,
            'source' => 'kasir',
            'total' => 1000,
        ]);

        $this->assertSame('menunggu', $order->fresh()->status);
    }

    public function test_no_stale_baru_status_remains_after_migration(): void
    {
        $this->assertFalse(
            DB::table('orders')->where('status', 'baru')->exists(),
            'Tidak boleh ada order berstatus lama "baru" yang tidak dikenal frontend.'
        );
    }

    public function test_table_qr_code_is_unique(): void
    {
        Table::create(['number' => 'T1', 'seats' => 2, 'status' => 'kosong', 'qr_code' => 'kode1234']);

        $this->expectException(\Illuminate\Database\QueryException::class);

        Table::create(['number' => 'T2', 'seats' => 2, 'status' => 'kosong', 'qr_code' => 'kode1234']);
    }

    public function test_every_seeded_table_has_a_qr_code(): void
    {
        $this->seed(\Database\Seeders\DatabaseSeeder::class);

        $this->assertGreaterThan(0, Table::count());

        $withoutQr = Table::whereNull('qr_code')->orWhere('qr_code', '')->count();
        $this->assertSame(0, $withoutQr, 'Semua meja harus punya token QR agar bisa dipindai.');
    }

    public function test_seeded_qr_codes_are_unique(): void
    {
        $this->seed(\Database\Seeders\DatabaseSeeder::class);

        $codes = Table::pluck('qr_code')->filter();

        $this->assertSame(
            $codes->count(),
            $codes->unique()->count(),
            'Token QR antar meja harus berbeda — kalau sama, QR menunjuk meja yang keliru.'
        );
    }

    public function test_seeded_finished_orders_exist_for_sales_report(): void
    {
        $this->seed(\Database\Seeders\DatabaseSeeder::class);

        $finished = Order::where('status', 'selesai')->count();

        $this->assertGreaterThan(0, $finished, 'Laporan penjualan butuh order selesai setelah seed.');
    }

    public function test_every_finished_order_has_a_payment(): void
    {
        $this->seed(\Database\Seeders\DatabaseSeeder::class);

        $finishedWithoutPayment = Order::where('status', 'selesai')
            ->whereDoesntHave('payment')
            ->count();

        $this->assertSame(
            0,
            $finishedWithoutPayment,
            'Order selesai tanpa payment tidak masuk breakdown Tunai/QRIS.'
        );
    }

    public function test_seeded_table_status_matches_its_orders(): void
    {
        $this->seed(\Database\Seeders\DatabaseSeeder::class);

        foreach (Table::with('orders')->get() as $table) {
            $statuses = $table->orders->pluck('status');
            $expected = $statuses->contains(fn ($s) => in_array($s, ['menunggu', 'diproses'], true))
                ? 'terisi'
                : ($statuses->last() === 'selesai' ? 'perlu-dibersihkan' : 'kosong');

            $this->assertSame(
                $expected,
                $table->status,
                "Status meja {$table->number} tidak cocok dengan order-nya."
            );
        }
    }
}

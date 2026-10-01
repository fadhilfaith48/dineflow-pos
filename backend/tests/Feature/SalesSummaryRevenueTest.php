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
 * Laporan penjualan harus konsisten: total omzet yang tampil sama dengan
 * penjumlahan per metode pembayaran.
 *
 * Sebelum perbaikan, totalRevenue menjumlahkan harga item (TANPA PPN) sedangkan
 * paymentBreakdown memakai order.total (DENGAN PPN). Satu layar Reports
 * menampilkan dua angka yang berbeda 10%.
 */
class SalesSummaryRevenueTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
    }

    /**
     * Order selesai dengan total 19800 (= 18000 + PPN 10%).
     */
    private function createFinishedOrder(string $method, int $quantity = 1, int $unitPrice = 18000): Order
    {
        $subtotal = $unitPrice * $quantity;
        $total = (int) round($subtotal * 1.1);

        $order = Order::create([
            'order_number' => 'ORD-'.str_pad((string) (Order::count() + 1), 4, '0', STR_PAD_LEFT),
            'table_id' => null,
            'source' => 'pelayan',
            'status' => 'selesai',
            'total' => $total,
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'menu_item_id' => null,
            'name' => 'Nasi Goreng',
            'price' => $unitPrice,
            'quantity' => $quantity,
            'status' => 'diantar',
        ]);

        Payment::create([
            'order_id' => $order->id,
            'reference' => 'MOCK-'.str_pad((string) $order->id, 6, '0', STR_PAD_LEFT),
            'method' => $method,
            'status' => 'paid',
            'gateway' => 'mock',
            'amount' => $total,
            'subtotal' => $subtotal,
            'ppn_amount' => $total - $subtotal,
            'total' => $total,
            'paid_at' => now(),
        ]);

        return $order;
    }

    public function test_total_revenue_matches_payment_breakdown_sum(): void
    {
        $this->createFinishedOrder('tunai');
        $this->createFinishedOrder('qris');

        $json = $this->getJson('/api/sales-summary')->assertOk()->json();

        $breakdownSum = array_sum(array_column($json['paymentBreakdown'], 'revenue'));

        $this->assertSame(
            $breakdownSum,
            $json['totalRevenue'],
            'Total omzet harus sama dengan jumlah per metode pembayaran.'
        );

        $this->assertSame(2, $json['orderCount']);
    }

    public function test_total_revenue_includes_tax(): void
    {
        // 18000 + 10% = 19800. Kalau totalRevenue memakai harga item, hasilnya
        // akan 18000 (dan tidak cocok dengan breakdown).
        $this->createFinishedOrder('tunai');

        $json = $this->getJson('/api/sales-summary')->assertOk()->json();

        $this->assertSame(19800, $json['totalRevenue']);
        $this->assertSame(18000, $json['subtotalRevenue']);
        $this->assertSame(19800, $json['paymentBreakdown']['tunai']['revenue']);
    }

    public function test_multi_quantity_totals_are_consistent(): void
    {
        $this->createFinishedOrder('qris', quantity: 3);

        $json = $this->getJson('/api/sales-summary')->assertOk()->json();

        // 3 x 18000 = 54000 + 10% = 59400
        $this->assertSame(59400, $json['totalRevenue']);
        $this->assertSame(54000, $json['subtotalRevenue']);
        $this->assertSame(59400, array_sum(array_column($json['paymentBreakdown'], 'revenue')));
    }

    public function test_top_items_revenue_excludes_tax(): void
    {
        $this->createFinishedOrder('tunai', quantity: 2);

        $json = $this->getJson('/api/sales-summary')->assertOk()->json();

        $this->assertSame(2, $json['topItems'][0]['quantity']);
        $this->assertSame(36000, $json['topItems'][0]['revenue'], 'Rekomendasi menu memakai harga item tanpa PPN.');
    }

    public function test_unfinished_orders_are_excluded(): void
    {
        $this->createFinishedOrder('tunai');

        $diproses = Order::create([
            'order_number' => 'ORD-'.str_pad((string) (Order::count() + 1), 4, '0', STR_PAD_LEFT),
            'table_id' => null,
            'source' => 'pelayan',
            'status' => 'diproses',
            'total' => 99000,
        ]);

        $json = $this->getJson('/api/sales-summary')->assertOk()->json();

        $this->assertSame(1, $json['orderCount']);
        $this->assertSame(19800, $json['totalRevenue']);
    }

    public function test_empty_report_is_all_zero(): void
    {
        $json = $this->getJson('/api/sales-summary')->assertOk()->json();

        $this->assertSame(0, $json['totalRevenue']);
        $this->assertSame(0, $json['subtotalRevenue']);
        $this->assertSame(0, $json['orderCount']);
    }
}

<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SalesSummaryTest extends TestCase
{
    use RefreshDatabase;

    private function makeSettledOrder(string $orderNumber, string $method, int $total, ?string $createdAt = null): Order
    {
        $order = Order::create([
            'order_number' => $orderNumber,
            'table_id' => null,
            'source' => 'kasir',
            'status' => 'selesai',
            'total' => $total,
        ]);
        if ($createdAt !== null) {
            $order->forceFill(['created_at' => $createdAt])->save();
        }
        Payment::create([
            'order_id' => $order->id,
            'method' => $method,
            'amount' => $total,
            'paid_at' => $createdAt ?? now(),
        ]);

        return $order;
    }

    public function test_summary_includes_payment_method_breakdown(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));

        $this->makeSettledOrder('ORD-0001', 'tunai', 20000);
        $this->makeSettledOrder('ORD-0002', 'tunai', 15000);
        $this->makeSettledOrder('ORD-0003', 'qris', 35000);

        $this->getJson('/api/sales-summary')
            ->assertOk()
            ->assertJsonPath('orderCount', 3)
            ->assertJsonPath('paymentBreakdown.tunai.count', 2)
            ->assertJsonPath('paymentBreakdown.tunai.revenue', 35000)
            ->assertJsonPath('paymentBreakdown.qris.count', 1)
            ->assertJsonPath('paymentBreakdown.qris.revenue', 35000);
    }

    public function test_custom_date_range_filters_orders(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));

        $this->makeSettledOrder('ORD-0001', 'tunai', 10000, now()->subDays(3)->toDateTimeString());
        $this->makeSettledOrder('ORD-0002', 'qris', 40000);

        $today = now()->toDateString();

        $this->getJson("/api/sales-summary?startDate={$today}&endDate={$today}")
            ->assertOk()
            ->assertJsonPath('orderCount', 1)
            ->assertJsonPath('paymentBreakdown.qris.revenue', 40000)
            ->assertJsonPath('paymentBreakdown.tunai.revenue', 0);
    }

    public function test_export_returns_csv_stream(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));

        $response = $this->get('/api/sales-summary/export?period=semua&startDate=2026-08-01&endDate=2026-08-31');

        $response->assertOk();
        $this->assertStringContainsString('text/csv', (string) $response->headers->get('Content-Type'));
    }

    public function test_export_includes_cashier_name_not_id(): void
    {
        $kasir = User::factory()->create(['name' => 'Kasir Shift Satu', 'role' => 'kasir']);
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));

        $order = $this->makeSettledOrder('ORD-0001', 'tunai', 20000);
        $order->payment->forceFill(['paid_by' => $kasir->id])->save();

        $csv = $this->get('/api/sales-summary/export?period=semua')->streamedContent();

        $this->assertStringContainsString('Kasir Shift Satu', $csv);
    }
}

<?php

namespace Tests\Feature;

use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Regresi webhook Xendit (`POST /api/xendit/callback`).
 *
 * Dua bug nyata yang sebelumnya lolos karena test memakai payload tidak realistis:
 *
 *  1. Pencarian payment salah kolom. Kita menyimpan ID QR Xendit (prefix `qr_`)
 *     di payments.reference, sedangkan `reference_id` yang dikirim Xendit adalah
 *     nomor order (ORD-0008). Kode lama hanya melakukan
 *     `where('reference', $payload['reference_id'])`, yang praktis tidak pernah
 *     cocok — webhook selalu balas 200 "ok" tanpa mengubah apa pun, padahal
 *     XENDIT_CALLBACK_URL sudah dikonfigurasi di .env maupun runbook deploy.
 *
 *  2. Status terminal menimpa status 'paid'. Callback bisa datang terlambat atau
 *     berulang, sehingga EXPIRED seusai pembayaran sukses akan membukukan order
 *     yang sudah lunas sebagai belum dibayar dan memunculkan lagi QR yang
 *     sebenarnya sudah dipakai.
 */
class XenditCallbackTest extends TestCase
{
    use RefreshDatabase;

    private const TOKEN = 'rahasia-token';

    private function makeOrder(string $orderNumber = 'ORD-0001'): Order
    {
        $category = MenuCategory::firstOrCreate(['name' => 'Makanan'], ['order' => 1]);
        $menu = MenuItem::firstOrCreate(
            ['code' => '#M01'],
            ['name' => 'Nasi Goreng', 'price' => 18000, 'category_id' => $category->id, 'available' => true],
        );

        $order = Order::create([
            'order_number' => $orderNumber,
            'source' => 'self-order',
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

    private function pendingPayment(Order $order, string $reference = 'qr_abc123'): Payment
    {
        return Payment::create([
            'order_id' => $order->id,
            'reference' => $reference,
            'method' => 'qris',
            'status' => 'pending',
            'gateway' => 'xendit',
            'amount' => $order->total,
            'subtotal' => 18000,
            'ppn_amount' => 1800,
            'total' => $order->total,
        ]);
    }

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('dinflow.xendit.callback_token', self::TOKEN);
    }

    private function sendCallback(array $payload)
    {
        return $this->postJson('/api/xendit/callback', $payload, ['x-callback-token' => self::TOKEN]);
    }

    public function test_token_tetap_diwajibkan(): void
    {
        $order = $this->makeOrder();
        $this->pendingPayment($order);

        $this->postJson('/api/xendit/callback', [
            'status' => 'PAID',
            'qr_code' => ['id' => 'qr_abc123'],
        ])->assertUnauthorized();

        $this->assertSame('pending', Payment::where('reference', 'qr_abc123')->value('status'));
    }

    public function test_paid_terdaftar_lewat_qr_code_id(): void
    {
        // Bentuk payload yang sebenarnya dikirim Xendit untuk QRIS.
        $order = $this->makeOrder();
        $this->pendingPayment($order, 'qr_abc123');

        $this->sendCallback([
            'status' => 'PAID',
            'qr_code' => [
                'id' => 'qr_abc123',
                'reference_id' => $order->order_number,
            ],
            'reference_id' => $order->order_number,
        ])->assertOk();

        $this->assertSame('paid', Payment::where('reference', 'qr_abc123')->value('status'));
        $this->assertSame('diproses', $order->fresh()->status);
    }

    public function test_paid_terdaftar_lewat_reference_id_nomor_order(): void
    {
        // Tanpa qr_code.id, hanya nomor order yang dikirim.
        $order = $this->makeOrder('ORD-0007');
        $this->pendingPayment($order, 'qr_zzz999');

        $this->sendCallback([
            'status' => 'SUCCEEDED',
            'reference_id' => 'ORD-0007',
        ])->assertOk();

        $this->assertSame('paid', Payment::where('reference', 'qr_zzz999')->value('status'));
        $this->assertSame('diproses', $order->fresh()->status);
    }

    public function test_paid_terdaftar_lewat_reference_id_yang_menyerupai_reference(): void
    {
        // Beberapa gateway meng-echo nilai reference apa adanya.
        $order = $this->makeOrder();
        $this->pendingPayment($order, 'qr_direct1');

        $this->sendCallback(['status' => 'PAID', 'reference_id' => 'qr_direct1'])->assertOk();

        $this->assertSame('paid', Payment::where('reference', 'qr_direct1')->value('status'));
    }

    public function test_expired_menandai_payment_pending(): void
    {
        $order = $this->makeOrder();
        $this->pendingPayment($order, 'qr_exp1');

        $this->sendCallback([
            'status' => 'EXPIRED',
            'qr_code' => ['id' => 'qr_exp1', 'reference_id' => $order->order_number],
        ])->assertOk();

        $this->assertSame('expired', Payment::where('reference', 'qr_exp1')->value('status'));
    }

    public function test_expired_terlambat_tidak_menimpa_paid(): void
    {
        $order = $this->makeOrder();
        $payment = $this->pendingPayment($order, 'qr_late1');
        $payment->update(['status' => 'paid']);

        $this->sendCallback([
            'status' => 'EXPIRED',
            'qr_code' => ['id' => 'qr_late1', 'reference_id' => $order->order_number],
        ])->assertOk();

        $this->assertSame('paid', Payment::where('reference', 'qr_late1')->value('status'));
    }

    public function test_failed_terlambat_tidak_menimpa_paid(): void
    {
        $order = $this->makeOrder();
        $payment = $this->pendingPayment($order, 'qr_late2');
        $payment->update(['status' => 'paid']);

        $this->sendCallback([
            'status' => 'FAILED',
            'qr_code' => ['id' => 'qr_late2', 'reference_id' => $order->order_number],
        ])->assertOk();

        $this->assertSame('paid', Payment::where('reference', 'qr_late2')->value('status'));
    }

    public function test_payment_tidak_dikenal_tetap_aman(): void
    {
        $this->makeOrder();

        $this->sendCallback([
            'status' => 'PAID',
            'qr_code' => ['id' => 'qr_tidak_ada'],
            'reference_id' => 'ORD-9999',
        ])->assertOk();

        $this->assertSame(0, Payment::where('status', 'paid')->count());
    }

    public function test_callback_untuk_order_yang_sudah_dibayar_tidak_menutup_lagi(): void
    {
        $order = $this->makeOrder();
        $payment = $this->pendingPayment($order, 'qr_repeat');
        $payment->update(['status' => 'paid']);
        $order->update(['status' => 'diproses']);

        // Dikirim dua kali (Xendit memang bisa retry webhook).
        foreach (range(1, 2) as $ignored) {
            $this->sendCallback([
                'status' => 'PAID',
                'qr_code' => ['id' => 'qr_repeat', 'reference_id' => $order->order_number],
            ])->assertOk();
        }

        $this->assertSame('paid', Payment::where('reference', 'qr_repeat')->value('status'));
        $this->assertSame('diproses', $order->fresh()->status);
    }
}

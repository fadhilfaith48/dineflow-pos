<?php

namespace Tests\Feature;

use App\Models\MenuCategory;
use App\Models\MenuItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Regresi untuk P1#3: POST /orders tidak boleh membuat order ganda bila
 * permintaan dikirim ulang dengan header X-Idempotency-Key yang sama
 * (mis. double-click "Bayar di Muka" / retry jaringan dari klien).
 */
class IdempotencyOrderTest extends TestCase
{
    use RefreshDatabase;

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

    private function createOrderPayload(array $items): array
    {
        return [
            'items' => $items,
        ];
    }

    public function test_same_idempotency_key_creates_only_one_order(): void
    {
        $menu = $this->makeMenu();
        $payload = $this->createOrderPayload([
            ['menuItemId' => $menu->id, 'quantity' => 2],
        ]);

        $first = $this->postJson('/api/orders', $payload, ['X-Idempotency-Key' => 'kunci-aksi-abc-1'])->assertCreated();
        $second = $this->postJson('/api/orders', $payload, ['X-Idempotency-Key' => 'kunci-aksi-abc-1'])->assertOk();

        $firstId = $first->json('data.id');
        $secondId = $second->json('data.id');

        $this->assertSame($firstId, $secondId);
        $this->assertDatabaseCount('orders', 1);
        $this->assertDatabaseHas('orders', [
            'id' => $firstId,
            'idempotency_key' => 'kunci-aksi-abc-1',
        ]);
    }

    public function test_different_idempotency_key_creates_two_orders(): void
    {
        $menu = $this->makeMenu();
        $payload = $this->createOrderPayload([
            ['menuItemId' => $menu->id, 'quantity' => 1],
        ]);

        $this->postJson('/api/orders', $payload, ['X-Idempotency-Key' => 'kunci-aksi-abc-1'])->assertCreated();
        $this->postJson('/api/orders', $payload, ['X-Idempotency-Key' => 'kunci-aksi-abd-2'])->assertCreated();

        $this->assertDatabaseCount('orders', 2);
    }

    public function test_invalid_idempotency_key_is_ignored(): void
    {
        $menu = $this->makeMenu();
        $payload = $this->createOrderPayload([
            ['menuItemId' => $menu->id, 'quantity' => 1],
        ]);

        $this->postJson('/api/orders', $payload, ['X-Idempotency-Key' => 'short'])->assertCreated();

        $this->assertDatabaseCount('orders', 1);
        $this->assertDatabaseHas('orders', ['idempotency_key' => null]);
    }

    public function test_idempotent_replay_returns_same_order_details(): void
    {
        $menu = $this->makeMenu();
        $payload = $this->createOrderPayload([
            ['menuItemId' => $menu->id, 'quantity' => 2],
        ]);

        $first = $this->postJson('/api/orders', $payload, ['X-Idempotency-Key' => 'kunci-aksi-abc-1']);
        $second = $this->postJson('/api/orders', $payload, ['X-Idempotency-Key' => 'kunci-aksi-abc-1']);

        $this->assertSame($first->json('data.order_number'), $second->json('data.order_number'));
        $this->assertSame($first->json('data.total'), $second->json('data.total'));
        $this->assertCount(1, $second->json('data.items'));
    }
}
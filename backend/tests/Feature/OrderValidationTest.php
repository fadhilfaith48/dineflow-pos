<?php

namespace Tests\Feature;

use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\MenuItemVariant as MenuVariant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Regresi validasi input order. Sebelumnya store() hanya memvalidasi
 * 'required|string' untuk note dan variantName tanpa batas panjang, dan
 * varian yang tidak ada di database diam-diam jatuh ke harga dasar menu.
 */
class OrderValidationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Sanctum::actingAs(User::factory()->create(['role' => 'kasir']));
    }

    private function menuItem(string $code = '#M01'): MenuItem
    {
        $category = MenuCategory::firstOrCreate(['name' => 'Makanan'], ['order' => 1]);

        return MenuItem::firstOrCreate(
            ['code' => $code],
            ['name' => 'Nasi Goreng', 'price' => 18000, 'category_id' => $category->id, 'available' => true],
        );
    }

    private function payload(array $item): array
    {
        return ['items' => [array_merge(['menuItemId' => $this->menuItem()->id, 'quantity' => 1], $item)]];
    }

    public function test_note_lebih_dari_255_karakter_ditolak(): void
    {
        $this->postJson('/api/orders', $this->payload(['note' => str_repeat('a', 256)]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('items.0.note');
    }

    public function test_note_tepat_255_karakter_diterima(): void
    {
        $this->postJson('/api/orders', $this->payload(['note' => str_repeat('a', 255)]))
            ->assertCreated();
    }

    public function test_variant_name_lebih_dari_255_karakter_ditolak(): void
    {
        $this->postJson('/api/orders', $this->payload(['variantName' => str_repeat('v', 256)]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('items.0.variantName');
    }

    public function test_quantity_di_atas_99_ditolak(): void
    {
        $this->postJson('/api/orders', $this->payload(['quantity' => 100]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('items.0.quantity');
    }

    public function test_lebih_dari_50_baris_item_ditolak(): void
    {
        $menu = $this->menuItem();
        $items = array_fill(0, 51, ['menuItemId' => $menu->id, 'quantity' => 1]);

        $this->postJson('/api/orders', ['items' => $items])
            ->assertStatus(422)
            ->assertJsonValidationErrors('items');
    }

    public function test_variant_tidak_ada_ditolak_bukan_jatuh_ke_harga_dasar(): void
    {
        $menu = $this->menuItem();
        MenuVariant::create([
            'menu_item_id' => $menu->id,
            'name' => 'Large',
            'price' => 22000,
            'available' => true,
            'order' => 0,
        ]);

        $this->postJson('/api/orders', $this->payload(['variantName' => 'Gigantic']))
            ->assertStatus(422)
            ->assertJsonValidationErrors('items');
    }

    public function test_varian_tidak_tersedia_ditolak(): void
    {
        $menu = $this->menuItem();
        MenuVariant::create([
            'menu_item_id' => $menu->id,
            'name' => 'Small',
            'price' => 14000,
            'available' => false,
            'order' => 0,
        ]);

        $this->postJson('/api/orders', $this->payload(['variantName' => 'Small']))
            ->assertStatus(422)
            ->assertJsonValidationErrors('items');
    }

    public function test_nama_varian_pada_menu_tanpa_varian_ditolak(): void
    {
        $this->postJson('/api/orders', $this->payload(['variantName' => 'Large']))
            ->assertStatus(422)
            ->assertJsonValidationErrors('items');
    }

    public function test_varian_valid_dipakai_harga_varian(): void
    {
        $menu = $this->menuItem();
        MenuVariant::create([
            'menu_item_id' => $menu->id,
            'name' => 'Large',
            'price' => 22000,
            'available' => true,
            'order' => 0,
        ]);

        $response = $this->postJson('/api/orders', $this->payload(['variantName' => 'Large']))
            ->assertCreated();

        $this->assertSame(22000, $response->json('data.items.0.price'));
        $this->assertSame(24200, $response->json('data.total'));
    }
}

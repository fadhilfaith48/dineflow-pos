<?php

namespace Database\Seeders;

use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\MenuItemVariant;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Setting;
use App\Models\Table;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->seedSettings();
        $this->seedUsers();
        $this->seedMenu();
        $this->seedVariants();
        $this->seedTables();
        $this->seedOrders();
    }

    private function seedSettings(): void
    {
        Setting::setValue('tax_rate', '10');
        Setting::setValue('restaurant_name', 'DINEFLOW RESTAURANT');
        Setting::setValue('restaurant_address', 'Jl. Raya No. 1, Jakarta');
    }

    private function seedUsers(): void
    {
        $users = [
            ['name' => 'Admin Resto', 'username' => 'admin', 'role' => 'admin'],
            ['name' => 'Kasir Shift 1', 'username' => 'kasir', 'role' => 'kasir'],
            ['name' => 'Pelayan A', 'username' => 'pelayan', 'role' => 'pelayan'],
            ['name' => 'Staf Dapur', 'username' => 'dapur', 'role' => 'dapur'],
        ];

        foreach ($users as $user) {
            User::updateOrCreate(
                ['username' => $user['username']],
                [...$user, 'password' => Hash::make('1234')],
            );
        }
    }

    private function seedMenu(): void
    {
        $categories = ['Makanan', 'Minuman', 'Penutup', 'Spesial'];
        foreach ($categories as $i => $name) {
            MenuCategory::updateOrCreate(['name' => $name], ['order' => $i + 1]);
        }

        $items = [
            // Makanan
            ['#M01', 'Nasi Goreng Spesial', 'Nasi goreng dengan telur, ayam, dan kerupuk', 18000, 'Makanan', true, true],
            ['#M02', 'Ayam Bakar', 'Ayam bakar bumbu kecap, sambal, lalapan', 22000, 'Makanan', true, true],
            ['#M03', 'Mie Ayam', 'Mie ayam pangsit dengan kuah kaldu', 16000, 'Makanan', true, true],
            ['#M04', 'Sate Ayam (10)', 'Sate ayam dengan bumbu kacang', 25000, 'Makanan'],
            ['#M05', 'Gado-Gado', 'Sayuran rebus, tahu tempe, bumbu kacang', 15000, 'Makanan'],
            ['#M06', 'Soto Ayam', 'Soto ayam dengan nasi dan emping', 17000, 'Makanan'],
            ['#M07', 'Nasi Uduk', 'Nasi uduk dengan ayam goreng dan sambal', 19000, 'Makanan', false, true],
            // Minuman
            ['#M08', 'Es Teh Manis', '', 5000, 'Minuman'],
            ['#M09', 'Es Jeruk', '', 7000, 'Minuman'],
            ['#M10', 'Jus Alpukat', 'Jus alpukat segar dengan susu cokelat', 12000, 'Minuman'],
            ['#M11', 'Es Kelapa Muda', '', 15000, 'Minuman'],
            ['#M12', 'Kopi Hitam', '', 8000, 'Minuman'],
            ['#M13', 'Teh Hangat', '', 4000, 'Minuman'],
            // Penutup
            ['#M14', 'Pisang Goreng', 'Pisang goreng dengan cokelat dan keju', 12000, 'Penutup'],
            ['#M15', 'Es Krim Vanilla', '', 10000, 'Penutup'],
            ['#M16', 'Puding Cokelat', '', 9000, 'Penutup'],
            ['#M17', 'Roti Bakar', 'Roti bakar isi cokelat keju', 13000, 'Penutup'],
            // Spesial
            ['#M18', 'Paket Nasi Ayam + Es Teh', 'Hemat: ayam bakar + nasi + es teh manis', 25000, 'Spesial'],
            ['#M19', 'Paket Nasi Goreng + Es Jeruk', 'Hemat: nasi goreng spesial + es jeruk', 23000, 'Spesial'],
        ];

        foreach ($items as $item) {
            $category = MenuCategory::where('name', $item[4])->first();
            MenuItem::updateOrCreate(
                ['code' => $item[0]],
                [
                    'name' => $item[1],
                    'description' => $item[2] ?: null,
                    'price' => $item[3],
                    'category_id' => $category->id,
                    'available' => $item[5] ?? true,
                    'is_spicy' => $item[6] ?? false,
                ],
            );
        }
    }

    private function seedVariants(): void
    {
        $variants = [
            '#M01' => [
                ['Original', 18000, true],
                ['Jumbo', 25000, true],
            ],
            '#M03' => [
                ['Original', 16000, true],
                ['Jumbo', 22000, true],
            ],
            '#M08' => [
                ['Original', 5000, true],
                ['Jumbo', 8000, true],
            ],
            '#M09' => [
                ['Original', 7000, true],
                ['Jumbo', 10000, true],
            ],
        ];

        foreach ($variants as $code => $items) {
            $menuItem = MenuItem::where('code', $code)->first();
            if (! $menuItem) {
                continue;
            }
            // Base price = price of first variant (Original)
            $menuItem->price = $items[0][1];
            $menuItem->save();

            foreach ($items as $i => $v) {
                MenuItemVariant::updateOrCreate(
                    ['menu_item_id' => $menuItem->id, 'name' => $v[0]],
                    [
                        'price' => $v[1],
                        'available' => $v[2],
                        'order' => $i,
                    ],
                );
            }
        }
    }

    private function seedTables(): void
    {
        $tables = [
            ['T1', 2, 'kosong'],
            ['T2', 4, 'terisi'],
            ['T3', 2, 'kosong'],
            ['T4', 4, 'perlu-dibersihkan'],
            ['T5', 6, 'terisi'],
            ['T6', 4, 'kosong'],
            ['T7', 2, 'kosong'],
            ['T8', 4, 'terisi'],
        ];

        foreach ($tables as $table) {
            Table::updateOrCreate(
                ['number' => $table[0]],
                ['seats' => $table[1], 'status' => $table[2], 'qr_code' => $table[0]],
            );
        }
    }

    private function seedOrders(): void
    {
        // Format item: [code, price, quantity, status, note?, variantName?]
        $orders = [
            [
                'order_number' => 'ORD-0001',
                'table' => 'T8',
                'source' => 'self-order',
                'status' => 'diproses',
                'created_at' => now()->subMinutes(47)->toDateTimeString(),
                'items' => [
                    ['#M03', 16000, 1, 'dimasak', null, 'Original', 3],
                    ['#M10', 12000, 1, 'baru'],
                ],
            ],
            [
                'order_number' => 'ORD-0002',
                'table' => 'T5',
                'source' => 'pelayan',
                'status' => 'diproses',
                'created_at' => now()->subMinutes(25)->toDateTimeString(),
                'items' => [
                    ['#M02', 22000, 1, 'dimasak', 'Tidak pedas', null, 0],
                    ['#M09', 10000, 2, 'baru', null, 'Jumbo'],
                ],
            ],
            [
                'order_number' => 'ORD-0003',
                'table' => 'T3',
                'source' => 'self-order',
                'status' => 'menunggu',
                'created_at' => now()->subMinutes(8)->toDateTimeString(),
                'items' => [
                    ['#M01', 25000, 1, 'baru', null, 'Jumbo', 2],
                    ['#M08', 8000, 1, 'baru', null, 'Jumbo'],
                ],
            ],
            [
                'order_number' => 'ORD-0004',
                'table' => 'T6',
                'source' => 'kasir',
                'status' => 'dibatalkan',
                'void_reason' => 'Dibatalkan pelanggan',
                'created_at' => '2026-08-13 09:15:00',
                'items' => [
                    ['#M05', 15000, 1, 'baru'],
                ],
            ],
        ];

        foreach ($orders as $data) {
            $table = Table::where('number', $data['table'])->first();

            $subtotal = collect($data['items'])
                ->reduce(fn ($sum, $item) => $sum + $item[1] * $item[2], 0);

            $order = Order::updateOrCreate(
                ['order_number' => $data['order_number']],
                [
                    'table_id' => $table->id,
                    'source' => $data['source'],
                    'status' => $data['status'],
                    'void_reason' => $data['void_reason'] ?? null,
                    'total' => (int) round($subtotal * 1.1),
                    'created_at' => $data['created_at'],
                    'updated_at' => $data['created_at'],
                ],
            );

            foreach ($data['items'] as $item) {
                $menu = MenuItem::where('code', $item[0])->first();
                OrderItem::updateOrCreate(
                    [
                        'order_id' => $order->id,
                        'name' => $menu->name,
                    ],
                    [
                        'menu_item_id' => $menu->id,
                        'variant_name' => $item[5] ?? null,
                        'price' => $item[1],
                        'quantity' => $item[2],
                        'note' => $item[4] ?? null,
                        'spice_level' => $item[6] ?? null,
                        'status' => $item[3],
                    ],
                );
            }
        }
    }
}
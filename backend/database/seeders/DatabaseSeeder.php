<?php

namespace Database\Seeders;

use App\Models\MenuCategory;
use App\Models\MenuItem;
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
        $categories = ['Makanan', 'Minuman', 'Dessert', 'Special'];
        foreach ($categories as $i => $name) {
            MenuCategory::updateOrCreate(['name' => $name], ['order' => $i + 1]);
        }

        $items = [
            // Makanan
            ['#M01', 'Nasi Goreng Spesial', 'Nasi goreng dengan telur, ayam, dan kerupuk', 18000, 'Makanan'],
            ['#M02', 'Ayam Bakar', 'Ayam bakar bumbu kecap, sambal, lalapan', 22000, 'Makanan'],
            ['#M03', 'Mie Ayam', 'Mie ayam pangsit dengan kuah kaldu', 16000, 'Makanan'],
            ['#M04', 'Sate Ayam (10)', 'Sate ayam dengan bumbu kacang', 25000, 'Makanan'],
            ['#M05', 'Gado-Gado', 'Sayuran rebus, tahu tempe, bumbu kacang', 15000, 'Makanan'],
            ['#M06', 'Soto Ayam', 'Soto ayam dengan nasi dan emping', 17000, 'Makanan'],
            ['#M07', 'Nasi Uduk', 'Nasi uduk dengan ayam goreng dan sambal', 19000, 'Makanan', false],
            // Minuman
            ['#M08', 'Es Teh Manis', '', 5000, 'Minuman'],
            ['#M09', 'Es Jeruk', '', 7000, 'Minuman'],
            ['#M10', 'Jus Alpukat', 'Jus alpukat segar dengan susu cokelat', 12000, 'Minuman'],
            ['#M11', 'Es Kelapa Muda', '', 15000, 'Minuman'],
            ['#M12', 'Kopi Hitam', '', 8000, 'Minuman'],
            ['#M13', 'Teh Hangat', '', 4000, 'Minuman'],
            // Dessert
            ['#M14', 'Pisang Goreng', 'Pisang goreng dengan cokelat dan keju', 12000, 'Dessert'],
            ['#M15', 'Es Krim Vanilla', '', 10000, 'Dessert'],
            ['#M16', 'Puding Cokelat', '', 9000, 'Dessert'],
            ['#M17', 'Roti Bakar', 'Roti bakar isi cokelat keju', 13000, 'Dessert'],
            // Special
            ['#M18', 'Paket Nasi Ayam + Es Teh', 'Hemat: ayam bakar + nasi + es teh manis', 25000, 'Special'],
            ['#M19', 'Paket Nasi Goreng + Es Jeruk', 'Hemat: nasi goreng spesial + es jeruk', 23000, 'Special'],
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
                ],
            );
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
        $orders = [
            [
                'order_number' => 'ORD-0001',
                'table' => 'T8',
                'source' => 'self-order',
                'status' => 'diproses',
                'created_at' => '2026-08-12 10:15:00',
                'items' => [
                    ['#M03', 16000, 1, 'dimasak'],
                    ['#M10', 12000, 1, 'baru'],
                ],
            ],
            [
                'order_number' => 'ORD-0002',
                'table' => 'T5',
                'source' => 'pelayan',
                'status' => 'diproses',
                'created_at' => '2026-08-12 10:20:00',
                'items' => [
                    ['#M02', 22000, 1, 'dimasak', 'Tidak pedas'],
                    ['#M09', 7000, 2, 'baru'],
                ],
            ],
            [
                'order_number' => 'ORD-0003',
                'table' => 'T3',
                'source' => 'self-order',
                'status' => 'menunggu-konfirmasi',
                'created_at' => '2026-08-13 09:00:00',
                'items' => [
                    ['#M01', 18000, 1, 'baru'],
                    ['#M08', 5000, 1, 'baru'],
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
                        'price' => $item[1],
                        'quantity' => $item[2],
                        'note' => $item[4] ?? null,
                        'status' => $item[3],
                    ],
                );
            }
        }
    }
}
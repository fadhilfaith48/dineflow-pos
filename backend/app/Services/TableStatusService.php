<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Table;
use Illuminate\Support\Facades\DB;

/**
 * Satu-satunya tempat yang menentukan status sebuah meja.
 *
 * Sebelumnya tiap aksi (bayar, void, batal, selesai) menulis status meja
 * dengan syaratnya sendiri, sehingga saling bertentangan: meja berstatus
 * 'perlu-dibersihkan' tidak pernah kembali 'terisi' ketika ada pesanan
 * berikutnya yang dibayar, dan meja bisa ditandai 'perlu-dibersihkan'
 * padahal masih ada pesanan aktif lain di meja yang sama.
 *
 * Status meja kini dihitung dari order yang benar-benar ada di meja:
 *   - ada pesanan diproses / menunggu  -> terisi
 *   - tidak ada, order terakhir selesai -> perlu-dibersihkan
 *   - tidak ada                         -> kosong
 */
class TableStatusService
{
    /**
     * Hitung ulang status meja milik order. Aman dipanggil di dalam transaksi
     * yang sudah mengunci baris order (lockForUpdate).
     */
    public static function syncForOrder(Order $order): void
    {
        if ($order->table_id) {
            self::syncById($order->table_id);
        }
    }

    /**
     * Hitung ulang status satu meja berdasarkan order aktif di meja tersebut.
     */
    public static function syncById(int $tableId): void
    {
        $table = Table::lockForUpdate()->find($tableId);

        if (! $table) {
            return;
        }

        $activeStatuses = ['menunggu', 'diproses'];

        $hasActiveOrder = Order::where('table_id', $tableId)
            ->whereIn('status', $activeStatuses)
            ->exists();

        if ($hasActiveOrder) {
            $next = 'terisi';
        } else {
            $lastOrderStatus = Order::where('table_id', $tableId)
                ->orderByDesc('id')
                ->value('status');

            $next = $lastOrderStatus === 'selesai' ? 'perlu-dibersihkan' : 'kosong';
        }

        if ($table->status !== $next) {
            $table->status = $next;
            $table->save();
        }
    }

    /**
     * Hitung ulang semua meja yang punya order. Dipakai perintah artisan
     * setelah migrasi / perbaikan data, atau bila diperlukan sinkronisasi
     * penuh tanpa order tertentu sebagai pemicu.
     */
    public static function syncAll(): int
    {
        $tableIds = Order::whereNotNull('table_id')
            ->distinct()
            ->pluck('table_id');

        $changed = 0;

        foreach ($tableIds as $tableId) {
            $before = Table::where('id', $tableId)->value('status');

            DB::transaction(fn () => self::syncById($tableId));

            if (Table::where('id', $tableId)->value('status') !== $before) {
                $changed++;
            }
        }

        return $changed;
    }
}

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Jadikan tables.qr_code unik.
     *
     * Sebelumnya kolom ini nullable tanpa unique, sedangkan TableController
     * bisa_beberapa meja berbagi QR yang sama. Akibatnya resolve() memakai
     * firstOrFail() selalu mengembalikan meja pertama — QR di meja lain
     * sebenarnya menunjuk meja yang salah, dan pelanggan memesan ke meja orang
     * lain tanpa sadari.
     *
     * Jalur aman untuk data yang sudah ada: token yang bentrok diberi prefix
     * LEGACY-<id> supaya tetap unik. Baris yang tidak bentrok dibiarkan apa
     * adanya supaya QR cetak yang sudah tersebar tidak ikut berubah.
     */
    public function up(): void
    {
        $duplicates = DB::table('tables')
            ->whereNotNull('qr_code')
            ->groupBy('qr_code')
            ->havingRaw('COUNT(*) > 1')
            ->pluck('qr_code');

        foreach ($duplicates as $qrCode) {
            $ids = DB::table('tables')
                ->where('qr_code', $qrCode)
                ->orderBy('id')
                ->pluck('id');

            // Meja pertama (id terkecil) tetap memakai token aslinya.
            foreach ($ids->skip(1) as $duplicateId) {
                DB::table('tables')
                    ->where('id', $duplicateId)
                    ->update(['qr_code' => 'LEGACY-'.$duplicateId]);
            }
        }

        Schema::table('tables', function ($table) {
            $table->unique('qr_code');
        });
    }

    public function down(): void
    {
        Schema::table('tables', function ($table) {
            $table->dropUnique(['qr_code']);
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Selaraskan default orders.status dengan kosakata yang benar-benar dipakai
     * aplikasi.
     *
     * Kolomnya default 'baru', padahal OrderController hanya menulis
     * 'menunggu' / 'diproses' / 'selesai' / 'dibatalkan'. Order yang dibuat di
     * luar aplikasi (mis. insert manual, skrip impor) akan mendapat status
     * 'baru' yang tidak dikenal di mana pun di frontend — order terlihat
     * hilang dari semua antrean.
     *
     * Baris yang sudah terlanjur 'baru' ikut diubah ke 'menunggu' supaya
     * konsisten dengan default barunya.
     */
    public function up(): void
    {
        DB::table('orders')->where('status', 'baru')->update(['status' => 'menunggu']);

        Schema::table('orders', function ($table) {
            $table->string('status')->default('menunggu')->change();
        });
    }

    public function down(): void
    {
        Schema::table('orders', function ($table) {
            $table->string('status')->default('baru')->change();
        });
    }
};

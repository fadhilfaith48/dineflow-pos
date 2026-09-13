<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tambah device_id di orders (untuk mengunci pembatalan self-order ke
     * perangkat pembuat) + ganti qr_code meja yang masih berupa nomor meja
     * (mis. "T2") menjadi token acak 8 karakter (anti-tebak URL /menu/...).
     */
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('device_id', 64)->nullable()->index()->after('source');
        });

        $rows = DB::table('tables')->whereColumn('qr_code', 'number')->get(['id']);

        foreach ($rows as $row) {
            DB::table('tables')->where('id', $row->id)->update(['qr_code' => static::newQrToken()]);
        }
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex(['device_id']);
            $table->dropColumn('device_id');
        });

        // Kembalikan qr_code ke nomor meja (pra-token).
        $rows = DB::table('tables')->get(['id', 'number']);

        foreach ($rows as $row) {
            DB::table('tables')->where('id', $row->id)->update(['qr_code' => $row->number]);
        }
    }

    private static function newQrToken(): string
    {
        $alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
        $out = '';

        for ($i = 0; $i < 8; $i++) {
            $out .= $alphabet[random_int(0, strlen($alphabet) - 1)];
        }

        return $out;
    }
};
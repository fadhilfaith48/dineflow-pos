<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Kunci idempotensi (opsional) untuk POST /orders. Klien yang sama akan
     * mengirim X-Idempotency-Key yang sama bila permintaan dikirim ulang
     * (double-click / retry jaringan) sehingga backend bisa mengembalikan
     * order yang sama alih-alih membuat order baru (anti order ganda).
     */
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('idempotency_key', 64)->nullable()->unique()->after('device_id');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex(['idempotency_key']);
            $table->dropColumn('idempotency_key');
        });
    }
};
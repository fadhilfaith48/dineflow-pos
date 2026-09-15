<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Backstop anti-race checkout QRIS: satu order hanya boleh punya SATU baris
     * payment. Duplikat lama (bila ada dari bug sebelum migrasi ini) dibersihkan
     * dengan menyisakan baris terbaru per order sebelum indeks unik dipasang.
     */
    public function up(): void
    {
        $dupes = DB::table('payments')
            ->select('order_id')
            ->groupBy('order_id')
            ->havingRaw('COUNT(*) > 1')
            ->get();

        foreach ($dupes as $dup) {
            $ids = DB::table('payments')
                ->where('order_id', $dup->order_id)
                ->orderBy('id')
                ->pluck('id');

            $keep = $ids->pop();

            if ($keep !== null && $ids->isNotEmpty()) {
                DB::table('payments')->whereIn('id', $ids)->delete();
            }
        }

        Schema::table('payments', function (Blueprint $table) {
            $table->unique('order_id');
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropUnique(['order_id']);
        });
    }
};
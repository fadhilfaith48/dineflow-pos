<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->string('reference')->nullable()->unique()->after('order_id');
            $table->string('status')->default('pending')->after('method');
            $table->string('gateway')->nullable()->after('status');
            $table->string('paid_via')->nullable()->after('gateway');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn(['reference', 'status', 'gateway', 'paid_via']);
        });
    }
};

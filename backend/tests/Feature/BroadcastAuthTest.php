<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Broadcast;
use Tests\TestCase;

class BroadcastAuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_authorize_private_channel(): void
    {
        $this->postJson('/api/broadcasting/auth', [
            'socket_id' => '1234.5678',
            'channel_name' => 'private-orders',
        ])->assertUnauthorized();
    }

    public function test_logged_in_user_can_authorize_private_orders_channel(): void
    {
        // phpunit.xml memakai BROADCAST_CONNECTION=null (tidak bisa menghitung
        // tanda tangan); pakai reverb agar auth menghasilkan HMAC lokal nyata
        // tanpa perlu koneksi ke server Reverb. Closure channel didaftarkan ke
        // driver aktif ini (di app nyata sudah terdaftar via routes/channels.php).
        config(['broadcasting.default' => 'reverb']);
        Broadcast::channel('orders', fn ($user) => $user !== null);

        $user = User::factory()->create(['role' => 'kasir']);
        $token = $user->createToken('uji-otorisasi')->plainTextToken;

        // Lewat header Bearer sungguhan agar middleware auth:sanctum berjalan penuh.
        $this->postJson('/api/broadcasting/auth', [
            'socket_id' => '1234.5678',
            'channel_name' => 'private-orders',
        ], ['Authorization' => "Bearer {$token}"])
            ->assertOk()
            ->assertJsonStructure(['auth']);
    }

    public function test_public_tracking_channel_needs_no_authentication(): void
    {
        $this->postJson('/api/broadcasting/auth', [
            'socket_id' => '1234.5678',
            'channel_name' => 'order.ORD-0001',
        ])
            // Channel publik tidak pernah memanggil endpoint ini dari Echo,
            // jadi tanpa login tetap harus ditolak (endpoint hanya untuk privat).
            ->assertUnauthorized();
    }
}

<?php

use Illuminate\Support\Facades\Broadcast;

/**
 * Otorisasi channel broadcasting.
 *
 * PRIVATE (butuh login sanctum — token Bearer dikirim Echo saat subscribe):
 * - `orders`  : alur pesanan antar panel internal (kasir/dapur/pelayan/admin).
 * - `settings`: perubahan pengaturan restoran (PPN/logo/nama).
 *
 * PUBLIK (tanpa login — dikonsumsi pelanggan Menu QR):
 * - `order.{orderNumber}` : pelacakan status pesanan milik pelanggan itu sendiri.
 * - `menu`                : katalog menu untuk halaman self-order.
 */
Broadcast::channel('orders', fn ($user) => $user !== null);

Broadcast::channel('settings', fn ($user) => $user !== null);

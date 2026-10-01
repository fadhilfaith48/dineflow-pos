<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\Setting;
use App\Models\Table;
use App\Services\TableStatusService;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

class OrderController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        $orders = Order::with(['table', 'items', 'payment'])->orderByDesc('id')->get();

        return OrderResource::collection($orders);
    }

    /**
     * Detail order untuk tracking pelanggan (publik, tanpa login).
     * Dipanggil halaman /order/ORD-XXXX dari QR barcode kasir.
     */
    public function track(string $orderNumber): OrderResource
    {
        $order = Order::where('order_number', $orderNumber)
            ->with(['table', 'items', 'payment'])
            ->firstOrFail();

        return new OrderResource($order);
    }

    public function store(Request $request): OrderResource
    {
        $validated = $request->validate([
            'tableId' => ['nullable', 'exists:tables,id'],
            'items' => ['required', 'array', 'min:1', 'max:50'],
            'items.*.menuItemId' => ['required', 'exists:menu_items,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:99'],
            'items.*.note' => ['nullable', 'string', 'max:255'],
            'items.*.variantName' => ['nullable', 'string', 'max:255'],
            'items.*.spiceLevel' => ['nullable', 'integer', 'between:0,5'],
        ]);

        // Rute POST /orders publik (self-order), jadi $request->user() tidak
        // ter-resolve (default guard web). Resolve manual via guard sanctum.
        $source = match (auth('sanctum')->user()?->role) {
            'kasir' => 'kasir',
            'pelayan' => 'pelayan',
            default => 'self-order',
        };

        // Anti-mainan: batas pembuatan hanya untuk alur publik (self-order),
        // sehingga kasir/pelayan (login) tidak pernah kena pembatasan.
        if ($source === 'self-order') {
            $this->assertCanCreateOrder($request);
        }

        $deviceId = $source === 'self-order'
            ? $this->validDeviceId((string) $request->header('X-Device-Id', ''))
            : null;

        // Idempotensi: header X-Idempotency-Key opsional. Bila key sama sudah
        // dipakai, kembalikan order yang sudah ada alih-alih membuat baru —
        // mencegah order ganda dari double-click / retry yang mengirim ulang
        // permintaan identik (key hanya dikirim untuk satu aksi kirim).
        $idempotencyKey = $this->validIdempotencyKey((string) $request->header('X-Idempotency-Key', ''));

        if ($idempotencyKey) {
            $existing = Order::where('idempotency_key', $idempotencyKey)->first();
            if ($existing) {
                return new OrderResource($existing->load(['table', 'items']));
            }
        }

        try {
            $order = DB::transaction(function () use ($validated, $source, $deviceId, $idempotencyKey) {
                $tableId = $validated['tableId'] ?? null;
                $table = $tableId ? Table::lockForUpdate()->find($tableId) : null;

                $menuItems = MenuItem::whereIn('id', collect($validated['items'])->pluck('menuItemId'))->lockForUpdate()->get()->keyBy('id');

                $subtotal = 0;
                foreach ($validated['items'] as $item) {
                    $menuItem = $menuItems->get($item['menuItemId']);
                    if (! $menuItem || ! $menuItem->available) {
                        throw ValidationException::withMessages([
                            'items' => ['Menu "'.($menuItem->name ?? '?').'" sedang tidak tersedia'],
                        ]);
                    }

                    if ($menuItem->is_spicy && ! isset($item['spiceLevel'])) {
                        throw ValidationException::withMessages([
                            'items' => ['Pilih level kepedasan (0-5) untuk "'.$menuItem->name.'"'],
                        ]);
                    }

                    $variantName = $item['variantName'] ?? null;
                    $unitPrice = $menuItem->price;

                    if ($variantName && $menuItem->variants()->count() > 0) {
                        $variant = $menuItem->variants()->where('name', $variantName)->first();
                        if ($variant && $variant->available) {
                            $unitPrice = $variant->price;
                        } elseif ($variant && ! $variant->available) {
                            throw ValidationException::withMessages([
                                'items' => ['Varian "'.$variantName.'" untuk "'.($menuItem->name).'" sedang tidak tersedia'],
                            ]);
                        } else {
                            // Varian tidak ada. Versi lama jatuh ke harga dasar
                            // tanpa error, jadi pelanggan bisa memesan varian
                            // palsu dan ditagih harga menu biasa.
                            throw ValidationException::withMessages([
                                'items' => ['Varian "'.$variantName.'" tidak tersedia untuk "'.($menuItem->name).'"'],
                            ]);
                        }
                    } elseif ($variantName && $menuItem->variants()->count() === 0) {
                        // Menu tanpa varian tidak boleh menerima nama varian.
                        throw ValidationException::withMessages([
                            'items' => ['Menu "'.($menuItem->name).'" tidak punya varian'],
                        ]);
                    }

                    $subtotal += $unitPrice * $item['quantity'];
                }

                $lastId = Order::lockForUpdate()->orderByDesc('id')->value('id') ?? 0;
                $orderNumber = 'ORD-'.str_pad((string) ($lastId + 1), 4, '0', STR_PAD_LEFT);

                $taxRate = ((int) Setting::getValue('tax_rate', '10')) / 100;

                $order = Order::create([
                    'order_number' => $orderNumber,
                    'table_id' => $table?->id,
                    'source' => $source,
                    'device_id' => $deviceId,
                    'idempotency_key' => $idempotencyKey,
                    // Bayar di muka: order menunggu pembayaran, BELUM masuk dapur.
                    'status' => 'menunggu',
                    'total' => (int) round($subtotal * (1 + $taxRate)),
                ]);

                foreach ($validated['items'] as $item) {
                    $menuItem = $menuItems->get($item['menuItemId']);
                    $variantName = $item['variantName'] ?? null;
                    $unitPrice = $menuItem->price;

                    if ($variantName && $menuItem->variants()->count() > 0) {
                        $variant = $menuItem->variants()->where('name', $variantName)->first();
                        if ($variant) {
                            $unitPrice = $variant->price;
                        }
                    }

                    $order->items()->create([
                        'menu_item_id' => $menuItem->id,
                        'name' => $menuItem->name,
                        'variant_name' => $variantName,
                        'price' => $unitPrice,
                        'quantity' => $item['quantity'],
                        'note' => $item['note'] ?? null,
                        'spice_level' => $item['spiceLevel'] ?? null,
                        'status' => 'baru',
                    ]);
                }

                return $order;
            });
        } catch (QueryException $e) {
            // Balapan: dua permintaan dengan key sama masuk bersamaan dan sama-sama
            // lolos pengecekan di atas; yang kalah kena unique constraint. Kembalikan
            // order yang sudah dibuat lawannya alih-alih ikut gagal 500.
            if ($idempotencyKey && $this->isUniqueViolation($e)) {
                $existing = Order::where('idempotency_key', $idempotencyKey)->first();
                if ($existing) {
                    return new OrderResource($existing->load(['table', 'items']));
                }
            }

            throw $e;
        }

        $this->safeBroadcastOrderChange($order, 'created');

        if ($source === 'self-order') {
            $this->bumpCreateCounters($request);
        }

        return new OrderResource($order->load(['table', 'items']));
    }

    /**
     * Anti-mainan pembuatan order (self-order publik). Bila header
     * X-Device-Id ada & valid, kuota dihitung per perangkat; tanpa header
     * (mis. wisata API / hapus localStorage) jatuh ke kuota per IP.
     */
    private function assertCanCreateOrder(Request $request): void
    {
        $device = $this->validDeviceId((string) $request->header('X-Device-Id', ''));

        if ($device) {
            $key = 'self-order-create:'.$device;
            $max = (int) config('dinflow.self_order_create_per_device_per_hour', 5);
        } else {
            $key = 'self-order-create-ip:'.$request->ip();
            $max = (int) config('dinflow.self_order_create_per_ip_per_hour', 20);
        }

        if (RateLimiter::tooManyAttempts($key, $max)) {
            abort(429, 'Terlalu sering membuat pesanan. Coba lagi dalam satu jam.');
        }
    }

    private function bumpCreateCounters(Request $request): void
    {
        $device = $this->validDeviceId((string) $request->header('X-Device-Id', ''));

        if ($device) {
            RateLimiter::hit('self-order-create:'.$device, 3600);
        } else {
            RateLimiter::hit('self-order-create-ip:'.$request->ip(), 3600);
        }
    }

    private function validDeviceId(string $value): ?string
    {
        $value = mb_strtolower(trim($value));

        return $value !== '' && preg_match('/^[a-z0-9_-]{8,64}$/', $value)
            ? $value
            : null;
    }

    private function validIdempotencyKey(string $value): ?string
    {
        $value = trim($value);

        return $value !== '' && preg_match('/^[a-zA-Z0-9_-]{8,64}$/', $value)
            ? $value
            : null;
    }

    /**
     * Transisi status item yang sah. Item hanya boleh maju satu tahap
     * (atau diulang dengan status yang sama) supaya dapur & pelayan tidak
     * bisa menandai makanan "diantar" padahal belum sempat dimasak.
     */
    private const ITEM_STATUS_NEXT = [
        'baru' => ['dimasak'],
        'dimasak' => ['siap'],
        'siap' => ['diantar'],
        'diantar' => [],
    ];

    public function updateItemStatus(Request $request, Order $order, int $itemId): OrderResource
    {
        $validated = $request->validate([
            'status' => ['required', 'in:baru,dimasak,siap,diantar'],
        ]);

        $newStatus = $validated['status'];

        DB::transaction(function () use ($order, $itemId, $newStatus) {
            $order = Order::lockForUpdate()->findOrFail($order->id);

            // Order yang sudah ditutup tidak boleh disentuh status itemnya,
            // kalau tidak order "selesai"/"dibatalkan" bisa dihidupkan lagi
            // lewat panel dapur atau pelayan.
            if (! in_array($order->status, ['diproses', 'selesai'], true)) {
                throw ValidationException::withMessages([
                    'order' => ['Pesanan tidak dalam status diproses'],
                ]);
            }

            $item = $order->items()->lockForUpdate()->findOrFail($itemId);

            if ($item->status !== $newStatus) {
                $allowed = self::ITEM_STATUS_NEXT[$item->status] ?? [];

                if (! in_array($newStatus, $allowed, true)) {
                    throw ValidationException::withMessages([
                        'status' => ['Status item tidak bisa diubah dari "'.$item->status.'" ke "'.$newStatus.'"'],
                    ]);
                }
            }

            $item->status = $newStatus;
            $item->save();
        });

        $order->refresh();

        $this->safeBroadcastOrderChange($order, 'item-status');

        return new OrderResource($order->load(['table', 'items']));
    }

    public function void(Request $request, Order $order): OrderResource
    {
        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:500'],
        ]);

        DB::transaction(function () use ($validated, $order, $request) {
            // Kunci baris order: dua permintaan batal untuk order yang sama
            // berjalan serial, dan cek status/pembayaran diulang DI DALAM
            // transaksi agar tidak ada yang lolos double-cancel / cancel
            // setelah dibayar (race antara klik bersamaan kasir vs QRIS).
            $order = Order::lockForUpdate()->findOrFail($order->id);

            if (in_array($order->status, ['selesai', 'dibatalkan'])) {
                throw ValidationException::withMessages([
                    'order' => ['Pesanan sudah '.($order->status === 'selesai' ? 'selesai' : 'dibatalkan')],
                ]);
            }

            // Pembayaran yang sudah 'paid' berarti uang sudah masuk — tidak
            // boleh dibatalkan dari kasir. Tapi payment yang masih 'pending'
            // (QRIS dibuat, pelanggan belum_scan) SEHARUSNYA boleh ditutup,
            // kalau tidak order nyangkut selamanya: tidak bisa dibayar (409),
            // tidak bisa dibatalkan (422), tidak bisa diselesaikan (butuh
            // status diproses). Payment pending dilepas jadi 'cancelled' supaya
            // kalau pelanggan terlanjur scan, tidak ada yang masuk ke kas.
            $payment = $order->payment()->lockForUpdate()->first();

            if ($payment?->status === 'paid') {
                throw ValidationException::withMessages([
                    'order' => ['Pesanan sudah dibayar dan tidak dapat dibatalkan dari sini.'],
                ]);
            }

            if ($payment && $payment->status === 'pending') {
                $payment->status = 'cancelled';
                $payment->save();
            }

            $order->status = 'dibatalkan';
            $order->void_reason = $validated['reason'];
            $order->voided_by = $request->user()?->id;
            $order->save();

            TableStatusService::syncForOrder($order);
        });

        $order->refresh();

        $this->safeBroadcastOrderChange($order, 'voided');

        return new OrderResource($order->load(['table', 'items']));
    }

    /**
     * Batalkan pesanan dari sisi pelanggan (self-order publik, tanpa login).
     * Aman karena dibatasi: hanya pesanan self-order, belum dibayar
     * (status 'menunggu'), dan masih dalam jendela waktu pembatalan.
     */
    public function cancel(Request $request, Order $order): OrderResource
    {
        // Cek cepat di luar transaksi untuk gagal segera pada kasus umum
        // (bukan pesanan self-order / di luar jendela). Cek final tetap
        // diulang di dalam transaksi dengan lock baris.
        if ($order->source !== 'self-order') {
            throw ValidationException::withMessages([
                'order' => ['Pesanan ini tidak bisa dibatalkan lewat halaman pelanggan'],
            ]);
        }

        $minutes = (int) config('dinflow.self_order_cancel_minutes', 10);
        if ($order->created_at->lt(now()->subMinutes($minutes))) {
            throw ValidationException::withMessages([
                'order' => ['Batas waktu pembatalan telah lewat. Silakan hubungi kasir.'],
            ]);
        }

        // Pengaman: pesanan self-order hanya bisa dibatalkan dari perangkat
        // (X-Device-Id) yang membuatnya. Mencegah penebakan id order.
        $device = $this->validDeviceId((string) $request->header('X-Device-Id', ''));
        if ($order->device_id && $device !== $order->device_id) {
            abort(403, 'Pesanan hanya bisa dibatalkan dari perangkat yang membuatnya.');
        }

        DB::transaction(function () use ($order, $request, $minutes) {
            $order = Order::lockForUpdate()->findOrFail($order->id);

            if ($order->source !== 'self-order') {
                throw ValidationException::withMessages([
                    'order' => ['Pesanan ini tidak bisa dibatalkan lewat halaman pelanggan'],
                ]);
            }

            if ($order->status !== 'menunggu') {
                throw ValidationException::withMessages([
                    'order' => ['Pesanan tidak dalam status menunggu pembayaran'],
                ]);
            }

            if ($order->created_at->lt(now()->subMinutes($minutes))) {
                throw ValidationException::withMessages([
                    'order' => ['Batas waktu pembatalan telah lewat. Silakan hubungi kasir.'],
                ]);
            }

            $device = $this->validDeviceId((string) $request->header('X-Device-Id', ''));
            if ($order->device_id && $device !== $order->device_id) {
                throw ValidationException::withMessages([
                    'order' => ['Pesanan hanya bisa dibatalkan dari perangkat yang membuatnya'],
                ]);
            }

            // Kalau pelanggan sudah sempat membuat QRIS, payment-nya dilepas
            // jadi 'cancelled' SEBELUM order dibatalkan. Tanpa ini, pelanggan
            // bisa bayar di m-banking beberapa saat kemudian dan
            // confirmPaid() akan menandai order yang sudah dibatalkan sebagai
            // 'paid' sekaligus mengubah meja menjadi 'terisi' — uang hilang.
            $payment = $order->payment()->lockForUpdate()->first();

            if ($payment?->status === 'paid') {
                throw ValidationException::withMessages([
                    'order' => ['Pesanan sudah dibayar dan tidak dapat dibatalkan.'],
                ]);
            }

            if ($payment && $payment->status === 'pending') {
                $payment->status = 'cancelled';
                $payment->save();
            }

            $order->status = 'dibatalkan';
            $order->void_reason = 'Dibatalkan pelanggan sebelum bayar';
            $order->voided_by = null;
            $order->save();

            TableStatusService::syncForOrder($order);
        });

        $order->refresh();

        $this->safeBroadcastOrderChange($order, 'voided');

        return new OrderResource($order->load(['table', 'items']));
    }

    /**
     * Tandai pesanan selesai & lepaskan meja (dipakai setelah layanan selesai,
     * karena pembayaran dilakukan di muka).
     */
    public function complete(Request $request, Order $order): OrderResource
    {
        DB::transaction(function () use ($order) {
            // Kunci baris order + cek ulang status di dalam transaksi agar
            // dua klik "Tandai Selesai" yang bersamaan tidak saling menimpa.
            $order = Order::lockForUpdate()->findOrFail($order->id);

            if ($order->status !== 'diproses') {
                throw ValidationException::withMessages([
                    'order' => ['Pesanan tidak dalam status diproses'],
                ]);
            }

            $order->status = 'selesai';
            $order->save();

            TableStatusService::syncForOrder($order);
        });

        $order->refresh();

        $this->safeBroadcastOrderChange($order, 'paid');

        return new OrderResource($order->load(['table', 'items']));
    }
}
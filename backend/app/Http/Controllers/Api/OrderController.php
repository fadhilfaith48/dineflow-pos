<?php

namespace App\Http\Controllers\Api;

use App\Events\OrderStatusChanged;
use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\Setting;
use App\Models\Table;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
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
            'items' => ['required', 'array', 'min:1'],
            'items.*.menuItemId' => ['required', 'exists:menu_items,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.note' => ['nullable', 'string'],
            'items.*.variantName' => ['nullable', 'string'],
            'items.*.spiceLevel' => ['nullable', 'integer', 'between:0,5'],
        ]);

        // Rute POST /orders publik (self-order), jadi $request->user() tidak
        // ter-resolve (default guard web). Resolve manual via guard sanctum.
        $source = match (auth('sanctum')->user()?->role) {
            'kasir' => 'kasir',
            'pelayan' => 'pelayan',
            default => 'self-order',
        };

        $order = DB::transaction(function () use ($validated, $source) {
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
                    }
                }

                $subtotal += $unitPrice * $item['quantity'];
            }

            $lastId = Order::lockForUpdate()->max('id') ?? 0;
            $orderNumber = 'ORD-'.str_pad((string) ($lastId + 1), 4, '0', STR_PAD_LEFT);

            $taxRate = ((int) Setting::getValue('tax_rate', '10')) / 100;

            $order = Order::create([
                'order_number' => $orderNumber,
                'table_id' => $table?->id,
                'source' => $source,
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

        OrderStatusChanged::dispatch($order, 'created');

        return new OrderResource($order->load(['table', 'items']));
    }

    public function confirm(Request $request, Order $order): OrderResource
    {
        if ($order->status !== 'menunggu-konfirmasi') {
            throw ValidationException::withMessages([
                'order' => ['Pesanan tidak dalam status menunggu konfirmasi'],
            ]);
        }

        $order->status = 'diproses';
        $order->save();

        OrderStatusChanged::dispatch($order, 'confirmed');

        return new OrderResource($order->load(['table', 'items']));
    }

    public function updateItemStatus(Request $request, Order $order, int $itemId): OrderResource
    {
        $validated = $request->validate([
            'status' => ['required', 'in:baru,dimasak,siap,diantar'],
        ]);

        $item = $order->items()->findOrFail($itemId);
        $item->status = $validated['status'];
        $item->save();

        OrderStatusChanged::dispatch($order, 'item-status');

        return new OrderResource($order->load(['table', 'items']));
    }

    public function void(Request $request, Order $order): OrderResource
    {
        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:500'],
        ]);

        if (in_array($order->status, ['selesai', 'dibatalkan'])) {
            throw ValidationException::withMessages([
                'order' => ['Pesanan sudah '.($order->status === 'selesai' ? 'selesai' : 'dibatalkan')],
            ]);
        }

        DB::transaction(function () use ($order, $validated, $request) {
            $order->status = 'dibatalkan';
            $order->void_reason = $validated['reason'];
            $order->voided_by = $request->user()?->id;
            $order->save();

            if ($order->table_id) {
                $table = Table::lockForUpdate()->find($order->table_id);
                if ($table && $table->status === 'terisi') {
                    $table->status = 'kosong';
                    $table->save();
                }
            }
        });

        OrderStatusChanged::dispatch($order, 'voided');

        return new OrderResource($order->load(['table', 'items']));
    }

    /**
     * Tandai pesanan selesai & lepaskan meja (dipakai setelah layanan selesai,
     * karena pembayaran dilakukan di muka).
     */
    public function complete(Request $request, Order $order): OrderResource
    {
        if ($order->status !== 'diproses') {
            throw ValidationException::withMessages([
                'order' => ['Pesanan tidak dalam status diproses'],
            ]);
        }

        DB::transaction(function () use ($order) {
            $order->status = 'selesai';
            $order->save();

            if ($order->table_id) {
                $table = Table::lockForUpdate()->find($order->table_id);
                if ($table && $table->status === 'terisi') {
                    $table->status = 'perlu-dibersihkan';
                    $table->save();
                }
            }
        });

        OrderStatusChanged::dispatch($order, 'paid');

        return new OrderResource($order->load(['table', 'items']));
    }
}
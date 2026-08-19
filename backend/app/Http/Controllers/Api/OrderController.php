<?php

namespace App\Http\Controllers\Api;

use App\Events\OrderStatusChanged;
use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\Table;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class OrderController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        $orders = Order::with(['table', 'items'])->orderByDesc('id')->get();

        return OrderResource::collection($orders);
    }

    public function store(Request $request): OrderResource
    {
        $validated = $request->validate([
            'tableId' => ['nullable', 'exists:tables,id'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.menuItemId' => ['required', 'exists:menu_items,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.note' => ['nullable', 'string'],
        ]);

        $source = match ($request->user()?->role) {
            'kasir' => 'kasir',
            'pelayan' => 'pelayan',
            default => 'self-order',
        };

        $order = DB::transaction(function () use ($validated, $source) {
            $table = $validated['tableId'] ? Table::lockForUpdate()->find($validated['tableId']) : null;

            $menuItems = MenuItem::whereIn('id', collect($validated['items'])->pluck('menuItemId'))->lockForUpdate()->get()->keyBy('id');

            $subtotal = 0;
            foreach ($validated['items'] as $item) {
                $menuItem = $menuItems->get($item['menuItemId']);
                if (! $menuItem || ! $menuItem->available) {
                    throw ValidationException::withMessages([
                        'items' => ['Menu "'.($menuItem->name ?? '?').'" sedang tidak tersedia'],
                    ]);
                }
                $subtotal += $menuItem->price * $item['quantity'];
            }

            $lastId = Order::lockForUpdate()->max('id') ?? 0;
            $orderNumber = 'ORD-'.str_pad((string) ($lastId + 1), 4, '0', STR_PAD_LEFT);

            $order = Order::create([
                'order_number' => $orderNumber,
                'table_id' => $table?->id,
                'source' => $source,
                'status' => $source === 'kasir' ? 'diproses' : 'menunggu-konfirmasi',
                'total' => (int) round($subtotal * 1.1),
            ]);

            foreach ($validated['items'] as $item) {
                $menuItem = $menuItems->get($item['menuItemId']);
                $order->items()->create([
                    'menu_item_id' => $menuItem->id,
                    'name' => $menuItem->name,
                    'price' => $menuItem->price,
                    'quantity' => $item['quantity'],
                    'note' => $item['note'] ?? null,
                    'status' => 'baru',
                ]);
            }

            if ($table) {
                $table->status = 'terisi';
                $table->save();
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
}
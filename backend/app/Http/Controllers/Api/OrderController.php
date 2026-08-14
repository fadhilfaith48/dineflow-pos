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
            'source' => ['required', 'in:kasir,pelayan,self-order'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.menuItemId' => ['required', 'exists:menu_items,id'],
            'items.*.name' => ['required', 'string'],
            'items.*.price' => ['required', 'integer', 'min:0'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.note' => ['nullable', 'string'],
        ]);

        $order = DB::transaction(function () use ($validated) {
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
                $subtotal += $item['price'] * $item['quantity'];
            }

            $orderNumber = 'ORD-'.str_pad((string) ((Order::max('id') ?? 0) + 1), 4, '0', STR_PAD_LEFT);

            $order = Order::create([
                'order_number' => $orderNumber,
                'table_id' => $table?->id,
                'source' => $validated['source'],
                'status' => $validated['source'] === 'kasir' ? 'baru' : 'menunggu-konfirmasi',
                'total' => (int) round($subtotal * 1.1),
            ]);

            foreach ($validated['items'] as $item) {
                $order->items()->create([
                    'menu_item_id' => $item['menuItemId'],
                    'name' => $item['name'],
                    'price' => $item['price'],
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
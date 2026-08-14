<?php

namespace App\Events;

use App\Http\Resources\OrderItemResource;
use App\Models\Order;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

class OrderStatusChanged implements ShouldBroadcastNow
{
    use Dispatchable;
    use InteractsWithSockets;

    public string $action;

    public array $order;

    public ?string $tableStatus;

    private string $trackChannel;

    public function __construct(Order $order, string $action)
    {
        $order->load(['table', 'items']);

        $this->action = $action;
        $this->order = [
            'id' => $order->id,
            'orderNumber' => $order->order_number,
            'tableId' => $order->table_id,
            'tableNumber' => $order->table?->number,
            'source' => $order->source,
            'status' => $order->status,
            'items' => collect($order->items)
                ->map(fn ($item) => (new OrderItemResource($item))->resolve())
                ->all(),
            'total' => $order->total,
            'createdAt' => $order->created_at?->toIso8601String(),
            'updatedAt' => $order->updated_at?->toIso8601String(),
        ];
        $this->tableStatus = $order->table?->status;
        $this->trackChannel = 'order.'.$order->order_number;
    }

    /**
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new Channel('orders'),
            new Channel($this->trackChannel),
        ];
    }

    public function broadcastAs(): string
    {
        return 'OrderStatusChanged';
    }
}

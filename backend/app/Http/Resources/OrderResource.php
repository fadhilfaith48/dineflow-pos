<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'orderNumber' => $this->order_number,
            'tableId' => $this->table_id,
            'tableNumber' => $this->whenLoaded('table', fn () => $this->table?->number),
            'source' => $this->source,
            'status' => $this->status,
            'items' => OrderItemResource::collection($this->whenLoaded('items')),
            'total' => $this->total,
            'createdAt' => $this->created_at?->toIso8601String(),
            'updatedAt' => $this->updated_at?->toIso8601String(),
        ];
    }
}
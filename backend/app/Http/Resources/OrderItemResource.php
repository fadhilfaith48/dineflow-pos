<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'menuItemId' => $this->menu_item_id,
            'name' => $this->name,
            'variantName' => $this->variant_name,
            'price' => $this->price,
            'quantity' => $this->quantity,
            'note' => $this->note,
            'status' => $this->status,
        ];
    }
}
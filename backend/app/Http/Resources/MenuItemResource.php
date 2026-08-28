<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MenuItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'code' => $this->code,
            'name' => $this->name,
            'description' => $this->description,
            'price' => $this->price,
            'categoryId' => $this->category_id,
            'available' => $this->available,
            'isSpicy' => $this->is_spicy,
            'imageUrl' => $this->image_url,
            'variants' => MenuItemVariantResource::collection($this->whenLoaded('variants')),
        ];
    }
}
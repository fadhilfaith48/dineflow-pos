<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['order_id', 'menu_item_id', 'name', 'variant_name', 'price', 'quantity', 'note', 'spice_level', 'status'])]
class OrderItem extends Model
{
    protected function casts(): array
    {
        return [
            'price' => 'integer',
            'quantity' => 'integer',
            'spice_level' => 'integer',
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function menuItem(): BelongsTo
    {
        return $this->belongsTo(MenuItem::class);
    }
}
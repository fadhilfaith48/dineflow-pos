<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['menu_item_id', 'name', 'price', 'available', 'order'])]
class MenuItemVariant extends Model
{
    protected function casts(): array
    {
        return [
            'price' => 'integer',
            'available' => 'boolean',
            'order' => 'integer',
        ];
    }

    public function menuItem(): BelongsTo
    {
        return $this->belongsTo(MenuItem::class);
    }
}

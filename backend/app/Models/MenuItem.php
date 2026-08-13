<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['code', 'name', 'description', 'price', 'category_id', 'available', 'image_url'])]
class MenuItem extends Model
{
    protected function casts(): array
    {
        return [
            'price' => 'integer',
            'available' => 'boolean',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(MenuCategory::class);
    }
}
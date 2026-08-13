<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['name', 'order'])]
class MenuCategory extends Model
{
    public function menuItems(): HasMany
    {
        return $this->hasMany(MenuItem::class);
    }
}
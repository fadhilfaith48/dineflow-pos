<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['number', 'seats', 'status', 'qr_code'])]
class Table extends Model
{
    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }
}
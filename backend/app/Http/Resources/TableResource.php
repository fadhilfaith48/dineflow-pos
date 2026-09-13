<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TableResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'number' => $this->number,
            'status' => $this->status,
            'seats' => $this->seats,
            // Token QR hanya untuk staf login (kasir/pelayan/admin) agar URL
            // /menu/{token} tidak bisa dibaca orang dari daftar meja publik.
            'qrCode' => $request->user('sanctum') ? $this->qr_code : null,
        ];
    }
}
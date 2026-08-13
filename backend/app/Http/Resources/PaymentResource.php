<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PaymentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'orderId' => $this->order_id,
            'method' => $this->method,
            'amount' => $this->amount,
            'cashReceived' => $this->cash_received,
            'change' => $this->change,
            'paidBy' => $this->paid_by,
            'paidAt' => $this->paid_at?->toIso8601String(),
        ];
    }
}
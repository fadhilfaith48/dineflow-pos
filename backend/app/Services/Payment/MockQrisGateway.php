<?php

namespace App\Services\Payment;

use Illuminate\Support\Str;

/**
 * Driver cadangan/demo tanpa akun maupun koneksi internet ke gateway.
 * Menghasilkan reference fiktif dan QR payload lokal; status hanya berubah
 * menjadi "paid" lewat markPaid() (tombol "Saya Sudah Bayar" di frontend).
 */
class MockQrisGateway implements PaymentGateway
{
    public function createPayment(string $orderNumber, int $amount, string $paidVia): array
    {
        $reference = 'MOCK-'.strtoupper(Str::random(12));

        $merchant = 'ID.CO.DINEFLOW.QRIS';
        $payload = '000201010212'.'2612'.'DINEFLOW'.'52045678'.'5303360'
            .'54'.str_pad((string) strlen((string) $amount), 2, '0', STR_PAD_LEFT).$amount
            .'5802ID'.'59'.str_pad((string) strlen('DINEFLOW'), 2, '0', STR_PAD_LEFT).'DINEFLOW'
            .'62'.'05'.'REF'.Str::substr($reference, 5, 5).'6304';

        return [
            'reference' => $reference,
            'qrContent' => $payload,
            'gateway' => 'mock',
        ];
    }

    public function getStatus(string $reference, string $invoiceNumber): string
    {
        return 'pending';
    }

    public function markPaid(string $reference): string
    {
        return 'paid';
    }
}

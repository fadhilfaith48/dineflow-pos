<?php

namespace App\Services\Payment;

interface PaymentGateway
{
    /**
     * Buat transaksi pembayaran (QRIS) di gateway.
     *
     * @return array{reference: string, qrContent: ?string, gateway: string}
     */
    public function createPayment(string $orderNumber, int $amount, string $paidVia): array;

    /**
     * Ambil status pembayaran dari gateway.
     *
     * @param  string  $reference  reference transaksi yang dibuat gateway (createPayment)
     * @param  string  $invoiceNumber  no. invoice/order (DOKU memakai ini untuk query status)
     * @return 'pending'|'paid'|'failed'|'expired'|'cancelled'
     */
    public function getStatus(string $reference, string $invoiceNumber): string;

    /**
     * Tandai pembayaran lunas secara manual (hanya untuk driver Mock / demo).
     *
     * @return 'pending'|'paid'|'failed'|'expired'|'cancelled'
     */
    public function markPaid(string $reference): string;
}

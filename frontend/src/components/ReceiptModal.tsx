import type { OrderItem, PaymentMethod } from '@/types'
import { formatRupiah } from '@/lib/format'
import { Button } from '@/components/Button'

export interface ReceiptData {
  orderNumber: string
  tableLabel: string
  createdAt: string
  items: Pick<OrderItem, 'name' | 'quantity' | 'price' | 'note'>[]
  subtotal: number
  tax: number
  total: number
  method: PaymentMethod
  change?: number
  taxRate?: number
  restaurantName?: string
  restaurantAddress?: string
  logoUrl?: string
}

interface ReceiptModalProps {
  receipt: ReceiptData
  onClose: () => void
}

export function ReceiptModal({ receipt, onClose }: ReceiptModalProps) {
  function handleCopy() {
    const lines = [
      receipt.restaurantName || 'DINEFLOW RESTAURANT',
      receipt.orderNumber,
      receipt.tableLabel,
      new Date(receipt.createdAt).toLocaleString('id-ID'),
      '------------------------------',
      ...receipt.items.map(
        (i) => `${i.quantity}x ${i.name}${i.note ? ` (${i.note})` : ''}\n${formatRupiah(i.price * i.quantity)}`,
      ),
      '------------------------------',
      `Subtotal\t${formatRupiah(receipt.subtotal)}`,
      `Pajak ${receipt.taxRate ?? 10}%\t${formatRupiah(receipt.tax)}`,
      `TOTAL\t${formatRupiah(receipt.total)}`,
      `Bayar\t${receipt.method === 'tunai' ? 'Tunai' : 'QRIS'}`,
      ...(receipt.change != null ? [`Kembalian\t${formatRupiah(receipt.change)}`] : []),
      '',
      'Terima kasih sudah berkunjung!',
    ]
    navigator.clipboard.writeText(lines.join('\n'))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/40 p-4">
      <div className="w-full max-w-[300px] overflow-hidden rounded-xl bg-bg-surface shadow-modal">
        <div id="print-area" className="bg-white p-4 font-mono text-[11px] leading-snug text-black">
          <div className="text-center">
            {receipt.logoUrl && (
              <img src={receipt.logoUrl} alt="Logo" className="mx-auto mb-1 h-14 w-14 object-contain" />
            )}
            <div className="text-[13px] font-bold tracking-wide">{receipt.restaurantName || 'DINEFLOW RESTAURANT'}</div>
            <div className="mt-0.5">{receipt.restaurantAddress || 'Jl. Raya No. 1, Jakarta'}</div>
            <div className="mt-1.5">{receipt.orderNumber}</div>
            <div>{receipt.tableLabel}</div>
            <div>{new Date(receipt.createdAt).toLocaleString('id-ID')}</div>
          </div>

          <div className="my-2 border-t border-dashed border-black" />

          {receipt.items.map((item, index) => (
            <div key={index} className="flex justify-between gap-2">
              <div className="min-w-0">
                <div>{item.quantity}x {item.name}</div>
                {item.note && <div className="pl-3 text-[11px]">- {item.note}</div>}
              </div>
              <div className="shrink-0">{formatRupiah(item.price * item.quantity)}</div>
            </div>
          ))}

          <div className="my-2 border-t border-dashed border-black" />

          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatRupiah(receipt.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Pajak {receipt.taxRate ?? 10}%</span>
            <span>{formatRupiah(receipt.tax)}</span>
          </div>
          <div className="mt-1 flex justify-between font-bold">
            <span>TOTAL</span>
            <span>{formatRupiah(receipt.total)}</span>
          </div>
          <div className="mt-1 flex justify-between">
            <span>Bayar</span>
            <span>{receipt.method === 'tunai' ? 'Tunai' : 'QRIS'}</span>
          </div>
          {receipt.change != null && (
            <div className="flex justify-between">
              <span>Kembalian</span>
              <span>{formatRupiah(receipt.change)}</span>
            </div>
          )}

          <div className="mt-2 text-center">Terima kasih sudah berkunjung!</div>
        </div>

        <div className="flex gap-2 border-t border-border-subtle bg-bg-surface p-4 print:hidden">
          <Button variant="outline" fullWidth onClick={handleCopy}>
            Salin Struk
          </Button>
          <Button fullWidth onClick={() => window.print()}>
            Cetak
          </Button>
        </div>
        <div className="bg-bg-surface px-4 pb-4 print:hidden">
          <Button variant="outline" fullWidth onClick={onClose}>
            Tutup
          </Button>
        </div>
      </div>
    </div>
  )
}

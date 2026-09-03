import type { Order, Settings } from '@/types'
import type { ReceiptData } from '@/components/ReceiptModal'

/**
 * Bangun data struk dari sebuah order (+ payment opsional) dan pengaturan restoran.
 * Dipakai Kasir (setelah bayar & cetak ulang dari riwayat) dan Admin (cetak ulang).
 */
export function orderToReceipt(order: Order, payment: Order['payment'], settings?: Settings): ReceiptData {
  const fallbackSubtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const subtotal = typeof payment?.subtotal === 'number' ? payment.subtotal : fallbackSubtotal
  const tax = typeof payment?.ppnAmount === 'number' ? payment.ppnAmount : Math.round(order.total - subtotal)
  return {
    orderNumber: order.orderNumber,
    tableLabel: order.tableNumber ? `Meja ${order.tableNumber}` : 'Bawa Pulang',
    createdAt: order.createdAt,
    items: order.items.map((item) => {
      const parts = [item.name]
      if (item.variantName) parts.push(item.variantName)
      if (typeof item.spiceLevel === 'number') parts.push(`Level ${item.spiceLevel}`)
      return {
        name: parts.join(' · '),
        quantity: item.quantity,
        price: item.price,
        note: item.note,
      }
    }),
    subtotal,
    tax,
    total: order.total,
    method: payment?.method ?? 'tunai',
    change: payment?.change ?? undefined,
    taxRate: settings?.taxRate ?? 10,
    restaurantName: settings?.restaurantName,
    restaurantAddress: settings?.restaurantAddress,
    logoUrl: settings?.logoUrl,
  }
}

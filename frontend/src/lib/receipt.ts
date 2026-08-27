import type { Order, Settings } from '@/types'
import type { ReceiptData } from '@/components/ReceiptModal'

/**
 * Bangun data struk dari sebuah order (+ payment opsional) dan pengaturan restoran.
 * Dipakai Kasir (setelah bayar & cetak ulang dari riwayat) dan Admin (cetak ulang).
 */
export function orderToReceipt(order: Order, payment: Order['payment'], settings?: Settings): ReceiptData {
  const subtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  return {
    orderNumber: order.orderNumber,
    tableLabel: order.tableNumber ? `Meja ${order.tableNumber}` : 'Take Away',
    createdAt: order.createdAt,
    items: order.items.map((item) => ({
      name: item.variantName ? `${item.name} (${item.variantName})` : item.name,
      quantity: item.quantity,
      price: item.price,
      note: item.note,
    })),
    subtotal,
    tax: Math.round(order.total - subtotal),
    total: order.total,
    method: payment?.method ?? 'tunai',
    change: payment?.change ?? undefined,
    taxRate: settings?.taxRate ?? 10,
    restaurantName: settings?.restaurantName,
    restaurantAddress: settings?.restaurantAddress,
    logoUrl: settings?.logoUrl,
  }
}

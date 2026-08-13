import { useCallback, useEffect, useState } from 'react'
import type { Order, OrderItem } from '@/types'
import { api } from '@/services/httpApi'
import { TopNavBar } from '@/components/TopNavBar'
import { OrderTicket } from './OrderTicket'

export function KitchenPage() {
  const [orders, setOrders] = useState<Order[]>([])

  const loadOrders = useCallback(() => {
    api.getOrders().then(setOrders)
  }, [])

  useEffect(() => {
    loadOrders()
    const timer = setInterval(loadOrders, 5000)
    return () => clearInterval(timer)
  }, [loadOrders])

  async function handleAdvanceItem(orderId: number, itemId: number, status: OrderItem['status']) {
    await api.updateItemStatus(orderId, itemId, status)
    loadOrders()
  }

  const activeOrders = orders
    .filter((o) => o.status === 'diproses')
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  return (
    <div className="flex min-h-screen flex-col bg-bg-secondary">
      <TopNavBar />

      <main className="flex-1 p-6">
        {activeOrders.length === 0 ? (
          <div className="flex h-full min-h-[60vh] items-center justify-center">
            <div className="text-center">
              <div className="font-num text-[40px] text-status-ready">✓</div>
              <p className="mt-2 text-heading font-semibold text-text-primary">Tidak ada pesanan aktif</p>
              <p className="mt-1 text-body text-text-secondary">Pesanan baru akan muncul di sini secara real-time.</p>
            </div>
          </div>
        ) : (
          <div className="grid auto-rows-min grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {activeOrders.map((order) => (
              <OrderTicket key={order.id} order={order} onAdvanceItem={handleAdvanceItem} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

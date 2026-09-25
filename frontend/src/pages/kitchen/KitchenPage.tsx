import { useCallback, useEffect, useRef, useState } from 'react'
import type { Order, OrderItem } from '@/types'
import { api } from '@/services/httpApi'
import echo from '@/services/echo'
import { TopNavBar } from '@/components/TopNavBar'
import { ErrorBanner } from '@/components/ErrorBanner'
import { OrderTicket } from './OrderTicket'

export function KitchenPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [error, setError] = useState('')
  const [pendingKeys, setPendingKeys] = useState<Set<string>>(new Set())
  const pendingRef = useRef(new Set<string>())

  const loadOrders = useCallback(() => {
    api.getOrders().then(setOrders).catch(() => {
      setError('Gagal memuat pesanan. Cek koneksi ke server.')
    })
  }, [])

  useEffect(() => {
    loadOrders()
    echo.private('orders').listen('OrderStatusChanged', loadOrders)
    return () => {
      echo.leaveChannel('orders')
    }
  }, [loadOrders])

  async function handleAdvanceItem(orderId: number, itemId: number, status: OrderItem['status']) {
    const key = `${orderId}:${itemId}`
    if (pendingRef.current.has(key)) return
    pendingRef.current.add(key)
    setPendingKeys(new Set(pendingRef.current))
    try {
      await api.updateItemStatus(orderId, itemId, status)
      loadOrders()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memperbarui status item.')
    } finally {
      pendingRef.current.delete(key)
      setPendingKeys(new Set(pendingRef.current))
    }
  }

  const activeOrders = orders
    .filter((o) => o.status === 'diproses')
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  return (
    <div className="flex min-h-dvh flex-col bg-bg-secondary">
      <TopNavBar />

      <main className="flex-1 p-6">
        {error && <ErrorBanner message={error} className="mb-4" />}
        {activeOrders.length === 0 ? (
          <div className="flex h-full min-h-[60vh] items-center justify-center">
            <div className="text-center">
              <div className="font-num text-kitchen-display text-status-ready">✓</div>
              <p className="mt-2 text-heading font-semibold text-text-primary">Tidak ada pesanan aktif</p>
              <p className="mt-1 text-body text-text-secondary">Pesanan baru akan muncul di sini secara real-time.</p>
            </div>
          </div>
        ) : (
          <div className="grid auto-rows-min grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-6">
            {activeOrders.map((order) => (
              <OrderTicket key={order.id} order={order} pendingKeys={pendingKeys} onAdvanceItem={handleAdvanceItem} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default KitchenPage

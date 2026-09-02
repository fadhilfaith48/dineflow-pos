import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import type { Order } from '@/types'
import { api } from '@/services/httpApi'
import echo from '@/services/echo'
import { OrderTracking } from '@/components/OrderTracking'

export function OrderTrackingPage() {
  const { orderNumber = '' } = useParams<{ orderNumber: string }>()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    if (!orderNumber) return
    let active = true
    api
      .getOrderByNumber(orderNumber)
      .then((found) => {
        if (!active) return
        setOrder(found)
        setMissing(!found)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [orderNumber])

  useEffect(() => {
    if (!orderNumber) return
    echo.channel(`order.${orderNumber}`).listen('OrderStatusChanged', (event: { order?: Order }) => {
      if (event.order?.orderNumber === orderNumber) setOrder(event.order)
    })
    return () => {
      echo.leaveChannel(`order.${orderNumber}`)
    }
  }, [orderNumber])

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg-secondary">
        <p className="text-body text-text-secondary">Memuat pesanan…</p>
      </main>
    )
  }

  if (missing || !order) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg-secondary px-6 text-center">
        <div className="font-num text-heading text-status-danger">!</div>
        <h1 className="text-heading font-semibold text-text-primary">Pesanan tidak ditemukan</h1>
        <p className="text-body text-text-secondary">
          Pastikan kode pesanan benar dan sudah pernah dibuat.
        </p>
      </main>
    )
  }

  return (
    <OrderTracking
      orderNumber={order.orderNumber}
      table={order.tableNumber ?? undefined}
      order={order}
      showOverall
    />
  )
}
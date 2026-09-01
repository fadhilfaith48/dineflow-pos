import { useEffect, useState } from 'react'
import type { Order } from '@/types'
import { formatRupiah, formatElapsed } from '@/lib/format'
import { StatusBadge, type BadgeVariant } from '@/components/StatusBadge'

const orderStatusBadge: Record<Order['status'], BadgeVariant> = {
  'menunggu-konfirmasi': 'new',
  baru: 'new',
  diproses: 'neutral',
  selesai: 'done',
  dibatalkan: 'danger',
}

const orderStatusBar: Record<Order['status'], string> = {
  'menunggu-konfirmasi': 'bg-status-new',
  baru: 'bg-status-new',
  diproses: 'bg-status-cooking',
  selesai: 'bg-status-done',
  dibatalkan: 'bg-status-danger',
}

interface OrderListProps {
  orders: Order[]
  onDeliver: (orderId: number) => void
  onBack: () => void
}

export function OrderList({ orders, onDeliver, onBack }: OrderListProps) {
  const active = orders.filter((o) => o.status !== 'dibatalkan')

  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000)
    return () => clearInterval(id)
  }, [])
  const now = Date.now()

  return (
    <main className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col bg-bg-secondary">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border-subtle bg-bg-surface px-4 py-3">
        <button
          onClick={onBack}
          aria-label="Kembali"
          className="flex h-11 w-11 items-center justify-center rounded-lg border border-border-subtle text-text-primary"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-heading font-semibold text-text-primary">Daftar Pesanan</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {active.length === 0 ? (
          <p className="py-16 text-center text-body text-text-secondary">Belum ada pesanan aktif.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {active.map((order) => {
              const allDelivered = order.items.every((i) => i.status === 'diantar')
              const elapsed = formatElapsed(new Date(order.createdAt).getTime(), now)
              return (
                <li key={order.id} className="relative flex flex-col gap-3 overflow-hidden rounded-xl border border-border-subtle bg-bg-surface p-4 shadow-card">
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${orderStatusBar[order.status]}`} />
                  <div className="flex items-center justify-between pl-1">
                    <div>
                      <div className="font-num text-subheading font-bold text-text-primary">{order.orderNumber}</div>
                      <div className="text-caption text-text-secondary">
                        <span className="flex items-center gap-1">
                          <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 6v6l4 2" />
                          </svg>
                          <span>Meja {order.tableNumber ?? '-'} · {elapsed}</span>
                        </span>
                      </div>
                    </div>
                    <StatusBadge variant={orderStatusBadge[order.status]} label={order.status} />
                  </div>
                  <ul className="divide-y divide-border-subtle pl-1">
                    {order.items.map((item) => (
                      <li key={item.id} className="flex items-center justify-between gap-2 py-2">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-body text-text-primary">
                            <span className="font-num font-semibold text-text-primary">{item.quantity}x</span>{' '}
                            {item.name}
                          </div>
                          {item.note && (
                            <span className="mt-0.5 inline-block rounded bg-status-danger/10 px-1.5 py-0.5 text-caption font-bold uppercase text-status-danger">
                              {item.note}
                            </span>
                          )}
                        </div>
                        <StatusBadge variant={item.status === 'diantar' ? 'done' : item.status === 'siap' ? 'ready' : item.status === 'dimasak' ? 'cooking' : 'new'} label={item.status} />
                      </li>
                    ))}
                  </ul>
                  <div className="flex items-center justify-between border-t border-border-subtle pl-1 pt-3">
                    <span className="font-num text-body font-bold text-text-primary">{formatRupiah(order.total)}</span>
                    {!allDelivered ? (
                      <button
                        onClick={() => onDeliver(order.id)}
                        className="rounded-lg bg-accent-primary px-4 py-2 text-caption font-bold uppercase tracking-wide text-text-on-accent transition-colors hover:bg-accent-primary-hover"
                      >
                        Antarkan
                      </button>
                    ) : (
                      <span className="text-caption font-semibold uppercase tracking-wide text-status-ready">Sudah diantar</span>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </main>
  )
}

import type { Order } from '@/types'
import { formatRupiah } from '@/lib/format'
import { StatusBadge, type BadgeVariant } from '@/components/StatusBadge'

const orderStatusBadge: Record<Order['status'], BadgeVariant> = {
  'menunggu-konfirmasi': 'new',
  baru: 'new',
  diproses: 'neutral',
  selesai: 'done',
  dibatalkan: 'danger',
}

interface OrderListProps {
  orders: Order[]
  onDeliver: (orderId: number) => void
  onBack: () => void
}

export function OrderList({ orders, onDeliver, onBack }: OrderListProps) {
  const active = orders.filter((o) => o.status !== 'dibatalkan')

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
              return (
                <li key={order.id} className="rounded-xl border border-border-subtle bg-bg-surface p-4 shadow-card">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-num text-subheading font-bold text-text-primary">{order.orderNumber}</div>
                      <div className="text-caption text-text-secondary">
                        Meja {order.tableNumber ?? '-'} · {new Date(order.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <StatusBadge variant={orderStatusBadge[order.status]} label={order.status} />
                  </div>
                  <ul className="mt-3 divide-y divide-border-subtle">
                    {order.items.map((item) => (
                      <li key={item.id} className="flex items-center justify-between py-2">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-body text-text-primary">
                            {item.quantity}× {item.name}
                          </div>
                          {item.note && <div className="truncate text-caption text-text-secondary">- {item.note}</div>}
                        </div>
                        <div className="ml-2 flex items-center gap-2">
                          <StatusBadge variant={item.status === 'diantar' ? 'done' : item.status === 'siap' ? 'ready' : item.status === 'dimasak' ? 'cooking' : 'new'} label={item.status} />
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="font-num text-body font-bold text-text-primary">{formatRupiah(order.total)}</span>
                    {!allDelivered ? (
                      <button
                        onClick={() => onDeliver(order.id)}
                        className="rounded-lg bg-accent-primary px-4 py-2 text-caption font-bold uppercase tracking-wide text-text-on-accent transition-colors hover:bg-accent-primary-hover"
                      >
                        Tandai Diantar
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

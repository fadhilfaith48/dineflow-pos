import { useState } from 'react'
import type { Order } from '@/types'
import { formatRupiah } from '@/lib/format'
import { Button } from '@/components/Button'

const sourceLabel: Record<Order['source'], string> = {
  kasir: 'Kasir',
  pelayan: 'Pelayan',
  'self-order': 'Self-Order',
}

interface KasirQueuePanelProps {
  pendingOrders: Order[]
  activeNotes: Order[]
  onConfirm: (orderId: number) => void
  onPayNote: (order: Order) => void
}

type Tab = 'masuk' | 'nota'

function OrderCard({
  order,
  action,
}: {
  order: Order
  action: { label: string; onClick: () => void; primary?: boolean }
}) {
  return (
    <li className="rounded-lg border border-border-subtle p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-num text-caption font-bold text-text-primary">{order.orderNumber}</div>
          <div className="text-caption text-text-secondary">
            Meja {order.tableNumber ?? '-'} ·{' '}
            {new Date(order.createdAt).toLocaleTimeString('id-ID', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-status-new/15 px-2.5 py-0.5 text-caption font-bold uppercase tracking-wide text-status-new">
          {sourceLabel[order.source]}
        </span>
      </div>

      <ul className="mt-2 divide-y divide-border-subtle">
        {order.items.map((item) => (
          <li key={item.id} className="flex justify-between gap-2 py-1 text-caption text-text-primary">
            <span className="min-w-0 truncate">
              {item.quantity}× {item.name}
            </span>
            <span className="shrink-0 font-num">{formatRupiah(item.price * item.quantity)}</span>
          </li>
        ))}
      </ul>

      <div className="mt-2 flex items-center justify-between gap-2 border-t border-border-subtle pt-2">
        <span className="font-num text-caption font-bold text-text-primary">{formatRupiah(order.total)}</span>
        <Button size="sm" variant={action.primary ? 'primary' : 'outline'} onClick={action.onClick}>
          {action.label}
        </Button>
      </div>
    </li>
  )
}

export function KasirQueuePanel({
  pendingOrders,
  activeNotes,
  onConfirm,
  onPayNote,
}: KasirQueuePanelProps) {
  const [tab, setTab] = useState<Tab>('masuk')

  return (
    <aside className="flex w-72 shrink-0 flex-col overflow-hidden rounded-xl border border-border-subtle bg-bg-surface shadow-card">
      <header className="flex border-b border-border-subtle">
        <button
          onClick={() => setTab('masuk')}
          className={`flex flex-1 items-center justify-center gap-2 py-3 text-body font-bold uppercase tracking-wide transition-colors ${
            tab === 'masuk'
              ? 'border-b-2 border-accent-primary text-accent-primary'
              : 'border-b-2 border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Masuk
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-status-new px-1.5 font-num text-caption font-bold text-white">
            {pendingOrders.length}
          </span>
        </button>
        <button
          onClick={() => setTab('nota')}
          className={`flex flex-1 items-center justify-center gap-2 py-3 text-body font-bold uppercase tracking-wide transition-colors ${
            tab === 'nota'
              ? 'border-b-2 border-accent-primary text-accent-primary'
              : 'border-b-2 border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Nota
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-primary px-1.5 font-num text-caption font-bold text-white">
            {activeNotes.length}
          </span>
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-3">
        {tab === 'masuk' ? (
          pendingOrders.length === 0 ? (
            <p className="py-10 text-center text-body text-text-secondary">Tidak ada pesanan masuk.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {pendingOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  action={{ label: 'Konfirmasi', primary: true, onClick: () => onConfirm(order.id) }}
                />
              ))}
            </ul>
          )
        ) : activeNotes.length === 0 ? (
          <p className="py-10 text-center text-body text-text-secondary">Tidak ada nota aktif.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {activeNotes.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                action={{ label: 'Bayar', primary: true, onClick: () => onPayNote(order) }}
              />
            ))}
          </ul>
        )}
      </div>
    </aside>
  )
}
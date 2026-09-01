import { useMemo, useState } from 'react'
import type { Order, PaymentMethod } from '@/types'
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
  historyOrders: Order[]
  onConfirm: (orderId: number) => void
  onVoid: (order: Order) => void
  onPayNote: (order: Order) => void
  onReprint: (order: Order) => void
}

type Panel = 'aktif' | 'riwayat'
type Tab = 'masuk' | 'nota'
type Scope = 'hari-ini' | 'semua'

function isToday(isoDate: string): boolean {
  const d = new Date(isoDate)
  const now = new Date()
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  )
}

/** Badge metode bayar: Tunai = hijau (status-ready), QRIS = biru (status-done). */
function MethodBadge({ method }: { method?: PaymentMethod }) {
  if (!method) return null
  const cls =
    method === 'tunai'
      ? 'bg-status-ready/15 text-status-ready'
      : 'bg-status-done/15 text-status-done'
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${cls}`}>
      {method === 'tunai' ? 'Tunai' : 'QRIS'}
    </span>
  )
}

function HistoryRow({ order, onClick }: { order: Order; onClick: () => void }) {
  const isCancelled = order.status === 'dibatalkan'
  return (
    <li>
      <button
        onClick={onClick}
        title={isCancelled ? 'Pesanan dibatalkan' : 'Cetak ulang struk'}
        className={`w-full rounded-lg border p-3 text-left transition-colors ${
          isCancelled
            ? 'border-status-danger/30 bg-status-danger/5 opacity-60'
            : 'border-border-subtle hover:border-accent-primary hover:bg-accent-tint/40'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="min-w-0 truncate font-num text-caption font-bold text-text-primary">
            {order.orderNumber}
          </span>
          <div className="flex items-center gap-1.5">
            {isCancelled && (
              <span className="shrink-0 rounded-full bg-status-danger/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-status-danger">
                Batal
              </span>
            )}
            <span className="shrink-0 font-num text-caption font-bold text-text-primary">
              {formatRupiah(order.total)}
            </span>
          </div>
        </div>
        <div className="mt-1 flex items-center justify-between gap-2">
          <span className="min-w-0 truncate text-caption text-text-secondary">
            {new Date(order.createdAt).toLocaleTimeString('id-ID', {
              hour: '2-digit',
              minute: '2-digit',
            })}
            {' · '}
            {order.tableNumber ? `Meja ${order.tableNumber}` : sourceLabel[order.source]}
          </span>
          {!isCancelled && <MethodBadge method={order.payment?.method} />}
        </div>
        {isCancelled && order.voidReason && (
          <div className="mt-1 truncate text-caption font-medium text-status-danger">
            {order.voidReason}
          </div>
        )}
      </button>
    </li>
  )
}

function OrderCard({
  order,
  action,
  onVoid,
}: {
  order: Order
  action: { label: string; onClick: () => void; primary?: boolean }
  onVoid?: () => void
}) {
  return (
    <li className="rounded-xl border border-border-subtle bg-bg-surface p-3 shadow-card">
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
              {item.variantName && <span className="text-text-secondary"> ({item.variantName})</span>}
              {typeof item.spiceLevel === 'number' && (
                <span className="text-status-danger"> Level {item.spiceLevel}</span>
              )}
            </span>
            <span className="shrink-0 font-num">{formatRupiah(item.price * item.quantity)}</span>
          </li>
        ))}
      </ul>

      <div className="mt-2 flex items-center justify-between gap-2 border-t border-border-subtle pt-2">
        <span className="font-num text-caption font-bold text-text-primary">{formatRupiah(order.total)}</span>
        <div className="flex gap-1.5">
          {onVoid && (
            <Button size="sm" variant="danger" onClick={onVoid}>
              Batalkan
            </Button>
          )}
          <Button size="sm" variant={action.primary ? 'primary' : 'outline'} onClick={action.onClick}>
            {action.label}
          </Button>
        </div>
      </div>
    </li>
  )
}

const panelPill = (active: boolean) =>
  `flex-1 rounded-lg px-3 py-2 text-body font-semibold transition-colors ${
    active ? 'bg-accent-primary text-text-on-accent' : 'bg-bg-secondary text-text-secondary hover:text-text-primary'
  }`

export function KasirQueuePanel({
  pendingOrders,
  activeNotes,
  historyOrders,
  onConfirm,
  onVoid,
  onPayNote,
  onReprint,
}: KasirQueuePanelProps) {
  const [panel, setPanel] = useState<Panel>('aktif')
  const [tab, setTab] = useState<Tab>('masuk')
  const [scope, setScope] = useState<Scope>('hari-ini')

  const visibleHistory = useMemo(
    () => (scope === 'hari-ini' ? historyOrders.filter((o) => isToday(o.createdAt)) : historyOrders),
    [historyOrders, scope],
  )

  return (
    <aside className="flex w-full shrink-0 flex-col overflow-hidden rounded-xl border border-border-subtle bg-bg-surface shadow-card md:w-72">
      <header className="flex gap-2 border-b border-border-subtle p-2">
        <button onClick={() => setPanel('aktif')} className={panelPill(panel === 'aktif')}>
          Pesanan Aktif
        </button>
        <button onClick={() => setPanel('riwayat')} className={panelPill(panel === 'riwayat')}>
          Riwayat
        </button>
      </header>

      {panel === 'aktif' ? (
        <>
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
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-status-new px-1.5 font-num text-caption font-bold text-text-on-accent">
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
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-primary px-1.5 font-num text-caption font-bold text-text-on-accent">
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
                      onVoid={() => onVoid(order)}
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
                    onVoid={() => onVoid(order)}
                  />
                ))}
              </ul>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="flex gap-2 border-b border-border-subtle p-2">
            <button
              onClick={() => setScope('hari-ini')}
              className={`flex-1 rounded-full px-3 py-1.5 text-caption font-semibold transition-colors ${
                scope === 'hari-ini'
                  ? 'bg-accent-tint text-accent-primary'
                  : 'bg-bg-secondary text-text-secondary hover:text-text-primary'
              }`}
            >
              Hari ini
            </button>
            <button
              onClick={() => setScope('semua')}
              className={`flex-1 rounded-full px-3 py-1.5 text-caption font-semibold transition-colors ${
                scope === 'semua'
                  ? 'bg-accent-tint text-accent-primary'
                  : 'bg-bg-secondary text-text-secondary hover:text-text-primary'
              }`}
            >
              Semua
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {visibleHistory.length === 0 ? (
              <p className="py-10 text-center text-body text-text-secondary">
                {scope === 'hari-ini' ? 'Belum ada transaksi hari ini.' : 'Belum ada transaksi.'}
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {visibleHistory.map((order) => (
                  <HistoryRow key={order.id} order={order} onClick={() => onReprint(order)} />
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </aside>
  )
}

import type { Order } from '@/types'
import { StatusBadge, type BadgeVariant } from '@/components/StatusBadge'

const itemBadge: Record<string, BadgeVariant> = {
  baru: 'new',
  dimasak: 'cooking',
  siap: 'ready',
  diantar: 'done',
}

const orderStatusLabel: Record<string, string> = {
  menunggu: 'Menunggu Pembayaran',
  diproses: 'Sedang Dimasak',
  selesai: 'Selesai',
  dibatalkan: 'Dibatalkan',
}

interface OrderTrackingProps {
  orderNumber: string
  table?: string
  order: Order | null
  subtitle?: string
  footerAction?: { label: string; onClick: () => void }
  showOverall?: boolean
}

export function OrderTracking({
  orderNumber,
  table,
  order,
  subtitle,
  footerAction,
  showOverall = false,
}: OrderTrackingProps) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-bg-secondary">
      <header className="bg-accent-primary px-5 py-6 text-center text-text-on-accent">
        <div className="text-caption font-semibold uppercase tracking-wider opacity-80">Pesanan Terkirim</div>
        <div className="font-num text-heading font-bold">{orderNumber}</div>
        {table && <div className="mt-1 text-caption opacity-90">Meja {table}</div>}
      </header>
      <div className="flex-1 px-4 py-5">
        <p className="text-body text-text-secondary">
          {subtitle ?? 'Pesananmu sudah terbayar di muka. Statusnya diperbarui otomatis.'}
        </p>
        {showOverall && order && (
          <div className="mt-4 flex items-center justify-between rounded-xl border border-border-subtle bg-bg-surface p-4 shadow-card">
            <span className="text-caption font-semibold uppercase tracking-wider text-text-secondary">
              Status Pesanan
            </span>
            <StatusBadge
              variant={orderStatusBadge(order.status)}
              label={orderStatusLabel[order.status] ?? order.status}
            />
          </div>
        )}
        {order && (
          <ul className="mt-5 flex flex-col gap-3">
            {order.items.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between rounded-xl border border-border-subtle bg-bg-surface p-4 shadow-card"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-body font-semibold text-text-primary">
                    {item.quantity}× {item.name}
                    {item.variantName && (
                      <span className="ml-1 text-caption text-text-secondary">({item.variantName})</span>
                    )}
                    {typeof item.spiceLevel === 'number' && (
                      <span className="ml-1 text-caption text-status-danger">Level {item.spiceLevel}</span>
                    )}
                  </div>
                </div>
                <StatusBadge variant={itemBadge[item.status] ?? 'new'} label={item.status} />
              </li>
            ))}
          </ul>
        )}
      </div>
      {footerAction && (
        <div className="border-t border-border-subtle bg-bg-surface p-4">
          <button
            onClick={footerAction.onClick}
            className="h-14 w-full rounded-xl border border-border-subtle text-body font-semibold text-text-primary"
          >
            {footerAction.label}
          </button>
        </div>
      )}
    </main>
  )
}

function orderStatusBadge(status: string): BadgeVariant {
  switch (status) {
    case 'menunggu':
      return 'new'
    case 'diproses':
      return 'cooking'
    case 'selesai':
      return 'done'
    default:
      return 'new'
  }
}
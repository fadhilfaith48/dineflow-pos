import type { Order, OrderItem } from '@/types'
import { formatRupiah } from '@/lib/format'

interface OrderTicketProps {
  order: Order
  onAdvanceItem: (orderId: number, itemId: number, status: OrderItem['status']) => void
}

const nextStatus: Record<OrderItem['status'], OrderItem['status'] | null> = {
  baru: 'dimasak',
  dimasak: 'siap',
  siap: null,
  diantar: null,
}

const statusBorder: Record<OrderItem['status'], string> = {
  baru: 'border-status-new',
  dimasak: 'border-status-cooking',
  siap: 'border-status-ready',
  diantar: 'border-status-done',
}

const statusText: Record<OrderItem['status'], string> = {
  baru: 'text-status-new',
  dimasak: 'text-status-cooking',
  siap: 'text-status-ready',
  diantar: 'text-status-done',
}

const statusBg: Record<OrderItem['status'], string> = {
  baru: 'bg-status-new/15',
  dimasak: 'bg-status-cooking/15',
  siap: 'bg-status-ready/15',
  diantar: 'bg-status-done/15',
}

export function OrderTicket({ order, onAdvanceItem }: OrderTicketProps) {
  return (
    <article className="flex flex-col overflow-hidden rounded-lg border border-border-subtle bg-bg-surface shadow-card">
      <header className="flex items-start justify-between gap-3 border-b border-dashed border-border-subtle px-5 py-4">
        <div>
          <div className="font-num text-[28px] font-bold leading-tight text-text-primary">
            #{order.orderNumber.replace('ORD-', '')}
          </div>
          <div className="mt-1 text-[17px] font-semibold text-text-secondary">
            Meja {order.tableNumber ?? 'Take Away'}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[17px] font-semibold uppercase tracking-wide text-text-secondary">
            {order.source === 'kasir' ? 'Kasir' : order.source === 'pelayan' ? 'Pelayan' : 'QR'}
          </div>
          <div className="mt-1 font-num text-[15px] text-text-secondary">
            {new Date(order.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </header>

      <ul className="flex-1 divide-y divide-border-subtle">
        {order.items.map((item) => {
          const next = nextStatus[item.status]
          return (
            <li
              key={item.id}
              className={`border-l-[6px] px-5 py-4 ${statusBorder[item.status]}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[24px] font-semibold leading-tight text-text-primary">
                    {item.quantity}× {item.name}
                    {item.variantName && <span className="text-[17px] font-normal text-text-secondary"> ({item.variantName})</span>}
                  </div>
                  {item.note && (
                    <div className="mt-1 text-[16px] font-semibold text-status-danger">
                      - {item.note}
                    </div>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <div className={`inline-flex rounded-full px-4 py-1 text-[16px] font-bold uppercase tracking-wide ${statusBg[item.status]} ${statusText[item.status]}`}>
                    {item.status}
                  </div>
                  {next && (
                    <button
                      onClick={() => onAdvanceItem(order.id, item.id, next)}
                      className="mt-2 block rounded-lg bg-accent-primary px-4 py-2 text-[16px] font-bold uppercase tracking-wide text-text-on-accent transition-colors hover:bg-accent-primary-hover"
                    >
                      {next === 'dimasak' ? 'Mulai Masak' : 'Siap Saji'}
                    </button>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      <footer className="flex items-center justify-between border-t border-border-subtle bg-bg-secondary px-5 py-3">
        <span className="text-[15px] font-semibold text-text-secondary">{order.items.length} item</span>
        <span className="font-num text-[18px] font-bold text-text-primary">{formatRupiah(order.total)}</span>
      </footer>
    </article>
  )
}

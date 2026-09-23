import { useEffect, useMemo, useState } from 'react'
import type { Order, PaymentMethod, Settings } from '@/types'
import { api } from '@/services/httpApi'
import echo from '@/services/echo'
import { formatRupiah } from '@/lib/format'
import { orderToReceipt } from '@/lib/receipt'
import { ReceiptModal } from '@/components/ReceiptModal'
import { ErrorBanner } from '@/components/ErrorBanner'
import { LoadingState } from '@/components/LoadingState'

const sourceLabel: Record<Order['source'], string> = {
  kasir: 'Kasir',
  pelayan: 'Pelayan',
  'self-order': 'Pesan Mandiri',
}

type MethodFilter = 'semua' | PaymentMethod
type StatusFilter = 'semua' | 'diproses' | 'selesai' | 'dibatalkan'

function toYmd(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const gridCols =
  'grid grid-cols-[1.5fr_2fr_1.6fr_0.7fr_1.3fr_1fr] items-center gap-3 px-5'

export function TransactionHistory() {
  const [orders, setOrders] = useState<Order[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState({ start: '', end: '' })
  const [query, setQuery] = useState('')
  const [method, setMethod] = useState<MethodFilter>('semua')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('semua')
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null)

  function loadOrders() {
    api.getOrders()
      .then(setOrders)
      .catch(() => setError('Gagal memuat riwayat transaksi. Periksa koneksi lalu coba lagi.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadOrders()
    api.getSettings().then(setSettings).catch(() => {})
  }, [])

  useEffect(() => {
    echo.private('orders').listen('OrderStatusChanged', (event: { action?: string }) => {
      if (event.action === 'paid' || event.action === 'voided') loadOrders()
    })
    echo.private('settings').listen('SettingsChanged', (event: { settings: Settings }) => {
      setSettings(event.settings)
    })
    return () => {
      echo.leaveChannel('orders')
      echo.leaveChannel('settings')
    }
  }, [])

  const paidOrders = useMemo(
    () => orders.filter((o) => o.status === 'diproses' || o.status === 'selesai' || o.status === 'dibatalkan'),
    [orders],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return paidOrders.filter((o) => {
      const dateOnly = toYmd(new Date(o.createdAt))
      if (range.start && dateOnly < range.start) return false
      if (range.end && dateOnly > range.end) return false
      if (method !== 'semua' && o.payment?.method !== method) return false
      if (statusFilter !== 'semua' && o.status !== statusFilter) return false
      if (q !== '' && !o.orderNumber.toLowerCase().includes(q)) return false
      return true
    })
  }, [paidOrders, range, method, statusFilter, query])

  const hasFilter = range.start !== '' || range.end !== '' || query.trim() !== '' || method !== 'semua' || statusFilter !== 'semua'

  function resetFilters() {
    setRange({ start: '', end: '' })
    setQuery('')
    setMethod('semua')
    setStatusFilter('semua')
  }

  if (error) {
    return <ErrorBanner message={error} />
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="date"
          aria-label="Tanggal mulai"
          value={range.start}
          onChange={(e) => setRange((r) => ({ ...r, start: e.target.value }))}
          className="font-num rounded-lg border border-border-subtle bg-bg-surface px-3 py-2.5 text-body text-text-primary"
        />
        <span className="text-body text-text-secondary">s/d</span>
        <input
          type="date"
          aria-label="Tanggal akhir"
          value={range.end}
          onChange={(e) => setRange((r) => ({ ...r, end: e.target.value }))}
          className="font-num rounded-lg border border-border-subtle bg-bg-surface px-3 py-2.5 text-body text-text-primary"
        />
        <input
          type="search"
          placeholder="Cari no. order…"
          aria-label="Cari nomor order"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-44 rounded-lg border border-border-subtle bg-bg-surface px-3 py-2.5 text-body text-text-primary placeholder:text-text-secondary"
        />
        <select
          aria-label="Filter metode bayar"
          value={method}
          onChange={(e) => setMethod(e.target.value as MethodFilter)}
          className="rounded-lg border border-border-subtle bg-bg-surface px-3 py-2.5 text-body font-semibold text-text-primary"
        >
          <option value="semua">Semua Metode</option>
          <option value="tunai">Tunai</option>
          <option value="qris">QRIS</option>
        </select>
        <select
          aria-label="Filter status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="rounded-lg border border-border-subtle bg-bg-surface px-3 py-2.5 text-body font-semibold text-text-primary"
        >
          <option value="semua">Semua Status</option>
          <option value="diproses">Diproses</option>
          <option value="selesai">Selesai</option>
          <option value="dibatalkan">Dibatalkan</option>
        </select>
        {hasFilter && (
          <button
            onClick={resetFilters}
            className="rounded-lg bg-bg-surface px-3 py-2.5 text-body font-semibold text-status-danger transition-colors hover:bg-status-danger/15"
          >
            Atur Ulang Filter
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border-subtle bg-bg-surface shadow-card">
        <div className={`${gridCols} border-b border-border-subtle py-4 text-body font-bold uppercase tracking-wide text-text-secondary`}>
          <span>Waktu</span>
          <span>No. Pesanan</span>
          <span>Meja/Sumber</span>
          <span>Item</span>
          <span className="text-right">Total</span>
          <span>Metode</span>
        </div>
        {loading ? (
          <LoadingState text="Memuat riwayat..." />
        ) : filtered.length === 0 ? (
          <p className="py-12 text-center text-body text-text-secondary">
            {paidOrders.length === 0 ? 'Belum ada transaksi.' : 'Tidak ada transaksi yang cocok dengan filter.'}
          </p>
        ) : (
          <ul className="divide-y divide-border-subtle">
            {filtered.map((order) => (
              <li key={order.id}>
                <button
                  onClick={() => setReceiptOrder(order)}
                  title="Cetak ulang struk"
                  className={`${gridCols} w-full py-4 text-left transition-colors hover:bg-accent-tint/40`}
                >
                  <span className="min-w-0 font-num text-body text-text-secondary">
                    {new Date(order.createdAt).toLocaleDateString('id-ID', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                    <br />
                    {new Date(order.createdAt).toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <span className="min-w-0 truncate font-num text-subheading font-bold text-text-primary">
                    {order.orderNumber}
                  </span>
                  <span className="min-w-0 truncate text-body text-text-secondary">
                    {order.tableNumber ? `Meja ${order.tableNumber}` : sourceLabel[order.source]}
                  </span>
                  <span className="font-num text-body text-text-secondary">
                    {order.items.reduce((sum, item) => sum + item.quantity, 0)}
                  </span>
                  <span className="font-num text-right text-subheading font-semibold text-text-primary">
                    {formatRupiah(order.total)}
                  </span>
                  <span
                    className={`justify-self-start rounded-full px-3 py-1 text-body font-bold uppercase tracking-wide ${
                      order.status === 'dibatalkan'
                        ? 'bg-status-danger/15 text-status-danger'
                        : order.payment?.method === 'tunai'
                          ? 'bg-status-ready/15 text-status-ready'
                          : 'bg-status-done/15 text-status-done'
                    }`}
                  >
                    {order.status === 'dibatalkan' ? 'Batal' : order.payment?.method === 'tunai' ? 'Tunai' : 'QRIS'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {receiptOrder && (
        <ReceiptModal
          receipt={orderToReceipt(receiptOrder, receiptOrder.payment, settings ?? undefined)}
          onClose={() => setReceiptOrder(null)}
        />
      )}
    </div>
  )
}

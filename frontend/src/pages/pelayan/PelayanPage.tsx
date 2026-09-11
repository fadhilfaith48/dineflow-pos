import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import type { DiningTable, MenuCategory, MenuItem, Order } from '@/types'
import { api } from '@/services/httpApi'
import echo from '@/services/echo'
import { useCart } from '@/hooks/useCart'
import { TopNavBar } from '@/components/TopNavBar'
import { TableSelect } from './TableSelect'
import { WaiterOrder } from './WaiterOrder'
import { OrderList } from './OrderList'
import { QrisPay } from '@/components/QrisPay'
import { formatRupiah } from '@/lib/format'

type View = 'tables' | 'order' | 'orders'
type PayMethod = 'choose' | 'qris' | 'kasir'

export function PelayanPage() {
  const cart = useCart()
  const [view, setView] = useState<View>('tables')
  const [tables, setTables] = useState<DiningTable[]>([])
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [activeCategory, setActiveCategory] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [selectedTable, setSelectedTable] = useState<DiningTable | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [error, setError] = useState('')
  const [payOpen, setPayOpen] = useState(false)
  const [payMethod, setPayMethod] = useState<PayMethod>('choose')
  const [payOrderId, setPayOrderId] = useState(0)
  const [payRef, setPayRef] = useState('')
  const [payQr, setPayQr] = useState<string | null>(null)
  const [payGateway, setPayGateway] = useState('mock')
  const [payAmount, setPayAmount] = useState(0)
  const [payOrderNumber, setPayOrderNumber] = useState('')
  const [isDelivering, setIsDelivering] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function loadOrders() {
    api.getOrders().then(setOrders).catch(() => {
      setError('Gagal memuat pesanan. Cek koneksi ke server.')
    })
  }

  function loadTables() {
    api.getTables().then(setTables).catch(() => {
      setError('Gagal memuat meja. Cek koneksi ke server.')
    })
  }

  useEffect(() => {
    setIsLoading(true)
    Promise.all([
      api.getTables().then(setTables).catch(() => setError('Gagal memuat meja. Cek koneksi ke server.')),
      api.getCategories().then((cats) => {
        setCategories(cats)
        setActiveCategory((prev) => prev ?? cats[0]?.id ?? null)
      }).catch(() => setError('Gagal memuat kategori menu. Cek koneksi ke server.')),
      api.getMenuItems().then(setItems).catch(() => setError('Gagal memuat menu. Cek koneksi ke server.')),
      api.getOrders().then(setOrders).catch(() => setError('Gagal memuat pesanan. Cek koneksi ke server.')),
    ]).finally(() => setIsLoading(false))

    echo.private('orders').listen('OrderStatusChanged', () => {
      loadOrders()
      loadTables()
    })
    echo.channel('menu').listen('MenuChanged', () => {
      api.getMenuItems().then(setItems)
    })

    return () => {
      echo.leaveChannel('orders')
      echo.leaveChannel('menu')
    }
  }, [])

  const deferredSearch = useDeferredValue(search)

  const visibleItems = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase()
    return items.filter(
      (item) => item.categoryId === activeCategory && (q === '' || item.name.toLowerCase().includes(q)),
    )
  }, [items, activeCategory, deferredSearch])

  const seatedAt = useMemo(() => {
    const map: Record<number, number> = {}
    for (const order of orders) {
      if (order.tableId == null) continue
      if (!['menunggu', 'diproses'].includes(order.status)) continue
      const ts = new Date(order.createdAt).getTime()
      if (Number.isFinite(ts) && (map[order.tableId] == null || ts < map[order.tableId])) {
        map[order.tableId] = ts
      }
    }
    return map
  }, [orders])

  function selectTable(table: DiningTable) {
    cart.clear()
    setSelectedTable(table)
    setView('order')
  }

  async function handleSubmitOrder() {
    if (!selectedTable || cart.lines.length === 0 || isSubmitting) return
    setIsSubmitting(true)
    try {
      const order = await api.createOrder({
        tableId: selectedTable.id,
        source: 'pelayan',
        items: cart.lines,
      })
      cart.clear()
      setPayAmount(order.total)
      setPayOrderNumber(order.orderNumber)
      setPayOrderId(order.id)
      setPayMethod('choose')
      setPayOpen(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal mengirim pesanan. Coba lagi.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handlePayQris() {
    setPayMethod('qris')
    try {
      const checkout = await api.checkoutOrder(payOrderId)
      setPayRef(checkout.reference)
      setPayQr(checkout.qrContent)
      setPayGateway(checkout.gateway)
    } catch {
      setPayRef(String(payOrderId))
      setPayQr(null)
      setPayGateway('mock')
    }
  }

  function handlePayKasir() {
    setPayMethod('kasir')
  }

  async function handlePaid() {
    setPayOpen(false)
    setPayMethod('choose')
    setView('orders')
    loadOrders()
    loadTables()
  }

  async function handleDeliver(orderId: number) {
    const order = orders.find((o) => o.id === orderId)
    if (!order || isDelivering) return
    setIsDelivering(true)
    try {
      const pending = order.items.filter((item) => item.status !== 'diantar')
      await Promise.all(pending.map((item) => api.updateItemStatus(order.id, item.id, 'diantar')))
      loadOrders()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menandai diantar.')
    } finally {
      setIsDelivering(false)
    }
  }

  return (
    <div className="flex h-screen flex-col bg-bg-secondary">
      <TopNavBar />
      {error && (
        <div className="bg-status-danger/15 px-4 py-2 text-center text-body font-semibold text-status-danger">{error}</div>
      )}
      {isLoading ? (
        <main className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col gap-4 bg-bg-secondary px-4 py-4">
          <div className="h-7 w-32 animate-pulse rounded bg-border-subtle" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex aspect-square animate-pulse flex-col items-center justify-center gap-2 rounded-xl border-2 border-border-subtle bg-bg-surface" />
            ))}
          </div>
        </main>
      ) : view === 'order' && selectedTable ? (
        <WaiterOrder
          table={selectedTable}
          categories={categories}
          items={visibleItems}
          activeCategory={activeCategory ?? 0}
          onCategoryChange={setActiveCategory}
          search={search}
          onSearchChange={setSearch}
          lines={cart.lines}
          itemCount={cart.itemCount}
          total={cart.summary.total}
          onAdd={cart.addItem}
          onIncrement={cart.increment}
          onDecrement={cart.decrement}
          onRemove={cart.removeLine}
          onSetNote={cart.setNote}
          onSetSpice={cart.setSpiceLevel}
          onSubmit={handleSubmitOrder}
          isSubmitting={isSubmitting}
          onBack={() => setView('tables')}
        />
      ) : view === 'orders' ? (
        <OrderList orders={orders} onDeliver={handleDeliver} onBack={() => setView('tables')} isDelivering={isDelivering} />
      ) : (
        <TableSelect
          tables={tables}
          seatedAt={seatedAt}
          onSelect={selectTable}
          onViewOrders={() => setView('orders')}
        />
      )}
      {payOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-bg-surface p-5 shadow-modal">
            <div className="mb-4 text-center">
              <div className="text-caption font-semibold uppercase tracking-wider text-text-secondary">
                {payMethod === 'qris' ? 'Minta Pelanggan Memindai QRIS' : payMethod === 'kasir' ? 'Bayar di Kasir' : 'Bayar di Muka'}
              </div>
              <div className="font-num text-heading font-bold text-accent-primary">{payOrderNumber}</div>
            </div>

            {payMethod === 'choose' && (
              <>
                <p className="text-center text-body text-text-secondary">
                  Total tagihan{' '}
                  <span className="font-num font-bold text-text-primary">{formatRupiah(payAmount)}</span>
                </p>
                <p className="mt-1 text-center text-caption text-text-secondary">
                  Pilih cara bayar di muka sebelum dapur memasak pesanan.
                </p>

                <button
                  onClick={handlePayQris}
                  className="mt-5 w-full rounded-xl border border-border-subtle bg-bg-surface p-5 text-left shadow-card"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-accent-tint text-accent-primary">
                      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="7" height="7" rx="1" />
                        <rect x="14" y="3" width="7" height="7" rx="1" />
                        <rect x="3" y="14" width="7" height="7" rx="1" />
                        <path d="M14 14h3v3h-3zM21 14v3M14 21h3" />
                      </svg>
                    </span>
                    <span className="flex-1">
                      <span className="block text-subheading font-bold text-text-primary">QRIS Langsung</span>
                      <span className="mt-0.5 block text-caption text-text-secondary">Pelanggan memindai QRIS di HP ini</span>
                    </span>
                    <span className="text-text-secondary">›</span>
                  </div>
                </button>

                <button
                  onClick={handlePayKasir}
                  className="mt-3 w-full rounded-xl border border-border-subtle bg-bg-surface p-5 text-left shadow-card"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-accent-tint text-accent-primary">
                      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="5" width="14" height="14" rx="2" />
                        <path d="M16 9h4a1 1 0 0 1 1 1v7a3 3 0 0 1-3 3h-1" />
                        <circle cx="12" cy="13" r="1.5" />
                      </svg>
                    </span>
                    <span className="flex-1">
                      <span className="block text-subheading font-bold text-text-primary">Bayar di Kasir</span>
                      <span className="mt-0.5 block text-caption text-text-secondary">Pelanggan bayar tunai / debit di kasir</span>
                    </span>
                    <span className="text-text-secondary">›</span>
                  </div>
                </button>
              </>
            )}

            {payMethod === 'qris' && (
              <>
                <QrisPay
                  reference={payRef || String(payAmount)}
                  qrContent={payQr}
                  gateway={payGateway}
                  total={payAmount}
                  onPaid={handlePaid}
                />
                <button
                  onClick={() => setPayMethod('choose')}
                  className="mt-3 w-full rounded-xl border border-border-subtle py-3 text-body font-semibold text-text-secondary transition-colors hover:bg-bg-secondary"
                >
                  Pilih Metode Lain
                </button>
              </>
            )}

            {payMethod === 'kasir' && (
              <>
                <p className="text-center text-body text-text-secondary">
                  Tunjukkan kode ini ke kasir. Pesanan baru dimasak setelah lunas.
                </p>
                <div className="mt-4 flex flex-col items-center rounded-xl border border-border-subtle bg-bg-surface p-5">
                  <div className="rounded-lg bg-white p-3">
                    <QRCodeSVG value={`${window.location.origin}/order/${payOrderNumber}`} size={160} />
                  </div>
                  <div className="mt-3 font-num text-subheading font-bold tracking-widest text-text-primary">
                    {payOrderNumber}
                  </div>
                  <div className="mt-1 font-num text-body font-bold text-accent-primary">
                    Total tagihan: {formatRupiah(payAmount)}
                  </div>
                </div>
                <button
                  onClick={() => setPayMethod('choose')}
                  className="mt-3 w-full rounded-xl border border-border-subtle py-3 text-body font-semibold text-text-secondary transition-colors hover:bg-bg-secondary"
                >
                  Pilih Metode Lain
                </button>
              </>
            )}

            <button
              onClick={() => {
                setPayOpen(false)
                setPayMethod('choose')
                setView('tables')
                setSelectedTable(null)
                cart.clear()
              }}
              className="mt-2 w-full rounded-xl border border-border-subtle py-3 text-body font-semibold text-text-secondary transition-colors hover:bg-bg-secondary"
            >
              Batal
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default PelayanPage

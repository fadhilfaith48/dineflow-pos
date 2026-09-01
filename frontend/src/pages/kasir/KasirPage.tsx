import { useEffect, useMemo, useState } from 'react'
import type { DiningTable, MenuCategory, MenuItem, MenuItemVariant, Order, PaymentMethod, Settings } from '@/types'
import { api } from '@/services/httpApi'
import echo from '@/services/echo'
import { useCart } from '@/hooks/useCart'
import { orderToReceipt } from '@/lib/receipt'
import { TopNavBar } from '@/components/TopNavBar'
import { ReceiptModal, type ReceiptData } from '@/components/ReceiptModal'
import { VoidOrderModal } from '@/components/VoidOrderModal'
import { MenuPanel } from './MenuPanel'
import { CartPanel } from './CartPanel'
import { PaymentModal } from './PaymentModal'
import { TablePickerModal } from './TablePickerModal'
import { KasirQueuePanel } from './KasirQueuePanel'

export function KasirPage() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const cart = useCart(settings?.taxRate)
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [activeCategory, setActiveCategory] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [tables, setTables] = useState<DiningTable[]>([])
  const [selectedTable, setSelectedTable] = useState<DiningTable | null>(null)
  const [showTablePicker, setShowTablePicker] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [receipt, setReceipt] = useState<ReceiptData | null>(null)
  const [error, setError] = useState('')
  const [orders, setOrders] = useState<Order[]>([])
  const [noteToPay, setNoteToPay] = useState<Order | null>(null)
  const [voidTarget, setVoidTarget] = useState<Order | null>(null)

  useEffect(() => {
    api.getCategories().then((cats) => {
      setCategories(cats)
      setActiveCategory((prev) => prev ?? cats[0]?.id ?? null)
    }).catch(() => setError('Gagal memuat kategori menu.'))
    api.getMenuItems().then(setItems).catch(() => setError('Gagal memuat menu.'))
    api.getTables().then(setTables).catch(() => setError('Gagal memuat meja.'))
    api.getSettings().then(setSettings).catch(() => {})
  }, [])

  useEffect(() => {
    const refresh = () => {
      api.getOrders().then(setOrders)
      api.getTables().then(setTables)
    }
    refresh()
    echo.private('orders').listen('OrderStatusChanged', refresh)
    return () => {
      echo.leaveChannel('orders')
    }
  }, [])

  useEffect(() => {
    echo.channel('menu').listen('MenuChanged', () => {
      api.getMenuItems().then(setItems)
    })
    return () => {
      echo.leaveChannel('menu')
    }
  }, [])

  useEffect(() => {
    echo.private('settings').listen('SettingsChanged', (event: { settings: Settings }) => {
      setSettings(event.settings)
    })
    return () => {
      echo.leaveChannel('settings')
    }
  }, [])

  const pendingOrders = useMemo(
    () => orders.filter((o) => o.status === 'menunggu-konfirmasi'),
    [orders],
  )

  const activeNotes = useMemo(
    () => orders.filter((o) => o.status === 'diproses'),
    [orders],
  )

  const paidOrders = useMemo(
    () => orders.filter((o) => o.status === 'selesai' || o.status === 'dibatalkan'),
    [orders],
  )

  const visibleItems = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter(
      (item) =>
        item.categoryId === activeCategory &&
        (q === '' || item.name.toLowerCase().includes(q)),
    )
  }, [items, activeCategory, search])

  function handleAdd(item: MenuItem, variant?: MenuItemVariant, spiceLevel?: number) {
    if (!item.available) return
    cart.addItem(item, variant, spiceLevel)
  }

  function handleHold() {
    if (cart.lines.length > 0 && window.confirm('Tahan pesanan? Keranjang akan dikosongkan.')) {
      cart.clear()
    }
  }

  async function handleConfirmOrder(orderId: number) {
    setError('')
    try {
      await api.confirmOrder(orderId)
      setOrders(await api.getOrders())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal konfirmasi pesanan.')
    }
  }

  async function handleVoidConfirm(reason: string) {
    if (!voidTarget) return
    const orderId = voidTarget.id
    setError('')
    try {
      await api.voidOrder(orderId, reason)
      setOrders(await api.getOrders())
      setTables(await api.getTables())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal membatalkan pesanan.')
    } finally {
      setVoidTarget(null)
    }
  }

  function handlePayNote(order: Order) {
    setNoteToPay(order)
    setShowPayment(true)
  }

  function handleReprint(order: Order) {
    setReceipt(orderToReceipt(order, order.payment, settings ?? undefined))
  }

  async function handleConfirmPayment(payload: { method: PaymentMethod; cashReceived?: number }) {
    setError('')
    try {
      if (!noteToPay) return
      const order = noteToPay
      const payment = await api.processPayment({
        orderId: order.id,
        method: payload.method,
        cashReceived: payload.cashReceived,
      })
      setReceipt(orderToReceipt(order, payment, settings ?? undefined))
      setNoteToPay(null)
      setShowPayment(false)
      setOrders(await api.getOrders())
      setTables(await api.getTables())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Transaksi gagal, coba lagi.')
    }
  }

  async function handleSendToKitchen() {
    if (cart.lines.length === 0) return
    setError('')
    try {
      await api.createOrder({
        tableId: selectedTable?.id ?? null,
        source: 'kasir',
        items: cart.lines,
      })
      cart.clear()
      setOrders(await api.getOrders())
      setTables(await api.getTables())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal mengirim pesanan ke dapur.')
    }
  }

  return (
    <div className="flex h-screen flex-col">
      <TopNavBar />
      <main className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto bg-bg-secondary p-4 md:flex-row md:overflow-hidden">
        <KasirQueuePanel
          pendingOrders={pendingOrders}
          activeNotes={activeNotes}
          historyOrders={paidOrders}
          onConfirm={handleConfirmOrder}
          onVoid={setVoidTarget}
          onPayNote={handlePayNote}
          onReprint={handleReprint}
        />
        <MenuPanel
          categories={categories}
          activeCategory={activeCategory ?? 0}
          onCategoryChange={setActiveCategory}
          items={visibleItems}
          search={search}
          onSearchChange={setSearch}
          onAdd={handleAdd}
        />
        <CartPanel
          lines={cart.lines}
          itemCount={cart.itemCount}
          subtotal={cart.summary.subtotal}
          tax={cart.summary.tax}
          total={cart.summary.total}
          taxRatePercent={settings?.taxRate ?? 10}
          tableLabel={selectedTable ? `Meja ${selectedTable.number}` : 'Take Away'}
          onSelectTable={() => setShowTablePicker(true)}
          onIncrement={cart.increment}
          onDecrement={cart.decrement}
          onRemove={cart.removeLine}
          onSetNote={cart.setNote}
          onSetSpice={cart.setSpiceLevel}
          onHold={handleHold}
          onSendToKitchen={handleSendToKitchen}
        />
      </main>

      <TablePickerModal
        open={showTablePicker}
        tables={tables}
        selectedTableId={selectedTable?.id ?? null}
        onSelect={setSelectedTable}
        onClose={() => setShowTablePicker(false)}
      />

      <PaymentModal
        open={showPayment}
        total={noteToPay ? noteToPay.total : cart.summary.total}
        qrisImageUrl={settings?.qrisImageUrl}
        onClose={() => {
          setShowPayment(false)
          setNoteToPay(null)
        }}
        onConfirm={handleConfirmPayment}
      />

      <VoidOrderModal
        open={!!voidTarget}
        orderNumber={voidTarget?.orderNumber}
        onClose={() => setVoidTarget(null)}
        onConfirm={handleVoidConfirm}
      />

      {error && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-status-danger px-4 py-2 text-body text-text-on-accent shadow-dropdown">
          {error}
        </div>
      )}

      {receipt && (
        <ReceiptModal
          receipt={receipt}
          onClose={() => {
            setReceipt(null)
            setSearch('')
          }}
        />
      )}
    </div>
  )
}

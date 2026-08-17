import { useEffect, useMemo, useState } from 'react'
import type { DiningTable, MenuCategory, MenuItem, Order, PaymentMethod } from '@/types'
import { api } from '@/services/httpApi'
import echo from '@/services/echo'
import { useCart } from '@/hooks/useCart'
import { TopNavBar } from '@/components/TopNavBar'
import { MenuPanel } from './MenuPanel'
import { CartPanel } from './CartPanel'
import { PaymentModal } from './PaymentModal'
import { TablePickerModal } from './TablePickerModal'
import { ReceiptModal, type ReceiptData } from './ReceiptModal'
import { KasirQueuePanel } from './KasirQueuePanel'

export function KasirPage() {
  const cart = useCart()
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

  useEffect(() => {
    api.getCategories().then((cats) => {
      setCategories(cats)
      setActiveCategory((prev) => prev ?? cats[0]?.id ?? null)
    })
    api.getMenuItems().then(setItems)
    api.getTables().then(setTables)
  }, [])

  useEffect(() => {
    const refresh = () => {
      api.getOrders().then(setOrders)
      api.getTables().then(setTables)
    }
    refresh()
    echo.channel('orders').listen('OrderStatusChanged', refresh)
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

  const pendingOrders = useMemo(
    () => orders.filter((o) => o.status === 'menunggu-konfirmasi'),
    [orders],
  )

  const activeNotes = useMemo(
    () => orders.filter((o) => o.status === 'diproses'),
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

  function handleAdd(item: MenuItem) {
    if (!item.available) return
    cart.addItem(item)
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

  function handlePayNote(order: Order) {
    setNoteToPay(order)
    setShowPayment(true)
  }

  async function handleConfirmPayment(payload: { method: PaymentMethod; cashReceived?: number }) {
    setError('')
    try {
      if (noteToPay) {
        const order = noteToPay
        const payment = await api.processPayment({
          orderId: order.id,
          method: payload.method,
          cashReceived: payload.cashReceived,
        })
        setReceipt({
          orderNumber: order.orderNumber,
          tableLabel: `Meja ${order.tableNumber ?? '-'}`,
          createdAt: order.createdAt,
          items: order.items.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            note: item.note,
          })),
          subtotal: order.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
          tax: Math.round(order.total - order.items.reduce((sum, item) => sum + item.price * item.quantity, 0)),
          total: order.total,
          method: payment.method,
          change: payment.change ?? undefined,
        })
        setNoteToPay(null)
        setShowPayment(false)
        setOrders(await api.getOrders())
        setTables(await api.getTables())
        return
      }

      const order = await api.createOrder({
        tableId: selectedTable?.id ?? null,
        source: 'kasir',
        items: cart.lines,
      })
      const payment = await api.processPayment({
        orderId: order.id,
        method: payload.method,
        cashReceived: payload.cashReceived,
      })
      setReceipt({
        orderNumber: order.orderNumber,
        tableLabel: selectedTable ? `Meja ${selectedTable.number}` : 'Take Away',
        createdAt: order.createdAt,
        items: order.items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          note: item.note,
        })),
        subtotal: cart.summary.subtotal,
        tax: cart.summary.tax,
        total: cart.summary.total,
        method: payment.method,
        change: payment.change ?? undefined,
      })
      setShowPayment(false)
      cart.clear()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Transaksi gagal, coba lagi.')
    }
  }

  return (
    <div className="flex h-screen flex-col">
      <TopNavBar />
      <main className="flex min-h-0 flex-1 gap-4 overflow-hidden bg-bg-secondary p-4">
        <KasirQueuePanel
          pendingOrders={pendingOrders}
          activeNotes={activeNotes}
          onConfirm={handleConfirmOrder}
          onPayNote={handlePayNote}
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
          tableLabel={selectedTable ? `Meja ${selectedTable.number}` : 'Take Away'}
          onSelectTable={() => setShowTablePicker(true)}
          onIncrement={cart.increment}
          onDecrement={cart.decrement}
          onRemove={cart.removeLine}
          onSetNote={cart.setNote}
          onHold={handleHold}
          onPay={() => setShowPayment(true)}
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
        onClose={() => {
          setShowPayment(false)
          setNoteToPay(null)
        }}
        onConfirm={handleConfirmPayment}
      />

      {error && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-lg bg-status-danger px-4 py-2 text-body text-white shadow-modal">
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

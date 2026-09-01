import { useEffect, useMemo, useState } from 'react'
import type { DiningTable, MenuCategory, MenuItem, Order } from '@/types'
import { api } from '@/services/httpApi'
import echo from '@/services/echo'
import { useCart } from '@/hooks/useCart'
import { TopNavBar } from '@/components/TopNavBar'
import { TableSelect } from './TableSelect'
import { WaiterOrder } from './WaiterOrder'
import { OrderList } from './OrderList'

type View = 'tables' | 'order' | 'orders'

export function PelayanPage() {
  const cart = useCart()
  const [view, setView] = useState<View>('tables')
  const [tables, setTables] = useState<DiningTable[]>([])
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [activeCategory, setActiveCategory] = useState<number | null>(null)
  const [selectedTable, setSelectedTable] = useState<DiningTable | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [error, setError] = useState('')

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
    api.getTables().then(setTables)
    api.getCategories().then((cats) => {
      setCategories(cats)
      setActiveCategory((prev) => prev ?? cats[0]?.id ?? null)
    })
    api.getMenuItems().then(setItems)
    loadOrders()

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

  const visibleItems = useMemo(() => {
    return items.filter((item) => item.categoryId === activeCategory)
  }, [items, activeCategory])

  const seatedAt = useMemo(() => {
    const map: Record<number, number> = {}
    for (const order of orders) {
      if (order.tableId == null) continue
      if (!['menunggu-konfirmasi', 'baru', 'diproses'].includes(order.status)) continue
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
    if (!selectedTable || cart.lines.length === 0) return
    try {
      await api.createOrder({
        tableId: selectedTable.id,
        source: 'pelayan',
        items: cart.lines,
      })
      cart.clear()
      setView('orders')
      loadOrders()
      loadTables()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal mengirim pesanan. Coba lagi.')
    }
  }

  async function handleDeliver(orderId: number) {
    const order = orders.find((o) => o.id === orderId)
    if (!order) return
    try {
      for (const item of order.items) {
        if (item.status !== 'diantar') {
          await api.updateItemStatus(order.id, item.id, 'diantar')
        }
      }
      loadOrders()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menandai diantar.')
    }
  }

  return (
    <div className="flex h-screen flex-col bg-bg-secondary">
      <TopNavBar />
      {error && (
        <div className="bg-status-danger/15 px-4 py-2 text-center text-body font-semibold text-status-danger">{error}</div>
      )}
      {view === 'order' && selectedTable ? (
        <WaiterOrder
          table={selectedTable}
          categories={categories}
          items={visibleItems}
          activeCategory={activeCategory ?? 0}
          onCategoryChange={setActiveCategory}
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
          onBack={() => setView('tables')}
        />
      ) : view === 'orders' ? (
        <OrderList orders={orders} onDeliver={handleDeliver} onBack={() => setView('tables')} />
      ) : (
        <TableSelect
          tables={tables}
          seatedAt={seatedAt}
          onSelect={selectTable}
          onViewOrders={() => setView('orders')}
        />
      )}
    </div>
  )
}

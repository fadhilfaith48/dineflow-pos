import { useEffect, useMemo, useState } from 'react'
import type { DiningTable, MenuCategory, MenuItem, Order } from '@/types'
import { api } from '@/services/httpApi'
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

  function loadOrders() {
    api.getOrders().then(setOrders)
  }

  function loadTables() {
    api.getTables().then(setTables)
  }

  useEffect(() => {
    api.getTables().then(setTables)
    api.getCategories().then((cats) => {
      setCategories(cats)
      setActiveCategory((prev) => prev ?? cats[0]?.id ?? null)
    })
    api.getMenuItems().then(setItems)
    loadOrders()
  }, [])

  const visibleItems = useMemo(() => {
    return items.filter((item) => item.categoryId === activeCategory)
  }, [items, activeCategory])

  function selectTable(table: DiningTable) {
    cart.clear()
    setSelectedTable(table)
    setView('order')
  }

  async function handleSubmitOrder() {
    if (!selectedTable || cart.lines.length === 0) return
    await api.createOrder({
      tableId: selectedTable.id,
      source: 'pelayan',
      items: cart.lines,
    })
    cart.clear()
    setView('orders')
    loadOrders()
    loadTables()
  }

  async function handleDeliver(orderId: number) {
    const order = orders.find((o) => o.id === orderId)
    if (!order) return
    for (const item of order.items) {
      if (item.status !== 'diantar') {
        await api.updateItemStatus(order.id, item.id, 'diantar')
      }
    }
    loadOrders()
  }

  return (
    <div className="flex h-screen flex-col bg-bg-secondary">
      <TopNavBar />
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
          onSubmit={handleSubmitOrder}
          onBack={() => setView('tables')}
        />
      ) : view === 'orders' ? (
        <OrderList orders={orders} onDeliver={handleDeliver} onBack={() => setView('tables')} />
      ) : (
        <TableSelect
          tables={tables}
          onSelect={selectTable}
          onViewOrders={() => setView('orders')}
        />
      )}
    </div>
  )
}

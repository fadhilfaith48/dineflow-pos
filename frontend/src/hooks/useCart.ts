import { useMemo, useState } from 'react'
import type { MenuItem } from '@/types'
import { TAX_RATE } from '@/services/mockData'

export interface CartLine {
  menuItemId: number
  name: string
  price: number
  quantity: number
  note?: string
}

export function useCart(taxRatePercent?: number) {
  const [lines, setLines] = useState<CartLine[]>([])
  const rate = (taxRatePercent ?? TAX_RATE * 100) / 100

  function addItem(item: MenuItem) {
    setLines((prev) => {
      const existing = prev.find((l) => l.menuItemId === item.id)
      if (existing) {
        return prev.map((l) =>
          l.menuItemId === item.id ? { ...l, quantity: l.quantity + 1 } : l,
        )
      }
      return [...prev, { menuItemId: item.id, name: item.name, price: item.price, quantity: 1 }]
    })
  }

  function increment(menuItemId: number) {
    setLines((prev) =>
      prev.map((l) =>
        l.menuItemId === menuItemId ? { ...l, quantity: l.quantity + 1 } : l,
      ),
    )
  }

  function decrement(menuItemId: number) {
    setLines((prev) =>
      prev
        .map((l) =>
          l.menuItemId === menuItemId ? { ...l, quantity: l.quantity - 1 } : l,
        )
        .filter((l) => l.quantity > 0),
    )
  }

  function removeLine(menuItemId: number) {
    setLines((prev) => prev.filter((l) => l.menuItemId !== menuItemId))
  }

  function setNote(menuItemId: number, note: string) {
    setLines((prev) =>
      prev.map((l) => (l.menuItemId === menuItemId ? { ...l, note } : l)),
    )
  }

  function clear() {
    setLines([])
  }

  const summary = useMemo(() => {
    const subtotal = lines.reduce((sum, l) => sum + l.price * l.quantity, 0)
    const tax = Math.round(subtotal * rate)
    return { subtotal, tax, total: subtotal + tax }
  }, [lines, rate])

  const itemCount = useMemo(() => lines.reduce((sum, l) => sum + l.quantity, 0), [lines])

  return {
    lines,
    addItem,
    increment,
    decrement,
    removeLine,
    setNote,
    clear,
    summary,
    itemCount,
  }
}

import { useMemo, useState } from 'react'
import type { MenuItem, MenuItemVariant } from '@/types'
import { TAX_RATE } from '@/lib/constants'

export interface CartLine {
  menuItemId: number
  name: string
  price: number
  quantity: number
  note?: string
  variantName?: string
}

function lineKey(menuItemId: number, variantName?: string): string {
  return variantName ? `${menuItemId}-${variantName}` : String(menuItemId)
}

export function useCart(taxRatePercent?: number) {
  const [lines, setLines] = useState<CartLine[]>([])
  const rate = (taxRatePercent ?? TAX_RATE * 100) / 100

  function addItem(item: MenuItem, variant?: MenuItemVariant) {
    const vName = variant?.name
    const vPrice = variant?.price ?? item.price
    const key = lineKey(item.id, vName)

    setLines((prev) => {
      const existing = prev.find((l) => lineKey(l.menuItemId, l.variantName) === key)
      if (existing) {
        return prev.map((l) =>
          lineKey(l.menuItemId, l.variantName) === key ? { ...l, quantity: l.quantity + 1 } : l,
        )
      }
      return [...prev, { menuItemId: item.id, name: item.name, price: vPrice, quantity: 1, variantName: vName }]
    })
  }

  function increment(menuItemId: number, variantName?: string) {
    const key = lineKey(menuItemId, variantName)
    setLines((prev) =>
      prev.map((l) =>
        lineKey(l.menuItemId, l.variantName) === key ? { ...l, quantity: l.quantity + 1 } : l,
      ),
    )
  }

  function decrement(menuItemId: number, variantName?: string) {
    const key = lineKey(menuItemId, variantName)
    setLines((prev) =>
      prev
        .map((l) =>
          lineKey(l.menuItemId, l.variantName) === key ? { ...l, quantity: l.quantity - 1 } : l,
        )
        .filter((l) => l.quantity > 0),
    )
  }

  function removeLine(menuItemId: number, variantName?: string) {
    const key = lineKey(menuItemId, variantName)
    setLines((prev) => prev.filter((l) => lineKey(l.menuItemId, l.variantName) !== key))
  }

  function setNote(menuItemId: number, note: string, variantName?: string) {
    const key = lineKey(menuItemId, variantName)
    setLines((prev) =>
      prev.map((l) => (lineKey(l.menuItemId, l.variantName) === key ? { ...l, note } : l)),
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

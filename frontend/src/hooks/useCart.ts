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
  spiceLevel?: number
}

function lineKey(menuItemId: number, variantName?: string, spiceLevel?: number): string {
  const variant = variantName ? `:${variantName}` : ''
  const spice = typeof spiceLevel === 'number' ? `:s${spiceLevel}` : ''
  return `${menuItemId}${variant}${spice}`
}

export function useCart(taxRatePercent?: number) {
  const [lines, setLines] = useState<CartLine[]>([])
  const rate = (taxRatePercent ?? TAX_RATE * 100) / 100

  function addItem(item: MenuItem, variant?: MenuItemVariant, spiceLevel?: number) {
    const vName = variant?.name
    const vPrice = variant?.price ?? item.price
    const level = item.isSpicy && typeof spiceLevel !== 'number' ? 0 : spiceLevel
    const key = lineKey(item.id, vName, level)

    setLines((prev) => {
      const existing = prev.find((l) => lineKey(l.menuItemId, l.variantName, l.spiceLevel) === key)
      if (existing) {
        return prev.map((l) =>
          lineKey(l.menuItemId, l.variantName, l.spiceLevel) === key ? { ...l, quantity: l.quantity + 1 } : l,
        )
      }
      return [...prev, { menuItemId: item.id, name: item.name, price: vPrice, quantity: 1, variantName: vName, spiceLevel: level }]
    })
  }

  function increment(menuItemId: number, variantName?: string, spiceLevel?: number) {
    const key = lineKey(menuItemId, variantName, spiceLevel)
    setLines((prev) =>
      prev.map((l) =>
        lineKey(l.menuItemId, l.variantName, l.spiceLevel) === key ? { ...l, quantity: l.quantity + 1 } : l,
      ),
    )
  }

  function decrement(menuItemId: number, variantName?: string, spiceLevel?: number) {
    const key = lineKey(menuItemId, variantName, spiceLevel)
    setLines((prev) =>
      prev
        .map((l) =>
          lineKey(l.menuItemId, l.variantName, l.spiceLevel) === key ? { ...l, quantity: l.quantity - 1 } : l,
        )
        .filter((l) => l.quantity > 0),
    )
  }

  function removeLine(menuItemId: number, variantName?: string, spiceLevel?: number) {
    const key = lineKey(menuItemId, variantName, spiceLevel)
    setLines((prev) => prev.filter((l) => lineKey(l.menuItemId, l.variantName, l.spiceLevel) !== key))
  }

  function setNote(menuItemId: number, note: string, variantName?: string, spiceLevel?: number) {
    const key = lineKey(menuItemId, variantName, spiceLevel)
    setLines((prev) => prev.map((l) => (lineKey(l.menuItemId, l.variantName, l.spiceLevel) === key ? { ...l, note } : l)))
  }

  function setSpiceLevel(menuItemId: number, variantName: string | undefined, oldSpice: number, newSpice: number) {
    setLines((prev) => {
      const fromKey = lineKey(menuItemId, variantName, oldSpice)
      const line = prev.find((l) => lineKey(l.menuItemId, l.variantName, l.spiceLevel) === fromKey)
      if (!line) return prev
      const rest = prev.filter((l) => lineKey(l.menuItemId, l.variantName, l.spiceLevel) !== fromKey)
      const toKey = lineKey(menuItemId, variantName, newSpice)
      const existing = rest.find((l) => lineKey(l.menuItemId, l.variantName, l.spiceLevel) === toKey)
      if (existing) {
        return rest.map((l) =>
          lineKey(l.menuItemId, l.variantName, l.spiceLevel) === toKey
            ? { ...l, quantity: l.quantity + line.quantity }
            : l,
        )
      }
      return [...rest, { ...line, spiceLevel: newSpice }]
    })
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
    setSpiceLevel,
    clear,
    summary,
    itemCount,
  }
}

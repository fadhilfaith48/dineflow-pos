import { useState } from 'react'
import type { DiningTable, MenuCategory, MenuItem, MenuItemVariant } from '@/types'
import type { CartLine } from '@/hooks/useCart'
import { formatRupiah } from '@/lib/format'
import { CategoryTabs } from '@/components/CategoryTabs'
import { StatusBadge } from '@/components/StatusBadge'

interface WaiterOrderProps {
  table: DiningTable
  categories: MenuCategory[]
  items: MenuItem[]
  activeCategory: number
  onCategoryChange: (id: number) => void
  lines: CartLine[]
  itemCount: number
  total: number
  onAdd: (item: MenuItem, variant?: MenuItemVariant) => void
  onIncrement: (menuItemId: number, variantName?: string) => void
  onDecrement: (menuItemId: number, variantName?: string) => void
  onRemove: (menuItemId: number, variantName?: string) => void
  onSetNote: (menuItemId: number, note: string, variantName?: string) => void
  onSubmit: () => void
  onBack: () => void
}

export function WaiterOrder({
  table,
  categories,
  items,
  activeCategory,
  onCategoryChange,
  lines,
  itemCount,
  total,
  onAdd,
  onIncrement,
  onDecrement,
  onRemove,
  onSetNote,
  onSubmit,
  onBack,
}: WaiterOrderProps) {
  const [showCart, setShowCart] = useState(false)

  return (
    <main className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col bg-bg-secondary">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border-subtle bg-bg-surface px-4 py-3">
        <button
          onClick={onBack}
          aria-label="Kembali"
          className="flex h-11 w-11 items-center justify-center rounded-lg border border-border-subtle text-text-primary"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <div className="text-caption font-semibold uppercase tracking-wide text-text-secondary">
            Input Pesanan
          </div>
          <div className="font-num text-subheading font-bold text-text-primary">Meja {table.number}</div>
        </div>
      </header>

      <div className="px-4 pt-3">
        <CategoryTabs categories={categories} activeId={activeCategory} onChange={onCategoryChange} />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        <ul className="flex flex-col gap-3">
          {items.length === 0 && (
            <li className="py-10 text-center text-body text-text-secondary">Tidak ada menu.</li>
          )}
          {items.map((item) => {
            const hasVariants = item.variants && item.variants.length > 0
            return (
              <li
                key={item.id}
                className={`rounded-xl border border-border-subtle bg-bg-surface p-4 shadow-card ${
                  item.available ? '' : 'opacity-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-subheading font-semibold text-text-primary">{item.name}</div>
                    {item.description && (
                      <p className="truncate text-caption text-text-secondary">{item.description}</p>
                    )}
                    <div className="mt-1 font-num text-body font-semibold text-text-secondary">
                      {formatRupiah(item.price)}
                    </div>
                  </div>
                  {!hasVariants && item.available && (
                    <button
                      onClick={() => onAdd(item)}
                      aria-label={`Tambah ${item.name}`}
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent-primary text-text-on-accent transition-colors hover:bg-accent-primary-hover"
                    >
                      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                    </button>
                  )}
                  {!item.available && <StatusBadge variant="danger" />}
                </div>
                {hasVariants && item.available && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {item.variants!.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => onAdd(item, v)}
                        disabled={!v.available}
                        className={`rounded-lg border px-3 py-1.5 text-caption font-semibold transition-colors ${
                          v.available
                            ? 'border-accent-primary/30 bg-accent-tint text-accent-primary hover:bg-accent-primary hover:text-text-on-accent'
                            : 'border-border-subtle bg-bg-secondary text-text-secondary opacity-50'
                        }`}
                      >
                        {v.name} {formatRupiah(v.price)}
                      </button>
                    ))}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </div>

      <div className="sticky bottom-0 z-20 border-t border-border-subtle bg-bg-surface p-4">
        <button
          onClick={() => setShowCart(true)}
          disabled={lines.length === 0}
          className="flex h-14 w-full items-center justify-between rounded-xl bg-accent-primary px-5 text-text-on-accent shadow-modal transition-colors hover:bg-accent-primary-hover disabled:opacity-40"
        >
          <span className="font-num text-body font-bold">{itemCount} item</span>
          <span className="text-subheading font-bold">Lihat & Kirim</span>
          <span className="font-num text-body font-bold">{formatRupiah(total)}</span>
        </button>
      </div>

      {showCart && (
        <div className="fixed inset-0 z-30 mx-auto flex max-w-md flex-col bg-bg-surface">
          <header className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
            <div>
              <div className="text-caption font-semibold uppercase tracking-wide text-text-secondary">Keranjang</div>
              <div className="font-num text-subheading font-bold text-text-primary">Meja {table.number}</div>
            </div>
            <button
              onClick={() => setShowCart(false)}
              aria-label="Tutup"
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-border-subtle text-text-primary"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </header>

          <div className="flex-1 overflow-y-auto px-4 py-3">
            {lines.length === 0 ? (
              <p className="py-10 text-center text-body text-text-secondary">Keranjang kosong.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {lines.map((line) => (
                  <li key={`${line.menuItemId}-${line.variantName ?? ''}`} className="rounded-xl border border-border-subtle p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-body font-semibold text-text-primary">
                          {line.name}
                          {line.variantName && <span className="ml-1 text-caption text-text-secondary">({line.variantName})</span>}
                        </div>
                        <div className="mt-0.5 font-num text-caption text-text-secondary">
                          {formatRupiah(line.price)} / porsi
                        </div>
                      </div>
                      <button
                        onClick={() => onRemove(line.menuItemId, line.variantName)}
                        aria-label={`Hapus ${line.name}`}
                        className="text-text-secondary transition-colors hover:text-status-danger"
                      >
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M18 6 6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => onDecrement(line.menuItemId, line.variantName)}
                          aria-label="Kurangi"
                          className="flex h-11 w-11 items-center justify-center rounded-lg border border-border-subtle text-text-primary"
                        >
                          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M5 12h14" />
                          </svg>
                        </button>
                        <span className="w-6 text-center font-num text-body font-bold">{line.quantity}</span>
                        <button
                          onClick={() => onIncrement(line.menuItemId, line.variantName)}
                          aria-label="Tambah"
                          className="flex h-11 w-11 items-center justify-center rounded-lg border border-border-subtle text-accent-primary"
                        >
                          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M12 5v14M5 12h14" />
                          </svg>
                        </button>
                      </div>
                      <span className="font-num text-body font-bold text-text-primary">
                        {formatRupiah(line.price * line.quantity)}
                      </span>
                    </div>
                    <input
                      value={line.note ?? ''}
                      onChange={(e) => onSetNote(line.menuItemId, e.target.value, line.variantName)}
                      placeholder="Catatan (mis. tidak pedas)"
                      className="mt-3 w-full rounded-lg border border-border-subtle px-3 py-2 text-body placeholder:text-text-secondary focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-tint"
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-border-subtle bg-bg-surface p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-body text-text-secondary">Total</span>
              <span className="font-num text-heading font-bold text-text-primary">{formatRupiah(total)}</span>
            </div>
            <button
              onClick={onSubmit}
              disabled={lines.length === 0}
              className="h-14 w-full rounded-xl bg-accent-primary text-text-on-accent text-subheading font-bold transition-colors hover:bg-accent-primary-hover disabled:opacity-40"
            >
              Kirim ke Dapur
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

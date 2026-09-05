import type { MenuCategory, MenuItem, MenuItemVariant } from '@/types'
import { useState } from 'react'
import { CategoryTabs } from '@/components/CategoryTabs'
import { SpicePills } from '@/components/SpicePills'
import { formatRupiah } from '@/lib/format'
import { displayPhoto } from '@/lib/menuPhoto'

interface MenuPanelProps {
  categories: MenuCategory[]
  activeCategory: number
  onCategoryChange: (id: number) => void
  items: MenuItem[]
  search: string
  onSearchChange: (value: string) => void
  onAdd: (item: MenuItem, variant?: MenuItemVariant, spiceLevel?: number) => void
}

export function MenuPanel({
  categories,
  activeCategory,
  onCategoryChange,
  items,
  search,
  onSearchChange,
  onAdd,
}: MenuPanelProps) {
  const [selectedVariant, setSelectedVariant] = useState<Record<number, string>>({})
  return (
    <section className="flex min-w-0 flex-1 flex-col gap-4 overflow-hidden">
      <div className="flex flex-col gap-3">
        <CategoryTabs categories={categories} activeId={activeCategory} onChange={onCategoryChange} />
        <div className="relative">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari menu..."
            className="w-full rounded-lg border border-border-subtle bg-bg-surface py-2.5 pl-10 pr-4 text-body placeholder:text-text-secondary focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-tint"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto rounded-xl border border-border-subtle bg-bg-surface shadow-card">
        {items.length === 0 ? (
          <div className="flex h-full items-center justify-center p-8 text-body text-text-secondary">
            Tidak ada menu ditemukan.
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {items.map((item) => {
              const hasVariants = item.variants && item.variants.length > 0
              const photo = displayPhoto(item, selectedVariant[item.id])
              return (
                <li
                  key={item.id}
                  className={`flex gap-3 overflow-hidden rounded-xl border border-border-subtle bg-bg-surface p-2 shadow-card ${
                    item.available ? '' : 'opacity-50'
                  }`}
                >
                  <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-bg-secondary">
                    {photo ? (
                      <img src={photo} alt={item.name} className="h-full w-full object-cover" />
                    ) : (
                      <svg className="h-10 w-10 text-border-subtle" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 11h18" />
                        <path d="M12 11v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V11" />
                        <path d="M21 11v8a3 3 0 0 1-3 3h-3a3 3 0 0 1-3-3" />
                        <circle cx="12" cy="5" r="2" />
                      </svg>
                    )}
                    {!item.available && (
                      <span className="absolute inset-0 flex items-center justify-center bg-bg-surface/60">
                        <span className="rounded bg-bg-surface px-2 py-0.5 text-caption font-bold uppercase text-status-danger">Habis</span>
                      </span>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1 py-1 pr-1">
                    <div className="truncate text-subheading font-semibold text-text-primary">{item.name}</div>
                    {item.description && (
                      <p className="truncate text-caption text-text-secondary">{item.description}</p>
                    )}
                    <div className="font-num text-body font-semibold text-text-secondary">
                      {formatRupiah(item.price)}
                    </div>
                    {hasVariants && item.available && (
                      <div className="mt-auto flex flex-wrap gap-1.5">
                        {item.variants!.map((v) => (
                          <button
                            key={v.id}
                            onClick={() => {
                              setSelectedVariant((prev) => ({ ...prev, [item.id]: v.name }))
                              onAdd(item, v)
                            }}
                            disabled={!v.available}
                            className={`rounded-md border px-2.5 py-1 text-caption font-semibold transition-colors ${
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
                    {!hasVariants && item.available && item.isSpicy && (
                      <div className="mt-auto">
                        <SpicePills onSelect={(level) => onAdd(item, undefined, level)} />
                      </div>
                    )}
                    {!hasVariants && item.available && !item.isSpicy && (
                      <div className="mt-auto flex justify-end">
                        <button
                          onClick={() => onAdd(item)}
                          aria-label={`Tambah ${item.name}`}
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent-primary text-text-on-accent transition-colors hover:bg-accent-primary-hover"
                        >
                          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M12 5v14M5 12h14" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}

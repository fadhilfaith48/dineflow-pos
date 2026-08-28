import type { MenuCategory, MenuItem, MenuItemVariant } from '@/types'
import { CategoryTabs } from '@/components/CategoryTabs'
import { SpicePills } from '@/components/SpicePills'
import { formatRupiah } from '@/lib/format'

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
          <ul className="divide-y divide-border-subtle">
            {items.map((item) => {
              const hasVariants = item.variants && item.variants.length > 0
              return (
                <li
                  key={item.id}
                  className={`px-4 py-3 ${item.available ? '' : 'opacity-50'}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-subheading font-semibold text-text-primary">
                        {item.name}
                      </div>
                      <div className="font-num text-body font-medium text-text-secondary">
                        {formatRupiah(item.price)}
                      </div>
                    </div>
                    {!hasVariants && item.available && !item.isSpicy && (
                      <button
                        onClick={() => onAdd(item)}
                        aria-label={`Tambah ${item.name}`}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border-subtle text-accent-primary transition-colors hover:bg-accent-primary hover:text-text-on-accent"
                      >
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M12 5v14M5 12h14" />
                        </svg>
                      </button>
                    )}
                    {!hasVariants && item.available && item.isSpicy && (
                      <SpicePills
                        className="shrink-0"
                        onSelect={(level) => onAdd(item, undefined, level)}
                      />
                    )}
                    {!item.available && (
                      <span className="shrink-0 rounded-full bg-status-danger/15 px-3 py-1 text-caption font-bold uppercase tracking-wider text-status-danger">
                        Habis
                      </span>
                    )}
                  </div>
                  {hasVariants && item.available && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {item.variants!.map((v) => (
                        <button
                          key={v.id}
                          onClick={() => onAdd(item, v)}
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
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}

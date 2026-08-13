import type { MenuCategory, MenuItem } from '@/types'
import { CategoryTabs } from '@/components/CategoryTabs'
import { formatRupiah } from '@/lib/format'

interface MenuPanelProps {
  categories: MenuCategory[]
  activeCategory: number
  onCategoryChange: (id: number) => void
  items: MenuItem[]
  search: string
  onSearchChange: (value: string) => void
  onAdd: (item: MenuItem) => void
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
            {items.map((item) => (
              <li
                key={item.id}
                className={`flex items-center gap-4 px-4 py-3 ${item.available ? '' : 'opacity-50'}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-subheading font-semibold text-text-primary">
                    {item.name}
                  </div>
                  <div className="font-num text-body font-medium text-text-secondary">
                    {formatRupiah(item.price)}
                  </div>
                </div>
                {item.available ? (
                  <button
                    onClick={() => onAdd(item)}
                    aria-label={`Tambah ${item.name}`}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-border-subtle text-accent-primary transition-colors hover:bg-accent-primary hover:text-text-on-accent"
                  >
                    <svg
                      className="h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </button>
                ) : (
                  <span className="rounded-full bg-status-danger/15 px-3 py-1 text-caption font-bold uppercase tracking-wider text-status-danger">
                    Habis
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

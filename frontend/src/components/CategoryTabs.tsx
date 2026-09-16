import type { MenuCategory } from '@/types'

interface CategoryTabsProps {
  categories: MenuCategory[]
  activeId: number
  onChange: (id: number) => void
}

export function CategoryTabs({ categories, activeId, onChange }: CategoryTabsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto">
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onChange(cat.id)}
          className={`inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg px-4 text-caption font-semibold uppercase tracking-wide transition-colors ${
            activeId === cat.id
              ? 'bg-accent-primary text-text-on-accent'
              : 'bg-bg-secondary text-text-secondary hover:bg-accent-tint hover:text-accent-primary'
          }`}
        >
          {cat.name}
        </button>
      ))}
    </div>
  )
}

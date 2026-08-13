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
          className={`shrink-0 rounded-lg px-4 py-2 text-caption font-semibold uppercase tracking-wide transition-colors ${
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

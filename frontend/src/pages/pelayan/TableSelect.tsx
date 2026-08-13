import type { DiningTable } from '@/types'

const statusStyle: Record<DiningTable['status'], { card: string; label: string; text: string }> = {
  kosong: { card: 'border-status-ready bg-accent-tint', label: 'Kosong', text: 'text-status-ready' },
  terisi: { card: 'border-accent-primary bg-bg-secondary', label: 'Terisi', text: 'text-accent-primary' },
  'perlu-dibersihkan': { card: 'border-status-danger bg-bg-surface', label: 'Perlu Dibersihkan', text: 'text-status-danger' },
}

interface TableSelectProps {
  tables: DiningTable[]
  onSelect: (table: DiningTable) => void
  onViewOrders: () => void
}

export function TableSelect({ tables, onSelect, onViewOrders }: TableSelectProps) {
  return (
    <main className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col gap-4 bg-bg-secondary px-4 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-heading font-semibold text-text-primary">Pilih Meja</h1>
        <button
          onClick={onViewOrders}
          className="rounded-lg border border-border-subtle px-4 py-2 text-caption font-semibold uppercase tracking-wide text-text-secondary transition-colors hover:bg-bg-surface"
        >
          Daftar Pesanan
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {tables.map((table) => {
          const s = statusStyle[table.status]
          return (
            <button
              key={table.id}
              onClick={() => onSelect(table)}
              className={`flex min-h-24 flex-col items-center justify-center gap-1 rounded-xl border-2 p-4 transition-transform active:scale-95 ${s.card}`}
            >
              <span className="font-num text-subheading font-bold text-text-primary">
                {table.number}
              </span>
              <span className={`text-caption font-semibold uppercase tracking-wide ${s.text}`}>
                {s.label}
              </span>
            </button>
          )
        })}
      </div>
    </main>
  )
}

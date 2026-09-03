import type { DiningTable } from '@/types'
import { Button } from '@/components/Button'
import { tableStatusLabel } from '@/lib/statusConfig'

interface TablePickerModalProps {
  open: boolean
  tables: DiningTable[]
  selectedTableId: number | null
  onSelect: (table: DiningTable | null) => void
  onClose: () => void
}

const statusStyle: Record<DiningTable['status'], string> = {
  kosong: 'border-status-ready bg-accent-tint text-status-ready',
  terisi: 'border-accent-primary bg-bg-secondary text-accent-primary',
  'perlu-dibersihkan': 'border-status-danger bg-bg-surface text-status-danger',
}

export function TablePickerModal({ open, tables, selectedTableId, onSelect, onClose }: TablePickerModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-bg-surface p-6 shadow-modal">
        <div className="flex items-center justify-between">
          <h3 className="text-heading font-semibold text-text-primary">Pilih Meja</h3>
          <button onClick={onClose} aria-label="Tutup" className="text-text-secondary hover:text-text-primary">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          <button
            onClick={() => {
              onSelect(null)
              onClose()
            }}
            className={`flex min-h-20 flex-col items-center justify-center rounded-xl border-2 p-3 transition-colors ${
              selectedTableId === null
                ? 'border-accent-primary bg-accent-tint text-accent-primary'
                : 'border-border-subtle text-text-secondary hover:bg-bg-secondary'
            }`}
          >
            <span className="text-caption font-bold uppercase tracking-wide">Bawa</span>
            <span className="text-caption font-bold uppercase tracking-wide">Pulang</span>
          </button>
          {tables.map((table) => {
            const s = statusStyle[table.status]
            return (
              <button
                key={table.id}
                onClick={() => {
                  onSelect(table)
                  onClose()
                }}
                className={`flex min-h-20 flex-col items-center justify-center gap-1 rounded-xl border-2 p-3 transition-colors ${
                  selectedTableId === table.id
                    ? 'border-accent-primary bg-accent-tint'
                    : s
                }`}
              >
                <span className="font-num text-body font-bold">{table.number}</span>
                <span className="max-w-full break-words text-center text-caption font-semibold uppercase leading-tight tracking-wide">
                  {tableStatusLabel[table.status] ?? table.status}
                </span>
              </button>
            )
          })}
        </div>

        <div className="mt-5">
          <Button variant="outline" fullWidth onClick={onClose}>
            Tutup
          </Button>
        </div>
      </div>
    </div>
  )
}

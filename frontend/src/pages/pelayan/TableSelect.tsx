import { useEffect, useRef, useState } from 'react'
import type { DiningTable } from '@/types'
import { formatElapsed } from '@/lib/format'

const statusStyle: Record<DiningTable['status'], { card: string; label: string; text: string }> = {
  kosong: { card: 'border-status-ready bg-accent-tint', label: 'Kosong', text: 'text-status-ready' },
  terisi: { card: 'border-accent-primary bg-bg-secondary', label: 'Terisi', text: 'text-accent-primary' },
  'perlu-dibersihkan': { card: 'border-status-danger bg-bg-surface', label: 'Perlu Dibersihkan', text: 'text-status-danger' },
}

interface TableSelectProps {
  tables: DiningTable[]
  /** tableId → timestamp meja mulai terisi (dari order aktif terawal). */
  seatedAt?: Record<number, number>
  onSelect: (table: DiningTable) => void
  onViewOrders: () => void
}

export function TableSelect({ tables, onSelect, onViewOrders, seatedAt }: TableSelectProps) {
  const [, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000)
    return () => clearInterval(id)
  }, [])

  const nowRef = useRef(Date.now())
  nowRef.current = Date.now()
  const now = nowRef.current

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

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
        {tables.map((table) => {
          const s = statusStyle[table.status]
          const start = table.status === 'terisi' ? seatedAt?.[table.id] : undefined
          const duration = start ? formatElapsed(start, now) : undefined
          return (
            <button
              key={table.id}
              onClick={() => onSelect(table)}
              className={`flex aspect-square min-h-fit flex-col items-center justify-center gap-1 rounded-xl border-2 p-2 transition-transform active:scale-95 sm:p-4 ${s.card}`}
            >
              <span className="font-num text-subheading font-bold text-text-primary">
                {table.number}
              </span>
              <span className="flex items-center gap-1 text-text-secondary">
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
                </svg>
                <span className="font-caption text-caption">{table.seats} Pax</span>
              </span>
              {duration && (
                <span className="font-num text-caption font-semibold text-text-secondary">{duration}</span>
              )}
              <span className={`max-w-full break-words text-center text-caption font-semibold uppercase leading-tight tracking-wide ${s.text}`}>
                {s.label}
              </span>
            </button>
          )
        })}
      </div>
    </main>
  )
}

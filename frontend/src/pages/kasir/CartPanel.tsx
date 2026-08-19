import type { CartLine } from '@/hooks/useCart'
import { formatRupiah } from '@/lib/format'
import { Button } from '@/components/Button'

interface CartPanelProps {
  lines: CartLine[]
  itemCount: number
  subtotal: number
  tax: number
  total: number
  tableLabel: string
  onSelectTable: () => void
  onIncrement: (menuItemId: number) => void
  onDecrement: (menuItemId: number) => void
  onRemove: (menuItemId: number) => void
  onSetNote: (menuItemId: number, note: string) => void
  onHold: () => void
  onSendToKitchen: () => void
}

export function CartPanel({
  lines,
  itemCount,
  subtotal,
  tax,
  total,
  tableLabel,
  onSelectTable,
  onIncrement,
  onDecrement,
  onRemove,
  onSetNote,
  onHold,
  onSendToKitchen,
}: CartPanelProps) {
  return (
    <aside className="flex w-96 shrink-0 flex-col overflow-hidden rounded-xl border border-border-subtle bg-bg-surface shadow-card">
      <div className="border-b border-dashed border-border-subtle p-4 text-center">
        <button
          onClick={onSelectTable}
          className="inline-flex items-center gap-1 rounded-lg bg-accent-tint px-3 py-1.5 font-num text-subheading font-bold text-accent-primary transition-colors hover:bg-accent-primary hover:text-text-on-accent"
        >
          {tableLabel}
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
        <div className="mt-1 text-caption text-text-secondary">
          {itemCount} item dalam keranjang
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {lines.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <div className="text-heading font-semibold text-border-subtle">#</div>
            <p className="max-w-[220px] text-caption text-text-secondary">
              Keranjang kosong. Klik tombol + pada menu untuk menambahkan pesanan.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {lines.map((line) => (
              <li key={line.menuItemId} className="rounded-lg border border-border-subtle p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 flex-1 truncate text-body font-semibold text-text-primary">
                    {line.name}
                  </span>
                  <button
                    onClick={() => onRemove(line.menuItemId)}
                    aria-label={`Hapus ${line.name}`}
                    className="text-text-secondary transition-colors hover:text-status-danger"
                  >
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onDecrement(line.menuItemId)}
                      aria-label="Kurangi"
                      className="flex h-7 w-7 items-center justify-center rounded-md border border-border-subtle text-text-primary hover:bg-bg-secondary"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M5 12h14" />
                      </svg>
                    </button>
                    <span className="w-6 text-center font-num text-body font-semibold">{line.quantity}</span>
                    <button
                      onClick={() => onIncrement(line.menuItemId)}
                      aria-label="Tambah"
                      className="flex h-7 w-7 items-center justify-center rounded-md border border-border-subtle text-text-primary hover:bg-bg-secondary"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                    </button>
                  </div>
                  <span className="font-num text-body font-semibold text-text-primary">
                    {formatRupiah(line.price * line.quantity)}
                  </span>
                </div>

                <input
                  value={line.note ?? ''}
                  onChange={(e) => onSetNote(line.menuItemId, e.target.value)}
                  placeholder="Catatan (mis. tidak pedas)"
                  className="mt-2 w-full rounded-md border border-border-subtle px-2.5 py-1.5 text-caption placeholder:text-text-secondary focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-tint"
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="shrink-0 border-t border-dashed border-border-subtle p-4">
        <div className="flex justify-between py-1 text-body text-text-secondary">
          <span>Subtotal</span>
          <span className="font-num">{formatRupiah(subtotal)}</span>
        </div>
        <div className="flex justify-between py-1 text-body text-text-secondary">
          <span>Pajak (10%)</span>
          <span className="font-num">{formatRupiah(tax)}</span>
        </div>
        <div className="mt-2 flex justify-between border-t border-border-subtle pt-3 text-subheading font-bold text-text-primary">
          <span>Total</span>
          <span className="font-num">{formatRupiah(total)}</span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={onHold} disabled={lines.length === 0}>
            Hold
          </Button>
          <Button onClick={onSendToKitchen} disabled={lines.length === 0}>
            Kirim ke Dapur
          </Button>
        </div>
      </div>
    </aside>
  )
}

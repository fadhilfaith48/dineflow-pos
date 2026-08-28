import { useState } from 'react'
import { Button } from '@/components/Button'

interface VoidOrderModalProps {
  open: boolean
  orderNumber?: string
  onClose: () => void
  onConfirm: (reason: string) => void
}

const PRESET_REASONS = ['Pelanggan batal', 'Salah input pesanan', 'Menu habis', 'Pesanan ganda']

export function VoidOrderModal({ open, orderNumber, onClose, onConfirm }: VoidOrderModalProps) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  if (!open) return null

  function submit() {
    if (!reason.trim()) {
      setError('Alasan pembatalan wajib diisi.')
      return
    }
    onConfirm(reason.trim())
    setReason('')
    setError('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-bg-surface p-6 shadow-modal">
        <div className="flex items-center justify-between">
          <h3 className="text-heading font-semibold text-text-primary">Batalkan Pesanan</h3>
          <button onClick={onClose} aria-label="Tutup" className="text-text-secondary hover:text-text-primary">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="mt-2 text-caption text-text-secondary">
          {orderNumber ? `Pesanan ${orderNumber} akan dibatalkan.` : 'Pesanan akan dibatalkan.'} Status menjadi
          dibatalkan dan meja (jika ada) kembali kosong.
        </p>

        <label className="mt-4 block text-caption font-semibold uppercase tracking-wide text-text-secondary">
          Alasan Pembatalan
        </label>
        <select
          value={PRESET_REASONS.includes(reason) ? reason : ''}
          onChange={(e) => {
            setReason(e.target.value)
            setError('')
          }}
          className="mt-1 w-full rounded-lg border border-border-subtle bg-bg-surface px-3 py-2 text-body focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-tint"
        >
          <option value="">Pilih alasan...</option>
          {PRESET_REASONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        <input
          value={reason}
          onChange={(e) => {
            setReason(e.target.value)
            setError('')
          }}
          placeholder="Atau tulis alasan lain..."
          className="mt-2 w-full rounded-lg border border-border-subtle px-3 py-2 text-body focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-tint"
        />

        {error && <p className="mt-2 text-caption font-semibold text-status-danger">{error}</p>}

        <div className="mt-6 flex gap-2">
          <Button variant="outline" fullWidth onClick={onClose}>
            Batal
          </Button>
          <Button variant="danger" fullWidth onClick={submit}>
            Ya, Batalkan
          </Button>
        </div>
      </div>
    </div>
  )
}

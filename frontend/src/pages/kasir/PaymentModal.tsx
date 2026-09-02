import { useEffect, useRef, useState } from 'react'
import type { PaymentMethod } from '@/types'
import { formatRupiah } from '@/lib/format'
import { Button } from '@/components/Button'
import { QrisPay } from '@/components/QrisPay'
import { api } from '@/services/httpApi'

interface PaymentModalProps {
  open: boolean
  total: number
  orderId: number
  onClose: () => void
  onTunai: (payload: { cashReceived?: number }) => Promise<void>
  onQrisPaid: () => Promise<void>
}

/**
 * Modal pembayaran kasir — bayar di muka (Tunai atau QRIS dinamis).
 * Order sudah dibuat berstatus 'menunggu'; setelah lunas otomatis ke dapur.
 */
export function PaymentModal({ open, total, orderId, onClose, onTunai, onQrisPaid }: PaymentModalProps) {
  const [method, setMethod] = useState<PaymentMethod>('tunai')
  const [cash, setCash] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [checkout, setCheckout] = useState<{ reference: string; qrContent: string | null; gateway: string } | null>(null)
  const [checkoutError, setCheckoutError] = useState('')
  const didQrisPaid = useRef(false)

  useEffect(() => {
    if (open) {
      setMethod('tunai')
      setCash('')
      setSubmitting(false)
      setCheckout(null)
      setCheckoutError('')
      didQrisPaid.current = false
    }
  }, [open])

  useEffect(() => {
    if (!open || method !== 'qris' || checkout) return
    let cancelled = false
    api.checkoutOrder(orderId)
      .then((c) => {
        if (!cancelled) setCheckout({ reference: c.reference, qrContent: c.qrContent, gateway: c.gateway })
      })
      .catch((e) => {
        if (!cancelled) setCheckoutError(e instanceof Error ? e.message : 'Gagal membuat pembayaran QRIS.')
      })
    return () => {
      cancelled = true
    }
  }, [open, method, orderId, checkout])

  if (!open) return null

  const cashAmount = Number(cash.replace(/\D/g, '')) || 0
  const change = cashAmount - total
  const cashInvalid = method === 'tunai' && cashAmount < total

  async function handleConfirmTunai() {
    if (submitting) return
    setSubmitting(true)
    try {
      await onTunai({ cashReceived: cashAmount })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleQrisPaid() {
    if (didQrisPaid.current) return
    didQrisPaid.current = true
    try {
      await onQrisPaid()
    } catch {
      didQrisPaid.current = false
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-bg-surface p-6 shadow-modal">
        <div className="flex items-center justify-between">
          <h2 className="text-heading font-semibold text-text-primary">Bayar di Muka</h2>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="text-text-secondary transition-colors hover:text-text-primary"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mt-4 flex justify-between rounded-lg bg-bg-secondary px-4 py-3">
          <span className="text-body text-text-secondary">Total</span>
          <span className="font-num text-heading font-bold text-text-primary">{formatRupiah(total)}</span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={() => setMethod('tunai')}
            className={`rounded-lg border px-4 py-3 text-body font-semibold transition-colors ${
              method === 'tunai'
                ? 'border-accent-primary bg-accent-tint text-accent-primary'
                : 'border-border-subtle text-text-secondary hover:bg-bg-secondary'
            }`}
          >
            Tunai
          </button>
          <button
            onClick={() => setMethod('qris')}
            className={`rounded-lg border px-4 py-3 text-body font-semibold transition-colors ${
              method === 'qris'
                ? 'border-accent-primary bg-accent-tint text-accent-primary'
                : 'border-border-subtle text-text-secondary hover:bg-bg-secondary'
            }`}
          >
            QRIS
          </button>
        </div>

        {method === 'tunai' && (
          <div className="mt-4">
            <label className="text-caption font-semibold uppercase tracking-wider text-text-secondary">
              Uang diterima
            </label>
            <input
              value={cash}
              onChange={(e) => setCash(e.target.value.replace(/\D/g, ''))}
              inputMode="numeric"
              placeholder="0"
              className="mt-1 w-full rounded-lg border border-border-subtle px-4 py-3 font-num text-body focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-tint"
            />
            <div className="mt-2 flex justify-between text-body">
              <span className="text-text-secondary">Kembalian</span>
              <span className={`font-num font-semibold ${cashInvalid ? 'text-status-danger' : 'text-status-ready'}`}>
                {cashAmount === 0 ? '-' : formatRupiah(Math.max(change, 0))}
              </span>
            </div>
          </div>
        )}

        {method === 'qris' && (
          <div className="mt-4 flex flex-col items-center text-center">
            {checkoutError ? (
              <p className="text-caption font-semibold text-status-danger">{checkoutError}</p>
            ) : checkout ? (
              <QrisPay
                reference={checkout.reference}
                qrContent={checkout.qrContent}
                gateway={checkout.gateway}
                total={total}
                onPaid={handleQrisPaid}
              />
            ) : (
              <p className="py-8 text-caption text-text-secondary">Membuat pembayaran QRIS...</p>
            )}
          </div>
        )}

        <div className="mt-6 flex gap-2">
          <Button variant="outline" fullWidth onClick={onClose}>
            Batal
          </Button>
          {method === 'tunai' && (
            <Button fullWidth onClick={handleConfirmTunai} disabled={cashInvalid || submitting}>
              {submitting ? 'Memproses...' : 'Konfirmasi Bayar'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

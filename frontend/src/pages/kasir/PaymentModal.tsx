import { useEffect, useMemo, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import type { PaymentMethod } from '@/types'
import { formatRupiah } from '@/lib/format'
import { Button } from '@/components/Button'

interface PaymentModalProps {
  open: boolean
  total: number
  onClose: () => void
  onConfirm: (payload: { method: PaymentMethod; cashReceived?: number }) => void
}

/** CRC-16/CCITT (0x1021) yang dipakai payload QRIS untuk tag 63 */
function crc16ccitt(data: string): string {
  let crc = 0xffff
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

const pad2 = (n: number) => String(n).padStart(2, '0')

/** Payload QRIS dinamis (EMVCo) berisi nominal; merchant fiktif untuk simulasi. */
function buildQrisPayload(total: number): string {
  const merchant = 'ID.CO.DINEFLOW.QRIS'
  const merchantId = 'DINEFLOW01'
  const name = 'DINEFLOW RESTAURANT'
  const city = 'JAKARTA'
  const amount = String(total)

  const merchantAccount =
    `00${pad2(merchant.length)}${merchant}` + `01${pad2(merchantId.length)}${merchantId}`
  const body =
    '000201010212' +
    `26${pad2(merchantAccount.length)}${merchantAccount}` +
    '52045678' +
    '5303360' +
    `54${pad2(amount.length)}${amount}` +
    '5802ID' +
    `59${pad2(name.length)}${name}` +
    `60${pad2(city.length)}${city}`
  return body + '6304' + crc16ccitt(body + '6304')
}

export function PaymentModal({ open, total, onClose, onConfirm }: PaymentModalProps) {
  const [method, setMethod] = useState<PaymentMethod>('tunai')
  const [cash, setCash] = useState('')
  const [qrisPaid, setQrisPaid] = useState(false)

  useEffect(() => {
    if (open) {
      setMethod('tunai')
      setCash('')
      setQrisPaid(false)
    }
  }, [open])

  const qrisPayload = useMemo(() => buildQrisPayload(total), [total])

  if (!open) return null

  const cashAmount = Number(cash.replace(/\D/g, '')) || 0
  const change = cashAmount - total
  const cashInvalid = method === 'tunai' && cashAmount < total

  function handleConfirm() {
    onConfirm({
      method,
      cashReceived: method === 'tunai' ? cashAmount : undefined,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-bg-surface p-6 shadow-modal">
        <div className="flex items-center justify-between">
          <h2 className="text-heading font-semibold text-text-primary">Pembayaran</h2>
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
            <div className="w-fit rounded-xl border border-border-subtle p-4">
              <QRCodeSVG value={qrisPayload} size={180} />
            </div>
            <p className="mt-3 text-caption text-text-secondary">
              Minta pelanggan memindai QRIS untuk membayar{' '}
              <span className="font-num font-semibold text-text-primary">{formatRupiah(total)}</span>
            </p>
            <div
              className={`mt-3 flex items-center gap-2 rounded-lg px-4 py-2 text-caption font-semibold ${
                qrisPaid
                  ? 'bg-status-ready/15 text-status-ready'
                  : 'bg-accent-tint text-accent-primary'
              }`}
            >
              {qrisPaid ? (
                <>Pembayaran berhasil</>
              ) : (
                <>
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-primary opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent-primary" />
                  </span>
                  Menunggu pembayaran...
                </>
              )}
            </div>
          </div>
        )}

        <div className="mt-6 flex gap-2">
          <Button variant="outline" fullWidth onClick={onClose}>
            Batal
          </Button>
          {method === 'qris' ? (
            <Button fullWidth onClick={() => setQrisPaid(true)}>
              Simulasi Pembayaran Sukses
            </Button>
          ) : (
            <Button fullWidth onClick={handleConfirm} disabled={cashInvalid}>
              Konfirmasi Bayar
            </Button>
          )}
        </div>

        {method === 'qris' && qrisPaid && (
          <div className="mt-4">
            <Button variant="primary" fullWidth onClick={handleConfirm}>
              Tandai Lunas
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
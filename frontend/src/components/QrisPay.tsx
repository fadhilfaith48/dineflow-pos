import { useEffect, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { api } from '@/services/httpApi'
import { formatRupiah } from '@/lib/format'

interface QrisPayProps {
  reference: string
  qrContent?: string | null
  gateway?: string
  total: number
  onPaid: () => void
}

/**
 * Tampilkan QRIS bayar di muka + polling status (doku) / tombol demo (mock).
 * Bila status gateway menjadi 'paid', otomatis onPaid() untuk lanjut alur.
 */
export function QrisPay({ reference, qrContent, gateway, total, onPaid }: QrisPayProps) {
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    timer.current = setInterval(async () => {
      try {
        const res = await api.getPaymentStatus(reference)
        if (res.status === 'paid') {
          if (timer.current) clearInterval(timer.current)
          setDone(true)
          onPaid()
        }
      } catch {
        // abaikan error polling, coba lagi pada interval berikutnya
      }
    }, 3000)

    return () => {
      if (timer.current) clearInterval(timer.current)
    }
  }, [reference, onPaid])

  async function handleMockPaid() {
    setError('')
    try {
      await api.markMockPaid(reference)
      if (timer.current) clearInterval(timer.current)
      setDone(true)
      onPaid()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menandai pembayaran.')
    }
  }

  return (
    <div className="flex flex-col items-center text-center">
      <div className="w-fit rounded-xl border border-border-subtle p-4">
        <QRCodeSVG value={qrContent || reference} size={200} />
      </div>

      {!done && (
        <>
          <p className="mt-3 text-caption text-text-secondary">
            Pindai QRIS untuk membayar{' '}
            <span className="font-num font-semibold text-text-primary">{formatRupiah(total)}</span>
          </p>
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-accent-tint px-4 py-2 text-caption font-semibold text-accent-primary">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-primary opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent-primary" />
            </span>
            Menunggu pembayaran...
          </div>
          {gateway === 'mock' && (
            <button
              onClick={handleMockPaid}
              className="mt-4 h-14 w-full rounded-xl bg-accent-primary font-semibold text-text-on-accent transition-colors hover:bg-accent-primary-hover"
            >
              Saya Sudah Bayar (Demo)
            </button>
          )}
          {error && (
            <p className="mt-2 text-caption font-semibold text-status-danger">{error}</p>
          )}
        </>
      )}

      {done && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-status-ready/15 px-4 py-2 text-caption font-semibold text-status-ready">
          Pembayaran berhasil
        </div>
      )}
    </div>
  )
}

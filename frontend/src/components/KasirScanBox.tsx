import { useState } from 'react'
import type { Order } from '@/types'
import { extractOrderNumber } from '@/lib/scan'
import { ScanCameraModal } from '@/components/ScanCameraModal'

interface KasirScanBoxProps {
  pendingOrders: Order[]
  onPayNote: (order: Order) => void
}

export function KasirScanBox({ pendingOrders, onPayNote }: KasirScanBoxProps) {
  const [value, setValue] = useState('')
  const [feedback, setFeedback] = useState('')
  const [showCamera, setShowCamera] = useState(false)

  function submitScan(raw: string) {
    const text = raw.trim()
    if (!text) return
    const number = extractOrderNumber(text)
    if (!number) {
      setFeedback('Kode tidak dikenali. Pastikan barcode berisi nomor pesanan (ORD-XXXX).')
      return
    }
    const found = pendingOrders.find((o) => o.orderNumber === number)
    if (!found) {
      setFeedback(`Pesanan ${number} tidak ditemukan di daftar masuk.`)
      return
    }
    setFeedback('')
    setValue('')
    onPayNote(found)
  }

  return (
    <div className="border-b border-border-subtle p-3">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          submitScan(value)
        }}
        className="flex gap-2"
      >
        <input
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setFeedback('')
          }}
          placeholder="Scan barcode / ketik ORD-XXXX"
          className="min-w-0 flex-1 rounded-lg border border-border-subtle bg-bg-secondary px-3 py-2 text-body text-text-primary placeholder:text-text-secondary"
        />
        <button
          type="submit"
          aria-label="Cari pesanan"
          className="flex w-11 shrink-0 items-center justify-center rounded-lg border border-border-subtle text-accent-primary"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => {
            setFeedback('')
            setShowCamera(true)
          }}
          aria-label="Scan dengan kamera"
          title="Scan dengan kamera"
          className="flex w-11 shrink-0 items-center justify-center rounded-lg bg-accent-primary text-text-on-accent"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 8a2 2 0 0 1 2-2h2l1.5-2h7L17 6h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <circle cx="12" cy="13" r="3.5" />
          </svg>
        </button>
      </form>
      {feedback && <p className="mt-2 text-caption font-medium text-status-danger">{feedback}</p>}

      <ScanCameraModal
        open={showCamera}
        onScan={(text) => {
          setShowCamera(false)
          setValue(text)
          submitScan(text)
        }}
        onClose={() => setShowCamera(false)}
      />
    </div>
  )
}
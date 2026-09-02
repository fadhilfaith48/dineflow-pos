import { useCallback, useEffect, useRef, useState } from 'react'

interface ScanCameraModalProps {
  open: boolean
  onScan: (decodedText: string) => void
  onClose: () => void
}

type Facing = 'environment' | 'user'
type Scanner = import('html5-qrcode').Html5Qrcode

export function ScanCameraModal({ open, onScan, onClose }: ScanCameraModalProps) {
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)
  const [facing, setFacing] = useState<Facing>('environment')
  const scannerRef = useRef<Scanner | null>(null)

  const stopScanner = useCallback(async () => {
    const inst = scannerRef.current
    scannerRef.current = null
    if (inst && inst.isScanning) {
      try {
        await inst.stop()
      } catch {
        // abaikan; kamera sudah mati
      }
      try {
        inst.clear()
      } catch {
        // abaikan
      }
    }
  }, [])

  const startScanner = useCallback(
    async (mode: Facing) => {
      setFacing(mode)
      setError('')
      setReady(false)
      try {
        await stopScanner()
        const { Html5Qrcode } = await import('html5-qrcode')
        const inst = new Html5Qrcode('scan-camera-region')
        scannerRef.current = inst
        await inst.start(
          { facingMode: mode },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          async (decodedText) => {
            onScan(decodedText)
            await stopScanner()
          },
          () => {
            // abaikan frame yang gagal dibaca
          },
        )
        setReady(true)
      } catch (e) {
        scannerRef.current = null
        setError(
          e instanceof Error && /NotAllowed|Permission/i.test(e.message)
            ? 'Kamera tidak diizinkan. Izinkan akses kamera untuk scan.'
            : 'Kamera tidak tersedia. Coba tombol ganti kamera atau gunakan barcode gun / ketik manual.',
        )
      }
    },
    [onScan, stopScanner],
  )

  useEffect(() => {
    if (!open) return
    let cancelled = false
    const timer = setTimeout(() => {
      if (!cancelled) void startScanner('environment')
    }, 0)
    return () => {
      cancelled = true
      clearTimeout(timer)
      void stopScanner()
    }
  }, [open, startScanner, stopScanner])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-bg-surface p-4 shadow-dropdown">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-heading font-semibold text-text-primary">Scan Barcode Pesanan</h2>
          <button
            onClick={() => {
              void stopScanner()
              onClose()
            }}
            aria-label="Tutup"
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-border-subtle text-text-primary"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div
          id="scan-camera-region"
          className="overflow-hidden rounded-lg border border-border-subtle bg-bg-secondary"
          style={{ minHeight: 260 }}
        />

        <div className="mt-3 flex gap-2">
          <button
            onClick={() => void startScanner('environment')}
            className={`flex-1 rounded-lg border px-3 py-2 text-caption font-semibold transition-colors ${
              facing === 'environment'
                ? 'border-accent-primary bg-accent-tint text-accent-primary'
                : 'border-border-subtle text-text-secondary'
            }`}
          >
            Kamera Belakang
          </button>
          <button
            onClick={() => void startScanner('user')}
            className={`flex-1 rounded-lg border px-3 py-2 text-caption font-semibold transition-colors ${
              facing === 'user'
                ? 'border-accent-primary bg-accent-tint text-accent-primary'
                : 'border-border-subtle text-text-secondary'
            }`}
          >
            Kamera Depan
          </button>
          <button
            onClick={() => void startScanner(facing === 'environment' ? 'user' : 'environment')}
            className="flex w-12 items-center justify-center rounded-lg border border-border-subtle text-text-primary"
            aria-label="Ganti kamera"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 1 1-2.6-6.4" />
              <path d="M21 3v5h-5" />
            </svg>
          </button>
        </div>

        {error && <p className="mt-3 text-caption font-medium text-status-danger">{error}</p>}
        {ready && (
          <p className="mt-3 text-center text-caption text-text-secondary">
            Arahkan kamera ke barcode pesanan di HP pelanggan.
          </p>
        )}
      </div>
    </div>
  )
}
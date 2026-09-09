import { useEffect, useState } from 'react'
import { formatElapsed } from '@/lib/format'

interface ElapsedTextProps {
  /** Timestamp mulai (ms). Jika undefined → tidak render apa pun. */
  start?: number
}

/**
 * Teks durasi yang self-update setiap 1 detik (mm:ss; ≥1 jam → h:mm).
 * Hanya komponen kecil ini yang re-render per detik, bukan halaman induk.
 */
export function ElapsedText({ start }: ElapsedTextProps) {
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  if (start == null) return null
  return <>{formatElapsed(start, Date.now())}</>
}
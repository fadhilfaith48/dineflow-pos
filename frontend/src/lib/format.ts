export function formatRupiah(value: number): string {
  return `Rp ${value.toLocaleString('id-ID')}`
}

/** Format digit mentah input uang menjadi "20.000" (titik ribuan). */
export function formatRupiahInput(value: string): string {
  const num = Number(value.replace(/\D/g, ''))
  return num ? num.toLocaleString('id-ID') : ''
}

/** Format selisih durasi dari start ke now (mm:ss; bila ≥ 1 jam → h:mm). */
export function formatElapsed(start: number, now: number): string {
  const ms = Math.max(0, now - start)
  const totalMin = Math.floor(ms / 60000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  const s = Math.floor((ms % 60000) / 1000)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

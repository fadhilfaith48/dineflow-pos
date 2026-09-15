/** Kunci idempotensi unik untuk satu aksi kirim pesanan (anti order ganda). */
export function newIdempotencyKey(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `ord-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
}
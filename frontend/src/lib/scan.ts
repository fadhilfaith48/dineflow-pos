/** Ekstrak nomor pesanan (ORD-XXXX) dari teks hasil scan barcode.
 *  Menerima URL penuh (mis. https://.../order/ORD-0007) maupun teks polos.
 */
export function extractOrderNumber(text: string): string | null {
  const match = text.trim().match(/(ORD-\d{4})/i)
  return match ? match[1].toUpperCase() : null
}
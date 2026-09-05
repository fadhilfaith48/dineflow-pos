import type { MenuItem } from '@/types'

/**
 * Resolusi foto yang ditampilkan untuk sebuah menu.
 * Jika varian ukuran punya foto sendiri, foto menyesuaikan varian yang dipilih
 * (fallback ke varian pertama yang punya foto, lalu foto item).
 */
export function displayPhoto(item: MenuItem, selectedVariantName?: string): string | undefined {
  const variants = item.variants ?? []
  if (selectedVariantName) {
    const v = variants.find((x) => x.name === selectedVariantName)
    if (v?.imageUrl) return v.imageUrl
  }
  return item.imageUrl ?? variants.find((x) => x.imageUrl)?.imageUrl
}
import type { MenuItem } from '@/types'

/**
 * Normalisasi URL foto agar sumber yang sama tetap tampil dari perangkat lain
 * (HP/tablet di jaringan Wi-Fi): URL absolut ke host backend localhost/127.0.0.1
 * (mis. `http://localhost:8000/storage/...`) diubah ke path relatif `/storage/...`
 * sehingga dimuat same-origin (dev lewat proxy Vite `/storage`, produksi via Nginx).
 * `blob:`/`data:` (preview upload lokal) dan URL host lain (S3, IP LAN) tetap apa adanya.
 */
export function photoUrl(src?: string): string | undefined {
  if (!src) return undefined
  try {
    const u = new URL(src, window.location.href)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return src
    const sameHost = u.hostname === 'localhost' || u.hostname === '127.0.0.1'
    if (sameHost || u.origin === window.location.origin) {
      return u.pathname + u.search
    }
  } catch {
    return src
  }
  return src
}

/**
 * Resolusi foto yang ditampilkan untuk sebuah menu.
 * Jika varian ukuran punya foto sendiri, foto menyesuaikan varian yang dipilih
 * (fallback ke varian pertama yang punya foto, lalu foto item). Hasil dinormalkan
 * `photoUrl` (relative `/storage`, aman dibuka dari HP/tablet).
 */
export function displayPhoto(item: MenuItem, selectedVariantName?: string): string | undefined {
  const variants = item.variants ?? []
  if (selectedVariantName) {
    const v = variants.find((x) => x.name === selectedVariantName)
    if (v?.imageUrl) return photoUrl(v.imageUrl)
  }
  return photoUrl(item.imageUrl ?? variants.find((x) => x.imageUrl)?.imageUrl)
}
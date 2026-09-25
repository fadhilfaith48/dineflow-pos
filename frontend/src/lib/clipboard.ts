/** Salin teks ke clipboard dengan fallback (textarea + execCommand) untuk
 *  lingkungan non-HTTPS (LAN/prototipe) di mana navigator.clipboard bisa undefinisi. */
export async function copyToClipboard(text: string): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text)
      return
    } catch {
      // fallback di bawah
    }
  }
  const ta = document.createElement('textarea')
  ta.value = text
  ta.setAttribute('readonly', '')
  ta.style.position = 'fixed'
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  ta.select()
  const ok = document.execCommand('copy')
  document.body.removeChild(ta)
  if (!ok) throw new Error('Gagal menyalin ke clipboard.')
}
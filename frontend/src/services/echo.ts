import Echo from 'laravel-echo'
import Pusher from 'pusher-js'
import { getToken } from './httpApi'

/**
 * Klien real-time tunggal (Laravel Echo + Reverb, protokol Pusher).
 *
 * Channel PUBLIK (tanpa login): `menu`, `order.{orderNumber}` (pelanggan Menu QR).
 * Channel PRIVAT (butuh token): `orders`, `settings` — panel kasir/dapur/pelayan/admin.
 * Otorisasi privat lewat POST `/api/broadcasting/auth` (auth:sanctum) dengan header
 * Bearer yang dibaca DINAMIS dari sessionStorage tiap subscribe (custom authorizer),
 * sehingga ganti login/logout per tab tidak membuat header Echo basi.
 *
 * WS same-origin saat dev (host halaman × proxy `/app` di vite.config.ts:
 * ws→127.0.0.1:8080). Saat produksi frontend ≠ backend origin (Vercel vs VPS
 * DuckDNS), host WS & endpoint auth diturunkan dari VITE_API_URL yang ABSOLUTE
 * (mis. https://dineflow.duckdns.org/api) supaya koneksi tetap menuju backend,
 * bukan domain frontend. Env VITE_REVERB_HOST/PORT/SCHEME tetap override opsional.
 */
const isPreview = import.meta.env.PROD
const API_BASE = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/+$/, '')

// dev: '/api' (relatif, same-origin via proxy Vite) → '/api/broadcasting/auth'
// prod: 'https://dineflow.duckdns.org/api' (absolute) → endpoint nyata di VPS
const AUTH_ENDPOINT = `${API_BASE}/broadcasting/auth`

function defaultWsHost(): string {
  if (import.meta.env.VITE_REVERB_HOST) return import.meta.env.VITE_REVERB_HOST
  try {
    return new URL(API_BASE).hostname
  } catch {
    return window.location.hostname
  }
}

const echo = new Echo({
  broadcaster: 'pusher',
  key: import.meta.env.VITE_REVERB_APP_KEY,
  Pusher,
  cluster: 'mt1',
  namespace: '',
  wsHost: defaultWsHost(),
  wsPort:
    Number(import.meta.env.VITE_REVERB_PORT) ||
    Number(window.location.port) ||
    (isPreview ? 443 : 80),
  forceTLS: isPreview ? true : import.meta.env.VITE_REVERB_SCHEME === 'https',
  enabledTransports: ['ws', 'wss'],
  authEndpoint: AUTH_ENDPOINT,
  // Authorizer kustom agar token dibaca saat subscribe (bukan saat modul dimuat),
  // dan request auth ikut ter-proxy same-origin lewat prefix `/api`.
  authorizer: (channel) => ({
    authorize: async (socketId, callback) => {
      try {
        const token = getToken()
        const res = await fetch(AUTH_ENDPOINT, {
          method: 'POST',
          headers: new Headers({
            Accept: 'application/json',
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          }),
          body: JSON.stringify({ socket_id: socketId, channel_name: channel.name }),
        })
        if (!res.ok) throw new Error(`Otorisasi channel gagal (${res.status})`)
        callback(null as unknown as Error, (await res.json()) as { auth: string })
      } catch (error) {
        callback(error as Error, null)
      }
    },
  }),
})

export default echo

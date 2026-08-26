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
 * WS selalu same-origin (host halaman) → lewat proxy `/app` di vite.config.ts
 * (dev: ws→127.0.0.1:8080; produksi: wss:443 via Nginx). Keuntungan dev:
 * HP di WiFi lokal tidak perlu buka port 8080 di firewall. Env VITE_REVERB_HOST/
 * PORT/SCHEME tetap didukung sebagai override opsional.
 */
const isPreview = import.meta.env.PROD

const AUTH_ENDPOINT = '/api/broadcasting/auth'

const echo = new Echo({
  broadcaster: 'pusher',
  key: import.meta.env.VITE_REVERB_APP_KEY,
  Pusher,
  cluster: 'mt1',
  namespace: '',
  wsHost: import.meta.env.VITE_REVERB_HOST || window.location.hostname,
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

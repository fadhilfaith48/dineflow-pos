import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

/**
 * Klien real-time tunggal (Laravel Echo + Reverb, protokol Pusher).
 * Channel publik: `orders` (kasir/dapur/pelayan) & `order.{orderNumber}` (pelanggan).
 */
/**
 * WS selalu same-origin (host halaman) → lewat proxy `/app` di vite.config.ts
 * (dev: ws→127.0.0.1:8080; produksi: wss:443 via Nginx). Keuntungan dev:
 * HP di WiFi lokal tidak perlu buka port 8080 di firewall. Env VITE_REVERB_HOST/
 * PORT/SCHEME tetap didukung sebagai override opsional.
 */
const isPreview = import.meta.env.PROD

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
})

export default echo
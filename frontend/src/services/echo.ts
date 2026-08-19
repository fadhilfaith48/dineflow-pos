import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

/**
 * Klien real-time tunggal (Laravel Echo + Reverb, protokol Pusher).
 * Channel publik: `orders` (kasir/dapur/pelayan) & `order.{orderNumber}` (pelanggan).
 */
/**
 * Saat build/preview (deploy via tunnel), Reverb diakses same-origin via proxy Vite
 * (wss pada host halaman). Saat dev lokal, pakai nilai env (127.0.0.1:8080).
 */
const isPreview = import.meta.env.PROD

const echo = new Echo({
  broadcaster: 'pusher',
  key: import.meta.env.VITE_REVERB_APP_KEY,
  Pusher,
  cluster: 'mt1',
  namespace: '',
  wsHost: isPreview ? window.location.hostname : import.meta.env.VITE_REVERB_HOST,
  wsPort: isPreview ? 443 : Number(import.meta.env.VITE_REVERB_PORT),
  forceTLS: isPreview ? true : import.meta.env.VITE_REVERB_SCHEME === 'https',
  enabledTransports: ['ws', 'wss'],
})

export default echo
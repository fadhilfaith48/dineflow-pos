import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

/**
 * Klien real-time tunggal (Laravel Echo + Reverb, protokol Pusher).
 * Channel publik: `orders` (kasir/dapur/pelayan) & `order.{orderNumber}` (pelanggan).
 */
const echo = new Echo({
  broadcaster: 'pusher',
  key: import.meta.env.VITE_REVERB_APP_KEY,
  Pusher,
  cluster: 'mt1',
  wsHost: import.meta.env.VITE_REVERB_HOST,
  wsPort: Number(import.meta.env.VITE_REVERB_PORT),
  forceTLS: import.meta.env.VITE_REVERB_SCHEME === 'https',
  enabledTransports: ['ws', 'wss'],
})

export default echo
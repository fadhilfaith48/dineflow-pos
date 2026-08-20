import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import type { MenuCategory, MenuItem, Order } from '@/types'
import { api } from '@/services/httpApi'
import echo from '@/services/echo'
import { useCart } from '@/hooks/useCart'
import { formatRupiah } from '@/lib/format'
import { CategoryTabs } from '@/components/CategoryTabs'
import { StatusBadge, type BadgeVariant } from '@/components/StatusBadge'

const itemBadge: Record<string, BadgeVariant> = {
  baru: 'new',
  dimasak: 'cooking',
  siap: 'ready',
  diantar: 'done',
}

type View = 'menu' | 'cart' | 'tracking'

export function MenuPage() {
  const { table } = useParams<{ table: string }>()
  const cart = useCart()
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [activeCategory, setActiveCategory] = useState<number | null>(null)
  const [tableId, setTableId] = useState<number | null>(null)
  const [tableChecked, setTableChecked] = useState(false)
  const [tableNotFound, setTableNotFound] = useState(false)
  const [view, setView] = useState<View>('menu')
  const [trackedOrder, setTrackedOrder] = useState<Order | null>(null)
  const [orderNumber, setOrderNumber] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    api.getCategories().then((cats) => {
      setCategories(cats)
      setActiveCategory((prev) => prev ?? cats[0]?.id ?? null)
    })
    api.getMenuItems().then(setItems)
  }, [])

  useEffect(() => {
    echo.channel('menu').listen('MenuChanged', () => {
      api.getMenuItems().then(setItems)
    })
    return () => {
      echo.leaveChannel('menu')
    }
  }, [])

  useEffect(() => {
    if (!table) return
    setTableChecked(false)
    setTableNotFound(false)
    api.getTables().then((tables) => {
      const found = tables.find((t) => t.number.toLowerCase() === table.toLowerCase())
      if (found) {
        setTableId(found.id)
      } else {
        setTableNotFound(true)
      }
    }).finally(() => setTableChecked(true))
  }, [table])

  useEffect(() => {
    if (view !== 'tracking' || !orderNumber) return
    echo.channel(`order.${orderNumber}`).listen('OrderStatusChanged', (event: { order?: Order }) => {
      if (event.order?.orderNumber === orderNumber) setTrackedOrder(event.order)
    })
    return () => {
      echo.leaveChannel(`order.${orderNumber}`)
    }
  }, [view, orderNumber])

  const visibleItems = useMemo(() => {
    return items.filter((item) => item.categoryId === activeCategory)
  }, [items, activeCategory])

  async function handleSubmitOrder() {
    if (tableId === null || cart.lines.length === 0 || submitting) return
    setSubmitting(true)
    setSubmitError('')
    try {
      const order = await api.createOrder({
        tableId,
        source: 'self-order',
        items: cart.lines,
      })
      setOrderNumber(order.orderNumber)
      setTrackedOrder(order)
      cart.clear()
      setView('tracking')
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Gagal mengirim pesanan. Coba lagi.')
    } finally {
      setSubmitting(false)
    }
  }

  if (tableNotFound || (tableChecked && tableId === null)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg-secondary px-6 text-center">
        <div className="font-num text-heading text-status-danger">!</div>
        <h1 className="text-heading font-semibold text-text-primary">Meja tidak ditemukan</h1>
        <p className="text-body text-text-secondary">
          Pastikan QR code yang dipindai benar dan meja sudah terdaftar.
        </p>
      </div>
    )
  }

  if (view === 'tracking') {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-bg-secondary">
        <header className="bg-accent-primary px-5 py-6 text-center text-text-on-accent">
          <div className="text-caption font-semibold uppercase tracking-wider opacity-80">Pesanan Terkirim</div>
          <div className="font-num text-heading font-bold">{orderNumber}</div>
          <div className="mt-1 text-caption opacity-90">Meja {table}</div>
        </header>
        <div className="flex-1 px-4 py-5">
          <p className="text-body text-text-secondary">
            Status pesananmu diperbarui otomatis. Silakan menunggu dan bayar di kasir saat selesai makan.
          </p>
          {trackedOrder && (
            <ul className="mt-5 flex flex-col gap-3">
              {trackedOrder.items.map((item) => (
                <li key={item.id} className="flex items-center justify-between rounded-xl border border-border-subtle bg-bg-surface p-4 shadow-card">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-body font-semibold text-text-primary">
                      {item.quantity}× {item.name}
                    </div>
                  </div>
                  <StatusBadge variant={itemBadge[item.status] ?? 'new'} label={item.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="border-t border-border-subtle bg-bg-surface p-4">
          <button
            onClick={() => setView('menu')}
            className="h-14 w-full rounded-xl border border-border-subtle text-body font-semibold text-text-primary"
          >
            Tambah Pesanan
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-bg-secondary">
      <header className="sticky top-0 z-20 border-b border-border-subtle bg-bg-surface px-5 py-4">
        <h1 className="text-heading font-bold text-text-primary">DineFlow Restaurant</h1>
        <p className="text-caption text-text-secondary">Scan & pesan sendiri · Meja {table}</p>
      </header>

      <div className="px-4 pt-3">
        <CategoryTabs categories={categories} activeId={activeCategory ?? 0} onChange={setActiveCategory} />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        <ul className="grid grid-cols-2 gap-3">
          {visibleItems.map((item) => (
            <li
              key={item.id}
              className={`flex flex-col overflow-hidden rounded-xl border border-border-subtle bg-bg-surface shadow-card ${
                item.available ? '' : 'opacity-50'
              }`}
            >
              <div className="flex h-20 items-center justify-center overflow-hidden bg-bg-secondary">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                ) : (
                  <svg className="h-10 w-10 text-border-subtle" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 11h18" />
                    <path d="M12 11v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V11" />
                    <path d="M21 11v8a3 3 0 0 1-3 3h-3a3 3 0 0 1-3-3" />
                    <circle cx="12" cy="5" r="2" />
                  </svg>
                )}
              </div>
              <div className="flex flex-1 flex-col p-3">
                <div className="line-clamp-2 text-body font-semibold text-text-primary">{item.name}</div>
                {item.description && <p className="mt-0.5 line-clamp-2 text-caption text-text-secondary">{item.description}</p>}
                <div className="mt-auto flex items-center justify-between pt-2">
                  <span className="font-num text-subheading font-bold text-accent-primary">
                    {formatRupiah(item.price)}
                  </span>
                  {item.available ? (
                    <button
                      onClick={() => cart.addItem(item)}
                      aria-label={`Tambah ${item.name}`}
                      className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-primary text-text-on-accent"
                    >
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                    </button>
                  ) : (
                    <span className="text-caption font-bold uppercase tracking-wide text-status-danger">Habis</span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="sticky bottom-0 z-20 border-t border-border-subtle bg-bg-surface p-4">
        <button
          onClick={() => setView('cart')}
          disabled={cart.lines.length === 0}
          className="flex h-14 w-full items-center justify-between rounded-xl bg-accent-primary px-5 text-text-on-accent shadow-modal transition-colors hover:bg-accent-primary-hover disabled:opacity-40"
        >
          <span className="font-num text-body font-bold">{cart.itemCount} item</span>
          <span className="text-subheading font-bold">Lihat Pesanan</span>
          <span className="font-num text-body font-bold">{formatRupiah(cart.summary.total)}</span>
        </button>
      </div>

      {view === 'cart' && (
        <div className="fixed inset-0 z-30 flex justify-center bg-slate-900/40">
          <div className="flex w-full max-w-md flex-col bg-bg-surface">
            <header className="flex items-center justify-between border-b border-border-subtle px-4 py-4">
              <h2 className="text-heading font-semibold text-text-primary">Pesanan Anda</h2>
              <button
                onClick={() => setView('menu')}
                aria-label="Tutup"
                className="flex h-11 w-11 items-center justify-center rounded-lg border border-border-subtle text-text-primary"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-3">
              {cart.lines.length === 0 ? (
                <p className="py-10 text-center text-body text-text-secondary">Keranjang kosong.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {cart.lines.map((line) => (
                    <li key={line.menuItemId} className="flex items-center justify-between gap-2 rounded-xl border border-border-subtle p-4">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-body font-semibold text-text-primary">{line.name}</div>
                        <div className="mt-1 flex items-center gap-2">
                          <button
                            onClick={() => cart.decrement(line.menuItemId)}
                            aria-label="Kurangi"
                            className="flex h-10 w-10 items-center justify-center rounded-lg border border-border-subtle text-text-primary"
                          >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <path d="M5 12h14" />
                            </svg>
                          </button>
                          <span className="w-6 text-center font-num text-body font-bold">{line.quantity}</span>
                          <button
                            onClick={() => cart.increment(line.menuItemId)}
                            aria-label="Tambah"
                            className="flex h-10 w-10 items-center justify-center rounded-lg border border-border-subtle text-accent-primary"
                          >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <path d="M12 5v14M5 12h14" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="font-num text-body font-bold text-text-primary">
                          {formatRupiah(line.price * line.quantity)}
                        </div>
                        <div className="font-num text-caption text-text-secondary">
                          {formatRupiah(line.price)} × {line.quantity}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border-t border-border-subtle bg-bg-surface p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-body text-text-secondary">Total</span>
                <span className="font-num text-heading font-bold text-text-primary">{formatRupiah(cart.summary.total)}</span>
              </div>
              <button
                onClick={handleSubmitOrder}
                disabled={cart.lines.length === 0 || submitting}
                className="h-14 w-full rounded-xl bg-accent-primary text-subheading font-bold text-text-on-accent transition-colors hover:bg-accent-primary-hover disabled:opacity-40"
              >
                {submitting ? 'Mengirim...' : 'Kirim Pesanan'}
              </button>
              {submitError && (
                <p className="mt-2 text-center text-caption font-semibold text-status-danger">{submitError}</p>
              )}
              <p className="mt-2 text-center text-caption text-text-secondary">
                Pembayaran dilakukan di kasir setelah menikmati hidangan.
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

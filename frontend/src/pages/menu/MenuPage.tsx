import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import type { MenuCategory, MenuItem, Order } from '@/types'
import type { MenuItemVariant } from '@/types'
import { api } from '@/services/httpApi'
import { QrisPay } from '@/components/QrisPay'
import echo from '@/services/echo'
import { useCart } from '@/hooks/useCart'
import { formatRupiah } from '@/lib/format'
import { CategoryTabs } from '@/components/CategoryTabs'
import { SpicePills } from '@/components/SpicePills'
import { OrderTracking } from '@/components/OrderTracking'

type View = 'menu' | 'cart' | 'payment' | 'tracking'
type PayMethod = 'choose' | 'qris' | 'kasir'

export function MenuPage() {
  const { table } = useParams<{ table: string }>()
  const cart = useCart()
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [activeCategory, setActiveCategory] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [tableId, setTableId] = useState<number | null>(null)
  const [tableChecked, setTableChecked] = useState(false)
  const [tableNotFound, setTableNotFound] = useState(false)
  const [view, setView] = useState<View>('menu')
  const [trackedOrder, setTrackedOrder] = useState<Order | null>(null)
  const [orderNumber, setOrderNumber] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [payRef, setPayRef] = useState('')
  const [payQr, setPayQr] = useState<string | null>(null)
  const [payGateway, setPayGateway] = useState('mock')
  const [payAmount, setPayAmount] = useState(0)
  const [payMethod, setPayMethod] = useState<PayMethod>('choose')

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
    if ((view !== 'tracking' && view !== 'payment') || !orderNumber) return
    echo.channel(`order.${orderNumber}`).listen('OrderStatusChanged', (event: { order?: Order }) => {
      if (event.order?.orderNumber !== orderNumber) return
      setTrackedOrder(event.order)
      if (payMethod === 'kasir' && event.order.status === 'diproses') {
        setView('tracking')
      }
    })
    return () => {
      echo.leaveChannel(`order.${orderNumber}`)
    }
  }, [view, orderNumber, payMethod])

  const visibleItems = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter(
      (item) => item.categoryId === activeCategory && (q === '' || item.name.toLowerCase().includes(q)),
    )
  }, [items, activeCategory, search])

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
      setPayAmount(order.total)
      setPayMethod('choose')
      cart.clear()
      setView('payment')
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Gagal mengirim pesanan. Coba lagi.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handlePayQris() {
    if (!trackedOrder) return
    setPayMethod('qris')
    try {
      const checkout = await api.checkoutOrder(trackedOrder.id)
      setPayRef(checkout.reference)
      setPayQr(checkout.qrContent)
      setPayGateway(checkout.gateway)
    } catch {
      setPayRef(String(trackedOrder.id))
      setPayQr(null)
      setPayGateway('mock')
    }
  }

  function handlePayKasir() {
    if (!trackedOrder) return
    setPayMethod('kasir')
  }

  async function handleQrisPaid() {
    try {
      const list = await api.getOrders()
      setTrackedOrder(list.find((o) => o.orderNumber === orderNumber) ?? trackedOrder)
    } catch {
      // abaikan, pakai order yang sudah dipegang
    }
    setView('tracking')
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

  if (view === 'payment') {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-bg-secondary">
        <header className="bg-accent-primary px-5 py-6 text-center text-text-on-accent">
          <div className="text-caption font-semibold uppercase tracking-wider opacity-80">Bayar di Muka</div>
          <div className="font-num text-heading font-bold">{orderNumber}</div>
          <div className="mt-1 text-caption opacity-90">Meja {table}</div>
        </header>

        {payMethod === 'choose' && (
          <>
            <div className="flex-1 overflow-y-auto px-4 py-5">
              <p className="text-center text-body text-text-secondary">
                Total tagihan <span className="font-num font-bold text-accent-primary">{formatRupiah(payAmount)}</span>
              </p>
              <p className="mt-1 text-center text-caption text-text-secondary">
                Pilih cara bayar di muka sebelum dapur memasak pesananmu.
              </p>

              <button
                onClick={handlePayQris}
                className="mt-5 w-full rounded-xl border border-border-subtle bg-bg-surface p-5 text-left shadow-card"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-accent-tint text-accent-primary">
                    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="7" height="7" rx="1" />
                      <rect x="14" y="3" width="7" height="7" rx="1" />
                      <rect x="3" y="14" width="7" height="7" rx="1" />
                      <path d="M14 14h3v3h-3zM21 14v3M14 21h3" />
                    </svg>
                  </span>
                  <span className="flex-1">
                    <span className="block text-subheading font-bold text-text-primary">Bayar Langsung lewat HP</span>
                    <span className="mt-0.5 block text-caption text-text-secondary">QRIS / E-Wallet (ShopeePay, GoPay, Dana, dll.)</span>
                  </span>
                  <span className="text-text-secondary">›</span>
                </div>
              </button>

              <button
                onClick={handlePayKasir}
                className="mt-3 w-full rounded-xl border border-border-subtle bg-bg-surface p-5 text-left shadow-card"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-accent-tint text-accent-primary">
                    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="5" width="14" height="14" rx="2" />
                      <path d="M16 9h4a1 1 0 0 1 1 1v7a3 3 0 0 1-3 3h-1" />
                      <circle cx="12" cy="13" r="1.5" />
                    </svg>
                  </span>
                  <span className="flex-1">
                    <span className="block text-subheading font-bold text-text-primary">Bayar di Kasir</span>
                    <span className="mt-0.5 block text-caption text-text-secondary">Tunai / Debit · tunjukkan kode ke kasir</span>
                  </span>
                  <span className="text-text-secondary">›</span>
                </div>
              </button>
            </div>
            <div className="border-t border-border-subtle bg-bg-surface p-4">
              <button
                onClick={() => setView('menu')}
                className="h-14 w-full rounded-xl border border-border-subtle text-body font-semibold text-text-primary"
              >
                Batal, Kembali ke Menu
              </button>
            </div>
          </>
        )}

        {payMethod === 'qris' && (
          <>
            <div className="flex-1 px-4 py-5">
              <QrisPay
                reference={payRef || String(trackedOrder?.id ?? '')}
                qrContent={payQr}
                gateway={payGateway}
                total={payAmount}
                onPaid={handleQrisPaid}
              />
            </div>
            <div className="border-t border-border-subtle bg-bg-surface p-4">
              <button
                onClick={() => setPayMethod('choose')}
                className="h-14 w-full rounded-xl border border-border-subtle text-body font-semibold text-text-primary"
              >
                Pilih Metode Lain
              </button>
            </div>
          </>
        )}

        {payMethod === 'kasir' && (
          <>
            <div className="flex-1 px-4 py-5 text-center">
              <p className="text-body text-text-secondary">Bawa HP ini ke kasir dan tunjukkan kode di bawah.</p>
              <div className="mt-5 flex flex-col items-center rounded-xl border border-border-subtle bg-bg-surface p-6 shadow-card">
                <div className="rounded-lg bg-white p-3">
                  <QRCodeSVG value={`${window.location.origin}/order/${orderNumber}`} size={180} />
                </div>
                <div className="mt-4 font-num text-heading font-bold tracking-widest text-text-primary">{orderNumber}</div>
                <p className="mt-2 font-num text-body font-bold text-accent-primary">Total tagihan: {formatRupiah(payAmount)}</p>
                <p className="mt-1 text-caption text-text-secondary">Nomor pesanan di atas</p>
              </div>
              <p className="mt-4 text-caption text-text-secondary">
                Bayar di kasir dengan tunai atau kartu. Pesananmu baru dimasak setelah lunas.
              </p>
            </div>
            <div className="border-t border-border-subtle bg-bg-surface p-4">
              <button
                onClick={() => setPayMethod('choose')}
                className="h-14 w-full rounded-xl border border-border-subtle text-body font-semibold text-text-primary"
              >
                Pilih Metode Lain
              </button>
            </div>
          </>
        )}
      </main>
    )
  }

  if (view === 'tracking') {
    return (
      <OrderTracking
        orderNumber={orderNumber}
        table={table}
        order={trackedOrder}
        footerAction={{ label: 'Tambah Pesanan', onClick: () => setView('menu') }}
      />
    )
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-bg-secondary">
      <header className="sticky top-0 z-20 border-b border-border-subtle bg-bg-surface px-5 py-4">
        <h1 className="text-heading font-bold text-text-primary">DineFlow Restaurant</h1>
        <p className="text-caption text-text-secondary">Scan & pesan sendiri · Meja {table}</p>
      </header>

      <div className="flex flex-col gap-3 px-4 pt-3">
        <CategoryTabs categories={categories} activeId={activeCategory ?? 0} onChange={setActiveCategory} />
        <div className="relative">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari menu..."
            className="w-full rounded-lg border border-border-subtle bg-bg-surface py-2.5 pl-10 pr-4 text-body placeholder:text-text-secondary focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-tint"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {visibleItems.length > 0 && search.trim() === '' && (
          <FeaturedCard item={visibleItems[0]} onAdd={(m, v, l) => cart.addItem(m, v, l)} />
        )}
        <ul className="flex flex-col gap-3 mt-3">
          {visibleItems.length === 0 && (
            <li className="py-10 text-center text-body text-text-secondary">Tidak ada menu ditemukan.</li>
          )}
          {visibleItems.slice(1).map((item) => {
            const hasVariants = item.variants && item.variants.length > 0
            return (
              <li
                key={item.id}
                className={`flex gap-3 overflow-hidden rounded-xl border border-border-subtle bg-bg-surface p-2 shadow-card ${
                  item.available ? '' : 'opacity-50'
                }`}
              >
                <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-bg-secondary">
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
                  {!item.available && (
                    <span className="absolute inset-0 flex items-center justify-center bg-bg-surface/60">
                      <span className="rounded bg-bg-surface px-2 py-0.5 text-caption font-bold uppercase text-status-danger">Habis</span>
                    </span>
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1 py-1 pr-1">
                  <div className="line-clamp-1 text-body font-semibold text-text-primary">{item.name}</div>
                  {item.description && <p className="line-clamp-1 text-caption text-text-secondary">{item.description}</p>}
                  {hasVariants && item.available ? (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {item.variants!.map((v: MenuItemVariant) => (
                        <button
                          key={v.id}
                          onClick={() => cart.addItem(item, v)}
                          disabled={!v.available}
                          className={`rounded-md border px-2 py-0.5 text-caption font-semibold transition-colors ${
                            v.available
                              ? 'border-accent-primary/30 bg-accent-tint text-accent-primary'
                              : 'border-border-subtle bg-bg-secondary text-text-secondary opacity-50'
                          }`}
                        >
                          {v.name} <span className="font-num">{formatRupiah(v.price)}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
                      <span className="font-num text-subheading font-bold text-accent-primary">
                        {formatRupiah(item.price)}
                      </span>
                      {item.available && item.isSpicy ? (
                        <SpicePills onSelect={(level) => cart.addItem(item, undefined, level)} />
                      ) : item.available ? (
                        <button
                          onClick={() => cart.addItem(item)}
                          aria-label={`Tambah ${item.name}`}
                          className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent-primary text-text-on-accent"
                        >
                          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M12 5v14M5 12h14" />
                          </svg>
                        </button>
                      ) : null}
                    </div>
                  )}
                </div>
              </li>
            )
          })}
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
        <div className="fixed inset-0 z-30 flex justify-center bg-text-primary/40">
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
                    <li key={`${line.menuItemId}-${line.variantName ?? ''}-${line.spiceLevel ?? 'x'}`} className="flex items-center justify-between gap-2 rounded-xl border border-border-subtle p-4">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-body font-semibold text-text-primary">
                          {line.name}
                          {line.variantName && <span className="ml-1 text-caption text-text-secondary">({line.variantName})</span>}
                          {typeof line.spiceLevel === 'number' && <span className="ml-1 text-caption text-status-danger">Level {line.spiceLevel}</span>}
                        </div>
                        {typeof line.spiceLevel === 'number' && (
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <span className="text-caption text-text-secondary">Pedas</span>
                            <button
                              onClick={() => cart.setSpiceLevel(line.menuItemId, line.variantName, line.spiceLevel as number, Math.max(0, (line.spiceLevel as number) - 1))}
                              disabled={line.spiceLevel === 0}
                              aria-label="Turunkan level"
                              className="flex h-7 w-7 items-center justify-center rounded-md border border-border-subtle text-text-primary disabled:opacity-40"
                            >
                              −
                            </button>
                            <span className="w-6 text-center font-num text-caption font-bold">{line.spiceLevel}</span>
                            <button
                              onClick={() => cart.setSpiceLevel(line.menuItemId, line.variantName, line.spiceLevel as number, Math.min(5, (line.spiceLevel as number) + 1))}
                              disabled={line.spiceLevel === 5}
                              aria-label="Naikkan level"
                              className="flex h-7 w-7 items-center justify-center rounded-md border border-border-subtle text-accent-primary disabled:opacity-40"
                            >
                              +
                            </button>
                          </div>
                        )}
                        <div className="mt-1.5 flex items-center gap-2">
                          <button
                            onClick={() => cart.decrement(line.menuItemId, line.variantName, line.spiceLevel)}
                            aria-label="Kurangi"
                            className="flex h-11 w-11 items-center justify-center rounded-lg border border-border-subtle text-text-primary"
                          >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <path d="M5 12h14" />
                            </svg>
                          </button>
                          <span className="w-6 text-center font-num text-body font-bold">{line.quantity}</span>
                          <button
                            onClick={() => cart.increment(line.menuItemId, line.variantName, line.spiceLevel)}
                            aria-label="Tambah"
                            className="flex h-11 w-11 items-center justify-center rounded-lg border border-border-subtle text-accent-primary"
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
                {submitting ? 'Memproses...' : 'Lanjut ke Pembayaran'}
              </button>
              {submitError && (
                <p className="mt-2 text-center text-caption font-semibold text-status-danger">{submitError}</p>
              )}
              <p className="mt-2 text-center text-caption text-text-secondary">
                Kamu akan membayar di muka sebelum dapur memasak pesananmu.
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

interface FeaturedCardProps {
  item: MenuItem
  onAdd: (item: MenuItem, variant?: MenuItemVariant, spiceLevel?: number) => void
}

function FeaturedCard({ item, onAdd }: FeaturedCardProps) {
  const hasVariants = item.variants && item.variants.length > 0
  return (
    <div className={`overflow-hidden rounded-xl border border-border-subtle bg-bg-surface shadow-card ${item.available ? '' : 'opacity-60'}`}>
      <div className="relative flex h-48 w-full items-center justify-center overflow-hidden bg-bg-secondary">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
        ) : (
          <svg className="h-16 w-16 text-border-subtle" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 11h18" />
            <path d="M12 11v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V11" />
            <path d="M21 11v8a3 3 0 0 1-3 3h-3a3 3 0 0 1-3-3" />
            <circle cx="12" cy="5" r="2" />
          </svg>
        )}
        <span className="absolute right-3 top-3 rounded-full bg-bg-surface/95 px-3 py-1 font-num text-body font-bold text-accent-primary shadow-card">
          {formatRupiah(item.price)}
        </span>
        {!item.available && (
          <span className="absolute inset-0 flex items-center justify-center bg-bg-surface/60">
            <span className="rounded bg-bg-surface px-3 py-1 text-caption font-bold uppercase text-status-danger">Habis</span>
          </span>
        )}
      </div>
      <div className="flex flex-col gap-3 p-4">
        <div>
          <div className="text-subheading font-bold text-text-primary">{item.name}</div>
          {item.description && <p className="mt-1 line-clamp-2 text-caption text-text-secondary">{item.description}</p>}
        </div>
        {hasVariants && item.available ? (
          <div className="flex flex-wrap gap-1.5">
            {item.variants!.map((v) => (
              <button
                key={v.id}
                onClick={() => onAdd(item, v)}
                disabled={!v.available}
                className={`rounded-lg border px-3 py-1.5 text-caption font-semibold transition-colors ${
                  v.available
                    ? 'border-accent-primary/30 bg-accent-tint text-accent-primary'
                    : 'border-border-subtle bg-bg-secondary text-text-secondary opacity-50'
                }`}
              >
                {v.name} <span className="font-num">{formatRupiah(v.price)}</span>
              </button>
            ))}
          </div>
        ) : item.available && item.isSpicy ? (
          <SpicePills onSelect={(level) => onAdd(item, undefined, level)} />
        ) : item.available ? (
          <button
            onClick={() => onAdd(item)}
            className="h-12 w-full rounded-xl bg-accent-primary font-semibold text-text-on-accent transition-colors hover:bg-accent-primary-hover"
          >
            Tambah ke Pesanan
          </button>
        ) : null}
      </div>
    </div>
  )
}

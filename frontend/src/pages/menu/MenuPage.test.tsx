import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { MenuPage } from './MenuPage'
import { api } from '@/services/httpApi'
import type { DiningTable, MenuCategory, MenuItem, Order } from '@/types'

/**
 * Regresi alur bayar di muka pada halaman Menu Pesan Mandiri (publik).
 *
 * Bug yang diuji: handlePayQris() versi lama memakai
 *   catch { setPayRef(String(trackedOrder.id)) }
 * Artinya kalau checkout gagal (mis. 409 sudah dibayar, 422 status berubah,
 * 429 kena rate limit), halaman tetap masuk ke mode QRIS dengan reference
 * palsu berupa id order. Akibatnya getPaymentStatus() meng-query
 * /api/payments/12/status yang tidak pernah ada → 404 → polling berjalan
 * seh eternity, dan tombol "Saya Sudah Bayar" pasti gagal tanpa alasan.
 *
 * Perilaku yang harus dipertahankan:
 *  - gagal  -> error asli ditampilkan, tidak ada reference palsu, tidak masuk
 *              layar QRIS
 *  - sukses -> masuk layar QRIS dengan reference dari gateway
 *  - PPN    -> diambil dari /public-info, bukan default 10% yang bisa meleset
 *              dari tagihan server
 */

vi.mock('@/services/echo', () => ({
  default: {
    channel: () => ({ listen: () => undefined, leaveChannel: () => undefined }),
    private: () => ({ listen: () => undefined, leaveChannel: () => undefined }),
    leaveChannel: () => undefined,
    leaveAllChannels: () => undefined,
  },
}))

const table: DiningTable = { id: 3, number: 'T3', seats: 2, status: 'kosong', qrCode: 'token-meja-3' }

const category: MenuCategory = { id: 1, name: 'Makanan', order: 1 }

const menuItem: MenuItem = {
  id: 7,
  categoryId: 1,
  code: '#M07',
  name: 'Nasi Goreng Spesial',
  description: null,
  price: 25000,
  imageUrl: null,
  available: true,
  isSpicy: false,
  variants: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
} as unknown as MenuItem

function makeOrder(): Order {
  return {
    id: 42,
    orderNumber: 'ORD-0042',
    tableId: 3,
    tableNumber: 'T3',
    source: 'self-order',
    status: 'menunggu',
    voidReason: null,
    voidedBy: null,
    items: [
      {
        id: 11,
        menuItemId: 7,
        name: 'Nasi Goreng Spesial',
        variantName: null,
        price: 25000,
        quantity: 1,
        note: null,
        spiceLevel: null,
        status: 'baru',
      },
    ],
    total: 27500,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as unknown as Order
}

/** Render halaman di route /menu/:table lalu item laluang ke layar keranjang. */
async function renderWithCartOpen() {
  const user = userEvent.setup()
  render(
    <MemoryRouter initialEntries={['/menu/token-meja-3']}>
      <Routes>
        <Route path="/menu/:table" element={<MenuPage />} />
      </Routes>
    </MemoryRouter>,
  )

  // Item pertama dirender sebagai FeaturedCard, sisanya sebagai kartu daftar.
  await user.click(await screen.findByRole('button', { name: 'Tambah ke Pesanan' }))

  const cartButton = screen.getByRole('button', { name: /Lihat Keranjang/ })
  await waitFor(() => expect(cartButton).toBeEnabled())
  await user.click(cartButton)

  return user
}

/** Lanjut dari keranjang ke layar pemilihan metode pembayaran. */
async function renderWithItemInCart() {
  const user = await renderWithCartOpen()

  const nextButton = screen.getByRole('button', { name: /Lanjut ke Pembayaran/ })
  await waitFor(() => expect(nextButton).toBeEnabled())
  await user.click(nextButton)

  return user
}

function stubBasics() {
  vi.spyOn(api, 'getTableBySlug').mockResolvedValue(table)
  vi.spyOn(api, 'getCategories').mockResolvedValue([category])
  vi.spyOn(api, 'getMenuItems').mockResolvedValue([menuItem])
  vi.spyOn(api, 'createOrder').mockResolvedValue(makeOrder())
}

describe('MenuPage alur bayar di muka', () => {
  beforeEach(() => {
    vi.spyOn(api, 'getPublicInfo').mockResolvedValue({
      taxRate: 10,
      restaurantName: 'DINEFLOW RESTAURANT',
      restaurantAddress: 'Jl. Raya No. 1',
    })
    // jsdom tidak menyediakan navigator.clipboard; halaman memanggilnya saat
    // pesanan dibuat, jadi harus di-stub agar tidak melempar.
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    })
    vi.stubGlobal('confirm', vi.fn(() => true))
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('memakai PPN dari backend untuk menghitung total keranjang', async () => {
    vi.spyOn(api, 'getPublicInfo').mockResolvedValue({
      taxRate: 12,
      restaurantName: 'DINEFLOW',
      restaurantAddress: 'Jl. Raya No. 1',
    })
    stubBasics()

    await renderWithCartOpen()

    // 25.000 + 12% = 28.000. Kalau taxRate dari /public-info diabaikan dan
    // default 10% yang dipakai, totalnya jadi 27.500 dan test ini gagal.
    // Muncul dua kali: sticky cart bar dan footer keranjang.
    await waitFor(() => expect(screen.getAllByText('Rp 28.000').length).toBeGreaterThanOrEqual(1))
    expect(screen.queryByText('Rp 27.500')).not.toBeInTheDocument()
  })

  it('berpindah ke layar QRIS memakai reference dari gateway saat checkout berhasil', async () => {
    stubBasics()
    vi.spyOn(api, 'checkoutOrder').mockResolvedValue({
      reference: 'qr_gateway_123',
      qrContent: 'QRIS-PAYLOAD',
      gateway: 'mock',
      status: 'pending',
      orderId: 42,
      orderNumber: 'ORD-0042',
    } as never)

    const user = await renderWithItemInCart()
    await user.click(screen.getByRole('button', { name: /Bayar Langsung lewat HP/ }))

    await waitFor(() => expect(api.checkoutOrder).toHaveBeenCalledWith(42))
    expect(await screen.findByText('Saya Sudah Bayar (Demo)')).toBeInTheDocument()
    expect(api.checkoutOrder).toHaveBeenCalledTimes(1)
  })

  it.each([
    [409, 'Pesanan sudah dibayar'],
    [422, 'Pesanan tidak dalam status menunggu pembayaran'],
    [429, 'Terlalu banyak permintaan. Coba lagi beberapa saat lagi.'],
  ])('menampilkan error %i tanpa memalsukan reference', async (_, pesan) => {
    stubBasics()
    const getPaymentStatus = vi.spyOn(api, 'getPaymentStatus')
    vi.spyOn(api, 'checkoutOrder').mockRejectedValue(new Error(pesan))

    const user = await renderWithItemInCart()
    await user.click(screen.getByRole('button', { name: /Bayar Langsung lewat HP/ }))

    expect(await screen.findByText(pesan)).toBeInTheDocument()

    // Tidak boleh masuk ke layar QRIS, dan tidak boleh polling reference palsu.
    expect(screen.queryByText('Saya Sudah Bayar (Demo)')).not.toBeInTheDocument()
    expect(screen.queryByText(/Menunggu pembayaran/)).not.toBeInTheDocument()
    expect(getPaymentStatus).not.toHaveBeenCalled()
  })

  it('memakai endpoint publik per nomor order, bukan getOrders yang butuh login', async () => {
    stubBasics()
    const getOrders = vi.spyOn(api, 'getOrders')
    vi.spyOn(api, 'checkoutOrder').mockResolvedValue({
      reference: 'qr_gateway_456',
      qrContent: 'QRIS-PAYLOAD',
      gateway: 'mock',
      status: 'pending',
      orderId: 42,
      orderNumber: 'ORD-0042',
    } as never)
    vi.spyOn(api, 'getPaymentStatus').mockResolvedValue({ status: 'paid', orderNumber: 'ORD-0042' })
    vi.spyOn(api, 'getOrderByNumber').mockResolvedValue(makeOrder())

    const user = await renderWithItemInCart()
    await user.click(screen.getByRole('button', { name: /Bayar Langsung lewat HP/ }))

    const demoButton = await screen.findByRole('button', { name: /Saya Sudah Bayar/ })
    await user.click(demoButton)

    await waitFor(() => expect(api.getOrderByNumber).toHaveBeenCalledWith('ORD-0042'))
    // getOrders() butuh role kasir/pelayan/dapur/admin — selalu 401 untuk pelanggan.
    expect(getOrders).not.toHaveBeenCalled()
  })
})

describe('MenuPage saat pemuatan data gagal', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('menampilkan pesan error ketika menu gagal dimuat, bukan halaman kosong diam', async () => {
    vi.spyOn(api, 'getTableBySlug').mockResolvedValue(table)
    vi.spyOn(api, 'getCategories').mockResolvedValue([category])
    vi.spyOn(api, 'getPublicInfo').mockResolvedValue({
      taxRate: 10,
      restaurantName: 'DINEFLOW',
      restaurantAddress: 'Jl. Raya No. 1',
    })
    vi.spyOn(api, 'getMenuItems').mockRejectedValue(new Error('Jaringan bermasalah'))

    render(
      <MemoryRouter initialEntries={['/menu/token-meja-3']}>
        <Routes>
          <Route path="/menu/:table" element={<MenuPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText('Gagal memuat menu.')).toBeInTheDocument()
  })

  it('tetap menampilkan "Meja tidak ditemukan" untuk QR meja yang invalid', async () => {
    vi.spyOn(api, 'getTableBySlug').mockRejectedValue(new Error('not found'))
    vi.spyOn(api, 'getCategories').mockResolvedValue([category])
    vi.spyOn(api, 'getMenuItems').mockResolvedValue([menuItem])
    vi.spyOn(api, 'getPublicInfo').mockResolvedValue({
      taxRate: 10,
      restaurantName: 'DINEFLOW',
      restaurantAddress: 'Jl. Raya No. 1',
    })

    render(
      <MemoryRouter initialEntries={['/menu/token-ngawur']}>
        <Routes>
          <Route path="/menu/:table" element={<MenuPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText('Meja tidak ditemukan')).toBeInTheDocument()
  })
})

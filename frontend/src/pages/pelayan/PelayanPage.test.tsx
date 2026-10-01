import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { PelayanPage } from './PelayanPage'
import { AuthProvider } from '@/context/AuthContext'
import { api } from '@/services/httpApi'
import type { DiningTable, MenuCategory, MenuItem, Order, User } from '@/types'

/**
 * Regresi alur bayar QRIS dari perangkat pelayan (login, role `pelayan`).
 *
 * Bug yang diuji: handlePayQris() versi lama memakai
 *   catch { setPayRef(String(payOrderId)) }
 * sehingga saat checkout gagal (409/422/429) layar tetap menampilkan QRIS
 * dengan reference berupa id order lokal. Polling /api/payments/{id}/status
 * lalu 404 terus-menerus tanpa penjelasan, dan pelayan tidak pernah tahu
 * kenapa QR-nya tidak berfungsi.
 *
 * Perilaku yang harus dipertahankan:
 *  - gagal  -> pesan error asli, tidak ada reference palsu, tidak ada polling
 *  - sukses -> layar QRIS memakai reference dari gateway
 *  - PPN    -> dari /public-info supaya total sama dengan tagihan server
 */

vi.mock('@/services/echo', () => ({
  default: {
    channel: () => ({ listen: () => undefined, leaveChannel: () => undefined }),
    private: () => ({ listen: () => undefined, leaveChannel: () => undefined }),
    leaveChannel: () => undefined,
    leaveAllChannels: () => undefined,
  },
}))

const tables: DiningTable[] = [
  { id: 3, number: 'T3', seats: 2, status: 'kosong', qrCode: 'token-meja-3' },
  { id: 4, number: 'T4', seats: 4, status: 'terisi', qrCode: 'token-meja-4' },
] as DiningTable[]

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
    id: 88,
    orderNumber: 'ORD-0088',
    tableId: 3,
    tableNumber: 'T3',
    source: 'pelayan',
    status: 'menunggu',
    voidReason: null,
    voidedBy: null,
    items: [
      {
        id: 12,
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

function stubBasics() {
  vi.spyOn(api, 'getTables').mockResolvedValue(tables)
  vi.spyOn(api, 'getCategories').mockResolvedValue([category])
  vi.spyOn(api, 'getMenuItems').mockResolvedValue([menuItem])
  vi.spyOn(api, 'getOrders').mockResolvedValue([])
  vi.spyOn(api, 'createOrder').mockResolvedValue(makeOrder())
}

const waiter: User = { id: 3, name: 'Budi', role: 'pelayan' } as User

/**
 * PelayanPage di dalam AuthProvider dengan sesi `pelayan` yang sudah aktif,
 * supaya TopNavBar punya user (dan bukan melempar error context).
 */
function renderPage() {
  sessionStorage.setItem('dineflow-user', JSON.stringify(waiter))
  return render(
    <MemoryRouter>
      <AuthProvider>
        <PelayanPage />
      </AuthProvider>
    </MemoryRouter>,
  )
}

/**
 * Lewati alur meja → tambah item → buka keranjang → kirim,
 * sampai modal pembayaran terbuka.
 */
async function openPaymentModal() {
  const user = userEvent.setup()
  renderPage()

  await user.click(await screen.findByRole('button', { name: /T3/ }))
  await user.click(await screen.findByRole('button', { name: 'Tambah Nasi Goreng Spesial' }))

  const openCartButton = screen.getByRole('button', { name: /Lihat & Kirim/ })
  await waitFor(() => expect(openCartButton).toBeEnabled())
  await user.click(openCartButton)

  const submitButton = screen.getByRole('button', { name: /Kirim & Bayar QRIS/ })
  await waitFor(() => expect(submitButton).toBeEnabled())
  await user.click(submitButton)

  await waitFor(() => expect(screen.getByText('Bayar di Kasir')).toBeInTheDocument())
  return user
}

describe('PelayanPage alur bayar QRIS', () => {
  beforeEach(() => {
    vi.spyOn(api, 'getPublicInfo').mockResolvedValue({
      taxRate: 10,
      restaurantName: 'DINEFLOW',
      restaurantAddress: 'Jl. Raya No. 1',
    })
    vi.stubGlobal('confirm', vi.fn(() => true))
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('memakai PPN dari backend untuk total di perangkat pelayan', async () => {
    vi.spyOn(api, 'getPublicInfo').mockResolvedValue({
      taxRate: 12,
      restaurantName: 'DINEFLOW',
      restaurantAddress: 'Jl. Raya No. 1',
    })
    stubBasics()
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: /T3/ }))
    await user.click(await screen.findByRole('button', { name: 'Tambah Nasi Goreng Spesial' }))

    // 25.000 + 12% = 28.000; dengan default 10% akan jadi 27.500.
    await waitFor(() => expect(screen.getByText('Rp 28.000')).toBeInTheDocument())
  })

  it('membuka layar QRIS dengan reference dari gateway saat checkout berhasil', async () => {
    stubBasics()
    vi.spyOn(api, 'checkoutOrder').mockResolvedValue({
      reference: 'qr_waiter_777',
      qrContent: 'QRIS-PAYLOAD',
      gateway: 'mock',
      status: 'pending',
      orderId: 88,
      orderNumber: 'ORD-0088',
    } as never)

    const user = await openPaymentModal()
    await user.click(screen.getByRole('button', { name: /QRIS Langsung/ }))

    await waitFor(() => expect(api.checkoutOrder).toHaveBeenCalledWith(88))
    expect(await screen.findByText('Saya Sudah Bayar (Demo)')).toBeInTheDocument()
  })

  it.each([
    [409, 'Pesanan sudah dibayar'],
    [422, 'Pesanan tidak dalam status menunggu pembayaran'],
    [429, 'Terlalu banyak permintaan. Coba lagi beberapa saat lagi.'],
  ])('menampilkan error %i tanpa memalsukan reference', async (_, pesan) => {
    stubBasics()
    const getPaymentStatus = vi.spyOn(api, 'getPaymentStatus')
    vi.spyOn(api, 'checkoutOrder').mockRejectedValue(new Error(pesan))

    const user = await openPaymentModal()
    await user.click(screen.getByRole('button', { name: /QRIS Langsung/ }))

    expect(await screen.findByText(pesan)).toBeInTheDocument()
    expect(screen.queryByText('Saya Sudah Bayar (Demo)')).not.toBeInTheDocument()
    expect(screen.queryByText(/Menunggu pembayaran/)).not.toBeInTheDocument()
    // Polling hanya boleh berjalan untuk reference asli dari gateway.
    expect(getPaymentStatus).not.toHaveBeenCalled()
  })
})

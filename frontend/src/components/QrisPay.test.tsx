import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QrisPay } from './QrisPay'
import { api } from '@/services/httpApi'
import type { PaymentStatus } from '@/types'

/**
 * Regresi QrisPay.
 *
 * Dua masalah nyata yang sebelumnya tidak punya test sama sekali:
 *  1. Polling berjalan terus 3 detik sekali selamanya untuk pembayaran yang
 *     sudah terminal (failed/expired/cancelled) — tidak ada jalan keluar dari
 *     layar "Menunggu pembayaran" padahal transaksi sudah tidak mungkin lanjut.
 *  2. Saat gateway tidak memberi qrContent, komponen merender QR dari nilai
 *     `reference`. Itu bukan payload QRIS, jadi tidak bisa discan sama sekali
 *     tapi tampil seolah-olah valid.
 */

const baseProps = {
  reference: 'qr_abc123',
  qrContent: 'QRIS-PAYLOAD-REAL',
  gateway: 'mock',
  total: 25000,
  onPaid: () => {},
}

function mockStatusSequence(sequence: PaymentStatus[]) {
  let call = 0
  return vi.spyOn(api, 'getPaymentStatus').mockImplementation(async () => {
    const status = sequence[Math.min(call, sequence.length - 1)]
    call += 1
    return { status, orderNumber: 'ORD-0001' }
  })
}

describe('QrisPay saat status masih pending', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('menampilkan status menunggu pembayaran', async () => {
    mockStatusSequence(['pending'])
    render(<QrisPay {...baseProps} />)

    expect(screen.getByText(/Menunggu pembayaran/)).toBeInTheDocument()
  })

  it('memanggil onPaid dan berhenti polling ketika lunas', async () => {
    const onPaid = vi.fn()
    const spy = mockStatusSequence(['pending', 'paid'])
    render(<QrisPay {...baseProps} onPaid={onPaid} />)

    await vi.advanceTimersByTimeAsync(3000)
    await vi.advanceTimersByTimeAsync(3000)

    await waitFor(() => expect(onPaid).toHaveBeenCalledTimes(1))
    expect(screen.getByText('Pembayaran berhasil')).toBeInTheDocument()

    const callsSoFar = spy.mock.calls.length
    await vi.advanceTimersByTimeAsync(15000)
    expect(spy).toHaveBeenCalledTimes(callsSoFar)
  })
})

describe('QrisPay saat status terminal', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it.each<[PaymentStatus, RegExp]>([
    ['expired', /Waktu pembayaran habis/],
    ['failed', /Pembayaran gagal/],
    ['cancelled', /Pembayaran dibatalkan/],
  ])('berhenti polling dan memberi pesan saat %s', async (status, pesan) => {
    const onPaid = vi.fn()
    const spy = mockStatusSequence([status])
    render(<QrisPay {...baseProps} onPaid={onPaid} />)

    await vi.advanceTimersByTimeAsync(3000)

    await waitFor(() => expect(screen.getByText(pesan)).toBeInTheDocument())
    expect(onPaid).not.toHaveBeenCalled()
    expect(screen.queryByText(/Menunggu pembayaran/)).not.toBeInTheDocument()

    const callsSoFar = spy.mock.calls.length
    await vi.advanceTimersByTimeAsync(15000)
    expect(spy).toHaveBeenCalledTimes(callsSoFar)
  })
})

describe('QrisPay saat qrContent tidak tersedia', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('tidak merender QR dari reference karena bukan payload QRIS', () => {
    vi.spyOn(api, 'getPaymentStatus').mockResolvedValue({ status: 'pending', orderNumber: 'ORD-0001' })
    const { container } = render(<QrisPay {...baseProps} qrContent={null} />)

    expect(screen.getByText('QRIS dinamis tidak tersedia')).toBeInTheDocument()
    // QR dari reference akan muncul sebagai <svg> di dalam wrapper QR.
    expect(container.querySelectorAll('svg').length).toBe(0)
  })
})

describe('QrisPay tombol demo', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('menandai lunas lewat mock-paid ketika driver mock', async () => {
    const user = userEvent.setup()
    const onPaid = vi.fn()
    vi.spyOn(api, 'getPaymentStatus').mockResolvedValue({ status: 'pending', orderNumber: 'ORD-0001' })
    vi.spyOn(api, 'markMockPaid').mockResolvedValue({ status: 'paid', orderNumber: 'ORD-0001' })

    render(<QrisPay {...baseProps} onPaid={onPaid} />)
    await user.click(screen.getByRole('button', { name: /Saya Sudah Bayar/ }))

    await waitFor(() => expect(onPaid).toHaveBeenCalledTimes(1))
  })

  it('menampilkan pesan error saat mock-paid ditolak backend', async () => {
    const user = userEvent.setup()
    vi.spyOn(api, 'getPaymentStatus').mockResolvedValue({ status: 'pending', orderNumber: 'ORD-0001' })
    vi.spyOn(api, 'markMockPaid').mockRejectedValue(new Error('Endpoint mock-paid hanya tersedia pada driver mock.'))

    render(<QrisPay {...baseProps} />)
    await user.click(screen.getByRole('button', { name: /Saya Sudah Bayar/ }))

    await waitFor(() =>
      expect(screen.getByText('Endpoint mock-paid hanya tersedia pada driver mock.')).toBeInTheDocument(),
    )
  })

  it('tidak menampilkan tombol simulasi untuk driver selain xendit', () => {
    vi.spyOn(api, 'getPaymentStatus').mockResolvedValue({ status: 'pending', orderNumber: 'ORD-0001' })

    render(<QrisPay {...baseProps} gateway="doku" />)

    expect(screen.queryByRole('button', { name: /Simulasi Pembayaran/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Saya Sudah Bayar/ })).not.toBeInTheDocument()
  })
})

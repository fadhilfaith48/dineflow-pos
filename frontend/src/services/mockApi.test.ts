import { describe, it, expect } from 'vitest'
import { api } from './mockApi'
import type { CreateOrderPayload } from './api'

const baseItems: CreateOrderPayload['items'] = [
  { menuItemId: 1, name: 'Nasi Goreng Spesial', price: 18000, quantity: 2 },
]

describe('MockApi — login', () => {
  it('berhasil dengan username & password benar', async () => {
    const user = await api.login('admin', '1234')
    expect(user.username).toBe('admin')
    expect(user.role).toBe('admin')
  })

  it('menolak password salah', async () => {
    await expect(api.login('admin', '0000')).rejects.toThrow('Username atau password salah')
  })

  it('menolak username yang tidak dikenal', async () => {
    await expect(api.login('nobody', '1234')).rejects.toThrow('Username atau password salah')
  })
})

describe('MockApi — createOrder', () => {
  it('order dari pelayan berstatus menunggu-konfirmasi dan total sudah termasuk pajak', async () => {
    const order = await api.createOrder({ tableId: 1, source: 'pelayan', items: baseItems })
    expect(order.status).toBe('menunggu-konfirmasi')
    expect(order.total).toBe(Math.round(18000 * 2 * 1.1))
  })

  it('order dari self-order juga menunggu-konfirmasi', async () => {
    const order = await api.createOrder({ tableId: 3, source: 'self-order', items: baseItems })
    expect(order.status).toBe('menunggu-konfirmasi')
  })

  it('order dari kasir langsung berstatus baru', async () => {
    const order = await api.createOrder({ tableId: null, source: 'kasir', items: baseItems })
    expect(order.status).toBe('baru')
  })

  it('meja dine-in menjadi terisi saat ada order', async () => {
    await api.createOrder({ tableId: 1, source: 'pelayan', items: baseItems })
    const tables = await api.getTables()
    expect(tables.find((t) => t.id === 1)?.status).toBe('terisi')
  })
})

describe('MockApi — confirmOrder', () => {
  it('mengubah menunggu-konfirmasi menjadi diproses', async () => {
    const order = await api.createOrder({ tableId: 1, source: 'pelayan', items: baseItems })
    const confirmed = await api.confirmOrder(order.id)
    expect(confirmed.status).toBe('diproses')
  })

  it('menolak konfirmasi order yang bukan menunggu-konfirmasi', async () => {
    const order = await api.createOrder({ tableId: null, source: 'kasir', items: baseItems })
    await expect(api.confirmOrder(order.id)).rejects.toThrow('menunggu konfirmasi')
  })
})

describe('MockApi — processPayment', () => {
  it('menandai order selesai, mencatat kembalian, dan meja jadi perlu dibersihkan', async () => {
    const order = await api.createOrder({ tableId: 1, source: 'pelayan', items: baseItems })
    const payment = await api.processPayment({ orderId: order.id, method: 'tunai', cashReceived: 50000 })

    expect(payment.amount).toBe(order.total)
    expect(payment.change).toBe(50000 - order.total)

    const after = (await api.getOrders()).find((o) => o.id === order.id)
    expect(after?.status).toBe('selesai')

    const tables = await api.getTables()
    expect(tables.find((t) => t.id === 1)?.status).toBe('perlu-dibersihkan')
  })
})

describe('MockApi — getSalesSummary', () => {
  it('menghitung order yang dibayar hari ini untuk periode harian', async () => {
    const order = await api.createOrder({ tableId: 1, source: 'kasir', items: baseItems })
    await api.processPayment({ orderId: order.id, method: 'qris' })

    const summary = await api.getSalesSummary('harian')
    expect(summary.orderCount).toBeGreaterThanOrEqual(1)
    expect(summary.totalRevenue).toBeGreaterThanOrEqual(order.total)
    expect(summary.topItems.some((t) => t.name === 'Nasi Goreng Spesial')).toBe(true)
  })

  it('order yang masih menunggu konfirmasi tidak dihitung sebagai penjualan', async () => {
    const before = await api.getSalesSummary('semua')
    const pending = await api.createOrder({ tableId: null, source: 'self-order', items: baseItems })

    const after = await api.getSalesSummary('semua')
    expect(after.orderCount).toBe(before.orderCount)
    expect(after.totalRevenue).toBe(before.totalRevenue)
    expect(pending.status).toBe('menunggu-konfirmasi')
  })
})
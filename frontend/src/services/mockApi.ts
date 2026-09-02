import type { Api, CartItemInput, CheckoutResult, CreateMenuItemInput, CreateOrderPayload, PaymentPayload } from './api'
import type { DiningTable, MenuCategory, MenuItem, Order, OrderItem, Payment, PaymentStatus, Role, SalesPeriod, SalesDateRange, SalesSummary, Settings, User } from '@/types'
import { DEFAULT_PASSWORD, TAX_RATE } from '@/lib/constants'
import { mockCategories, mockMenuItems, mockOrders, mockTables, mockUsers } from './mockData'

let orders: Order[] = [...mockOrders]
let menuItems: MenuItem[] = [...mockMenuItems]
let tables: DiningTable[] = [...mockTables]
let users: User[] = [...mockUsers]
let orderCounter = mockOrders.length
const pendingPayments = new Map<string, { orderId: number; payment: Payment }>()

/**
 * Implementasi API memakai mock data (in-memory).
 * Nanti ganti implementasi di sini dengan fetch ke Laravel tanpa
 * menyentuh komponen UI.
 */
export class MockApi implements Api {
  async login(username: string, password: string): Promise<User> {
    const user = users.find((u) => u.username === username)
    if (!user || password !== DEFAULT_PASSWORD) {
      throw new Error('Username atau password salah')
    }
    return { ...user }
  }

  async logout(): Promise<void> {
    // No-op: MockApi tidak memakai token server.
  }

  async changePassword(): Promise<void> {
    // No-op: MockApi tidak memakai password server.
  }

  async getCategories(): Promise<MenuCategory[]> {
    return [...mockCategories]
  }

  async getMenuItems(categoryId?: number): Promise<MenuItem[]> {
    if (categoryId === undefined) return [...menuItems]
    return menuItems.filter((item) => item.categoryId === categoryId)
  }

  async getTables(): Promise<DiningTable[]> {
    return [...tables]
  }

  async createTable(input: { number: string; seats: number }): Promise<DiningTable> {
    if (tables.some((t) => t.number.toLowerCase() === input.number.toLowerCase())) {
      throw new Error('Nomor meja sudah dipakai')
    }
    const table: DiningTable = {
      id: Math.max(0, ...tables.map((t) => t.id)) + 1,
      number: input.number,
      seats: input.seats,
      status: 'kosong',
      qrCode: input.number,
    }
    tables = [...tables, table]
    return { ...table }
  }

  async updateTable(id: number, data: Partial<DiningTable>): Promise<DiningTable> {
    const table = tables.find((t) => t.id === id)
    if (!table) throw new Error('Meja tidak ditemukan')
    Object.assign(table, data)
    return { ...table }
  }

  async deleteTable(id: number): Promise<void> {
    tables = tables.filter((t) => t.id !== id)
  }

  async getOrders(): Promise<Order[]> {
    return [...orders]
  }

  async createOrder(payload: CreateOrderPayload): Promise<Order> {
    orderCounter += 1
    const now = new Date().toISOString()
    const items: OrderItem[] = payload.items.map((item: CartItemInput, index) => ({
      id: index + 1,
      menuItemId: item.menuItemId,
      name: item.name,
      variantName: item.variantName,
      spiceLevel: item.spiceLevel,
      price: item.price,
      quantity: item.quantity,
      note: item.note,
      status: 'baru',
    }))
    const order: Order = {
      id: orderCounter,
      orderNumber: `ORD-${String(orderCounter).padStart(4, '0')}`,
      tableId: payload.tableId,
      source: payload.source,
      // Bayar di muka: semua kanal menunggu pembayaran sebelum masuk dapur.
      status: 'menunggu',
      items,
      total: Math.round(
        items.reduce((sum, item) => sum + item.price * item.quantity, 0) * (1 + TAX_RATE),
      ),
      createdAt: now,
      updatedAt: now,
    }
    orders = [order, ...orders]
    return order
  }

  async completeOrder(orderId: number): Promise<Order> {
    const order = orders.find((o) => o.id === orderId)
    if (!order) throw new Error('Pesanan tidak ditemukan')
    if (order.status !== 'diproses') throw new Error('Pesanan tidak dalam status diproses')
    order.status = 'selesai'
    order.updatedAt = new Date().toISOString()
    if (order.tableId) {
      const table = tables.find((t) => t.id === order.tableId)
      if (table && table.status === 'terisi') table.status = 'perlu-dibersihkan'
    }
    return order
  }

  async confirmOrder(): Promise<Order> {
    throw new Error('Konfirmasi manual tidak dipakai lagi. Pesanan otomatis ke dapur setelah lunas.')
  }

  async voidOrder(orderId: number, reason: string): Promise<Order> {
    const order = orders.find((o) => o.id === orderId)
    if (!order) throw new Error('Pesanan tidak ditemukan')
    if (order.status === 'selesai' || order.status === 'dibatalkan') {
      throw new Error(`Pesanan sudah ${order.status === 'selesai' ? 'selesai' : 'dibatalkan'}`)
    }
    order.status = 'dibatalkan'
    order.voidReason = reason
    order.updatedAt = new Date().toISOString()
    if (order.tableId) {
      const table = tables.find((t) => t.id === order.tableId)
      if (table && table.status === 'terisi') table.status = 'kosong'
    }
    return order
  }

  async updateItemStatus(
    orderId: number,
    itemId: number,
    status: OrderItem['status'],
  ): Promise<Order> {
    const order = orders.find((o) => o.id === orderId)
    if (!order) throw new Error('Order tidak ditemukan')
    order.items = order.items.map((item) =>
      item.id === itemId ? { ...item, status } : item,
    )
    return order
  }

  async processPayment(payload: PaymentPayload): Promise<Payment> {
    const order = orders.find((o) => o.id === payload.orderId)
    if (!order) throw new Error('Order tidak ditemukan')
    if (order.status !== 'menunggu') throw new Error('Pesanan tidak dalam status menunggu pembayaran')
    order.status = 'diproses'
    order.updatedAt = new Date().toISOString()
    if (order.tableId) {
      const table = tables.find((t) => t.id === order.tableId)
      if (table) table.status = 'terisi'
    }
    const payment: Payment = {
      id: order.id,
      orderId: order.id,
      method: payload.method,
      status: 'paid',
      paidVia: payload.method,
      amount: order.total,
      cashReceived: payload.cashReceived,
      change: payload.cashReceived ? payload.cashReceived - order.total : undefined,
      paidBy: 1,
      paidAt: new Date().toISOString(),
    }
    order.payment = payment
    return payment
  }

  async checkoutOrder(orderId: number): Promise<CheckoutResult> {
    const order = orders.find((o) => o.id === orderId)
    if (!order) throw new Error('Order tidak ditemukan')
    if (order.status !== 'menunggu') throw new Error('Pesanan tidak dalam status menunggu pembayaran')
    const reference = `MOCK-${Math.random().toString(36).slice(2, 12).toUpperCase()}`
    const payment: Payment = {
      id: order.id,
      orderId: order.id,
      reference,
      method: 'qris',
      status: 'pending',
      gateway: 'mock',
      paidVia: 'qris',
      amount: order.total,
      paidBy: 0,
      paidAt: undefined,
    }
    pendingPayments.set(reference, { orderId: order.id, payment })
    return { reference, gateway: 'mock', qrContent: reference, status: 'pending', orderId: order.id, orderNumber: order.orderNumber, payment }
  }

  async getPaymentStatus(reference: string): Promise<{ status: PaymentStatus; orderNumber: string }> {
    const entry = pendingPayments.get(reference)
    if (!entry) throw new Error('Pembayaran tidak ditemukan')
    const order = orders.find((o) => o.id === entry.orderId)!
    return { status: entry.payment.status, orderNumber: order.orderNumber }
  }

  async markMockPaid(reference: string): Promise<{ status: PaymentStatus; orderNumber: string }> {
    const entry = pendingPayments.get(reference)
    if (!entry) throw new Error('Pembayaran tidak ditemukan')
    entry.payment.status = 'paid'
    entry.payment.paidAt = new Date().toISOString()
    const order = orders.find((o) => o.id === entry.orderId)
    if (order) {
      order.status = 'diproses'
      order.updatedAt = new Date().toISOString()
      order.payment = entry.payment
      if (order.tableId) {
        const table = tables.find((t) => t.id === order.tableId)
        if (table) table.status = 'terisi'
      }
    }
    return { status: 'paid', orderNumber: order?.orderNumber ?? '' }
  }

  async updateMenuItem(id: number, data: Partial<MenuItem>): Promise<MenuItem> {
    const item = menuItems.find((m) => m.id === id)
    if (!item) throw new Error('Menu tidak ditemukan')
    Object.assign(item, data)
    return { ...item }
  }

  async createMenuItem(input: CreateMenuItemInput): Promise<MenuItem> {
    const id = Math.max(0, ...menuItems.map((m) => m.id)) + 1
    const item: MenuItem = {
      id,
      code: `#M${String(id).padStart(2, '0')}`,
      name: input.name,
      description: input.description,
      price: input.price,
      categoryId: input.categoryId,
      available: true,
      imageUrl: input.imageUrl,
      isSpicy: input.isSpicy,
    }
    menuItems = [...menuItems, item]
    return { ...item }
  }

  async deleteMenuItem(id: number): Promise<void> {
    menuItems = menuItems.filter((m) => m.id !== id)
  }

  async getUsers(): Promise<User[]> {
    return [...users]
  }

  async createUser(input: { name: string; username: string; role: Role }): Promise<User> {
    if (users.some((u) => u.username.toLowerCase() === input.username.toLowerCase())) {
      throw new Error('Username sudah dipakai')
    }
    const user: User = {
      id: Math.max(0, ...users.map((u) => u.id)) + 1,
      name: input.name,
      username: input.username,
      role: input.role,
    }
    users = [...users, user]
    return { ...user }
  }

  async updateUser(id: number, data: Partial<User>): Promise<User> {
    const user = users.find((u) => u.id === id)
    if (!user) throw new Error('Staf tidak ditemukan')
    Object.assign(user, data)
    return { ...user }
  }

  async deleteUser(id: number): Promise<void> {
    users = users.filter((u) => u.id !== id)
  }

  async resetUserPassword(): Promise<void> {
    // No-op: MockApi tidak memakai password per-user.
  }

  async getSalesSummary(period: SalesPeriod = 'semua', _range?: SalesDateRange): Promise<SalesSummary> {
    const now = new Date()
    const settled = orders.filter((o) => {
      if (o.status !== 'selesai' && o.status !== 'diproses') return false
      if (period === 'semua') return true
      const created = new Date(o.createdAt)
      if (period === 'harian') return created.toDateString() === now.toDateString()
      if (period === 'mingguan') {
        const weekAgo = new Date(now)
        weekAgo.setDate(now.getDate() - 7)
        return created >= weekAgo
      }
      if (period === 'bulanan') {
        return created.getFullYear() === now.getFullYear() && created.getMonth() === now.getMonth()
      }
      return true
    })
    const counts = new Map<string, { quantity: number; revenue: number }>()
    let totalRevenue = 0
    for (const order of settled) {
      for (const item of order.items) {
        totalRevenue += item.price * item.quantity
        const cur = counts.get(item.name) ?? { quantity: 0, revenue: 0 }
        cur.quantity += item.quantity
        cur.revenue += item.price * item.quantity
        counts.set(item.name, cur)
      }
    }
    const topItems = [...counts.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5)
    return {
      totalRevenue,
      orderCount: settled.length,
      topItems,
      paymentBreakdown: {
        tunai: { revenue: 0, count: 0 },
        qris: { revenue: 0, count: 0 },
      },
    }
  }

  async getSettings(): Promise<Settings> {
    return { taxRate: TAX_RATE * 100, restaurantName: 'DINEFLOW RESTAURANT', restaurantAddress: 'Jl. Raya No. 1, Jakarta' }
  }

  async updateSettings(_data: Partial<Settings>): Promise<Settings> {
    return this.getSettings()
  }

  async uploadLogo(): Promise<{ logoUrl: string }> {
    return { logoUrl: '' }
  }

  async uploadQris(): Promise<{ qrisImageUrl: string }> {
    return { qrisImageUrl: '' }
  }

  async exportSalesReport(): Promise<Blob> {
    return new Blob(['mock export'], { type: 'text/csv' })
  }
}

/** Instance API tunggal yang dipakai seluruh aplikasi. */
export const api: Api = new MockApi()

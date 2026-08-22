import type { MenuCategory, MenuItem, Order, Payment, PaymentMethod, DiningTable, SalesSummary, SalesPeriod, User, Role, Settings } from '@/types'

/**
 * Kontrak API yang dipakai seluruh halaman.
 * Saat backend Laravel siap, implementasikan interface ini lewat fetch/axios
 * tanpa mengubah komponen UI.
 */
export interface Api {
  login(username: string, password: string): Promise<User>
  logout(): Promise<void>
  changePassword(currentPassword: string, newPassword: string): Promise<void>
  getCategories(): Promise<MenuCategory[]>
  getMenuItems(categoryId?: number): Promise<MenuItem[]>
  getTables(): Promise<DiningTable[]>
  createTable(input: { number: string; seats: number }): Promise<DiningTable>
  updateTable(id: number, data: Partial<DiningTable>): Promise<DiningTable>
  deleteTable(id: number): Promise<void>
  getOrders(): Promise<Order[]>
  createOrder(payload: CreateOrderPayload): Promise<Order>
  confirmOrder(orderId: number): Promise<Order>
  updateItemStatus(orderId: number, itemId: number, status: Order['items'][number]['status']): Promise<Order>
  processPayment(payload: PaymentPayload): Promise<Payment>
  createMenuItem(input: CreateMenuItemInput): Promise<MenuItem>
  updateMenuItem(id: number, data: Partial<MenuItem> & { image?: File }): Promise<MenuItem>
  deleteMenuItem(id: number): Promise<void>
  getUsers(): Promise<User[]>
  createUser(input: { name: string; username: string; role: Role }): Promise<User>
  updateUser(id: number, data: Partial<User>): Promise<User>
  deleteUser(id: number): Promise<void>
  resetUserPassword(id: number): Promise<void>
  getSalesSummary(period?: SalesPeriod): Promise<SalesSummary>
  getSettings(): Promise<Settings>
  updateSettings(data: Partial<Settings>): Promise<Settings>
  uploadLogo(file: File): Promise<{ logoUrl: string }>
  exportSalesReport(period?: SalesPeriod): Promise<Blob>
}

export interface CreateMenuItemInput {
  name: string
  price: number
  categoryId: number
  description?: string
  imageUrl?: string
  image?: File
}

export interface CartItemInput {
  menuItemId: number
  name: string
  price: number
  quantity: number
  note?: string
}

export interface CreateOrderPayload {
  tableId: number | null
  source: 'kasir' | 'pelayan' | 'self-order'
  items: CartItemInput[]
}

export interface PaymentPayload {
  orderId: number
  method: PaymentMethod
  cashReceived?: number
}

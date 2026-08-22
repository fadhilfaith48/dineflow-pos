export type Role = 'kasir' | 'pelayan' | 'dapur' | 'admin'

export interface User {
  id: number
  name: string
  username: string
  role: Role
}

export type TableStatus = 'kosong' | 'terisi' | 'perlu-dibersihkan'

export interface DiningTable {
  id: number
  number: string
  status: TableStatus
  seats: number
  qrCode: string
}

export interface MenuCategory {
  id: number
  name: string
  order: number
}

export interface MenuItem {
  id: number
  code: string
  name: string
  description?: string
  price: number
  categoryId: number
  available: boolean
  imageUrl?: string
}

export type OrderSource = 'kasir' | 'pelayan' | 'self-order'

export type OrderStatus = 'menunggu-konfirmasi' | 'baru' | 'diproses' | 'selesai' | 'dibatalkan'

export type ItemStatus = 'baru' | 'dimasak' | 'siap' | 'diantar'

export interface OrderItem {
  id: number
  menuItemId: number
  name: string
  price: number
  quantity: number
  note?: string
  status: ItemStatus
}

export interface Order {
  id: number
  orderNumber: string
  tableId: number | null
  tableNumber?: string
  source: OrderSource
  status: OrderStatus
  items: OrderItem[]
  total: number
  createdAt: string
  updatedAt: string
}

export type PaymentMethod = 'tunai' | 'qris'

export interface Payment {
  id: number
  orderId: number
  method: PaymentMethod
  amount: number
  cashReceived?: number
  change?: number
  paidBy: number
  paidAt: string
}

export type SalesPeriod = 'harian' | 'mingguan' | 'bulanan' | 'semua'

export interface TopSellingItem {
  name: string
  quantity: number
  revenue: number
}

export interface SalesSummary {
  totalRevenue: number
  orderCount: number
  topItems: TopSellingItem[]
}

export interface Settings {
  taxRate: number
  restaurantName: string
  restaurantAddress: string
  logoUrl?: string
}

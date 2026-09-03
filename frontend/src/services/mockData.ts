import type { DiningTable, MenuCategory, MenuItem, Order, User } from '@/types'

/**
 * Data tiruan untuk pengembangan frontend sebelum backend Laravel tersedia.
 * Menu & skenario mengikuti PRD (Nasi Goreng, Ayam Bakar, Es Teh, dll).
 */

export const mockUsers: User[] = [
  { id: 1, name: 'Admin Resto', username: 'admin', role: 'admin' },
  { id: 2, name: 'Kasir Shift 1', username: 'kasir', role: 'kasir' },
  { id: 3, name: 'Pelayan A', username: 'pelayan', role: 'pelayan' },
  { id: 4, name: 'Staf Dapur', username: 'dapur', role: 'dapur' },
]

export const mockCategories: MenuCategory[] = [
  { id: 1, name: 'Makanan', order: 1 },
  { id: 2, name: 'Minuman', order: 2 },
  { id: 3, name: 'Penutup', order: 3 },
  { id: 4, name: 'Spesial', order: 4 },
]

export const mockMenuItems: MenuItem[] = [
  // Makanan
  { id: 1, code: '#M01', name: 'Nasi Goreng Spesial', description: 'Nasi goreng dengan telur, ayam, dan kerupuk', price: 18000, categoryId: 1, available: true },
  { id: 2, code: '#M02', name: 'Ayam Bakar', description: 'Ayam bakar bumbu kecap, sambal, lalapan', price: 22000, categoryId: 1, available: true },
  { id: 3, code: '#M03', name: 'Mie Ayam', description: 'Mie ayam pangsit dengan kuah kaldu', price: 16000, categoryId: 1, available: true },
  { id: 4, code: '#M04', name: 'Sate Ayam (10)', description: 'Sate ayam dengan bumbu kacang', price: 25000, categoryId: 1, available: true },
  { id: 5, code: '#M05', name: 'Gado-Gado', description: 'Sayuran rebus, tahu tempe, bumbu kacang', price: 15000, categoryId: 1, available: true },
  { id: 6, code: '#M06', name: 'Soto Ayam', description: 'Soto ayam dengan nasi dan emping', price: 17000, categoryId: 1, available: true },
  { id: 7, code: '#M07', name: 'Nasi Uduk', description: 'Nasi uduk dengan ayam goreng dan sambal', price: 19000, categoryId: 1, available: false },
  // Minuman
  { id: 8, code: '#M08', name: 'Es Teh Manis', description: '', price: 5000, categoryId: 2, available: true },
  { id: 9, code: '#M09', name: 'Es Jeruk', description: '', price: 7000, categoryId: 2, available: true },
  { id: 10, code: '#M10', name: 'Jus Alpukat', description: 'Jus alpukat segar dengan susu cokelat', price: 12000, categoryId: 2, available: true },
  { id: 11, code: '#M11', name: 'Es Kelapa Muda', description: '', price: 15000, categoryId: 2, available: true },
  { id: 12, code: '#M12', name: 'Kopi Hitam', description: '', price: 8000, categoryId: 2, available: true },
  { id: 13, code: '#M13', name: 'Teh Hangat', description: '', price: 4000, categoryId: 2, available: true },
  // Penutup
  { id: 14, code: '#M14', name: 'Pisang Goreng', description: 'Pisang goreng dengan cokelat dan keju', price: 12000, categoryId: 3, available: true },
  { id: 15, code: '#M15', name: 'Es Krim Vanilla', description: '', price: 10000, categoryId: 3, available: true },
  { id: 16, code: '#M16', name: 'Puding Cokelat', description: '', price: 9000, categoryId: 3, available: true },
  { id: 17, code: '#M17', name: 'Roti Bakar', description: 'Roti bakar isi cokelat keju', price: 13000, categoryId: 3, available: true },
  // Spesial
  { id: 18, code: '#M18', name: 'Paket Nasi Ayam + Es Teh', description: 'Hemat: ayam bakar + nasi + es teh manis', price: 25000, categoryId: 4, available: true },
  { id: 19, code: '#M19', name: 'Paket Nasi Goreng + Es Jeruk', description: 'Hemat: nasi goreng spesial + es jeruk', price: 23000, categoryId: 4, available: true },
]

export const mockTables: DiningTable[] = [
  { id: 1, number: 'T1', status: 'kosong', seats: 2, qrCode: 'T1' },
  { id: 2, number: 'T2', status: 'terisi', seats: 4, qrCode: 'T2' },
  { id: 3, number: 'T3', status: 'kosong', seats: 2, qrCode: 'T3' },
  { id: 4, number: 'T4', status: 'perlu-dibersihkan', seats: 4, qrCode: 'T4' },
  { id: 5, number: 'T5', status: 'terisi', seats: 6, qrCode: 'T5' },
  { id: 6, number: 'T6', status: 'kosong', seats: 4, qrCode: 'T6' },
  { id: 7, number: 'T7', status: 'kosong', seats: 2, qrCode: 'T7' },
  { id: 8, number: 'T8', status: 'terisi', seats: 4, qrCode: 'T8' },
]

export const mockOrders: Order[] = [
  {
    id: 1,
    orderNumber: 'ORD-0001',
    tableId: 8,
    tableNumber: 'T8',
    source: 'self-order',
    status: 'diproses',
    items: [
      { id: 1, menuItemId: 3, name: 'Mie Ayam', price: 16000, quantity: 1, status: 'dimasak' },
      { id: 2, menuItemId: 10, name: 'Jus Alpukat', price: 12000, quantity: 1, status: 'baru' },
    ],
    total: 30800,
    createdAt: '2026-08-12T10:15:00',
    updatedAt: '2026-08-12T10:15:30',
  },
  {
    id: 2,
    orderNumber: 'ORD-0002',
    tableId: 5,
    tableNumber: 'T5',
    source: 'pelayan',
    status: 'diproses',
    items: [
      { id: 1, menuItemId: 2, name: 'Ayam Bakar', price: 22000, quantity: 1, note: 'Tidak pedas', status: 'dimasak' },
      { id: 2, menuItemId: 9, name: 'Es Jeruk', price: 7000, quantity: 2, status: 'baru' },
    ],
    total: 39600,
    createdAt: '2026-08-12T10:20:00',
    updatedAt: '2026-08-12T10:21:00',
  },
  {
    id: 3,
    orderNumber: 'ORD-0003',
    tableId: 3,
    tableNumber: 'T3',
    source: 'self-order',
    status: 'menunggu',
    items: [
      { id: 1, menuItemId: 1, name: 'Nasi Goreng Spesial', price: 18000, quantity: 1, status: 'baru' },
      { id: 2, menuItemId: 8, name: 'Es Teh Manis', price: 5000, quantity: 1, status: 'baru' },
    ],
    total: 25300,
    createdAt: '2026-08-13T09:00:00',
    updatedAt: '2026-08-13T09:00:05',
  },
]


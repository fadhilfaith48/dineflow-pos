import type { ItemStatus, OrderStatus, TableStatus } from '@/types'
import type { BadgeVariant } from '@/components/StatusBadge'

/**
 * Pemetaan status (order, item, meja) ke varian badge & label Indonesia.
 * Sumber tunggal agar konsisten di seluruh layar (Kasir, Pelayan, Tracking, KDS).
 */

export const orderStatusBadge: Record<OrderStatus, BadgeVariant> = {
  menunggu: 'new',
  diproses: 'cooking',
  selesai: 'done',
  dibatalkan: 'cancelled',
}

export const orderStatusLabel: Record<OrderStatus, string> = {
  menunggu: 'Menunggu Pembayaran',
  diproses: 'Sedang Dimasak',
  selesai: 'Selesai',
  dibatalkan: 'Dibatalkan',
}

export const orderStatusBar: Record<OrderStatus, string> = {
  menunggu: 'bg-status-new',
  diproses: 'bg-status-cooking',
  selesai: 'bg-status-done',
  dibatalkan: 'bg-status-danger',
}

export const itemStatusBadge: Record<ItemStatus, BadgeVariant> = {
  baru: 'new',
  dimasak: 'cooking',
  siap: 'ready',
  diantar: 'done',
}

export const itemStatusLabel: Record<ItemStatus, string> = {
  baru: 'Baru',
  dimasak: 'Dimasak',
  siap: 'Siap',
  diantar: 'Diantar',
}

export const tableStatusLabel: Record<TableStatus, string> = {
  kosong: 'Kosong',
  terisi: 'Terisi',
  'perlu-dibersihkan': 'Perlu Dibersihkan',
}

import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { Order } from '@/types'
import { StatusBadge } from './StatusBadge'
import { OrderList } from '@/pages/pelayan/OrderList'

describe('StatusBadge terhadap status tak dikenal', () => {
  it('tidak crash dan memakai fallback neutral', () => {
    render(<StatusBadge variant={'legacy-status' as never} label="legacy-status" />)
    const badge = screen.getByText('legacy-status')
    expect(badge.className).toContain('text-text-secondary')
  })
})

describe('OrderList terhadap filter status pelayan', () => {
  const baseOrder = {
    id: 3,
    orderNumber: 'ORD-0003',
    tableId: 3,
    tableNumber: 'T3',
    source: 'self-order',
    voidReason: null,
    voidedBy: null,
    items: [
      { id: 5, menuItemId: 1, name: 'Nasi Goreng Spesial', variantName: 'Jumbo', price: 25000, quantity: 1, note: null, spiceLevel: 2, status: 'baru' },
    ],
    total: 35750,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as unknown as Order

  it('menampilkan order berstatus diproses', () => {
    render(<OrderList orders={[{ ...baseOrder, status: 'diproses' }]} onDeliver={() => {}} onBack={() => {}} />)
    expect(screen.getByText('ORD-0003')).toBeInTheDocument()
  })

  it('menyembunyikan order berstatus selesai', () => {
    render(<OrderList orders={[{ ...baseOrder, status: 'selesai' }]} onDeliver={() => {}} onBack={() => {}} />)
    expect(screen.queryByText('ORD-0003')).not.toBeInTheDocument()
    expect(screen.getByText('Belum ada pesanan aktif.')).toBeInTheDocument()
  })

  it('tidak crash untuk status legacy seeder dan menyembunyikannya', () => {
    render(
      <OrderList
        orders={[{ ...baseOrder, status: 'menunggu-konfirmasi' as unknown as Order['status'] }]}
        onDeliver={() => {}}
        onBack={() => {}}
      />,
    )
    expect(screen.queryByText('ORD-0003')).not.toBeInTheDocument()
  })
})
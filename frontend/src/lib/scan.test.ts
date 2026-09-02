import { describe, expect, it } from 'vitest'
import { extractOrderNumber } from './scan'

describe('extractOrderNumber', () => {
  it('mengambil nomor dari URL penuh', () => {
    expect(extractOrderNumber('http://localhost:5173/order/ORD-0007')).toBe('ORD-0007')
    expect(extractOrderNumber('https://dineflow.app/order/ORD-0042')).toBe('ORD-0042')
  })

  it('mengambil nomor dari teks polos', () => {
    expect(extractOrderNumber('ORD-0001')).toBe('ORD-0001')
  })

  it('case-insensitive lalu diuppercase', () => {
    expect(extractOrderNumber('ord-0012')).toBe('ORD-0012')
  })

  it('menolak input tanpa nomor pesanan', () => {
    expect(extractOrderNumber('localhost:5173/order/42')).toBeNull()
    expect(extractOrderNumber('')).toBeNull()
    expect(extractOrderNumber('https://example.com/abc')).toBeNull()
  })

  it('mengambil nomor yang menyatu dengan teks lain', () => {
    expect(extractOrderNumber('ORD-0099- MEJA 1')).toBe('ORD-0099')
  })
})
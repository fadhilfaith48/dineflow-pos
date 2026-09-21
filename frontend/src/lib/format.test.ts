import { describe, expect, it } from 'vitest'
import { formatElapsed, formatRupiah, formatRupiahInput } from './format'

describe('formatRupiah', () => {
  it('memformat ribuan dengan titik id-ID', () => {
    expect(formatRupiah(20000)).toBe('Rp 20.000')
    expect(formatRupiah(1234567)).toBe('Rp 1.234.567')
  })

  it('menambah prefix Rp', () => {
    expect(formatRupiah(500)).toBe('Rp 500')
    expect(formatRupiah(0)).toBe('Rp 0')
  })
})

describe('formatRupiahInput', () => {
  it('menambah titik ribuan pada digit mentah', () => {
    expect(formatRupiahInput('25000')).toBe('25.000')
    expect(formatRupiahInput('20000')).toBe('20.000')
  })

  it('merapikan input yang sudah bertitik', () => {
    expect(formatRupiahInput('20.000')).toBe('20.000')
    expect(formatRupiahInput('1.234.567')).toBe('1.234.567')
  })

  it('mengabaikan karakter non-digit', () => {
    expect(formatRupiahInput('abc')).toBe('')
    expect(formatRupiahInput('12a34')).toBe('1.234')
  })

  it('mengembalikan string kosong untuk nilai kosong/nol', () => {
    expect(formatRupiahInput('')).toBe('')
    expect(formatRupiahInput('0')).toBe('')
  })
})

describe('formatElapsed', () => {
  it('memformat durasi menit:detik', () => {
    expect(formatElapsed(0, 65_000)).toBe('01:05')
    expect(formatElapsed(0, 3_600_000)).toBe('1:00')
  })
})
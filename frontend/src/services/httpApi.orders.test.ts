import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { api } from './httpApi'

/**
 * Regresi pemisahan route void & cancel.
 *
 * `POST /orders/{id}/void` (publik) pernah dipakai untuk cancel mandiri, sementara
 * `PATCH /orders/{id}/void` dipakai staff untuk void dengan alasan. Dua aksi
 * ini berbeda objek dan berbeda hak akses, jadi route publiknya dipindah ke
 * `/cancel` supaya tidak ada lagi dua aksi berbeda pada path yang sama.
 *
 * Test ini mengunci: frontend hanya boleh memanggil path yang sesuai perannya.
 * Kalau cancelOrder diubah kembali ke /void, atau voidOrder memakai POST,
 * test ini gagal — bukan baru ketahuan saat deploy.
 */

function mockFetchOnce(body: unknown = { data: { id: 1, orderNumber: 'ORD-0001' } }) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
}

describe('httpApi pembatalan & void', () => {
  beforeEach(() => {
    sessionStorage.setItem('dineflow-token', 'token-uji')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    sessionStorage.clear()
  })

  it('cancelOrder memakai POST /orders/{id}/cancel', async () => {
    const fetchSpy = mockFetchOnce()

    await api.cancelOrder(42)

    const [url, init] = fetchSpy.mock.calls[0]
    expect(String(url)).toContain('/orders/42/cancel')
    expect(String(url)).not.toContain('/void')
    expect(init?.method).toBe('POST')
  })

  it('voidOrder memakai PATCH /orders/{id}/void dengan alasan', async () => {
    const fetchSpy = mockFetchOnce()

    await api.voidOrder(42, 'Salah input menu')

    const [url, init] = fetchSpy.mock.calls[0]
    expect(String(url)).toContain('/orders/42/void')
    expect(init?.method).toBe('PATCH')
    expect(String(init?.body)).toContain('Salah input menu')
  })

  it('cancelOrder tidak mengirim body (tanpa alasan, pelanggan bukan staff)', async () => {
    const fetchSpy = mockFetchOnce()

    await api.cancelOrder(42)

    const [, init] = fetchSpy.mock.calls[0]
    expect(init?.body ?? '').toBe('')
  })
})

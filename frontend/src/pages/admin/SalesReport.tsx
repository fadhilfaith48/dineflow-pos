import { useCallback, useEffect, useState } from 'react'
import type { SalesPeriod, SalesSummary } from '@/types'
import { api } from '@/services/httpApi'
import echo from '@/services/echo'
import { formatRupiah } from '@/lib/format'
import { Button } from '@/components/Button'

const periods: { value: SalesPeriod; label: string }[] = [
  { value: 'harian', label: 'Hari ini' },
  { value: 'mingguan', label: '7 Hari' },
  { value: 'bulanan', label: 'Bulan ini' },
  { value: 'semua', label: 'Semua' },
]

export function SalesReport() {
  const [period, setPeriod] = useState<SalesPeriod>('semua')
  const [summary, setSummary] = useState<SalesSummary | null>(null)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)

  const loadSummary = useCallback((showLoading: boolean) => {
    if (showLoading) {
      setSummary(null)
      setError('')
    }
    api.getSalesSummary(period).then(setSummary).catch(() => {
      setError('Gagal memuat laporan penjualan. Periksa koneksi lalu coba lagi.')
    })
  }, [period])

  useEffect(() => {
    loadSummary(true)
  }, [loadSummary])

  useEffect(() => {
    echo.channel('orders').listen('OrderStatusChanged', (event: { action?: string }) => {
      if (event.action === 'paid') loadSummary(false)
    })
    return () => {
      echo.leaveChannel('orders')
    }
  }, [loadSummary])

  async function handleExport() {
    setExporting(true)
    try {
      const blob = await api.exportSalesReport(period)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `laporan-penjualan-${period}-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('Gagal export laporan. Coba lagi.')
    } finally {
      setExporting(false)
    }
  }

  if (error) {
    return <p className="py-12 text-center text-body text-status-danger">{error}</p>
  }

  if (!summary) {
    return <p className="py-12 text-center text-body text-text-secondary">Memuat laporan...</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <div className="flex gap-2">
          {periods.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`rounded-lg px-4 py-2 text-body font-semibold transition-colors ${
                period === p.value ? 'bg-accent-primary text-text-on-accent' : 'bg-bg-surface text-text-secondary'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <Button variant="outline" onClick={handleExport} disabled={exporting}>
          {exporting ? 'Export...' : 'Export CSV'}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border-subtle bg-bg-surface p-5 shadow-card">
          <div className="text-caption font-semibold uppercase tracking-wide text-text-secondary">
            Total Penjualan
          </div>
          <div className="mt-2 font-num text-display font-bold text-accent-primary">
            {formatRupiah(summary.totalRevenue)}
          </div>
        </div>
        <div className="rounded-xl border border-border-subtle bg-bg-surface p-5 shadow-card">
          <div className="text-caption font-semibold uppercase tracking-wide text-text-secondary">
            Jumlah Transaksi
          </div>
          <div className="mt-2 font-num text-display font-bold text-text-primary">
            {summary.orderCount}
          </div>
        </div>
        <div className="rounded-xl border border-border-subtle bg-bg-surface p-5 shadow-card">
          <div className="text-caption font-semibold uppercase tracking-wide text-text-secondary">
            Rata-rata per Transaksi
          </div>
          <div className="mt-2 font-num text-display font-bold text-text-primary">
            {formatRupiah(summary.orderCount > 0 ? Math.round(summary.totalRevenue / summary.orderCount) : 0)}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border-subtle bg-bg-surface shadow-card">
        <div className="border-b border-border-subtle px-4 py-3 text-body font-semibold text-text-primary">
          Menu Terlaris
        </div>
        {summary.topItems.length === 0 ? (
          <p className="px-4 py-10 text-center text-body text-text-secondary">Belum ada data penjualan.</p>
        ) : (
          <ul className="divide-y divide-border-subtle">
            {summary.topItems.map((item, index) => (
              <li key={item.name} className="flex items-center gap-4 px-4 py-3">
                <span className="font-num w-8 text-heading font-bold text-border-subtle">{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-body font-semibold text-text-primary">{item.name}</div>
                  <div className="font-num text-caption text-text-secondary">{item.quantity} porsi terjual</div>
                </div>
                <span className="font-num text-body font-semibold text-text-primary">
                  {formatRupiah(item.revenue)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

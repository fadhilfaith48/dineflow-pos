import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import type { DiningTable, TableStatus } from '@/types'
import { Button } from '@/components/Button'

interface TableManagementProps {
  tables: DiningTable[]
  onCreate: (input: { number: string; seats: number }) => Promise<void>
  onUpdateStatus: (id: number, status: TableStatus) => Promise<void>
  onDelete: (id: number) => Promise<void>
}

const statusLabel: Record<TableStatus, string> = {
  kosong: 'Kosong',
  terisi: 'Terisi',
  'perlu-dibersihkan': 'Perlu Dibersihkan',
}

const statusOption: Record<TableStatus, string> = {
  kosong: 'text-status-ready',
  terisi: 'text-accent-primary',
  'perlu-dibersihkan': 'text-status-danger',
}

export function TableManagement({ tables, onCreate, onUpdateStatus, onDelete }: TableManagementProps) {
  const [showAdd, setShowAdd] = useState(false)
  const [number, setNumber] = useState('')
  const [seats, setSeats] = useState('4')
  const [error, setError] = useState('')
  const [qrTable, setQrTable] = useState<DiningTable | null>(null)

  async function handleCreate() {
    const num = number.trim()
    const seatCount = Number(seats) || 0
    if (!num || seatCount <= 0) {
      setError('Nomor meja dan jumlah kursi wajib diisi.')
      return
    }
    setError('')
    try {
      await onCreate({ number: num, seats: seatCount })
      setShowAdd(false)
      setNumber('')
      setSeats('4')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menambah meja')
    }
  }

  const qrUrl = qrTable ? `${window.location.origin}/menu/${qrTable.qrCode}` : ''

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="text-body font-semibold text-text-primary">Daftar Meja ({tables.length})</div>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          + Tambah Meja
        </Button>
      </div>

      {showAdd && (
        <div className="rounded-xl border border-border-subtle bg-bg-surface p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="text-caption font-semibold uppercase tracking-wide text-text-secondary">
                Nomor Meja
              </label>
              <input
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="mis. T9"
                className="mt-1 w-32 rounded-lg border border-border-subtle px-3 py-2 text-body focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-tint"
              />
            </div>
            <div>
              <label className="text-caption font-semibold uppercase tracking-wide text-text-secondary">
                Jumlah Kursi
              </label>
              <input
                value={seats}
                onChange={(e) => setSeats(e.target.value.replace(/\D/g, ''))}
                inputMode="numeric"
                className="mt-1 w-24 rounded-lg border border-border-subtle px-3 py-2 font-num text-body focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-tint"
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreate}>
                Simpan
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowAdd(false)}>
                Batal
              </Button>
            </div>
          </div>
          {error && <p className="mt-2 text-caption text-status-danger">{error}</p>}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border-subtle bg-bg-surface shadow-card">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border-subtle bg-bg-secondary text-caption font-semibold uppercase tracking-wide text-text-secondary">
              <th className="px-4 py-3">Meja</th>
              <th className="px-4 py-3">Kursi</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">QR</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {tables.map((table) => (
              <tr key={table.id}>
                <td className="px-4 py-3 font-num text-body font-bold text-text-primary">{table.number}</td>
                <td className="px-4 py-3 font-num text-body text-text-secondary">{table.seats}</td>
                <td className="px-4 py-3">
                  <select
                    value={table.status}
                    onChange={(e) => onUpdateStatus(table.id, e.target.value as TableStatus)}
                    className={`rounded-lg border border-border-subtle bg-bg-surface px-2 py-1.5 text-caption font-semibold ${statusOption[table.status]}`}
                  >
                    {(Object.keys(statusLabel) as TableStatus[]).map((s) => (
                      <option key={s} value={s}>
                        {statusLabel[s]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => setQrTable(table)}
                    className="rounded-lg border border-border-subtle px-3 py-1.5 text-caption font-semibold text-accent-primary hover:bg-accent-tint"
                  >
                    Lihat QR
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => {
                      if (window.confirm(`Hapus meja ${table.number}?`)) onDelete(table.id)
                    }}
                    className="rounded-lg border border-border-subtle px-3 py-1.5 text-caption font-semibold text-status-danger hover:bg-status-danger/10"
                  >
                    Hapus
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {qrTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-bg-surface p-6 text-center shadow-modal">
            <h3 className="text-heading font-semibold text-text-primary">QR Meja {qrTable.number}</h3>
            <p className="mt-1 text-caption text-text-secondary">Scan untuk pesan mandiri di meja ini</p>
            <div className="mx-auto mt-4 w-fit rounded-xl border border-border-subtle p-4">
              <QRCodeSVG value={qrUrl} size={180} />
            </div>
            <p className="mt-3 font-num text-caption break-all text-text-secondary">{qrUrl}</p>
            <div className="mt-4 flex gap-2">
              <Button
                variant="outline"
                fullWidth
                onClick={() => {
                  navigator.clipboard.writeText(qrUrl)
                  setQrTable(null)
                }}
              >
                Salin Link
              </Button>
              <Button fullWidth onClick={() => setQrTable(null)}>
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

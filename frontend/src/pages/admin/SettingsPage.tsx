import { useEffect, useState } from 'react'
import type { Settings } from '@/types'
import { api } from '@/services/httpApi'
import { Button } from '@/components/Button'

export function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [taxRate, setTaxRate] = useState('10')
  const [restaurantName, setRestaurantName] = useState('')
  const [restaurantAddress, setRestaurantAddress] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string>('')
  const [qrisFile, setQrisFile] = useState<File | null>(null)
  const [qrisPreview, setQrisPreview] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    api.getSettings().then((s) => {
      setSettings(s)
      setTaxRate(String(s.taxRate))
      setRestaurantName(s.restaurantName)
      setRestaurantAddress(s.restaurantAddress)
      setLogoPreview(s.logoUrl ?? '')
      setQrisPreview(s.qrisImageUrl ?? '')
    })
  }, [])

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  function handleQrisChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setQrisFile(file)
    setQrisPreview(URL.createObjectURL(file))
  }

  async function handleSave() {
    setSaving(true)
    setSuccess('')
    setError('')
    try {
      await api.updateSettings({
        taxRate: parseInt(taxRate, 10) || 10,
        restaurantName,
        restaurantAddress,
      })
      if (logoFile) {
        const result = await api.uploadLogo(logoFile)
        setLogoPreview(result.logoUrl)
        setLogoFile(null)
      }
      if (qrisFile) {
        const result = await api.uploadQris(qrisFile)
        setQrisPreview(result.qrisImageUrl)
        setQrisFile(null)
      }
      setSuccess('Pengaturan berhasil disimpan.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menyimpan pengaturan.')
    } finally {
      setSaving(false)
    }
  }

  if (!settings) {
    return <p className="py-12 text-center text-body text-text-secondary">Memuat pengaturan...</p>
  }

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <div className="rounded-lg bg-status-danger/15 px-4 py-2 text-body font-semibold text-status-danger">{error}</div>
      )}
      {success && (
        <div className="rounded-lg bg-status-ready/15 px-4 py-2 text-body font-semibold text-status-ready">{success}</div>
      )}

      <div className="rounded-xl border border-border-subtle bg-bg-surface p-5 shadow-card">
        <div className="text-heading font-semibold text-text-primary">Logo Restoran</div>
        <div className="mt-3 flex items-center gap-4">
          {logoPreview && (
            <img src={logoPreview} alt="Logo" className="h-16 w-16 rounded-lg object-cover" />
          )}
          <div>
            <label className="cursor-pointer rounded-lg border border-border-subtle bg-bg-secondary px-4 py-2 text-body font-semibold text-text-primary transition-colors hover:bg-bg-primary">
              Pilih Logo
              <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
            </label>
            <p className="mt-1 text-caption text-text-secondary">PNG/JPG/WebP, maks 2 MB</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border-subtle bg-bg-surface p-5 shadow-card">
        <div className="text-heading font-semibold text-text-primary">Gambar QRIS Statis</div>
        <div className="mt-3 flex items-center gap-4">
          {qrisPreview && (
            <img src={qrisPreview} alt="QRIS" className="h-20 w-20 rounded-lg object-contain" />
          )}
          <div>
            <label className="cursor-pointer rounded-lg border border-border-subtle bg-bg-secondary px-4 py-2 text-body font-semibold text-text-primary transition-colors hover:bg-bg-primary">
              Pilih QRIS
              <input type="file" accept="image/*" className="hidden" onChange={handleQrisChange} />
            </label>
            <p className="mt-1 text-caption text-text-secondary">PNG/JPG/WebP, maks 2 MB. Ditampilkan di layar pembayaran kasir.</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border-subtle bg-bg-surface p-5 shadow-card">
        <div className="text-heading font-semibold text-text-primary">Informasi Restoran</div>
        <div className="mt-4 flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-caption font-semibold text-text-secondary">Nama Restoran</label>
            <input
              type="text"
              value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
              className="w-full rounded-lg border border-border-subtle bg-bg-primary px-3 py-2 text-body text-text-primary focus:border-accent-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-caption font-semibold text-text-secondary">Alamat</label>
            <input
              type="text"
              value={restaurantAddress}
              onChange={(e) => setRestaurantAddress(e.target.value)}
              className="w-full rounded-lg border border-border-subtle bg-bg-primary px-3 py-2 text-body text-text-primary focus:border-accent-primary focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border-subtle bg-bg-surface p-5 shadow-card">
        <div className="text-heading font-semibold text-text-primary">Pajak (PPN)</div>
        <div className="mt-4">
          <label className="mb-1 block text-caption font-semibold text-text-secondary">Tarif PPN (%)</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              max="100"
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
              className="w-24 rounded-lg border border-border-subtle bg-bg-primary px-3 py-2 font-num text-body text-text-primary focus:border-accent-primary focus:outline-none"
            />
            <span className="text-body text-text-secondary">%</span>
          </div>
          <p className="mt-1 text-caption text-text-secondary">Default: 10%. Berlaku untuk semua transaksi baru.</p>
        </div>
      </div>

      <div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
        </Button>
      </div>
    </div>
  )
}

import { useState } from 'react'
import type { MenuCategory, MenuItem } from '@/types'
import type { MenuVariantInput } from '@/services/api'
import { formatRupiah } from '@/lib/format'
import { photoUrl } from '@/lib/menuPhoto'
import { Button } from '@/components/Button'

interface MenuManagementProps {
  items: MenuItem[]
  categories: MenuCategory[]
  onToggleAvailable: (item: MenuItem) => void
  onEditPrice: (item: MenuItem, price: number) => void
  onSave: (item: MenuItem, data: MenuFormData) => Promise<void>
  onCreate: (data: MenuFormData) => Promise<void>
  onDelete: (item: MenuItem) => Promise<void>
}

export interface MenuFormData {
  name: string
  price: number
  categoryId: number
  description?: string
  imageUrl?: string
  image?: File
  isSpicy?: boolean
  variants?: MenuVariantInput[]
}

const emptyForm: MenuFormData = {
  name: '',
  price: 0,
  categoryId: 0,
  description: '',
  imageUrl: '',
  isSpicy: false,
  variants: [],
}

interface VariantDraft {
  id?: number
  name: string
  price: number
  available: boolean
  imageUrl?: string
  image?: File
  preview?: string
}

interface MenuFormModalProps {
  title: string
  initial: MenuFormData
  categories: MenuCategory[]
  onClose: () => void
  onSave: (data: MenuFormData) => Promise<void>
}

function MenuFormModal({ title, initial, categories, onClose, onSave }: MenuFormModalProps) {
  const [form, setForm] = useState<MenuFormData>({
    ...initial,
    categoryId: initial.categoryId || categories[0]?.id || 0,
  })
  const [variants, setVariants] = useState<VariantDraft[]>(
    (initial.variants ?? []).map((v) => ({ id: v.id, name: v.name, price: v.price, available: v.available ?? true, imageUrl: v.imageUrl }))
  )
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState<string | null>(photoUrl(initial.imageUrl ?? undefined) ?? null)

  function handleFileChange(file: File | undefined) {
    if (!file) return
    setForm({ ...form, image: file })
    setPreview(URL.createObjectURL(file))
  }

  function addVariant() {
    setVariants([...variants, { name: '', price: 0, available: true }])
  }

  function removeVariant(index: number) {
    setVariants(variants.filter((_, i) => i !== index))
  }

  function updateVariant(index: number, field: keyof VariantDraft, value: string | number | boolean) {
    setVariants(variants.map((v, i) => (i === index ? { ...v, [field]: value } : v)))
  }

  function handleVariantFile(index: number, file: File | undefined) {
    if (!file) return
    setVariants(variants.map((v, i) => (i === index ? { ...v, image: file, preview: URL.createObjectURL(file) } : v)))
  }

  async function handleSave() {
    if (!form.name.trim() || form.price <= 0 || !form.categoryId) {
      setError('Nama, harga, dan kategori wajib diisi.')
      return
    }

    const validVariants = variants.filter((v) => v.name.trim() !== '')
    if (validVariants.length > 0) {
      const hasInvalid = validVariants.some((v) => v.price <= 0)
      if (hasInvalid) {
        setError('Semua varian harus memiliki harga lebih dari 0.')
        return
      }
    }

    setError('')
    setSaving(true)
    try {
      const variantInputs: MenuVariantInput[] | undefined =
        validVariants.length > 0
          ? validVariants.map((v) => ({ id: v.id, name: v.name, price: v.price, available: v.available, imageUrl: v.imageUrl, image: v.image }))
          : undefined
      await onSave({ ...form, variants: variantInputs })
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menyimpan')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-bg-surface p-6 shadow-modal max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-heading font-semibold text-text-primary">{title}</h3>
          <button onClick={onClose} aria-label="Tutup" className="text-text-secondary hover:text-text-primary">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <div>
            <label className="text-caption font-semibold uppercase tracking-wide text-text-secondary">Nama Menu</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1 w-full rounded-lg border border-border-subtle px-3 py-2 text-body focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-tint"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-caption font-semibold uppercase tracking-wide text-text-secondary">Harga Dasar</label>
              <input
                value={form.price === 0 ? '' : String(form.price)}
                onChange={(e) => setForm({ ...form, price: Number(e.target.value.replace(/\D/g, '')) || 0 })}
                inputMode="numeric"
                placeholder="0"
                className="mt-1 w-full rounded-lg border border-border-subtle px-3 py-2 font-num text-body focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-tint"
              />
            </div>
            <div>
              <label className="text-caption font-semibold uppercase tracking-wide text-text-secondary">Kategori</label>
              <select
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-border-subtle bg-bg-surface px-3 py-2 text-body focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-tint"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-caption font-semibold uppercase tracking-wide text-text-secondary">Deskripsi</label>
            <input
              value={form.description ?? ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="mt-1 w-full rounded-lg border border-border-subtle px-3 py-2 text-body focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-tint"
            />
          </div>
          <label className="flex items-center justify-between rounded-lg border border-border-subtle px-3 py-2.5">
            <span className="text-caption font-semibold uppercase tracking-wide text-text-secondary">
              Item Pedas
            </span>
            <input
              type="checkbox"
              checked={!!form.isSpicy}
              onChange={(e) => setForm({ ...form, isSpicy: e.target.checked })}
              className="h-4 w-4 accent-accent-primary"
            />
          </label>
          <p className="-mt-1 text-[11px] text-text-secondary">
            Jika dicentang, pelanggan memilih level kepedasan (0-5) saat memesan.
          </p>
          <div>
            <label className="text-caption font-semibold uppercase tracking-wide text-text-secondary">Foto Menu</label>
            <div className="mt-1 flex items-center gap-3">
              {preview ? (
                <img src={preview} alt="Pratinjau" className="h-16 w-16 rounded-lg object-cover" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-bg-secondary">
                  <svg className="h-6 w-6 text-border-subtle" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 11h18" />
                    <path d="M12 11v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V11" />
                    <path d="M21 11v8a3 3 0 0 1-3 3h-3a3 3 0 0 1-3-3" />
                    <circle cx="12" cy="5" r="2" />
                  </svg>
                </div>
              )}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => handleFileChange(e.target.files?.[0])}
                className="w-full rounded-lg border border-border-subtle px-3 py-2 text-body file:mr-3 file:rounded-lg file:border-0 file:bg-accent-primary file:px-3 file:py-1.5 file:text-caption file:font-bold file:uppercase file:text-text-on-accent focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-tint"
              />
            </div>
            <p className="mt-1 text-caption text-text-secondary">PNG/JPG/WebP, maks 2 MB (opsional)</p>
          </div>

          <div className="border-t border-border-subtle pt-3">
            <div className="flex items-center justify-between">
              <label className="text-caption font-semibold uppercase tracking-wide text-text-secondary">Varian Menu</label>
              <button
                type="button"
                onClick={addVariant}
                className="rounded-lg bg-accent-tint px-2 py-1 text-caption font-bold text-accent-primary hover:bg-accent-primary/10"
              >
                + Tambah
              </button>
            </div>
            <p className="mt-0.5 text-[11px] text-text-secondary">Opsi ukuran/tipe dengan harga berbeda (opsional)</p>

            {variants.length === 0 ? (
              <p className="mt-2 rounded-lg border border-dashed border-border-subtle py-3 text-center text-caption text-text-secondary">
                Tanpa varian — gunakan harga dasar
              </p>
            ) : (
              <div className="mt-2 flex flex-col gap-2">
                {variants.map((v, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg border border-border-subtle p-2">
                    <label className="relative block h-10 w-10 shrink-0 cursor-pointer overflow-hidden rounded-md bg-bg-secondary">
                      {v.preview ?? v.imageUrl ? (
                        <img src={photoUrl(v.preview ?? v.imageUrl)} alt={`Foto ${v.name || 'varian'}`} className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center">
                          <svg className="h-5 w-5 text-border-subtle" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <path d="m21 15-5-5L5 21" />
                          </svg>
                        </span>
                      )}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(e) => handleVariantFile(i, e.target.files?.[0])}
                        className="sr-only"
                      />
                    </label>
                    <input
                      value={v.name}
                      onChange={(e) => updateVariant(i, 'name', e.target.value)}
                      placeholder="Nama (mis. Original)"
                      className="min-w-0 flex-1 rounded-md border border-border-subtle px-2 py-1 text-caption focus:border-accent-primary focus:outline-none"
                    />
                    <input
                      value={v.price === 0 ? '' : String(v.price)}
                      onChange={(e) => updateVariant(i, 'price', Number(e.target.value.replace(/\D/g, '')) || 0)}
                      inputMode="numeric"
                      placeholder="Harga"
                      className="w-20 rounded-md border border-border-subtle px-2 py-1 font-num text-caption focus:border-accent-primary focus:outline-none"
                    />
                    <label className="flex items-center gap-1 text-[11px] text-text-secondary">
                      <input
                        type="checkbox"
                        checked={v.available}
                        onChange={(e) => updateVariant(i, 'available', e.target.checked)}
                        className="h-3.5 w-3.5 accent-accent-primary"
                      />
                      Aktif
                    </label>
                    <button
                      type="button"
                      onClick={() => removeVariant(i)}
                      className="rounded p-1 text-text-secondary hover:bg-status-danger/10 hover:text-status-danger"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M18 6 6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-caption text-status-danger">{error}</p>}
        </div>

        <div className="mt-6 flex gap-2">
          <Button variant="outline" fullWidth onClick={onClose}>
            Batal
          </Button>
          <Button fullWidth onClick={handleSave} disabled={saving}>
            {saving ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export function MenuManagement({
  items,
  categories,
  onToggleAvailable,
  onEditPrice,
  onSave,
  onCreate,
  onDelete,
}: MenuManagementProps) {
  const [editingId, setEditingId] = useState<number | null>(null)
  const [priceDraft, setPriceDraft] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)

  const catName = (id: number) => categories.find((c) => c.id === id)?.name ?? '-'

  function startEdit(item: MenuItem) {
    setEditingId(item.id)
    setPriceDraft(String(item.price))
  }

  function commitEdit(item: MenuItem) {
    const price = Number(priceDraft.replace(/\D/g, ''))
    if (price > 0) onEditPrice(item, price)
    setEditingId(null)
  }

  const editFormData: MenuFormData = editingItem
    ? {
        name: editingItem.name,
        price: editingItem.price,
        categoryId: editingItem.categoryId,
        description: editingItem.description,
        imageUrl: editingItem.imageUrl,
        isSpicy: editingItem.isSpicy,
        variants: editingItem.variants?.map((v) => ({
          id: v.id,
          name: v.name,
          price: v.price,
          available: v.available,
          imageUrl: v.imageUrl,
        })),
      }
    : emptyForm

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="text-body font-semibold text-text-primary">Daftar Menu ({items.length})</div>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          + Tambah Menu
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border-subtle bg-bg-surface shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="border-b border-border-subtle bg-bg-secondary text-caption font-semibold uppercase tracking-wide text-text-secondary">
                <th className="px-4 py-3">Menu</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3">Harga</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {items.map((item) => (
                <tr key={item.id} className={item.available ? '' : 'bg-bg-secondary/50'}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {item.imageUrl ? (
                        <img src={photoUrl(item.imageUrl)} alt={item.name} className="h-10 w-10 rounded-lg object-cover" />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-bg-secondary">
                          <svg className="h-6 w-6 text-border-subtle" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 11h18" />
                            <path d="M12 11v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V11" />
                            <path d="M21 11v8a3 3 0 0 1-3 3h-3a3 3 0 0 1-3-3" />
                            <circle cx="12" cy="5" r="2" />
                          </svg>
                        </div>
                      )}
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-body font-semibold text-text-primary">{item.name}</span>
                            {item.isSpicy && (
                              <span className="rounded-full bg-status-danger/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-status-danger">
                                Pedas
                              </span>
                            )}
                          </div>
                          <div className="font-num text-caption text-text-secondary">{item.code}</div>
                        {item.variants && item.variants.length > 0 && (
                          <div className="mt-0.5 flex flex-wrap gap-1">
                            {item.variants.map((v) => (
                              <span key={v.id} className="rounded-lg border border-accent-primary/30 bg-accent-tint px-2 py-0.5 text-caption font-semibold text-accent-primary">
                                {v.name} <span className="font-num">{formatRupiah(v.price)}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-body text-text-secondary">{catName(item.categoryId)}</td>
                  <td className="px-4 py-3">
                    {editingId === item.id ? (
                      <input
                        value={priceDraft}
                        onChange={(e) => setPriceDraft(e.target.value.replace(/\D/g, ''))}
                        inputMode="numeric"
                        autoFocus
                        className="w-28 rounded-md border border-accent-primary px-2 py-1 font-num text-body focus:outline-none"
                      />
                    ) : (
                      <span className="font-num text-body font-semibold text-text-primary">
                        {formatRupiah(item.price)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-caption font-bold uppercase tracking-wider ${
                        item.available
                          ? 'bg-status-ready/15 text-status-ready'
                          : 'bg-status-danger/15 text-status-danger'
                      }`}
                    >
                      {item.available ? 'Tersedia' : 'Habis'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {editingId === item.id ? (
                        <>
                          <button
                            onClick={() => commitEdit(item)}
                            className="rounded-lg bg-accent-primary px-3 py-1.5 text-caption font-bold uppercase tracking-wide text-text-on-accent"
                          >
                            Simpan
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="rounded-lg border border-border-subtle px-3 py-1.5 text-caption font-bold uppercase tracking-wide text-text-secondary"
                          >
                            Batal
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => setEditingItem(item)}
                            className="rounded-lg border border-border-subtle px-3 py-1.5 text-caption font-bold uppercase tracking-wide text-text-primary hover:bg-bg-secondary"
                          >
                            Ubah
                          </button>
                          <button
                            onClick={() => startEdit(item)}
                            className="rounded-lg border border-border-subtle px-3 py-1.5 text-caption font-bold uppercase tracking-wide text-text-primary hover:bg-bg-secondary"
                          >
                            Harga
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => onToggleAvailable(item)}
                        className={`rounded-lg px-3 py-1.5 text-caption font-bold uppercase tracking-wide text-text-on-accent ${
                          item.available
                            ? 'bg-status-danger hover:bg-status-danger-hover'
                            : 'bg-status-ready hover:bg-status-ready-hover'
                        }`}
                      >
                        {item.available ? 'Habis' : 'Tersedia'}
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Hapus menu ${item.name}?`)) onDelete(item)
                        }}
                        className="rounded-lg border border-border-subtle px-3 py-1.5 text-caption font-bold uppercase tracking-wide text-status-danger hover:bg-status-danger/10"
                      >
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && (
        <MenuFormModal
          title="Tambah Menu"
          initial={emptyForm}
          categories={categories}
          onClose={() => setShowAdd(false)}
          onSave={onCreate}
        />
      )}
      {editingItem && (
        <MenuFormModal
          title={`Ubah ${editingItem.name}`}
          initial={editFormData}
          categories={categories}
          onClose={() => setEditingItem(null)}
          onSave={async (data) => {
            await onSave(editingItem, data)
            setEditingItem(null)
          }}
        />
      )}
    </div>
  )
}

import { useState } from 'react'
import type { MenuCategory, MenuItem } from '@/types'
import { formatRupiah } from '@/lib/format'
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
}

const emptyForm: MenuFormData = {
  name: '',
  price: 0,
  categoryId: 0,
  description: '',
  imageUrl: '',
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
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState<string | null>(initial.imageUrl ?? null)

  function handleFileChange(file: File | undefined) {
    if (!file) return
    setForm({ ...form, image: file })
    setPreview(URL.createObjectURL(file))
  }

  async function handleSave() {
    if (!form.name.trim() || form.price <= 0 || !form.categoryId) {
      setError('Nama, harga, dan kategori wajib diisi.')
      return
    }
    setError('')
    setSaving(true)
    try {
      await onSave(form)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menyimpan')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-bg-surface p-6 shadow-modal">
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
              <label className="text-caption font-semibold uppercase tracking-wide text-text-secondary">Harga</label>
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
                        <img src={item.imageUrl} alt={item.name} className="h-10 w-10 rounded-lg object-cover" />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-bg-secondary">
                          <svg className="h-5 w-5 text-border-subtle" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 11h18" />
                            <path d="M12 11v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V11" />
                            <path d="M21 11v8a3 3 0 0 1-3 3h-3a3 3 0 0 1-3-3" />
                            <circle cx="12" cy="5" r="2" />
                          </svg>
                        </div>
                      )}
                      <div>
                        <div className="text-body font-semibold text-text-primary">{item.name}</div>
                        <div className="font-num text-caption text-text-secondary">{item.code}</div>
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
                            Edit
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
                          item.available ? 'bg-status-danger hover:bg-red-700' : 'bg-status-ready hover:bg-green-700'
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
          title={`Edit ${editingItem.name}`}
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

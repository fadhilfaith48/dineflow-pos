import { useState } from 'react'
import type { Role, User } from '@/types'
import { roleLabel } from '@/lib/roles'
import { DEFAULT_PASSWORD } from '@/lib/constants'
import { Button } from '@/components/Button'

interface StaffManagementProps {
  users: User[]
  onCreate: (input: { name: string; username: string; role: Role }) => Promise<void>
  onUpdateRole: (id: number, role: Role) => Promise<void>
  onDelete: (id: number) => Promise<void>
  onResetPassword: (id: number) => Promise<void>
}

const roles: Role[] = ['admin', 'kasir', 'pelayan', 'dapur']

const gridCols =
  'grid grid-cols-[2fr_1.6fr_1.2fr_1.2fr] items-center gap-3 px-5'

export function StaffManagement({ users, onCreate, onUpdateRole, onDelete, onResetPassword }: StaffManagementProps) {
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [role, setRole] = useState<Role>('kasir')
  const [error, setError] = useState('')

  async function handleCreate() {
    if (!name.trim() || !username.trim()) {
      setError('Nama dan username wajib diisi.')
      return
    }
    setError('')
    try {
      await onCreate({ name: name.trim(), username: username.trim(), role })
      setShowAdd(false)
      setName('')
      setUsername('')
      setRole('kasir')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menambah staf')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="text-subheading font-semibold text-text-primary">Daftar Staf ({users.length})</div>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          + Tambah Staf
        </Button>
      </div>

      {showAdd && (
        <div className="rounded-xl border border-border-subtle bg-bg-surface p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="text-body font-semibold uppercase tracking-wide text-text-secondary">Nama</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-48 rounded-lg border border-border-subtle px-3 py-2 text-body focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-tint"
              />
            </div>
            <div>
              <label className="text-body font-semibold uppercase tracking-wide text-text-secondary">Username</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 w-40 rounded-lg border border-border-subtle px-3 py-2 text-body focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-tint"
              />
            </div>
            <div>
              <label className="text-body font-semibold uppercase tracking-wide text-text-secondary">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="mt-1 rounded-lg border border-border-subtle bg-bg-surface px-3 py-2 text-body focus:border-accent-primary focus:outline-none"
              >
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {roleLabel[r]}
                  </option>
                ))}
              </select>
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

      <div className="overflow-x-auto rounded-xl border border-border-subtle bg-bg-surface shadow-card">
        <div className={`${gridCols} border-b border-border-subtle py-4 text-body font-bold uppercase tracking-wide text-text-secondary`}>
          <span>Nama</span>
          <span>Username</span>
          <span>Role</span>
          <span className="justify-self-end">Aksi</span>
        </div>
        <ul className="divide-y divide-border-subtle">
          {users.map((user) => (
            <li key={user.id} className={gridCols}>
              <span className="min-w-0 truncate text-subheading font-semibold text-text-primary">{user.name}</span>
              <span className="font-num text-body text-text-secondary">{user.username}</span>
              <select
                value={user.role}
                onChange={(e) => onUpdateRole(user.id, e.target.value as Role)}
                className="rounded-lg border border-border-subtle bg-bg-surface px-3 py-2 text-body font-semibold"
              >
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {roleLabel[r]}
                  </option>
                ))}
              </select>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    if (window.confirm(`Atur ulang password ${user.name} ke ${DEFAULT_PASSWORD}?`)) onResetPassword(user.id)
                  }}
                  className="rounded-lg border border-border-subtle px-4 py-2 text-body font-semibold text-accent-primary hover:bg-accent-tint"
                >
                  Atur Ulang
                </button>
                <button
                  onClick={() => {
                    if (window.confirm(`Hapus staf ${user.name}?`)) onDelete(user.id)
                  }}
                  className="rounded-lg border border-border-subtle px-4 py-2 text-body font-semibold text-status-danger hover:bg-status-danger/10"
                >
                  Hapus
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

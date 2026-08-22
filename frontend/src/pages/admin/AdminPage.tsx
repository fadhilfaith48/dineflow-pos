import { useEffect, useState } from 'react'
import type { MenuCategory, MenuItem, TableStatus, DiningTable, Role, User } from '@/types'
import { api } from '@/services/httpApi'
import { TopNavBar } from '@/components/TopNavBar'
import { MenuManagement, type MenuFormData } from './MenuManagement'
import { SalesReport } from './SalesReport'
import { TableManagement } from './TableManagement'
import { StaffManagement } from './StaffManagement'
import { SettingsPage } from './SettingsPage'

type Tab = 'menu' | 'meja' | 'staf' | 'laporan' | 'pengaturan'

export function AdminPage() {
  const [tab, setTab] = useState<Tab>('menu')
  const [items, setItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [tables, setTables] = useState<DiningTable[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [error, setError] = useState('')

  function loadItems() {
    api.getMenuItems().then(setItems).catch(() => setError('Gagal memuat menu.'))
  }

  function loadTables() {
    api.getTables().then(setTables).catch(() => setError('Gagal memuat meja.'))
  }

  function loadUsers() {
    api.getUsers().then(setUsers).catch(() => setError('Gagal memuat staf.'))
  }

  useEffect(() => {
    loadItems()
    api.getCategories().then(setCategories).catch(() => setError('Gagal memuat kategori.'))
    loadTables()
    loadUsers()
  }, [])

  async function handleToggleAvailable(item: MenuItem) {
    try {
      await api.updateMenuItem(item.id, { available: !item.available })
      loadItems()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal mengubah ketersediaan.')
    }
  }

  async function handleEditPrice(item: MenuItem, price: number) {
    try {
      await api.updateMenuItem(item.id, { price })
      loadItems()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal mengubah harga.')
    }
  }

  async function handleSaveMenuItem(item: MenuItem, data: MenuFormData) {
    try {
      await api.updateMenuItem(item.id, {
        name: data.name,
        price: data.price,
        categoryId: data.categoryId,
        description: data.description,
        imageUrl: data.imageUrl,
        image: data.image,
      })
      loadItems()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menyimpan menu.')
    }
  }

  async function handleCreateMenuItem(data: MenuFormData) {
    try {
      await api.createMenuItem(data)
      loadItems()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal membuat menu.')
    }
  }

  async function handleDeleteMenuItem(item: MenuItem) {
    try {
      await api.deleteMenuItem(item.id)
      loadItems()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menghapus menu.')
    }
  }

  return (
    <div className="flex h-screen flex-col">
      <TopNavBar />
      <main className="mx-auto w-full max-w-5xl flex-1 overflow-y-auto bg-bg-secondary p-6">
        {error && (
          <div className="mb-4 rounded-lg bg-status-danger/15 px-4 py-2 text-body font-semibold text-status-danger">{error}</div>
        )}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setTab('menu')}
            className={`rounded-lg px-4 py-2 text-body font-semibold transition-colors ${
              tab === 'menu' ? 'bg-accent-primary text-text-on-accent' : 'bg-bg-surface text-text-secondary'
            }`}
          >
            Manajemen Menu
          </button>
          <button
            onClick={() => setTab('meja')}
            className={`rounded-lg px-4 py-2 text-body font-semibold transition-colors ${
              tab === 'meja' ? 'bg-accent-primary text-text-on-accent' : 'bg-bg-surface text-text-secondary'
            }`}
          >
            Manajemen Meja
          </button>
          <button
            onClick={() => setTab('staf')}
            className={`rounded-lg px-4 py-2 text-body font-semibold transition-colors ${
              tab === 'staf' ? 'bg-accent-primary text-text-on-accent' : 'bg-bg-surface text-text-secondary'
            }`}
          >
            Manajemen Staf
          </button>
          <button
            onClick={() => setTab('laporan')}
            className={`rounded-lg px-4 py-2 text-body font-semibold transition-colors ${
              tab === 'laporan' ? 'bg-accent-primary text-text-on-accent' : 'bg-bg-surface text-text-secondary'
            }`}
          >
            Laporan Penjualan
          </button>
          <button
            onClick={() => setTab('pengaturan')}
            className={`rounded-lg px-4 py-2 text-body font-semibold transition-colors ${
              tab === 'pengaturan' ? 'bg-accent-primary text-text-on-accent' : 'bg-bg-surface text-text-secondary'
            }`}
          >
            Pengaturan
          </button>
        </div>

        {tab === 'menu' && (
          <MenuManagement
            items={items}
            categories={categories}
            onToggleAvailable={handleToggleAvailable}
            onEditPrice={handleEditPrice}
            onSave={handleSaveMenuItem}
            onCreate={handleCreateMenuItem}
            onDelete={handleDeleteMenuItem}
          />
        )}
        {tab === 'meja' && (
          <TableManagement
            tables={tables}
            onCreate={async (input) => {
              try {
                await api.createTable(input)
                loadTables()
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Gagal membuat meja.')
              }
            }}
            onUpdateStatus={async (id, status: TableStatus) => {
              try {
                await api.updateTable(id, { status })
                loadTables()
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Gagal mengubah status meja.')
              }
            }}
            onDelete={async (id) => {
              try {
                await api.deleteTable(id)
                loadTables()
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Gagal menghapus meja.')
              }
            }}
          />
        )}
        {tab === 'staf' && (
          <StaffManagement
            users={users}
            onCreate={async (input) => {
              try {
                await api.createUser(input)
                loadUsers()
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Gagal membuat staf.')
              }
            }}
            onUpdateRole={async (id, role: Role) => {
              try {
                await api.updateUser(id, { role })
                loadUsers()
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Gagal mengubah role staf.')
              }
            }}
            onDelete={async (id) => {
              try {
                await api.deleteUser(id)
                loadUsers()
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Gagal menghapus staf.')
              }
            }}
            onResetPassword={async (id) => {
              try {
                await api.resetUserPassword(id)
                loadUsers()
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Gagal mereset password staf.')
              }
            }}
          />
        )}
        {tab === 'laporan' && <SalesReport />}
        {tab === 'pengaturan' && <SettingsPage />}
      </main>
    </div>
  )
}

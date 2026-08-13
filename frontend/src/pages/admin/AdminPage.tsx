import { useEffect, useState } from 'react'
import type { MenuCategory, MenuItem, TableStatus, DiningTable, Role, User } from '@/types'
import { api } from '@/services/mockApi'
import { TopNavBar } from '@/components/TopNavBar'
import { MenuManagement, type MenuFormData } from './MenuManagement'
import { SalesReport } from './SalesReport'
import { TableManagement } from './TableManagement'
import { StaffManagement } from './StaffManagement'

type Tab = 'menu' | 'meja' | 'staf' | 'laporan'

export function AdminPage() {
  const [tab, setTab] = useState<Tab>('menu')
  const [items, setItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [tables, setTables] = useState<DiningTable[]>([])
  const [users, setUsers] = useState<User[]>([])

  function loadItems() {
    api.getMenuItems().then(setItems)
  }

  function loadTables() {
    api.getTables().then(setTables)
  }

  function loadUsers() {
    api.getUsers().then(setUsers)
  }

  useEffect(() => {
    loadItems()
    api.getCategories().then(setCategories)
    loadTables()
    loadUsers()
  }, [])

  async function handleToggleAvailable(item: MenuItem) {
    await api.updateMenuItem(item.id, { available: !item.available })
    loadItems()
  }

  async function handleEditPrice(item: MenuItem, price: number) {
    await api.updateMenuItem(item.id, { price })
    loadItems()
  }

  async function handleSaveMenuItem(item: MenuItem, data: MenuFormData) {
    await api.updateMenuItem(item.id, {
      name: data.name,
      price: data.price,
      categoryId: data.categoryId,
      description: data.description,
      imageUrl: data.imageUrl,
    })
    loadItems()
  }

  async function handleCreateMenuItem(data: MenuFormData) {
    await api.createMenuItem(data)
    loadItems()
  }

  async function handleDeleteMenuItem(item: MenuItem) {
    await api.deleteMenuItem(item.id)
    loadItems()
  }

  return (
    <div className="flex h-screen flex-col">
      <TopNavBar />
      <main className="mx-auto w-full max-w-5xl flex-1 overflow-y-auto bg-bg-secondary p-6">
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
              await api.createTable(input)
              loadTables()
            }}
            onUpdateStatus={async (id, status: TableStatus) => {
              await api.updateTable(id, { status })
              loadTables()
            }}
            onDelete={async (id) => {
              await api.deleteTable(id)
              loadTables()
            }}
          />
        )}
        {tab === 'staf' && (
          <StaffManagement
            users={users}
            onCreate={async (input) => {
              await api.createUser(input)
              loadUsers()
            }}
            onUpdateRole={async (id, role: Role) => {
              await api.updateUser(id, { role })
              loadUsers()
            }}
            onDelete={async (id) => {
              await api.deleteUser(id)
              loadUsers()
            }}
          />
        )}
        {tab === 'laporan' && <SalesReport />}
      </main>
    </div>
  )
}

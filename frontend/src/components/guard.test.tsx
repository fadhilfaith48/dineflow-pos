import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { LoginPage } from '@/pages/auth/LoginPage'
import { roleHome } from '@/lib/roles'
import type { User } from '@/types'

const STORAGE_KEY = 'dineflow-user'

function seedUser(user: User | null) {
  if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
  else localStorage.removeItem(STORAGE_KEY)
}

describe('roleHome', () => {
  it('memetakan tiap role ke halaman dashboard-nya', () => {
    expect(roleHome).toEqual({
      kasir: '/kasir',
      pelayan: '/pelayan',
      dapur: '/kitchen',
      admin: '/admin',
    })
  })
})

function renderProtected() {
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={['admin']}>
                <div>Admin Dashboard</div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/kasir"
            element={
              <ProtectedRoute roles={['kasir']}>
                <div>Kasir Dashboard</div>
              </ProtectedRoute>
            }
          />
          <Route path="/pelayan" element={<div>Pelayan Page</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute', () => {
  beforeEach(() => seedUser(null))

  it('redirect ke /login bila belum login', () => {
    renderProtected()
    expect(screen.getByText('Login Page')).toBeInTheDocument()
  })

  it('mengizinkan akses bila role sesuai', () => {
    seedUser({ id: 1, name: 'Admin', username: 'admin', role: 'admin' })
    renderProtected()
    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument()
  })

  it('redirect pelayan yang memaksa masuk /admin ke roleHome-nya', () => {
    seedUser({ id: 3, name: 'Pelayan', username: 'pelayan', role: 'pelayan' })
    renderProtected()
    expect(screen.getByText('Pelayan Page')).toBeInTheDocument()
  })
})

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin" element={<div>Admin Dashboard</div>} />
          <Route path="/kasir" element={<div>Kasir Dashboard</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('LoginPage — redirect sesuai role', () => {
  beforeEach(() => seedUser(null))

  it('setelah login admin diarahkan ke /admin', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByPlaceholderText('mis. kasir'), 'admin')
    await user.type(screen.getByPlaceholderText('••••'), '1234')
    await user.click(screen.getByRole('button', { name: 'Masuk' }))

    expect(await screen.findByText('Admin Dashboard')).toBeInTheDocument()
  })

  it('setelah login kasir diarahkan ke /kasir', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByPlaceholderText('mis. kasir'), 'kasir')
    await user.type(screen.getByPlaceholderText('••••'), '1234')
    await user.click(screen.getByRole('button', { name: 'Masuk' }))

    expect(await screen.findByText('Kasir Dashboard')).toBeInTheDocument()
  })
})
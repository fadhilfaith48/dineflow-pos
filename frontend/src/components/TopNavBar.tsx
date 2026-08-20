import { useState } from 'react'
import { useNavigate, NavLink } from 'react-router-dom'
import type { Role } from '@/types'
import { useAuth } from '@/context/AuthContext'
import { roleLabel } from '@/lib/roles'
import { ChangePasswordModal } from './ChangePasswordModal'

const navItems: { to: string; label: string; roles: Role[] }[] = [
  { to: '/kasir', label: 'Kasir', roles: ['kasir', 'admin'] },
  { to: '/kitchen', label: 'Dapur', roles: ['dapur', 'admin'] },
  { to: '/pelayan', label: 'Pelayan', roles: ['pelayan', 'admin'] },
  { to: '/admin', label: 'Admin', roles: ['admin'] },
]

export function TopNavBar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [showChangePassword, setShowChangePassword] = useState(false)
  const visible = navItems.filter((item) => user && item.roles.includes(user.role))

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center justify-between border-b border-border-subtle bg-bg-surface px-6">
      <div className="font-num text-display font-bold tracking-tighter text-text-primary">
        DineFlow<span className="text-accent-primary">POS</span>
      </div>
      <nav className="flex h-full items-end gap-1">
        {visible.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `px-4 py-3 text-body font-semibold transition-colors border-b-2 ${
                isActive
                  ? 'border-accent-primary text-accent-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      {user && (
        <div className="flex items-center gap-4">
          <span className="inline-block h-2 w-2 rounded-full bg-status-ready" />
          <div className="text-right">
            <div className="text-caption font-semibold text-text-primary">{user.name}</div>
            <div className="text-caption uppercase tracking-wide text-text-secondary">
              {roleLabel[user.role]}
            </div>
          </div>
          <button
            onClick={() => setShowChangePassword(true)}
            className="rounded-lg border border-border-subtle px-3 py-1.5 text-caption font-semibold text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary"
          >
            Ganti Password
          </button>
          <button
            onClick={handleLogout}
            className="rounded-lg border border-border-subtle px-3 py-1.5 text-caption font-semibold text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary"
          >
            Keluar
          </button>
        </div>
      )}
      <ChangePasswordModal
        open={showChangePassword}
        onClose={() => setShowChangePassword(false)}
        onChanged={() => {}}
      />
    </header>
  )
}

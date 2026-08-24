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
  const [menuOpen, setMenuOpen] = useState(false)
  const visible = navItems.filter((item) => user && item.roles.includes(user.role))
  const initials = user ? user.name.charAt(0).toUpperCase() : ''

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center justify-between border-b border-border-subtle bg-bg-surface px-4 md:px-6">
      <div className="font-num text-heading font-bold tracking-tighter text-text-primary md:text-display">
        DineFlow<span className="text-accent-primary">POS</span>
      </div>

      {/* Link navigasi: hanya desktop — di mobile tiap role cukup halamannya sendiri */}
      <nav className="hidden h-full items-end gap-1 md:flex">
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
        <div className="flex items-center gap-2 md:gap-4">
          {/* Hamburger: hanya mobile & hanya jika user punya >1 halaman (admin) */}
          {visible.length > 1 && (
            <div className="relative md:hidden">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="Menu navigasi"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border-subtle text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              {menuOpen && (
                <nav className="absolute right-0 top-full z-50 mt-1 w-40 rounded-xl border border-border-subtle bg-bg-surface py-1 shadow-dropdown">
                  {visible.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setMenuOpen(false)}
                      className={({ isActive }) =>
                        `block px-4 py-2.5 text-body font-semibold transition-colors ${
                          isActive
                            ? 'bg-accent-tint text-accent-primary'
                            : 'text-text-primary hover:bg-bg-secondary'
                        }`
                      }
                    >
                      {item.label}
                    </NavLink>
                  ))}
                </nav>
              )}
            </div>
          )}

          <span className="hidden h-2 w-2 rounded-full bg-status-ready sm:inline-block" />
          <div className="hidden text-right md:block">
            <div className="text-caption font-semibold text-text-primary">{user.name}</div>
            <div className="text-caption uppercase tracking-wide text-text-secondary">
              {roleLabel[user.role]}
            </div>
          </div>
          {/* Avatar inisial: pengganti nama+role di mobile */}
          <div
            aria-hidden
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-tint text-caption font-bold text-accent-primary md:hidden"
          >
            {initials}
          </div>
          <button
            onClick={() => setShowChangePassword(true)}
            aria-label="Ganti Password"
            title="Ganti Password"
            className="flex items-center rounded-lg border border-border-subtle px-2 py-2 text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary md:px-3 md:py-1.5"
          >
            <svg className="h-4 w-4 md:hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span className="hidden text-caption font-semibold md:inline">Ganti Password</span>
          </button>
          <button
            onClick={handleLogout}
            aria-label="Keluar"
            title="Keluar"
            className="flex items-center rounded-lg border border-border-subtle px-2 py-2 text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary md:px-3 md:py-1.5"
          >
            <svg className="h-4 w-4 md:hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span className="hidden text-caption font-semibold md:inline">Keluar</span>
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

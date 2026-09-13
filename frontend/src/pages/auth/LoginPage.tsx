import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { roleHome } from '@/lib/roles'
import { DEFAULT_PASSWORD } from '@/lib/constants'
import { Button } from '@/components/Button'

interface RoleOption {
  username: string
  label: string
  icon: ReactNode
}

const roleOptions: RoleOption[] = [
  {
    username: 'admin',
    label: 'Admin',
    icon: (
      <img
        src="/Admin.png"
        alt="Ikon Admin"
        className="h-3.5 w-3.5 object-contain"
      />
    ),
  },
  {
    username: 'kasir',
    label: 'Kasir',
    icon: (
      <img
        src="/kasir.png"
        alt="Ikon Kasir"
        className="h-3.5 w-3.5 object-contain"
      />
    ),
  },
  {
    username: 'pelayan',
    label: 'Pelayan',
    icon: (
      <img
        src="/Pelayan.png"
        alt="Ikon Pelayan"
        className="h-3.5 w-3.5 object-contain"
      />
    ),
  },
  {
    username: 'dapur',
    label: 'Dapur',
    icon: (
      <img
        src="/Dapur.png"
        alt="Ikon Dapur"
        className="h-3.5 w-3.5 object-contain"
      />
    ),
  },
]

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-[17px] w-[17px]">
      <path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12z" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-[17px] w-[17px]">
      <path d="M2 4l20 16M6.9 5.6A10.9 10.9 0 001.5 12S5 19 12 19c1.4 0 2.7-.3 3.9-.9M9.9 6.6C10.6 6.4 11.3 6.2 12 6.2c7 0 10.5 5.8 10.5 5.8-.9 1.5-2.3 3-4.1 4.1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [activeRole, setActiveRole] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(username.trim(), password)
      navigate(roleHome[user.role], { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Masuk gagal')
    } finally {
      setLoading(false)
    }
  }

  function selectRole(roleUsername: string) {
    setUsername(roleUsername)
    setPassword(DEFAULT_PASSWORD)
    setActiveRole(roleUsername)
  }

  const roleButtonBase =
    'flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2.5 text-caption font-semibold transition-colors'

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-secondary p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <img src="/favicon.png" alt="Logo DineFlow" className="mx-auto mb-4 h-24 w-auto object-contain" />
          <h1 className="font-num text-display font-bold tracking-tighter text-text-primary">
            DineFlow<span className="text-accent-primary">POS</span>
          </h1>
          <p className="mt-1 text-caption text-text-secondary">Masuk untuk memulai sesi kerja</p>
        </div>

        <div className="rounded-xl border border-border-subtle bg-bg-surface p-6 shadow-card">
          <p className="mb-3 text-caption font-semibold uppercase tracking-wide text-text-secondary">
            Pilih peran untuk mengisi otomatis
          </p>
          <div className="grid grid-cols-2 gap-2">
            {roleOptions.map((role) => {
              const active = activeRole === role.username
              return (
                <button
                  key={role.username}
                  type="button"
                  aria-pressed={active}
                  onClick={() => selectRole(role.username)}
                  className={`${roleButtonBase} ${
                    active
                      ? 'border-accent-primary bg-accent-primary text-text-on-accent'
                      : 'border-border-subtle bg-bg-surface text-text-primary hover:border-accent-primary hover:text-accent-primary'
                  }`}
                >
                  <span className="h-3.5 w-3.5">{role.icon}</span>
                  {role.label}
                </button>
              )
            })}
          </div>

          <form onSubmit={handleSubmit} className="mt-5">
            <label htmlFor="username" className="text-caption font-semibold uppercase tracking-wide text-text-secondary">
              Username
            </label>
            <input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              placeholder="mis. kasir"
              className="mt-1 mb-4 w-full rounded-lg border border-border-subtle bg-bg-secondary px-3.5 py-2.5 text-body text-text-primary outline-none transition-colors placeholder:text-text-secondary/60 focus:border-accent-primary focus:bg-bg-surface focus:ring-[3px] focus:ring-accent-tint"
            />

            <label htmlFor="password" className="text-caption font-semibold uppercase tracking-wide text-text-secondary">
              Password
            </label>
            <div className="relative mt-1">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="••••"
                className="w-full rounded-lg border border-border-subtle bg-bg-secondary py-2.5 pl-3.5 pr-12 text-body text-text-primary outline-none transition-colors placeholder:text-text-secondary/60 focus:border-accent-primary focus:bg-bg-surface focus:ring-[3px] focus:ring-accent-tint"
              />
              <button
                type="button"
                aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary"
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>

            {error && (
              <p className="mt-4 rounded-lg bg-status-danger/10 px-3.5 py-2 text-caption text-status-danger">
                {error}
              </p>
            )}

            <Button type="submit" fullWidth className="mt-5" disabled={loading}>
              {loading ? 'Masuk...' : 'Masuk'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
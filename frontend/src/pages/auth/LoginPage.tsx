import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { roleHome } from '@/lib/roles'
import { MOCK_PASSWORD } from '@/services/mockData'
import { Button } from '@/components/Button'

const demoAccounts = [
  { username: 'admin', label: 'Admin' },
  { username: 'kasir', label: 'Kasir' },
  { username: 'pelayan', label: 'Pelayan' },
  { username: 'dapur', label: 'Dapur' },
]

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
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
      setError(err instanceof Error ? err.message : 'Login gagal')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-secondary p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="font-num text-display font-bold tracking-tighter text-text-primary">
            DineFlow<span className="text-accent-primary">POS</span>
          </div>
          <p className="mt-1 text-caption text-text-secondary">Masuk untuk memulai sesi kerja</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-xl border border-border-subtle bg-bg-surface p-6 shadow-card">
          <label className="text-caption font-semibold uppercase tracking-wide text-text-secondary">
            Username
          </label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            placeholder="mis. kasir"
            className="mt-1 mb-4 w-full rounded-lg border border-border-subtle px-4 py-3 text-body focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-tint"
          />

          <label className="text-caption font-semibold uppercase tracking-wide text-text-secondary">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            placeholder="••••"
            className="mt-1 w-full rounded-lg border border-border-subtle px-4 py-3 text-body focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-tint"
          />

          {error && (
            <p className="mt-3 rounded-lg bg-status-danger/10 px-3 py-2 text-caption text-status-danger">
              {error}
            </p>
          )}

          <Button type="submit" fullWidth className="mt-5" disabled={loading}>
            {loading ? 'Masuk...' : 'Masuk'}
          </Button>
        </form>

        <div className="mt-4 rounded-xl border border-border-subtle bg-bg-surface p-4">
          <p className="text-caption font-semibold uppercase tracking-wide text-text-secondary">
            Akun demo (password: {MOCK_PASSWORD})
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {demoAccounts.map((acc) => (
              <button
                key={acc.username}
                type="button"
                onClick={() => {
                  setUsername(acc.username)
                  setPassword(MOCK_PASSWORD)
                }}
                className="rounded-lg border border-border-subtle px-3 py-2 text-caption font-semibold text-text-primary transition-colors hover:bg-accent-tint hover:text-accent-primary"
              >
                {acc.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

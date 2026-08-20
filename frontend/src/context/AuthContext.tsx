import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { User } from '@/types'
import { AUTH_UNAUTHORIZED_EVENT } from '@/services/httpApi'
import { api } from '@/services/httpApi'
import { clearToken } from '@/services/httpApi'

interface AuthContextValue {
  user: User | null
  login: (username: string, password: string) => Promise<User>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

const STORAGE_KEY = 'dineflow-user'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    try {
      return JSON.parse(raw) as User
    } catch {
      return null
    }
  })

  const login = useCallback(async (username: string, password: string) => {
    const loggedIn = await api.login(username, password)
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(loggedIn))
    setUser(loggedIn)
    return loggedIn
  }, [])

  const logout = useCallback(() => {
    api.logout().catch(() => {})
    clearToken()
    sessionStorage.removeItem(STORAGE_KEY)
    setUser(null)
  }, [])

  useEffect(() => {
    const handleUnauthorized = () => {
      sessionStorage.removeItem(STORAGE_KEY)
      setUser(null)
    }
    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized)
    return () => window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized)
  }, [])

  const value = useMemo(() => ({ user, login, logout }), [user, login, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth harus dipakai di dalam <AuthProvider>')
  return ctx
}

import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import type { Role } from '@/types'
import { useAuth } from '@/context/AuthContext'
import { roleHome } from '@/lib/roles'

interface ProtectedRouteProps {
  roles: Role[]
  children: ReactNode
}

export function ProtectedRoute({ roles, children }: ProtectedRouteProps) {
  const { user } = useAuth()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!roles.includes(user.role)) {
    return <Navigate to={roleHome[user.role]} replace />
  }

  return <>{children}</>
}

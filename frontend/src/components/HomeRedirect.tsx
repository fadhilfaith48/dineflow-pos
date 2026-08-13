import { Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { roleHome } from '@/lib/roles'

export function HomeRedirect() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={roleHome[user.role]} replace />
}

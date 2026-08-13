import type { Role } from '@/types'

export const roleHome: Record<Role, string> = {
  kasir: '/kasir',
  pelayan: '/pelayan',
  dapur: '/kitchen',
  admin: '/admin',
}

export const roleLabel: Record<Role, string> = {
  kasir: 'Kasir',
  pelayan: 'Pelayan',
  dapur: 'Dapur',
  admin: 'Admin',
}

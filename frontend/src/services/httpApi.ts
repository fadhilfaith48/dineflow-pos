import type {
  Api,
  CreateMenuItemInput,
  CreateOrderPayload,
  PaymentPayload,
} from './api'
import type {
  DiningTable,
  MenuCategory,
  MenuItem,
  Order,
  Payment,
  Role,
  SalesPeriod,
  SalesSummary,
  Settings,
  User,
} from '@/types'

/**
 * Implementasi kontrak `Api` memakai fetch ke backend Laravel.
 * Response Laravel dibungkus `{ data: ... }` (API Resource) → di-unwrap di sini
 * sehingga UI tetap menerima bentuk tipe `types/index.ts`. UI tidak berubah.
 */
const BASE_URL = import.meta.env.VITE_API_URL ?? '/api'

const TOKEN_KEY = 'dineflow-token'
const USER_KEY = 'dineflow-user'

export const AUTH_UNAUTHORIZED_EVENT = 'dineflow:unauthorized'

export function clearToken(): void {
  sessionStorage.removeItem(TOKEN_KEY)
}

export function clearAuth(): void {
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(USER_KEY)
}

function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY)
}

function setToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token)
}

function unwrap<T>(json: { data: T }): T {
  return json.data
}

function errorMessage(body: { message?: string; errors?: Record<string, string[]> }): string {
  if (body.errors) {
    const first = Object.values(body.errors)[0]
    if (first?.length) return first[0]
  }
  return body.message ?? 'Terjadi kesalahan'
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  headers.set('Accept', 'application/json')
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers })

  if (res.status === 401) {
    clearAuth()
    window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT))
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      message?: string
      errors?: Record<string, string[]>
    }
    throw new Error(errorMessage(body))
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

function jsonBody(data: unknown): RequestInit {
  return { body: JSON.stringify(data) }
}

function appendScalar(formData: FormData, data: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && value !== null) {
      formData.append(key, String(value))
    }
  }
}

export class HttpApi implements Api {
  async login(username: string, password: string): Promise<User> {
    const json = await request<{ token: string; user: User }>('/login', {
      method: 'POST',
      ...jsonBody({ username, password }),
    })
    setToken(json.token)
    return json.user
  }

  async logout(): Promise<void> {
    try {
      await request('/logout', { method: 'POST' })
    } finally {
      clearToken()
    }
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await request('/change-password', {
      method: 'POST',
      ...jsonBody({ currentPassword, newPassword, newPassword_confirmation: newPassword }),
    })
  }

  async getCategories(): Promise<MenuCategory[]> {
    return request<{ data: MenuCategory[] }>('/categories').then(unwrap)
  }

  async getMenuItems(categoryId?: number): Promise<MenuItem[]> {
    const query = categoryId !== undefined ? `?categoryId=${categoryId}` : ''
    return request<{ data: MenuItem[] }>(`/menu-items${query}`).then(unwrap)
  }

  async getTables(): Promise<DiningTable[]> {
    return request<{ data: DiningTable[] }>('/tables').then(unwrap)
  }

  async createTable(input: { number: string; seats: number }): Promise<DiningTable> {
    return request<{ data: DiningTable }>('/tables', {
      method: 'POST',
      ...jsonBody(input),
    }).then(unwrap)
  }

  async updateTable(id: number, data: Partial<DiningTable>): Promise<DiningTable> {
    return request<{ data: DiningTable }>(`/tables/${id}`, {
      method: 'PUT',
      ...jsonBody(data),
    }).then(unwrap)
  }

  async deleteTable(id: number): Promise<void> {
    await request(`/tables/${id}`, { method: 'DELETE' })
  }

  async getOrders(): Promise<Order[]> {
    return request<{ data: Order[] }>('/orders').then(unwrap)
  }

  async createOrder(payload: CreateOrderPayload): Promise<Order> {
    return request<{ data: Order }>('/orders', {
      method: 'POST',
      ...jsonBody(payload),
    }).then(unwrap)
  }

  async confirmOrder(orderId: number): Promise<Order> {
    return request<{ data: Order }>(`/orders/${orderId}/confirm`, {
      method: 'PATCH',
    }).then(unwrap)
  }

  async updateItemStatus(
    orderId: number,
    itemId: number,
    status: Order['items'][number]['status'],
  ): Promise<Order> {
    return request<{ data: Order }>(`/orders/${orderId}/items/${itemId}`, {
      method: 'PATCH',
      ...jsonBody({ status }),
    }).then(unwrap)
  }

  async processPayment(payload: PaymentPayload): Promise<Payment> {
    return request<{ data: Payment }>(`/orders/${payload.orderId}/payments`, {
      method: 'POST',
      ...jsonBody({ method: payload.method, cashReceived: payload.cashReceived }),
    }).then(unwrap)
  }

  async createMenuItem(input: CreateMenuItemInput): Promise<MenuItem> {
    if (input.image instanceof File) {
      const formData = new FormData()
      appendScalar(formData, {
        name: input.name,
        price: input.price,
        categoryId: input.categoryId,
        description: input.description ?? '',
      })
      formData.append('image', input.image)
      return request<{ data: MenuItem }>('/menu-items', {
        method: 'POST',
        body: formData,
      }).then(unwrap)
    }
    return request<{ data: MenuItem }>('/menu-items', {
      method: 'POST',
      ...jsonBody({
        name: input.name,
        price: input.price,
        categoryId: input.categoryId,
        description: input.description,
        imageUrl: input.imageUrl,
      }),
    }).then(unwrap)
  }

  async updateMenuItem(
    id: number,
    data: Partial<MenuItem> & { image?: File },
  ): Promise<MenuItem> {
    const { image, ...scalars } = data
    if (image instanceof File) {
      const formData = new FormData()
      formData.append('_method', 'PUT')
      appendScalar(formData, scalars)
      formData.append('image', image)
      return request<{ data: MenuItem }>(`/menu-items/${id}`, {
        method: 'POST',
        body: formData,
      }).then(unwrap)
    }
    return request<{ data: MenuItem }>(`/menu-items/${id}`, {
      method: 'PUT',
      ...jsonBody(scalars),
    }).then(unwrap)
  }

  async deleteMenuItem(id: number): Promise<void> {
    await request(`/menu-items/${id}`, { method: 'DELETE' })
  }

  async getUsers(): Promise<User[]> {
    return request<{ data: User[] }>('/users').then(unwrap)
  }

  async createUser(input: { name: string; username: string; role: Role }): Promise<User> {
    return request<{ data: User }>('/users', {
      method: 'POST',
      ...jsonBody(input),
    }).then(unwrap)
  }

  async updateUser(id: number, data: Partial<User>): Promise<User> {
    return request<{ data: User }>(`/users/${id}`, {
      method: 'PUT',
      ...jsonBody(data),
    }).then(unwrap)
  }

  async deleteUser(id: number): Promise<void> {
    await request(`/users/${id}`, { method: 'DELETE' })
  }

  async resetUserPassword(id: number): Promise<void> {
    await request(`/users/${id}/reset-password`, { method: 'POST' })
  }

  async getSalesSummary(period?: SalesPeriod): Promise<SalesSummary> {
    const query = period ? `?period=${period}` : ''
    return request<SalesSummary>(`/sales-summary${query}`)
  }

  async getSettings(): Promise<Settings> {
    return request<Settings>('/settings')
  }

  async updateSettings(data: Partial<Settings>): Promise<Settings> {
    return request<Settings>('/settings', {
      method: 'PUT',
      ...jsonBody(data),
    })
  }

  async uploadLogo(file: File): Promise<{ logoUrl: string }> {
    const formData = new FormData()
    formData.append('logo', file)
    return request<{ logoUrl: string }>('/settings/logo', {
      method: 'POST',
      body: formData,
    })
  }

  async exportSalesReport(period?: SalesPeriod): Promise<Blob> {
    const query = period ? `?period=${period}` : ''
    const headers = new Headers()
    headers.set('Accept', 'text/csv')
    const token = getToken()
    if (token) headers.set('Authorization', `Bearer ${token}`)
    const res = await fetch(`${BASE_URL}/sales-summary/export${query}`, { headers })
    if (!res.ok) throw new Error('Gagal export laporan')
    return res.blob()
  }
}

/** Instance API tunggal yang dipakai seluruh aplikasi (kini dari Laravel). */
export const api: Api = new HttpApi()
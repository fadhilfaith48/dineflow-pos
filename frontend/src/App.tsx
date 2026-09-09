import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { HomeRedirect } from '@/components/HomeRedirect'
import { PlaceholderPage } from '@/pages/PlaceholderPage'

const LoginPage = lazy(() => import('@/pages/auth/LoginPage'))
const KasirPage = lazy(() => import('@/pages/kasir/KasirPage'))
const KitchenPage = lazy(() => import('@/pages/kitchen/KitchenPage'))
const PelayanPage = lazy(() => import('@/pages/pelayan/PelayanPage'))
const MenuPage = lazy(() => import('@/pages/menu/MenuPage'))
const OrderTrackingPage = lazy(() => import('@/pages/order/OrderTrackingPage'))
const AdminPage = lazy(() => import('@/pages/admin/AdminPage'))

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense
          fallback={
            <div className="flex min-h-screen items-center justify-center bg-bg-primary">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent-primary border-t-transparent" />
            </div>
          }
        >
          <Routes>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/kasir"
            element={
              <ProtectedRoute roles={['kasir', 'admin']}>
                <KasirPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/kitchen"
            element={
              <ProtectedRoute roles={['dapur', 'admin']}>
                <KitchenPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pelayan"
            element={
              <ProtectedRoute roles={['pelayan', 'admin']}>
                <PelayanPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminPage />
              </ProtectedRoute>
            }
          />

          <Route path="/menu/:table" element={<MenuPage />} />
          <Route path="/order/:orderNumber" element={<OrderTrackingPage />} />
          <Route
            path="*"
            element={<PlaceholderPage title="404" description="Halaman tidak ditemukan." />}
          />
        </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  )
}

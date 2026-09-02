import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { HomeRedirect } from '@/components/HomeRedirect'
import { LoginPage } from '@/pages/auth/LoginPage'
import { KasirPage } from '@/pages/kasir/KasirPage'
import { KitchenPage } from '@/pages/kitchen/KitchenPage'
import { PelayanPage } from '@/pages/pelayan/PelayanPage'
import { MenuPage } from '@/pages/menu/MenuPage'
import { OrderTrackingPage } from '@/pages/order/OrderTrackingPage'
import { AdminPage } from '@/pages/admin/AdminPage'
import { PlaceholderPage } from '@/pages/PlaceholderPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
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
      </AuthProvider>
    </BrowserRouter>
  )
}

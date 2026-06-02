import { Provider } from 'react-redux'
import { store } from './store/store'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'

// Auth
import Login from './Auth/Login'
import RequireAuth from './routes/RequireAuth'
import PersistLogin from './routes/PersistLogin'

// Layout
import Layout from './components/layout/layout'

// Public
import OrderLanding from './pages/public/OrderLanding'

// Errors
import NotFound from './pages/errors/NotFound'
import Forbidden from './pages/errors/Forbidden'
import SuspendedAccount from './pages/errors/SuspendedAccount'

// Admin
import AdminDashboard   from './pages/admin/AdminDashboard'
import AllCommandes     from './pages/admin/AllCommandes'
import AllClients       from './pages/admin/AllClients'
import ClientCommandes  from './pages/admin/ClientCommandes'
import UnpaidPage       from './pages/admin/UnpaidPage'
import UserManagement   from './pages/admin/UserManagement'
import CatalogPage      from './pages/admin/CatalogPage'
import NotificationsPage from './pages/admin/NotificationsPage'
import SettingsPage     from './pages/admin/SettingsPage'

// Shared order detail
import OrderDetail from './pages/shared/OrderDetail'

// Employe
import EmployeDashboard  from './pages/employe/EmployeDashboard'
import EmployeCommandes  from './pages/employe/EmployeCommandes'
import ReturnedOrders    from './pages/employe/ReturnedOrders'

// Livreur
import LivreurDashboard    from './pages/livreur/LivreurDashboard'
import ReadyForDelivery    from './pages/livreur/ReadyForDelivery'
import DeliveryDetails     from './pages/livreur/DeliveryDetails'
import CanceledDeliveries  from './pages/livreur/CanceledDeliveries'
import LivreurOrders       from './pages/livreur/LivreurOrders'

import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/order" element={<OrderLanding />} />
            <Route path="/compte-suspendu" element={<SuspendedAccount />} />
            <Route path="/404" element={<NotFound />} />
            <Route path="/interdit" element={<Forbidden />} />

            <Route element={<PersistLogin />}>
              {/* Login */}
              <Route path="/" element={<Login />} />

              {/* Layout wraps all authenticated routes */}
              <Route element={<Layout />}>

                {/* ── Admin ── */}
                <Route element={<RequireAuth allowedRoles={['admin']} />}>
                  <Route path="/admin/dashboard"        element={<AdminDashboard />} />
                  <Route path="/admin/commandes"        element={<AllCommandes />} />
                  <Route path="/admin/commandes/:id"    element={<OrderDetail />} />
                  <Route path="/admin/clients"          element={<AllClients />} />
                  <Route path="/admin/clients/:clientId" element={<ClientCommandes />} />
                  <Route path="/admin/unpaid"           element={<UnpaidPage />} />
                  <Route path="/admin/users-management" element={<UserManagement />} />
                  <Route path="/admin/catalog"          element={<CatalogPage />} />
                  <Route path="/admin/settings"         element={<SettingsPage />} />
                </Route>

                {/* ── Shared (admin + employe + livreur) ── */}
                <Route element={<RequireAuth allowedRoles={['admin', 'employe', 'livreur']} />}>
                  <Route path="/notifications"  element={<NotificationsPage />} />
                  <Route path="/orders/:id"     element={<OrderDetail />} />
                </Route>

                {/* ── Employe ── */}
                <Route element={<RequireAuth allowedRoles={['employe']} />}>
                  <Route path="/employe/dashboard"          element={<EmployeDashboard />} />
                  <Route path="/employe/commandes"          element={<EmployeCommandes />} />
                  <Route path="/employe/commandes/:id"      element={<OrderDetail />} />
                  <Route path="/employe/clients"            element={<AllClients />} />
                  <Route path="/employe/clients/:clientId"  element={<ClientCommandes />} />
                  <Route path="/employe/retours"            element={<ReturnedOrders />} />
                </Route>

                {/* ── Livreur ── */}
                <Route element={<RequireAuth allowedRoles={['livreur']} />}>
                  <Route path="/livreur"            element={<LivreurDashboard />} />
                  <Route path="/livreur/delivery"   element={<ReadyForDelivery />} />
                  <Route path="/livreur/delivery/:id" element={<DeliveryDetails />} />
                  <Route path="/livreur/canceled"   element={<CanceledDeliveries />} />
                  <Route path="/livreur/orders"     element={<LivreurOrders />} />
                  <Route path="/livreur/map"        element={<NotFound />} />
                  <Route path="/livreur/clients"    element={<AllClients />} />
                </Route>

              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/404" replace />} />
          </Routes>
        </BrowserRouter>

        <ToastContainer
          position="bottom-right"
          autoClose={2000}
          hideProgressBar
          newestOnTop
          closeOnClick
          pauseOnHover
          theme="light"
          closeButton={false}
        />
      </Provider>
    </QueryClientProvider>
  )
}

export default App

import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AccountsPage } from '@/features/accounts/AccountsPage'
import { AuthPage } from '@/features/auth/AuthPage'
import { AuthProvider, useAuth } from '@/features/auth/AuthContext'
import { CategoriesPage } from '@/features/categories/CategoriesPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { TransactionsPage } from '@/features/transactions/TransactionsPage'
import { AppShell, PantallaCargando } from '@/routes/AppShell'

function RutaProtegida({ children }: { children: React.ReactNode }) {
  const { user, cargando } = useAuth()
  const location = useLocation()

  // Mientras se canjea la cookie de refresco no se sabe si hay sesion. Mandar
  // al login aqui expulsaria al usuario en cada recarga de pagina.
  if (cargando) return <PantallaCargando />

  if (!user) {
    return <Navigate to="/entrar" replace state={{ from: location.pathname }} />
  }

  return <>{children}</>
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/entrar" element={<AuthPage />} />
          <Route
            element={
              <RutaProtegida>
                <AppShell />
              </RutaProtegida>
            }
          >
            <Route path="/" element={<DashboardPage />} />
            <Route path="/transacciones" element={<TransactionsPage />} />
            <Route path="/cuentas" element={<AccountsPage />} />
            <Route path="/categorias" element={<CategoriesPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

import {
  ArrowLeftRight,
  LayoutDashboard,
  LogOut,
  Menu,
  Tags,
  Wallet,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { Button, Spinner } from '@/components/ui'
import { useAuth } from '@/features/auth/AuthContext'
import { cn } from '@/lib/utils'

const NAVEGACION = [
  { a: '/', etiqueta: 'Tablero', Icono: LayoutDashboard },
  { a: '/transacciones', etiqueta: 'Movimientos', Icono: ArrowLeftRight },
  { a: '/cuentas', etiqueta: 'Cuentas', Icono: Wallet },
  { a: '/categorias', etiqueta: 'Categorías', Icono: Tags },
]

export function AppShell() {
  const { user, logout } = useAuth()
  const [menuAbierto, setMenuAbierto] = useState(false)

  return (
    <div className="min-h-screen bg-muted/40">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r bg-card transition-transform lg:translate-x-0',
          menuAbierto ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-14 items-center justify-between border-b px-5">
          <span className="font-semibold tracking-tight">Finanzas</span>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMenuAbierto(false)}
            aria-label="Cerrar menú"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {NAVEGACION.map(({ a, etiqueta, Icono }) => (
            <NavLink
              key={a}
              to={a}
              end={a === '/'}
              onClick={() => setMenuAbierto(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )
              }
            >
              <Icono className="h-4 w-4" />
              {etiqueta}
            </NavLink>
          ))}
        </nav>

        <div className="border-t p-3">
          <div className="mb-2 px-3">
            <p className="truncate text-sm font-medium">{user?.nombre}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground"
            onClick={() => void logout()}
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </Button>
        </div>
      </aside>

      {menuAbierto && (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setMenuAbierto(false)}
        />
      )}

      <div className="lg:pl-60">
        <header className="flex h-14 items-center gap-3 border-b bg-card px-4 lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMenuAbierto(true)}
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <span className="font-semibold">Finanzas</span>
        </header>

        <main className="p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export function PantallaCargando() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner className="h-8 w-8" />
    </div>
  )
}

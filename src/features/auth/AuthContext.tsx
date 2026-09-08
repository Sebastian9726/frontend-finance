import { useQueryClient } from '@tanstack/react-query'
import { createContext, use, useCallback, useEffect, useMemo, useState } from 'react'
import { api, setAccessToken, setOnSessionLost } from '@/lib/api'
import type { TokenResponse, User } from '@/lib/types'

interface AuthState {
  user: User | null
  cargando: boolean
  login: (email: string, password: string) => Promise<void>
  registrar: (datos: DatosRegistro) => Promise<void>
  logout: () => Promise<void>
}

export interface DatosRegistro {
  email: string
  password: string
  nombre: string
  moneda_base: 'COP' | 'USD'
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [cargando, setCargando] = useState(true)
  const queryClient = useQueryClient()

  const cerrarSesionLocal = useCallback(() => {
    setAccessToken(null)
    setUser(null)
    queryClient.clear()
  }, [queryClient])

  useEffect(() => {
    // El interceptor avisa cuando ni el refresco sirvio: ahi la sesion murio.
    setOnSessionLost(cerrarSesionLocal)
    return () => setOnSessionLost(null)
  }, [cerrarSesionLocal])

  useEffect(() => {
    // Al cargar la pagina no hay access token (vive en memoria y se perdio con
    // la recarga), pero puede quedar la cookie httpOnly del refresh. Se intenta
    // canjearla: si funciona, la sesion continua sin volver a pedir clave.
    let cancelado = false

    api
      .post<TokenResponse>('/auth/refresh')
      .then(({ data }) => {
        if (cancelado) return
        setAccessToken(data.access_token)
        setUser(data.user)
      })
      .catch(() => {
        // Sin cookie o cookie vencida: simplemente no hay sesion.
      })
      .finally(() => {
        if (!cancelado) setCargando(false)
      })

    return () => {
      cancelado = true
    }
  }, [])

  const aplicar = useCallback((data: TokenResponse) => {
    setAccessToken(data.access_token)
    setUser(data.user)
  }, [])

  const login = useCallback(
    async (email: string, password: string) => {
      const { data } = await api.post<TokenResponse>('/auth/login', { email, password })
      aplicar(data)
    },
    [aplicar],
  )

  const registrar = useCallback(
    async (datos: DatosRegistro) => {
      const { data } = await api.post<TokenResponse>('/auth/register', datos)
      aplicar(data)
    },
    [aplicar],
  )

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout')
    } finally {
      // Se limpia igual si la peticion falla: el usuario pidio salir y la
      // sesion local debe cerrarse pase lo que pase.
      cerrarSesionLocal()
    }
  }, [cerrarSesionLocal])

  const value = useMemo(
    () => ({ user, cargando, login, registrar, logout }),
    [user, cargando, login, registrar, logout],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}

export function useAuth(): AuthState {
  const context = use(AuthContext)
  if (!context) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return context
}

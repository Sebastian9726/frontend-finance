import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import type { TokenResponse } from './types'

/**
 * Cliente HTTP hacia la API.
 *
 * `VITE_API_URL` se resuelve en tiempo de BUILD. En desarrollo se deja vacia y
 * las peticiones salen como `/api/...` relativas, que el proxy de Vite reenvia
 * a localhost:8000. En produccion apunta a https://api.midominio.com.
 *
 * `withCredentials` es obligatorio: la cookie del refresh token es httpOnly y
 * viaja sola, pero solo si el navegador tiene permitido enviarla cross-origin.
 */
export const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL ?? ''}/api/v1`,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

/**
 * El access token vive SOLO en memoria, nunca en localStorage: asi un XSS no
 * se lo puede llevar de forma persistente. Al recargar la pagina se pierde y
 * se recupera llamando a /auth/refresh, que usa la cookie httpOnly.
 */
let accessToken: string | null = null
let onSessionLost: (() => void) | null = null

export function setAccessToken(token: string | null): void {
  accessToken = token
}

export function getAccessToken(): string | null {
  return accessToken
}

/** El AuthProvider registra aqui que hacer cuando la sesion muere del todo. */
export function setOnSessionLost(handler: (() => void) | null): void {
  onSessionLost = handler
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

// ---------------------------------------------------------------------------
// Refresco automatico
// ---------------------------------------------------------------------------

/**
 * Una sola peticion de refresco a la vez.
 *
 * Sin esta cola, un dashboard que dispara cinco consultas en paralelo con el
 * token vencido lanzaria cinco refrescos simultaneos. Como la rotacion revoca
 * el token anterior en cada canje, los refrescos que llegan de segundos
 * presentarian un token ya revocado, el backend lo leeria como reuso y
 * cerraria la sesion del usuario. Aqui el primero refresca y los demas esperan
 * su resultado.
 */
let refreshEnCurso: Promise<string> | null = null

async function refrescar(): Promise<string> {
  refreshEnCurso ??= api
    .post<TokenResponse>('/auth/refresh')
    .then((response) => {
      setAccessToken(response.data.access_token)
      return response.data.access_token
    })
    .finally(() => {
      refreshEnCurso = null
    })

  return refreshEnCurso
}

interface ConfigConReintento extends InternalAxiosRequestConfig {
  _reintentado?: boolean
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as ConfigConReintento | undefined
    const esRutaDeSesion =
      original?.url?.includes('/auth/refresh') || original?.url?.includes('/auth/login')

    // Solo se reintenta una vez: si el refresco tampoco sirve, insistir seria
    // un bucle infinito de 401.
    if (error.response?.status !== 401 || !original || original._reintentado || esRutaDeSesion) {
      return Promise.reject(error)
    }

    original._reintentado = true
    try {
      const token = await refrescar()
      original.headers.Authorization = `Bearer ${token}`
      return await api(original)
    } catch (fallo) {
      setAccessToken(null)
      onSessionLost?.()
      return Promise.reject(fallo)
    }
  },
)

/** Mensaje legible de un error de la API, para mostrarle al usuario. */
export function mensajeDeError(error: unknown, alterno = 'Ocurrió un error inesperado'): string {
  if (axios.isAxiosError(error)) {
    const detalle = error.response?.data?.detail
    if (typeof detalle === 'string') return detalle
    // Los 422 de Pydantic traen una lista de problemas por campo.
    if (Array.isArray(detalle) && detalle[0]?.msg) {
      return detalle.map((d: { msg: string }) => d.msg).join('. ')
    }
    if (!error.response) return 'No se pudo conectar con el servidor'
  }
  return alterno
}

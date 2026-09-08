import axios from 'axios'

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
 * se recupera llamando a /auth/refresh con la cookie.
 */
let accessToken: string | null = null

export function setAccessToken(token: string | null): void {
  accessToken = token
}

export function getAccessToken(): string | null {
  return accessToken
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

// El interceptor de respuesta con refresh automatico y cola de peticiones
// se agrega en la Fase 1, junto con los endpoints de autenticacion.

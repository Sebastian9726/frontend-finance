import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Button, Card, ErrorState, Field, Input, Select, Spinner } from '@/components/ui'
import { mensajeDeError } from '@/lib/api'
import { useAuth } from './AuthContext'

type Modo = 'login' | 'registro'

export function AuthPage() {
  const { user, cargando, login, registrar } = useAuth()
  const location = useLocation()
  const [modo, setModo] = useState<Modo>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre] = useState('')
  const [moneda, setMoneda] = useState<'COP' | 'USD'>('COP')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  if (cargando) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (user) {
    const destino = (location.state as { from?: string } | null)?.from ?? '/'
    return <Navigate to={destino} replace />
  }

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault()
    setError(null)
    setEnviando(true)
    try {
      if (modo === 'login') {
        await login(email, password)
      } else {
        await registrar({ email, password, nombre, moneda_base: moneda })
      }
    } catch (fallo) {
      setError(mensajeDeError(fallo, 'No se pudo completar la operación'))
    } finally {
      setEnviando(false)
    }
  }

  const esRegistro = modo === 'registro'

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md p-6">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Finanzas</h1>
          <p className="text-sm text-muted-foreground">
            {esRegistro
              ? 'Crea tu cuenta para empezar a registrar tus movimientos.'
              : 'Ingresa para ver cómo vas.'}
          </p>
        </header>

        <form onSubmit={enviar} className="space-y-4">
          {esRegistro && (
            <Field label="Nombre">
              <Input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
                autoComplete="name"
              />
            </Field>
          )}

          <Field label="Correo">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </Field>

          <Field
            label="Contraseña"
            hint={esRegistro ? 'Mínimo 10 caracteres, con letras y números.' : undefined}
          >
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={esRegistro ? 'new-password' : 'current-password'}
            />
          </Field>

          {esRegistro && (
            <Field
              label="Moneda base"
              hint="En esta moneda se consolidan tus reportes. No se puede cambiar después."
            >
              <Select value={moneda} onChange={(e) => setMoneda(e.target.value as 'COP' | 'USD')}>
                <option value="COP">Peso colombiano (COP)</option>
                <option value="USD">Dólar (USD)</option>
              </Select>
            </Field>
          )}

          {error && <ErrorState mensaje={error} />}

          <Button type="submit" className="w-full" disabled={enviando}>
            {enviando && <Spinner className="h-4 w-4" />}
            {esRegistro ? 'Crear cuenta' : 'Ingresar'}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          {esRegistro ? '¿Ya tienes cuenta?' : '¿Primera vez aquí?'}{' '}
          <button
            type="button"
            className="font-medium text-primary underline-offset-4 hover:underline"
            onClick={() => {
              setModo(esRegistro ? 'login' : 'registro')
              setError(null)
            }}
          >
            {esRegistro ? 'Ingresa' : 'Crea tu cuenta'}
          </button>
        </p>
      </Card>
    </div>
  )
}

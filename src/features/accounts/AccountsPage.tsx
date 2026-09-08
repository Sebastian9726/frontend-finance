import { Plus, Power, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Monto } from '@/components/Monto'
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Select,
  Spinner,
} from '@/components/ui'
import { useAuth } from '@/features/auth/AuthContext'
import {
  useAccounts,
  useCreateAccount,
  useDeleteAccount,
  useUpdateAccount,
} from '@/hooks/useFinance'
import { mensajeDeError } from '@/lib/api'
import { parseInput, toApi, zero } from '@/lib/money'
import { ACCOUNT_TYPE_LABEL, type AccountType, type Account } from '@/lib/types'

export function AccountsPage() {
  const { user } = useAuth()
  const cuentas = useAccounts()
  const actualizar = useUpdateAccount()
  const borrar = useDeleteAccount()
  const [abierto, setAbierto] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const monedaBase = user?.moneda_base ?? 'COP'

  async function alternarActiva(cuenta: Account) {
    setError(null)
    try {
      await actualizar.mutateAsync({ id: cuenta.id, activa: !cuenta.activa })
    } catch (fallo) {
      setError(mensajeDeError(fallo))
    }
  }

  async function eliminar(cuenta: Account) {
    if (!window.confirm(`¿Borrar la cuenta "${cuenta.nombre}"?`)) return
    setError(null)
    try {
      await borrar.mutateAsync(cuenta.id)
    } catch (fallo) {
      setError(mensajeDeError(fallo))
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cuentas</h1>
          <p className="text-sm text-muted-foreground">
            Dónde está tu dinero. El saldo se calcula con tus movimientos.
          </p>
        </div>
        <Button onClick={() => setAbierto(true)}>
          <Plus className="h-4 w-4" />
          Nueva cuenta
        </Button>
      </header>

      {error && <ErrorState mensaje={error} />}

      {cuentas.isPending ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : !cuentas.data?.length ? (
        <Card>
          <EmptyState
            titulo="Todavía no tienes cuentas"
            descripcion="Crea una cuenta —banco, efectivo o tarjeta— para empezar a registrar movimientos."
            accion={
              <Button onClick={() => setAbierto(true)}>
                <Plus className="h-4 w-4" />
                Crear cuenta
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cuentas.data.map((cuenta) => (
            <Card key={cuenta.id} className={cuenta.activa ? '' : 'opacity-60'}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{cuenta.nombre}</p>
                    <p className="text-xs text-muted-foreground">
                      {ACCOUNT_TYPE_LABEL[cuenta.tipo]} · {cuenta.moneda}
                    </p>
                  </div>
                  {!cuenta.activa && <Badge className="text-muted-foreground">Inactiva</Badge>}
                </div>

                <div className="mt-4 text-2xl font-semibold">
                  <Monto valor={cuenta.saldo_actual} moneda={cuenta.moneda} colorear />
                </div>
                {cuenta.moneda !== monedaBase && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Se convierte a {monedaBase} en los totales
                  </p>
                )}

                <div className="mt-4 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void alternarActiva(cuenta)}
                  >
                    <Power className="h-3.5 w-3.5" />
                    {cuenta.activa ? 'Desactivar' : 'Activar'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void eliminar(cuenta)}
                    aria-label={`Borrar ${cuenta.nombre}`}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={abierto}
        onClose={() => setAbierto(false)}
        title="Nueva cuenta"
        description="La moneda no se puede cambiar después: los movimientos quedan convertidos con ella."
      >
        <AccountForm onListo={() => setAbierto(false)} />
      </Dialog>
    </div>
  )
}

function AccountForm({ onListo }: { onListo: () => void }) {
  const crear = useCreateAccount()
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState<AccountType>('banco')
  const [moneda, setMoneda] = useState<'COP' | 'USD'>('COP')
  const [saldoTexto, setSaldoTexto] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault()
    setError(null)

    const saldo = saldoTexto.trim() ? parseInput(saldoTexto, moneda) : zero(moneda)
    if (!saldo) {
      setError('El saldo inicial no es un monto válido.')
      return
    }

    try {
      await crear.mutateAsync({
        nombre,
        tipo,
        moneda,
        saldo_inicial: toApi(saldo),
      })
      onListo()
    } catch (fallo) {
      setError(mensajeDeError(fallo, 'No se pudo crear la cuenta'))
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-4">
      <Field label="Nombre">
        <Input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Bancolombia, Efectivo…"
          required
          autoFocus
          maxLength={120}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tipo">
          <Select value={tipo} onChange={(e) => setTipo(e.target.value as AccountType)}>
            {Object.entries(ACCOUNT_TYPE_LABEL).map(([valor, etiqueta]) => (
              <option key={valor} value={valor}>
                {etiqueta}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Moneda">
          <Select value={moneda} onChange={(e) => setMoneda(e.target.value as 'COP' | 'USD')}>
            <option value="COP">COP</option>
            <option value="USD">USD</option>
          </Select>
        </Field>
      </div>

      <Field
        label="Saldo inicial"
        hint="Cuánto hay en la cuenta hoy, antes de registrar movimientos."
      >
        <Input
          value={saldoTexto}
          onChange={(e) => setSaldoTexto(e.target.value)}
          placeholder="0"
          inputMode="decimal"
        />
      </Field>

      {error && <ErrorState mensaje={error} />}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onListo}>
          Cancelar
        </Button>
        <Button type="submit" disabled={crear.isPending}>
          {crear.isPending && <Spinner className="h-4 w-4" />}
          Crear
        </Button>
      </div>
    </form>
  )
}

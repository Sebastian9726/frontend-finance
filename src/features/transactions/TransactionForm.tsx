import { useState } from 'react'
import { Button, ErrorState, Field, Input, Select, Spinner, Textarea } from '@/components/ui'
import {
  useAccounts,
  useCategories,
  useCreateTransaction,
  useCreateTransfer,
} from '@/hooks/useFinance'
import { useAuth } from '@/features/auth/AuthContext'
import { mensajeDeError } from '@/lib/api'
import { hoy } from '@/lib/dates'
import { format, negate, parseInput, toApi } from '@/lib/money'
import type { Account } from '@/lib/types'

/**
 * Alta de un ingreso o un gasto.
 *
 * El usuario siempre escribe una cantidad POSITIVA y elige el tipo; el signo
 * lo pone este formulario justo antes de enviar. La API guarda el monto con
 * signo (negativo el gasto) porque asi el saldo es una suma directa.
 */
export function TransactionForm({ onListo }: { onListo: () => void }) {
  const { user } = useAuth()
  const monedaBase = user?.moneda_base ?? 'COP'
  const cuentas = useAccounts()
  const categorias = useCategories()
  const crear = useCreateTransaction()

  const [tipo, setTipo] = useState<'gasto' | 'ingreso'>('gasto')
  const [cuentaId, setCuentaId] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [montoTexto, setMontoTexto] = useState('')
  const [fecha, setFecha] = useState(hoy())
  const [descripcion, setDescripcion] = useState('')
  const [notas, setNotas] = useState('')
  const [error, setError] = useState<string | null>(null)

  const activas = (cuentas.data ?? []).filter((c) => c.activa)

  // Por defecto, la primera cuenta en la moneda base del usuario. Las cuentas
  // llegan ordenadas por nombre, asi que sin esto una cuenta en dolares que
  // empiece por "A" seria la opcion inicial de todos los movimientos, y ademas
  // exigiria tener cargada la tasa del dia.
  const predeterminada =
    activas.find((c) => c.moneda === monedaBase) ?? activas[0]
  const cuenta: Account | undefined = activas.find((c) => c.id === cuentaId) ?? predeterminada
  const moneda = cuenta?.moneda ?? monedaBase

  const delTipo = (categorias.data ?? []).filter((c) => c.tipo === tipo)

  // Se parsea en cada tecla para dar retroalimentacion inmediata de como
  // quedara el monto formateado.
  const montoParseado = montoTexto.trim() ? parseInput(montoTexto, moneda) : null

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault()
    setError(null)

    if (!cuenta) {
      setError('Primero crea una cuenta.')
      return
    }
    if (!montoParseado || montoParseado.units === 0) {
      setError('Escribe un monto válido, por ejemplo 125.000 o 125.000,50')
      return
    }

    // El gasto se guarda en negativo: es su efecto sobre el saldo.
    const montoFinal = tipo === 'gasto' ? negate(montoParseado) : montoParseado

    try {
      await crear.mutateAsync({
        account_id: cuenta.id,
        category_id: categoriaId || null,
        tipo,
        monto: toApi(montoFinal),
        fecha,
        descripcion,
        notas: notas || null,
      })
      onListo()
    } catch (fallo) {
      setError(mensajeDeError(fallo, 'No se pudo guardar el movimiento'))
    }
  }

  if (cuentas.isPending) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    )
  }

  if (!activas.length) {
    return (
      <ErrorState mensaje="Necesitas al menos una cuenta activa para registrar movimientos. Créala en la sección Cuentas." />
    )
  }

  return (
    <form onSubmit={enviar} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          variant={tipo === 'gasto' ? 'default' : 'outline'}
          onClick={() => {
            setTipo('gasto')
            setCategoriaId('')
          }}
        >
          Gasto
        </Button>
        <Button
          type="button"
          variant={tipo === 'ingreso' ? 'default' : 'outline'}
          onClick={() => {
            setTipo('ingreso')
            setCategoriaId('')
          }}
        >
          Ingreso
        </Button>
      </div>

      <Field
        label={`Monto (${moneda})`}
        hint={
          montoParseado
            ? `Se guardará como ${format(tipo === 'gasto' ? negate(montoParseado) : montoParseado)}`
            : 'Puedes escribirlo como 1.250.000 o 1250000,50'
        }
      >
        <Input
          value={montoTexto}
          onChange={(e) => setMontoTexto(e.target.value)}
          placeholder="0"
          inputMode="decimal"
          autoFocus
          required
        />
      </Field>

      <Field label="Descripción">
        <Input
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder={tipo === 'gasto' ? 'Mercado, arriendo…' : 'Salario, venta…'}
          required
          maxLength={255}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Cuenta">
          <Select value={cuenta?.id ?? ''} onChange={(e) => setCuentaId(e.target.value)}>
            {activas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre} ({c.moneda})
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Fecha">
          <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
        </Field>
      </div>

      <Field label="Categoría">
        <Select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
          <option value="">Sin categoría</option>
          {delTipo.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Notas (opcional)">
        <Textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} />
      </Field>

      {error && <ErrorState mensaje={error} />}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onListo}>
          Cancelar
        </Button>
        <Button type="submit" disabled={crear.isPending}>
          {crear.isPending && <Spinner className="h-4 w-4" />}
          Guardar
        </Button>
      </div>
    </form>
  )
}

/** Traslado entre dos cuentas propias. */
export function TransferForm({ onListo }: { onListo: () => void }) {
  const { user } = useAuth()
  const monedaBase = user?.moneda_base ?? 'COP'
  const cuentas = useAccounts()
  const crear = useCreateTransfer()

  const activas = (cuentas.data ?? []).filter((c) => c.activa)
  const [origenId, setOrigenId] = useState('')
  const [destinoId, setDestinoId] = useState('')
  const [montoTexto, setMontoTexto] = useState('')
  const [fecha, setFecha] = useState(hoy())
  const [descripcion, setDescripcion] = useState('Traslado entre cuentas')
  const [error, setError] = useState<string | null>(null)

  const origen =
    activas.find((c) => c.id === origenId) ??
    activas.find((c) => c.moneda === monedaBase) ??
    activas[0]
  const destino = activas.find((c) => c.id === destinoId) ?? activas.find((c) => c.id !== origen?.id)
  const moneda = origen?.moneda ?? monedaBase
  const montoParseado = montoTexto.trim() ? parseInput(montoTexto, moneda) : null

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault()
    setError(null)

    if (!origen || !destino || origen.id === destino.id) {
      setError('Elige dos cuentas distintas.')
      return
    }
    if (!montoParseado || montoParseado.units <= 0) {
      setError('Escribe un monto válido mayor que cero.')
      return
    }

    try {
      await crear.mutateAsync({
        cuenta_origen_id: origen.id,
        cuenta_destino_id: destino.id,
        monto: toApi(montoParseado),
        fecha,
        descripcion,
      })
      onListo()
    } catch (fallo) {
      setError(mensajeDeError(fallo, 'No se pudo registrar el traslado'))
    }
  }

  if (activas.length < 2) {
    return <ErrorState mensaje="Necesitas al menos dos cuentas activas para trasladar dinero." />
  }

  return (
    <form onSubmit={enviar} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Desde">
          <Select value={origen?.id ?? ''} onChange={(e) => setOrigenId(e.target.value)}>
            {activas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre} ({c.moneda})
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Hacia">
          <Select value={destino?.id ?? ''} onChange={(e) => setDestinoId(e.target.value)}>
            {activas
              .filter((c) => c.id !== origen?.id)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} ({c.moneda})
                </option>
              ))}
          </Select>
        </Field>
      </div>

      <Field
        label={`Monto (${moneda})`}
        hint={
          origen && destino && origen.moneda !== destino.moneda
            ? `Se convertirá a ${destino.moneda} con la tasa del día`
            : montoParseado
              ? `Se trasladarán ${format(montoParseado)}`
              : undefined
        }
      >
        <Input
          value={montoTexto}
          onChange={(e) => setMontoTexto(e.target.value)}
          placeholder="0"
          inputMode="decimal"
          required
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Fecha">
          <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
        </Field>
        <Field label="Descripción">
          <Input
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            required
            maxLength={255}
          />
        </Field>
      </div>

      {error && <ErrorState mensaje={error} />}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onListo}>
          Cancelar
        </Button>
        <Button type="submit" disabled={crear.isPending}>
          {crear.isPending && <Spinner className="h-4 w-4" />}
          Trasladar
        </Button>
      </div>
    </form>
  )
}

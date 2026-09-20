/**
 * Detalle de un activo o una deuda, con su historial.
 *
 * Los dos casos comparten forma -- una posicion con un valor que cambia en el
 * tiempo -- asi que comparten componente y solo difieren en las etiquetas y en
 * que hook usan. Duplicarlo habria significado arreglar cada cosa dos veces.
 */

import { Power, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Monto } from '@/components/Monto'
import {
  Badge,
  Button,
  Dialog,
  ErrorState,
  Field,
  Input,
  Spinner,
  Table,
  Td,
  Th,
  Tr,
} from '@/components/ui'
import {
  useAddBalance,
  useAddValuation,
  useAsset,
  useDeleteAsset,
  useDeleteBalance,
  useDeleteLiability,
  useDeleteValuation,
  useLiability,
  useUpdateAsset,
  useUpdateLiability,
} from '@/hooks/useFinance'
import { mensajeDeError } from '@/lib/api'
import { formatearFecha, hoy } from '@/lib/dates'
import { type Currency, isNegative, parseInput, toApi } from '@/lib/money'
import {
  ASSET_TYPE_LABEL,
  LIABILITY_TYPE_LABEL,
  type AssetDetail,
  type LiabilityDetail,
} from '@/lib/types'

export type Seleccion = { clase: 'activo' | 'deuda'; id: string } | null

export function PositionDialog({
  seleccion,
  onClose,
  monedaBase,
}: {
  seleccion: Seleccion
  onClose: () => void
  monedaBase: Currency
}) {
  const esActivo = seleccion?.clase === 'activo'
  const activo = useAsset(esActivo ? seleccion.id : null)
  const deuda = useLiability(seleccion && !esActivo ? seleccion.id : null)

  const consulta = esActivo ? activo : deuda
  const datos = consulta.data

  return (
    <Dialog
      open={seleccion !== null}
      onClose={onClose}
      title={datos?.nombre ?? (esActivo ? 'Activo' : 'Deuda')}
      description={
        esActivo
          ? 'Cada valuación mueve la serie de patrimonio desde su fecha en adelante.'
          : 'Cada saldo registrado mueve la serie de patrimonio desde su fecha en adelante.'
      }
    >
      {seleccion === null ? null : consulta.isPending ? (
        <div className="flex h-32 items-center justify-center">
          <Spinner />
        </div>
      ) : consulta.isError ? (
        <ErrorState mensaje={mensajeDeError(consulta.error)} />
      ) : datos ? (
        <Contenido
          posicion={
            esActivo
              ? normalizarActivo(datos as AssetDetail)
              : normalizarDeuda(datos as LiabilityDetail)
          }
          esActivo={esActivo}
          monedaBase={monedaBase}
          onClose={onClose}
        />
      ) : null}
    </Dialog>
  )
}

/** Forma comun a activo y deuda, para no escribir el detalle dos veces. */
interface Posicion {
  id: string
  nombre: string
  moneda: Currency
  activo: boolean
  notas: string | null
  montoActual: string
  fechaMonto: string | null
  /** Ganancia (activo) o abonado (deuda). `null` si no hay referencia. */
  comparado: string | null
  historial: { id: string; fecha: string; monto: string; nota: string | null }[]
  etiquetaTipo: string
}

function Contenido({
  posicion: p,
  esActivo,
  monedaBase,
  onClose,
}: {
  posicion: Posicion
  esActivo: boolean
  monedaBase: Currency
  onClose: () => void
}) {
  const agregarValuacion = useAddValuation()
  const agregarSaldo = useAddBalance()
  const borrarValuacion = useDeleteValuation()
  const borrarSaldo = useDeleteBalance()
  const actualizarActivo = useUpdateAsset()
  const actualizarDeuda = useUpdateLiability()
  const borrarActivo = useDeleteAsset()
  const borrarDeuda = useDeleteLiability()

  const [montoTexto, setMontoTexto] = useState('')
  const [fecha, setFecha] = useState(hoy())
  const [error, setError] = useState<string | null>(null)

  const guardando = agregarValuacion.isPending || agregarSaldo.isPending

  async function registrar(evento: React.FormEvent) {
    evento.preventDefault()
    setError(null)

    const monto = parseInput(montoTexto, p.moneda)
    if (!monto) {
      setError(esActivo ? 'El valor no es válido.' : 'El saldo no es válido.')
      return
    }
    // Ambos van positivos, como los CHECK de la base. Registrar un 0 es la
    // forma correcta de decir "lo vendi" o "ya la pague".
    if (isNegative(monto)) {
      setError(
        esActivo
          ? 'El valor no puede ser negativo. Si lo vendiste, registra 0.'
          : 'El saldo no puede ser negativo. Si ya la pagaste, registra 0.',
      )
      return
    }

    try {
      if (esActivo) {
        await agregarValuacion.mutateAsync({ id: p.id, fecha, valor: toApi(monto) })
      } else {
        await agregarSaldo.mutateAsync({ id: p.id, fecha, saldo: toApi(monto) })
      }
      setMontoTexto('')
    } catch (fallo) {
      setError(mensajeDeError(fallo, 'No se pudo registrar'))
    }
  }

  async function borrarFila(filaId: string) {
    setError(null)
    try {
      if (esActivo) {
        await borrarValuacion.mutateAsync({ id: p.id, valuationId: filaId })
      } else {
        await borrarSaldo.mutateAsync({ id: p.id, balanceId: filaId })
      }
    } catch (fallo) {
      setError(mensajeDeError(fallo))
    }
  }

  async function alternarActivo() {
    setError(null)
    try {
      if (esActivo) {
        await actualizarActivo.mutateAsync({ id: p.id, activo: !p.activo })
      } else {
        await actualizarDeuda.mutateAsync({ id: p.id, activa: !p.activo })
      }
    } catch (fallo) {
      setError(mensajeDeError(fallo))
    }
  }

  async function eliminar() {
    const aviso = esActivo
      ? `¿Borrar "${p.nombre}"? Desaparecerá de TODA la historia, como si nunca lo hubieras tenido. Si lo vendiste, registra mejor una valuación en 0.`
      : `¿Borrar "${p.nombre}"? Desaparecerá de TODA la historia. Si ya la pagaste, registra mejor un saldo en 0.`
    if (!window.confirm(aviso)) return

    setError(null)
    try {
      if (esActivo) {
        await borrarActivo.mutateAsync(p.id)
      } else {
        await borrarDeuda.mutateAsync(p.id)
      }
      onClose()
    } catch (fallo) {
      setError(mensajeDeError(fallo))
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-md border bg-muted/40 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">
              {p.etiquetaTipo} · {p.moneda}
            </p>
            <div className="mt-1 text-2xl font-semibold">
              <Monto valor={p.montoActual} moneda={p.moneda} />
            </div>
            {p.fechaMonto && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {esActivo ? 'Valorado el' : 'Saldo al'} {formatearFecha(p.fechaMonto)}
              </p>
            )}
          </div>
          {!p.activo && <Badge className="text-muted-foreground">Inactivo</Badge>}
        </div>

        {p.comparado && (
          <p className="mt-3 flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">
              {esActivo ? 'Ganancia sobre el costo' : 'Abonado del monto original'}
            </span>
            <Monto valor={p.comparado} moneda={p.moneda} colorear={esActivo} />
          </p>
        )}

        {p.moneda !== monedaBase && (
          <p className="mt-2 text-xs text-muted-foreground">
            En el patrimonio se convierte a {monedaBase} con la tasa de cada cierre de mes.
          </p>
        )}

        {p.notas && <p className="mt-3 text-sm text-muted-foreground">{p.notas}</p>}
      </div>

      <form onSubmit={registrar} className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <Field label={esActivo ? 'Nuevo valor' : 'Nuevo saldo'}>
          <Input
            value={montoTexto}
            onChange={(e) => setMontoTexto(e.target.value)}
            placeholder={esActivo ? '360.000.000' : '180.000.000'}
            inputMode="decimal"
            required
          />
        </Field>
        <Field label="Fecha">
          <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
        </Field>
        <Button type="submit" disabled={guardando}>
          {guardando && <Spinner className="h-4 w-4" />}
          Registrar
        </Button>
      </form>

      {error && <ErrorState mensaje={error} />}

      <div>
        <p className="mb-2 text-sm font-medium">Historial</p>
        <Table>
          <thead>
            <tr className="border-b">
              <Th>Fecha</Th>
              <Th className="text-right">{esActivo ? 'Valor' : 'Saldo'}</Th>
              <Th>Nota</Th>
              <Th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {p.historial.map((fila) => (
              <Tr key={fila.id}>
                <Td className="whitespace-nowrap text-muted-foreground">
                  {formatearFecha(fila.fecha)}
                </Td>
                <Td className="text-right">
                  <Monto valor={fila.monto} moneda={p.moneda} />
                </Td>
                <Td className="text-muted-foreground">{fila.nota ?? '—'}</Td>
                <Td>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void borrarFila(fila.id)}
                    aria-label={`Borrar registro del ${fila.fecha}`}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </div>

      <div className="flex flex-wrap justify-between gap-2 border-t pt-4">
        <Button variant="outline" size="sm" onClick={() => void alternarActivo()}>
          <Power className="h-3.5 w-3.5" />
          {p.activo ? 'Desactivar' : 'Activar'}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => void eliminar()}>
          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
          Borrar
        </Button>
      </div>
    </div>
  )
}

function normalizarActivo(a: AssetDetail): Posicion {
  return {
    id: a.id,
    nombre: a.nombre,
    moneda: a.moneda,
    activo: a.activo,
    notas: a.notas,
    montoActual: a.valor_actual,
    fechaMonto: a.fecha_valor,
    comparado: a.ganancia,
    historial: a.valuaciones.map((v) => ({
      id: v.id,
      fecha: v.fecha,
      monto: v.valor,
      nota: v.nota,
    })),
    etiquetaTipo: ASSET_TYPE_LABEL[a.tipo],
  }
}

function normalizarDeuda(d: LiabilityDetail): Posicion {
  return {
    id: d.id,
    nombre: d.nombre,
    moneda: d.moneda,
    activo: d.activa,
    notas: d.notas,
    montoActual: d.saldo_actual,
    fechaMonto: d.fecha_saldo,
    comparado: d.abonado,
    historial: d.saldos.map((s) => ({
      id: s.id,
      fecha: s.fecha,
      monto: s.saldo,
      nota: s.nota,
    })),
    etiquetaTipo: LIABILITY_TYPE_LABEL[d.tipo],
  }
}

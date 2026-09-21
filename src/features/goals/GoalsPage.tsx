import { AlertTriangle, CheckCircle2, Plus, Target, Trash2 } from 'lucide-react'
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
  Table,
  Td,
  Th,
  Tr,
  Textarea,
} from '@/components/ui'
import { useAuth } from '@/features/auth/AuthContext'
import {
  useAccounts,
  useAddContribution,
  useCreateGoal,
  useDeleteContribution,
  useDeleteGoal,
  useGoal,
  useGoals,
  useUpdateGoal,
} from '@/hooks/useFinance'
import { mensajeDeError } from '@/lib/api'
import { formatearFecha, hoy } from '@/lib/dates'
import { type Currency, isNegative, isZero, parseInput, toApi } from '@/lib/money'
import type { Goal } from '@/lib/types'

export function GoalsPage() {
  const { user } = useAuth()
  const monedaBase = user?.moneda_base ?? 'COP'

  const metas = useGoals()
  const [nueva, setNueva] = useState(false)
  const [abierta, setAbierta] = useState<string | null>(null)

  const activas = (metas.data ?? []).filter((m) => m.activa)
  const cerradas = (metas.data ?? []).filter((m) => !m.activa)

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Metas</h1>
          <p className="text-sm text-muted-foreground">
            Para qué estás ahorrando y a qué ritmo vas.
          </p>
        </div>
        <Button onClick={() => setNueva(true)}>
          <Plus className="h-4 w-4" />
          Nueva meta
        </Button>
      </header>

      {metas.isError && <ErrorState mensaje={mensajeDeError(metas.error)} />}

      {metas.isPending ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : !metas.data?.length ? (
        <Card>
          <EmptyState
            titulo="Todavía no tienes metas"
            descripcion="Define cuánto quieres juntar y para cuándo. Con unos pocos aportes ya se puede estimar si vas a llegar."
            accion={
              <Button onClick={() => setNueva(true)}>
                <Plus className="h-4 w-4" />
                Crear meta
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {activas.map((meta) => (
              <GoalCard key={meta.id} meta={meta} onAbrir={() => setAbierta(meta.id)} />
            ))}
          </div>

          {cerradas.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-medium text-muted-foreground">Archivadas</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {cerradas.map((meta) => (
                  <GoalCard key={meta.id} meta={meta} onAbrir={() => setAbierta(meta.id)} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <Dialog
        open={nueva}
        onClose={() => setNueva(false)}
        title="Nueva meta"
        description="Lo que ya tengas ahorrado entra como primer aporte, para poder medir el ritmo desde el principio."
      >
        <GoalForm monedaBase={monedaBase} onListo={() => setNueva(false)} />
      </Dialog>

      <GoalDialog goalId={abierta} onClose={() => setAbierta(null)} />
    </div>
  )
}

function GoalCard({ meta, onAbrir }: { meta: Goal; onAbrir: () => void }) {
  return (
    <Card className={meta.activa ? '' : 'opacity-60'}>
      <CardContent className="p-5">
        <button type="button" onClick={onAbrir} className="w-full text-left">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="flex items-center gap-2 truncate font-medium">
                <Target className="h-4 w-4 shrink-0 text-muted-foreground" />
                {meta.nombre}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {meta.fecha_objetivo
                  ? `Para el ${formatearFecha(meta.fecha_objetivo)}`
                  : 'Sin fecha objetivo'}
                {' · '}
                {meta.moneda}
              </p>
            </div>
            {meta.cumplida ? (
              <Badge className="border-income/40 bg-income/10 text-income">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Cumplida
              </Badge>
            ) : meta.en_riesgo ? (
              <Badge className="border-amber-500/40 bg-amber-500/10 text-amber-600">
                <AlertTriangle className="mr-1 h-3 w-3" />
                En riesgo
              </Badge>
            ) : null}
          </div>

          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-semibold">
              <Monto valor={meta.monto_actual} moneda={meta.moneda} />
            </span>
            <span className="text-sm text-muted-foreground">
              de <Monto valor={meta.monto_objetivo} moneda={meta.moneda} />
            </span>
          </div>

          {/*
            `porcentaje` llega del backend ya topado en 100: es un número para
            el ancho de la barra, no dinero.
          */}
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all ${
                meta.cumplida ? 'bg-income' : meta.en_riesgo ? 'bg-amber-500' : 'bg-primary'
              }`}
              style={{ width: `${meta.porcentaje}%` }}
            />
          </div>

          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span className="tabular">{meta.porcentaje.toFixed(0)}%</span>
            {!meta.cumplida && (
              <span>
                faltan <Monto valor={meta.monto_faltante} moneda={meta.moneda} />
              </span>
            )}
          </div>

          <p className="mt-3 border-t pt-3 text-xs text-muted-foreground">
            <Proyeccion meta={meta} />
          </p>
        </button>
      </CardContent>
    </Card>
  )
}

/**
 * Lee la proyección del backend. Cuando viene vacía NO se rellena con una
 * estimación propia: sin historia suficiente, una fecha de cumplimiento sería
 * adivinar, y una adivinanza presentada como dato es peor que no decir nada.
 */
function Proyeccion({ meta }: { meta: Goal }) {
  if (meta.cumplida) return <>Ya la alcanzaste. Puedes archivarla desde el detalle.</>

  if (!meta.aporte_mensual_promedio || !meta.fecha_proyectada) {
    return (
      <>
        Aún no hay suficientes aportes para estimar un ritmo. Con un par de meses de
        historia aparece aquí la fecha proyectada.
      </>
    )
  }

  return (
    <>
      Al ritmo de <Monto valor={meta.aporte_mensual_promedio} moneda={meta.moneda} /> al mes,
      la alcanzarías el {formatearFecha(meta.fecha_proyectada)}.
      {meta.en_riesgo && meta.aporte_mensual_requerido && (
        <>
          {' '}
          Para llegar a tiempo tendrías que aportar{' '}
          <Monto valor={meta.aporte_mensual_requerido} moneda={meta.moneda} /> al mes.
        </>
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// Detalle
// ---------------------------------------------------------------------------

function GoalDialog({ goalId, onClose }: { goalId: string | null; onClose: () => void }) {
  const meta = useGoal(goalId)

  return (
    <Dialog
      open={goalId !== null}
      onClose={onClose}
      title={meta.data?.nombre ?? 'Meta'}
      description="Cada aporte recalcula el ritmo y la fecha proyectada."
    >
      {goalId === null ? null : meta.isPending ? (
        <div className="flex h-32 items-center justify-center">
          <Spinner />
        </div>
      ) : meta.isError ? (
        <ErrorState mensaje={mensajeDeError(meta.error)} />
      ) : meta.data ? (
        <GoalDetailBody meta={meta.data} onClose={onClose} />
      ) : null}
    </Dialog>
  )
}

function GoalDetailBody({
  meta,
  onClose,
}: {
  meta: NonNullable<ReturnType<typeof useGoal>['data']>
  onClose: () => void
}) {
  const aportar = useAddContribution()
  const borrarAporte = useDeleteContribution()
  const actualizar = useUpdateGoal()
  const borrar = useDeleteGoal()

  const [montoTexto, setMontoTexto] = useState('')
  const [fecha, setFecha] = useState(hoy())
  const [error, setError] = useState<string | null>(null)

  async function registrar(evento: React.FormEvent) {
    evento.preventDefault()
    setError(null)

    const monto = parseInput(montoTexto, meta.moneda)
    if (!monto) {
      setError('El aporte no es un monto válido.')
      return
    }
    // Negativo SÍ se permite -- es un retiro -- pero cero no dice nada y el
    // backend lo rechaza con un 422. Mejor decirlo aquí con palabras.
    if (isZero(monto)) {
      setError('El aporte no puede ser cero.')
      return
    }

    try {
      await aportar.mutateAsync({ id: meta.id, fecha, monto: toApi(monto) })
      setMontoTexto('')
    } catch (fallo) {
      setError(mensajeDeError(fallo, 'No se pudo registrar el aporte'))
    }
  }

  async function eliminar() {
    if (!window.confirm(`¿Borrar la meta "${meta.nombre}" y todos sus aportes?`)) return
    setError(null)
    try {
      await borrar.mutateAsync(meta.id)
      onClose()
    } catch (fallo) {
      setError(mensajeDeError(fallo))
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-md border bg-muted/40 p-4">
        <div className="text-2xl font-semibold">
          <Monto valor={meta.monto_actual} moneda={meta.moneda} />
          <span className="text-base font-normal text-muted-foreground">
            {' de '}
            <Monto valor={meta.monto_objetivo} moneda={meta.moneda} />
          </span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          <Proyeccion meta={meta} />
        </p>
      </div>

      <form onSubmit={registrar} className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <Field
          label="Aporte"
          hint="En negativo si sacaste plata de la meta."
        >
          <Input
            value={montoTexto}
            onChange={(e) => setMontoTexto(e.target.value)}
            placeholder="1.000.000"
            inputMode="decimal"
            required
          />
        </Field>
        <Field label="Fecha">
          <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
        </Field>
        <Button type="submit" disabled={aportar.isPending}>
          {aportar.isPending && <Spinner className="h-4 w-4" />}
          Registrar
        </Button>
      </form>

      {error && <ErrorState mensaje={error} />}

      <div>
        <p className="mb-2 text-sm font-medium">Aportes</p>
        {meta.aportes.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Todavía no hay aportes.
          </p>
        ) : (
          <Table>
            <thead>
              <tr className="border-b">
                <Th>Fecha</Th>
                <Th className="text-right">Monto</Th>
                <Th>Nota</Th>
                <Th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {meta.aportes.map((aporte) => (
                <Tr key={aporte.id}>
                  <Td className="whitespace-nowrap text-muted-foreground">
                    {formatearFecha(aporte.fecha)}
                  </Td>
                  <Td className="text-right">
                    <Monto valor={aporte.monto} moneda={meta.moneda} colorear />
                  </Td>
                  <Td className="text-muted-foreground">{aporte.nota ?? '—'}</Td>
                  <Td>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        void borrarAporte.mutateAsync({
                          id: meta.id,
                          contributionId: aporte.id,
                        })
                      }
                      aria-label={`Borrar aporte del ${aporte.fecha}`}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>

      <div className="flex flex-wrap justify-between gap-2 border-t pt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            void actualizar.mutateAsync({ id: meta.id, activa: !meta.activa })
          }
        >
          {meta.activa ? 'Archivar' : 'Reactivar'}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => void eliminar()}>
          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
          Borrar
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Alta
// ---------------------------------------------------------------------------

function GoalForm({
  monedaBase,
  onListo,
}: {
  monedaBase: Currency
  onListo: () => void
}) {
  const crear = useCreateGoal()
  const cuentas = useAccounts()

  const [nombre, setNombre] = useState('')
  const [moneda, setMoneda] = useState<Currency>(monedaBase)
  const [objetivoTexto, setObjetivoTexto] = useState('')
  const [inicialTexto, setInicialTexto] = useState('')
  const [fechaObjetivo, setFechaObjetivo] = useState('')
  const [accountId, setAccountId] = useState('')
  const [notas, setNotas] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault()
    setError(null)

    const objetivo = parseInput(objetivoTexto, moneda)
    // Refleja el CHECK `monto_objetivo > 0` de la base: una meta de cero o
    // negativa no significa nada, y el 422 crudo no lo explicaría.
    if (!objetivo || isZero(objetivo) || isNegative(objetivo)) {
      setError('El objetivo debe ser un monto mayor que cero.')
      return
    }

    let inicial: string | null = null
    if (inicialTexto.trim()) {
      const parseado = parseInput(inicialTexto, moneda)
      if (!parseado || isNegative(parseado)) {
        setError('Lo ya ahorrado no puede ser negativo.')
        return
      }
      inicial = toApi(parseado)
    }

    try {
      await crear.mutateAsync({
        nombre,
        moneda,
        monto_objetivo: toApi(objetivo),
        monto_inicial: inicial,
        fecha_objetivo: fechaObjetivo || null,
        account_id: accountId || null,
        notas: notas.trim() || null,
      })
      onListo()
    } catch (fallo) {
      setError(mensajeDeError(fallo, 'No se pudo crear la meta'))
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-4">
      <Field label="Nombre">
        <Input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Viaje, cuota inicial, fondo de emergencia…"
          required
          autoFocus
          maxLength={120}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Objetivo">
          <Input
            value={objetivoTexto}
            onChange={(e) => setObjetivoTexto(e.target.value)}
            placeholder="18.000.000"
            inputMode="decimal"
            required
          />
        </Field>

        <Field label="Moneda" hint="No se puede cambiar después.">
          <Select value={moneda} onChange={(e) => setMoneda(e.target.value as Currency)}>
            <option value="COP">COP</option>
            <option value="USD">USD</option>
          </Select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Ya tengo ahorrado" hint="Opcional. Entra como primer aporte.">
          <Input
            value={inicialTexto}
            onChange={(e) => setInicialTexto(e.target.value)}
            placeholder="0"
            inputMode="decimal"
          />
        </Field>

        <Field label="Fecha objetivo" hint="Opcional.">
          <Input
            type="date"
            value={fechaObjetivo}
            onChange={(e) => setFechaObjetivo(e.target.value)}
          />
        </Field>
      </div>

      <Field label="Cuenta asociada" hint="Opcional e informativa: el avance sale de los aportes.">
        <Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          <option value="">Ninguna</option>
          {(cuentas.data ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Notas" hint="Opcional.">
        <Textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} />
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

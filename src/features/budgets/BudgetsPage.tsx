import { ChevronLeft, ChevronRight, Copy, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Monto } from '@/components/Monto'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
  useBudgetStatus,
  useBudgets,
  useCategories,
  useCopyBudgets,
  useCreateBudget,
  useDeleteBudget,
  useUpdateBudget,
} from '@/hooks/useFinance'
import { mensajeDeError } from '@/lib/api'
import {
  type MesNumerico,
  etiquetaMes,
  mesActualNumerico,
  mismosMeses,
  sumarMeses,
} from '@/lib/dates'
import { type Currency, fromApi, isNegative, parseInput, toApi } from '@/lib/money'
import type { BudgetLine, BudgetState } from '@/lib/types'

const GRIS = '#94A3B8'

/** Colores del semáforo. El estado lo decide el backend: aquí solo se pinta. */
const COLOR_ESTADO: Record<BudgetState, string> = {
  ok: 'bg-income',
  alerta: 'bg-amber-500',
  excedido: 'bg-expense',
}

const TEXTO_ESTADO: Record<BudgetState, string> = {
  ok: 'En rango',
  alerta: 'Cerca del límite',
  excedido: 'Excedido',
}

export function BudgetsPage() {
  const { user } = useAuth()
  const moneda = user?.moneda_base ?? 'COP'

  const [mes, setMes] = useState<MesNumerico>(mesActualNumerico())
  const status = useBudgetStatus(mes)
  const copiar = useCopyBudgets()
  const borrar = useDeleteBudget()

  const [nuevo, setNuevo] = useState(false)
  const [editando, setEditando] = useState<BudgetLine | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const esMesActual = mismosMeses(mes, mesActualNumerico())
  const lineas = status.data?.lineas ?? []

  async function copiarDelAnterior() {
    setError(null)
    setAviso(null)
    try {
      const r = await copiar.mutateAsync(mes)
      setAviso(
        r.copiados === 0
          ? `Todas las categorías del mes anterior ya tenían presupuesto aquí (${r.omitidos}). No se tocó ninguna.`
          : `Se copiaron ${r.copiados} presupuestos.` +
              (r.omitidos ? ` ${r.omitidos} ya existían y se dejaron intactos.` : ''),
      )
    } catch (fallo) {
      setError(mensajeDeError(fallo))
    }
  }

  async function eliminar(linea: BudgetLine) {
    if (!window.confirm(`¿Quitar el presupuesto de "${linea.categoria}"?`)) return
    setError(null)
    try {
      await borrar.mutateAsync(linea.id)
    } catch (fallo) {
      setError(mensajeDeError(fallo))
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Presupuestos</h1>
          <p className="text-sm text-muted-foreground">
            Cuánto pensabas gastar y cuánto llevas, mes a mes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-md border bg-card px-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMes(sumarMeses(mes, -1))}
              aria-label="Mes anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[8.5rem] text-center text-sm font-medium capitalize">
              {etiquetaMes(mes)}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMes(sumarMeses(mes, 1))}
              aria-label="Mes siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" onClick={() => void copiarDelAnterior()} disabled={copiar.isPending}>
            {copiar.isPending ? <Spinner className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            Copiar del mes anterior
          </Button>
          <Button onClick={() => setNuevo(true)}>
            <Plus className="h-4 w-4" />
            Presupuesto
          </Button>
        </div>
      </header>

      {error && <ErrorState mensaje={error} />}
      {aviso && (
        <div className="rounded-md border bg-card px-4 py-3 text-sm text-muted-foreground">
          {aviso}
        </div>
      )}
      {!esMesActual && (
        <div className="rounded-md border bg-muted/40 px-4 py-2 text-sm text-muted-foreground">
          Estás viendo un mes distinto al actual.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Resumen titulo="Presupuestado" valor={status.data?.total_limite} moneda={moneda} />
        <Resumen titulo="Ejecutado" valor={status.data?.total_ejecutado} moneda={moneda} />
        <Resumen
          titulo="Disponible"
          valor={status.data?.total_disponible}
          moneda={moneda}
          colorear
          detalle="Negativo si ya te pasaste del total"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Por categoría</CardTitle>
        </CardHeader>
        <CardContent>
          {status.isPending ? (
            <div className="flex h-40 items-center justify-center">
              <Spinner />
            </div>
          ) : lineas.length === 0 ? (
            <EmptyState
              titulo={`Sin presupuestos en ${etiquetaMes(mes)}`}
              descripcion="Define un límite por categoría, o copia los del mes anterior."
              accion={
                <Button onClick={() => setNuevo(true)}>
                  <Plus className="h-4 w-4" />
                  Crear presupuesto
                </Button>
              }
            />
          ) : (
            <ul className="space-y-5">
              {lineas.map((linea) => (
                <li key={linea.id}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="flex items-center gap-2 font-medium">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: linea.color ?? GRIS }}
                      />
                      {linea.categoria}
                    </span>
                    <span className="text-sm tabular">
                      <Monto valor={linea.ejecutado} moneda={moneda} />
                      <span className="text-muted-foreground">
                        {' de '}
                        <Monto valor={linea.monto_limite} moneda={moneda} />
                      </span>
                    </span>
                  </div>

                  <div className="mt-2 flex items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      {/*
                        `porcentaje` viene del backend y es un número, no dinero:
                        se usa solo para el ancho de la barra. Se topa en 100
                        para que un excedido no se salga del riel; que se pasó ya
                        lo dice el color.
                      */}
                      <div
                        className={`h-full rounded-full transition-all ${COLOR_ESTADO[linea.estado]}`}
                        style={{ width: `${Math.min(linea.porcentaje, 100)}%` }}
                      />
                    </div>
                    <span className="w-12 shrink-0 text-right text-sm tabular text-muted-foreground">
                      {linea.porcentaje.toFixed(0)}%
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditando(linea)}
                      aria-label={`Editar presupuesto de ${linea.categoria}`}
                    >
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void eliminar(linea)}
                      aria-label={`Quitar presupuesto de ${linea.categoria}`}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>

                  <p className="mt-1 text-xs text-muted-foreground">
                    {TEXTO_ESTADO[linea.estado]} ·{' '}
                    {/*
                      `fromApi` y no `parseInput`: este string viene del API, no
                      de un formulario. El signo de `disponible` ya dice si sobra
                      o falta, así que el monto se muestra sin él.
                    */}
                    {isNegative(fromApi(linea.disponible, moneda))
                      ? 'te pasaste por '
                      : 'te quedan '}
                    <Monto valor={linea.disponible} moneda={moneda} sinSigno />
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {status.data && status.data.sin_presupuesto.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Gasto sin presupuesto</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-muted-foreground">
              Gastaste <Monto valor={status.data.total_sin_presupuesto} moneda={moneda} /> en
              categorías que no tienen límite definido este mes.
            </p>
            <ul className="divide-y">
              {status.data.sin_presupuesto.map((item) => (
                <li
                  key={item.category_id ?? item.categoria}
                  className="flex items-center gap-2 py-2 text-sm"
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: item.color ?? GRIS }}
                  />
                  <span className="flex-1 truncate">{item.categoria}</span>
                  <Monto valor={item.ejecutado} moneda={moneda} />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Dialog
        open={nuevo}
        onClose={() => setNuevo(false)}
        title={`Nuevo presupuesto · ${etiquetaMes(mes)}`}
        description="Solo se presupuestan categorías de gasto: no se limita lo que entra."
      >
        <BudgetForm mes={mes} moneda={moneda} onListo={() => setNuevo(false)} />
      </Dialog>

      <Dialog
        open={editando !== null}
        onClose={() => setEditando(null)}
        title={editando ? `Presupuesto de ${editando.categoria}` : ''}
      >
        {editando && (
          <BudgetEditForm
            linea={editando}
            moneda={moneda}
            onListo={() => setEditando(null)}
          />
        )}
      </Dialog>
    </div>
  )
}

function Resumen({
  titulo,
  valor,
  moneda,
  colorear,
  detalle,
}: {
  titulo: string
  valor: string | undefined
  moneda: Currency
  colorear?: boolean
  detalle?: string
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm font-medium text-muted-foreground">{titulo}</p>
        <div className="mt-2 text-2xl font-semibold">
          {valor === undefined ? (
            <div className="h-8 w-32 animate-pulse rounded bg-muted" />
          ) : (
            <Monto valor={valor} moneda={moneda} colorear={colorear} />
          )}
        </div>
        {detalle && <p className="mt-1 text-xs text-muted-foreground">{detalle}</p>}
      </CardContent>
    </Card>
  )
}

function BudgetForm({
  mes,
  moneda,
  onListo,
}: {
  mes: MesNumerico
  moneda: Currency
  onListo: () => void
}) {
  const crear = useCreateBudget()
  const categorias = useCategories()
  const yaPresupuestadas = useBudgets(mes)

  const [categoryId, setCategoryId] = useState('')
  const [limiteTexto, setLimiteTexto] = useState('')
  const [alerta, setAlerta] = useState('80')
  const [error, setError] = useState<string | null>(null)

  // Solo categorías de gasto que todavía no tienen presupuesto este mes: la
  // alternativa es dejar elegir una y responder con un 409 evitable.
  const usadas = new Set((yaPresupuestadas.data ?? []).map((b) => b.category_id))
  const disponibles = (categorias.data ?? []).filter(
    (c) => c.tipo === 'gasto' && !usadas.has(c.id),
  )

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault()
    setError(null)

    const limite = parseInput(limiteTexto, moneda)
    if (!limite || isNegative(limite)) {
      setError('El límite debe ser un monto positivo.')
      return
    }

    try {
      await crear.mutateAsync({
        category_id: categoryId,
        anio: mes.anio,
        mes: mes.mes,
        monto_limite: toApi(limite),
        alerta_pct: alerta,
      })
      onListo()
    } catch (fallo) {
      setError(mensajeDeError(fallo, 'No se pudo crear el presupuesto'))
    }
  }

  if (categorias.isPending || yaPresupuestadas.isPending) {
    return (
      <div className="flex h-24 items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (disponibles.length === 0) {
    return (
      <EmptyState
        titulo="Todas tus categorías de gasto ya tienen presupuesto este mes"
        descripcion="Edita uno existente, o crea una categoría nueva."
      />
    )
  }

  return (
    <form onSubmit={enviar} className="space-y-4">
      <Field label="Categoría">
        <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
          <option value="">Elige una…</option>
          {disponibles.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </Select>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Límite del mes">
          <Input
            value={limiteTexto}
            onChange={(e) => setLimiteTexto(e.target.value)}
            placeholder="500.000"
            inputMode="decimal"
            required
            autoFocus
          />
        </Field>

        <Field label="Avisar al %" hint="Cuándo pasar a ámbar.">
          <Input
            value={alerta}
            onChange={(e) => setAlerta(e.target.value)}
            inputMode="numeric"
            required
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
          Crear
        </Button>
      </div>
    </form>
  )
}

function BudgetEditForm({
  linea,
  moneda,
  onListo,
}: {
  linea: BudgetLine
  moneda: Currency
  onListo: () => void
}) {
  const actualizar = useUpdateBudget()
  const [limiteTexto, setLimiteTexto] = useState(linea.monto_limite)
  const [alerta, setAlerta] = useState(linea.alerta_pct)
  const [error, setError] = useState<string | null>(null)

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault()
    setError(null)

    const limite = parseInput(limiteTexto, moneda)
    if (!limite || isNegative(limite)) {
      setError('El límite debe ser un monto positivo.')
      return
    }

    try {
      await actualizar.mutateAsync({
        id: linea.id,
        monto_limite: toApi(limite),
        alerta_pct: alerta,
      })
      onListo()
    } catch (fallo) {
      setError(mensajeDeError(fallo))
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Llevas <Monto valor={linea.ejecutado} moneda={moneda} /> ejecutados. Ni la categoría
        ni el mes se pueden mover: para eso, quita este presupuesto y crea el que corresponde.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Límite del mes">
          <Input
            value={limiteTexto}
            onChange={(e) => setLimiteTexto(e.target.value)}
            inputMode="decimal"
            required
            autoFocus
          />
        </Field>
        <Field label="Avisar al %">
          <Input
            value={alerta}
            onChange={(e) => setAlerta(e.target.value)}
            inputMode="numeric"
            required
          />
        </Field>
      </div>

      {error && <ErrorState mensaje={error} />}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onListo}>
          Cancelar
        </Button>
        <Button type="submit" disabled={actualizar.isPending}>
          {actualizar.isPending && <Spinner className="h-4 w-4" />}
          Guardar
        </Button>
      </div>
    </form>
  )
}

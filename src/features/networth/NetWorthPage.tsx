import { Landmark, Plus, Scale, TrendingDown, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Monto } from '@/components/Monto'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  EmptyState,
  ErrorState,
  Select,
  Spinner,
} from '@/components/ui'
import { AssetForm } from '@/features/networth/AssetForm'
import { LiabilityForm } from '@/features/networth/LiabilityForm'
import { PositionDialog } from '@/features/networth/PositionDialog'
import { useAuth } from '@/features/auth/AuthContext'
import {
  useAssets,
  useLiabilities,
  useNetWorthComposition,
  useNetWorthSeries,
} from '@/hooks/useFinance'
import { mensajeDeError } from '@/lib/api'
import { compacto } from '@/lib/charts'
import { formatearFecha, mesCorto, ultimosMeses, anioActual } from '@/lib/dates'
import { type Currency, format, fromApi } from '@/lib/money'
import {
  ASSET_TYPE_LABEL,
  LIABILITY_TYPE_LABEL,
  type Asset,
  type AssetType,
  type Liability,
  type LiabilityType,
  type NetWorthPoint,
} from '@/lib/types'

const VERDE = 'hsl(142 71% 33%)'
const ROJO = 'hsl(0 72% 51%)'
const AZUL = 'hsl(221 83% 45%)'

const PERIODOS = [
  { valor: '6', etiqueta: 'Últimos 6 meses' },
  { valor: '12', etiqueta: 'Últimos 12 meses' },
  { valor: '24', etiqueta: 'Últimos 24 meses' },
  { valor: 'anio', etiqueta: 'Este año' },
] as const

type Periodo = (typeof PERIODOS)[number]['valor']

/** Que se esta viendo en el modal de detalle. */
type Seleccion = { clase: 'activo' | 'deuda'; id: string } | null

export function NetWorthPage() {
  const { user } = useAuth()
  const moneda = user?.moneda_base ?? 'COP'

  const [periodo, setPeriodo] = useState<Periodo>('12')
  const rango = periodo === 'anio' ? anioActual() : ultimosMeses(Number(periodo))

  const serie = useNetWorthSeries(rango)
  const composicion = useNetWorthComposition()
  const activos = useAssets()
  const deudas = useLiabilities()

  const [nuevoActivo, setNuevoActivo] = useState(false)
  const [nuevaDeuda, setNuevaDeuda] = useState(false)
  const [seleccion, setSeleccion] = useState<Seleccion>(null)

  const puntos = serie.data?.puntos ?? []
  const hayEstimadas = puntos.some((p) => p.tasa_estimada)
  const vacio = !activos.data?.length && !deudas.data?.length

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Patrimonio</h1>
          <p className="text-sm text-muted-foreground">
            Lo que tienes menos lo que debes, mes a mes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            className="w-44"
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value as Periodo)}
            aria-label="Período"
          >
            {PERIODOS.map((p) => (
              <option key={p.valor} value={p.valor}>
                {p.etiqueta}
              </option>
            ))}
          </Select>
          <Button variant="outline" onClick={() => setNuevaDeuda(true)}>
            <Plus className="h-4 w-4" />
            Deuda
          </Button>
          <Button onClick={() => setNuevoActivo(true)}>
            <Plus className="h-4 w-4" />
            Activo
          </Button>
        </div>
      </header>

      {serie.isError && <ErrorState mensaje={mensajeDeError(serie.error)} />}
      {composicion.isError && <ErrorState mensaje={mensajeDeError(composicion.error)} />}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          titulo="Patrimonio neto"
          valor={composicion.data?.patrimonio_neto}
          moneda={moneda}
          Icono={Scale}
          colorear
          detalle={
            composicion.data ? `Al ${formatearFecha(composicion.data.fecha)}` : undefined
          }
          cargando={composicion.isPending}
        />
        <Kpi
          titulo="Activos"
          valor={composicion.data?.total_activos}
          moneda={moneda}
          Icono={Landmark}
          clase="text-income"
          cargando={composicion.isPending}
        />
        <Kpi
          titulo="Deudas"
          valor={composicion.data?.total_pasivos}
          moneda={moneda}
          Icono={TrendingDown}
          clase="text-expense"
          cargando={composicion.isPending}
        />
        <Kpi
          titulo="Variación del período"
          valor={serie.data?.variacion}
          moneda={moneda}
          Icono={TrendingUp}
          colorear
          detalle={
            serie.data?.variacion_pct != null
              ? `${serie.data.variacion_pct >= 0 ? '+' : ''}${serie.data.variacion_pct.toFixed(1)}% desde el inicio del período`
              : 'Se necesitan al menos dos meses para comparar'
          }
          cargando={serie.isPending}
        />
      </div>

      {hayEstimadas && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
          <span className="font-medium">Algunos meses usan una tasa estimada.</span>{' '}
          No había tasa de cambio registrada para ese cierre y se tomó la más cercana
          anterior. Registra las tasas faltantes y el patrimonio se recalcula solo.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Patrimonio neto en el tiempo</CardTitle>
        </CardHeader>
        <CardContent>
          {serie.isPending ? (
            <div className="flex h-[320px] items-center justify-center">
              <Spinner />
            </div>
          ) : puntos.length === 0 ? (
            <EmptyState
              titulo="Todavía no hay historia que mostrar"
              descripcion="Registra un activo o una deuda y la serie mensual se construye sola."
              accion={
                <Button onClick={() => setNuevoActivo(true)}>
                  <Plus className="h-4 w-4" />
                  Registrar activo
                </Button>
              }
            />
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={puntos} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis
                  dataKey="fecha"
                  tickFormatter={mesCorto}
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  width={70}
                  tickFormatter={(v: number) => compacto(v, moneda)}
                />
                <ReferenceLine y={0} stroke="currentColor" opacity={0.35} />
                <Tooltip content={<TooltipPatrimonio moneda={moneda} />} />

                {/*
                  Los `dataKey` convierten a number porque Recharts necesita
                  numeros para calcular geometria. El numero se usa solo para
                  pintar: el tooltip formatea desde el string original.
                  Las deudas van NEGADAS para dibujarse bajo el eje.
                */}
                <Area
                  name="Activos"
                  dataKey={(p: NetWorthPoint) => Number(p.total_activos)}
                  stroke={VERDE}
                  fill={VERDE}
                  fillOpacity={0.18}
                  strokeWidth={1.5}
                />
                <Area
                  name="Deudas"
                  dataKey={(p: NetWorthPoint) => -Number(p.total_pasivos)}
                  stroke={ROJO}
                  fill={ROJO}
                  fillOpacity={0.18}
                  strokeWidth={1.5}
                />
                <Line
                  name="Patrimonio neto"
                  dataKey={(p: NetWorthPoint) => Number(p.patrimonio_neto)}
                  stroke={AZUL}
                  strokeWidth={2.5}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {vacio && !activos.isPending && !deudas.isPending ? null : (
        <div className="grid gap-4 lg:grid-cols-2">
          <ListaPosiciones
            titulo="Activos"
            vacioTexto="Sin activos registrados."
            moneda={moneda}
            cargando={activos.isPending}
            items={(activos.data ?? []).map((a) => aFila(a, 'activo'))}
            onAbrir={(id) => setSeleccion({ clase: 'activo', id })}
            onNuevo={() => setNuevoActivo(true)}
          />
          <ListaPosiciones
            titulo="Deudas"
            vacioTexto="Sin deudas registradas. Mejor así."
            moneda={moneda}
            cargando={deudas.isPending}
            items={(deudas.data ?? []).map((d) => aFila(d, 'deuda'))}
            onAbrir={(id) => setSeleccion({ clase: 'deuda', id })}
            onNuevo={() => setNuevaDeuda(true)}
          />
        </div>
      )}

      <Dialog
        open={nuevoActivo}
        onClose={() => setNuevoActivo(false)}
        title="Nuevo activo"
        description="El valor que registres queda como su primera valuación. La moneda no se puede cambiar después."
      >
        <AssetForm onListo={() => setNuevoActivo(false)} />
      </Dialog>

      <Dialog
        open={nuevaDeuda}
        onClose={() => setNuevaDeuda(false)}
        title="Nueva deuda"
        description="El saldo va positivo: es lo que debes. En el patrimonio se resta solo."
      >
        <LiabilityForm onListo={() => setNuevaDeuda(false)} />
      </Dialog>

      <PositionDialog
        seleccion={seleccion}
        onClose={() => setSeleccion(null)}
        monedaBase={moneda}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Piezas
// ---------------------------------------------------------------------------

interface Fila {
  id: string
  nombre: string
  subtitulo: string
  monto: string
  moneda: Currency
  inactivo: boolean
  detalle: string | null
}

function aFila(item: Asset | Liability, clase: 'activo' | 'deuda'): Fila {
  if (clase === 'activo') {
    const a = item as Asset
    return {
      id: a.id,
      nombre: a.nombre,
      subtitulo: `${ASSET_TYPE_LABEL[a.tipo as AssetType]} · ${a.moneda}`,
      monto: a.valor_actual,
      moneda: a.moneda,
      inactivo: !a.activo,
      detalle: a.fecha_valor ? `Valorado el ${formatearFecha(a.fecha_valor)}` : null,
    }
  }
  const d = item as Liability
  return {
    id: d.id,
    nombre: d.nombre,
    subtitulo: `${LIABILITY_TYPE_LABEL[d.tipo as LiabilityType]} · ${d.moneda}`,
    monto: d.saldo_actual,
    moneda: d.moneda,
    inactivo: !d.activa,
    detalle: d.fecha_saldo ? `Saldo al ${formatearFecha(d.fecha_saldo)}` : null,
  }
}

function ListaPosiciones({
  titulo,
  vacioTexto,
  moneda,
  cargando,
  items,
  onAbrir,
  onNuevo,
}: {
  titulo: string
  vacioTexto: string
  moneda: Currency
  cargando: boolean
  items: Fila[]
  onAbrir: (id: string) => void
  onNuevo: () => void
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>{titulo}</CardTitle>
        <Button variant="ghost" size="sm" onClick={onNuevo}>
          <Plus className="h-3.5 w-3.5" />
          Agregar
        </Button>
      </CardHeader>
      <CardContent>
        {cargando ? (
          <div className="flex h-32 items-center justify-center">
            <Spinner />
          </div>
        ) : items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{vacioTexto}</p>
        ) : (
          <ul className="divide-y">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onAbrir(item.id)}
                  className="flex w-full items-center gap-3 py-3 text-left transition-colors hover:bg-accent/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 truncate font-medium">
                      {item.nombre}
                      {item.inactivo && (
                        <Badge className="text-muted-foreground">Inactivo</Badge>
                      )}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {item.subtitulo}
                      {item.detalle ? ` · ${item.detalle}` : ''}
                    </p>
                  </div>
                  <Monto
                    valor={item.monto}
                    moneda={item.moneda}
                    className="shrink-0 font-medium"
                  />
                </button>
              </li>
            ))}
          </ul>
        )}
        {items.length > 0 && (
          <p className="pt-3 text-xs text-muted-foreground">
            Los montos se muestran en su propia moneda. En el total de arriba van
            convertidos a {moneda}.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Tooltip propio para formatear desde los strings originales del API.
 *
 * El formatter por defecto recibiria el numero que consumio el eje -- y para
 * las deudas, ademas, ese numero esta negado para dibujarse bajo el cero.
 * Leyendo el punto original se muestran las cifras tal como son.
 */
function TooltipPatrimonio({
  active,
  payload,
  moneda,
}: {
  active?: boolean
  payload?: { payload: NetWorthPoint }[]
  moneda: Currency
}) {
  const punto = payload?.[0]?.payload
  if (!active || !punto) return null

  return (
    <div className="rounded-md border bg-card px-3 py-2 text-sm shadow-md">
      <p className="mb-1.5 font-medium">{formatearFecha(punto.fecha)}</p>
      <Linea etiqueta="Activos" valor={punto.total_activos} moneda={moneda} color={VERDE} />
      <Linea etiqueta="Deudas" valor={punto.total_pasivos} moneda={moneda} color={ROJO} />
      <div className="mt-1.5 border-t pt-1.5">
        <Linea
          etiqueta="Patrimonio neto"
          valor={punto.patrimonio_neto}
          moneda={moneda}
          color={AZUL}
        />
      </div>
      {punto.tasa_estimada && (
        <p className="mt-1.5 text-xs text-muted-foreground">Tasa de cambio estimada</p>
      )}
    </div>
  )
}

function Linea({
  etiqueta,
  valor,
  moneda,
  color,
}: {
  etiqueta: string
  valor: string
  moneda: Currency
  color: string
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <span className="flex-1 text-muted-foreground">{etiqueta}</span>
      <span className="tabular font-medium">{format(fromApi(valor, moneda))}</span>
    </div>
  )
}

function Kpi({
  titulo,
  valor,
  moneda,
  Icono,
  clase,
  colorear,
  detalle,
  cargando,
}: {
  titulo: string
  valor: string | undefined
  moneda: Currency
  Icono: typeof Scale
  clase?: string
  colorear?: boolean
  detalle?: string
  cargando: boolean
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{titulo}</p>
          <Icono className={`h-4 w-4 ${clase ?? 'text-muted-foreground'}`} />
        </div>
        <div className="mt-2 text-2xl font-semibold">
          {cargando || valor === undefined ? (
            <div className="h-8 w-32 animate-pulse rounded bg-muted" />
          ) : (
            <Monto valor={valor} moneda={moneda} colorear={colorear} className={clase} />
          )}
        </div>
        {detalle && <p className="mt-1 text-xs text-muted-foreground">{detalle}</p>}
      </CardContent>
    </Card>
  )
}

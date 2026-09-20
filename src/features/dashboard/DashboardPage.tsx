import { ArrowDownRight, ArrowUpRight, Scale, Wallet } from 'lucide-react'
import { useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Monto } from '@/components/Monto'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  ErrorState,
  Select,
  Spinner,
  Table,
  Td,
  Th,
  Tr,
} from '@/components/ui'
import { useAuth } from '@/features/auth/AuthContext'
import { useByCategory, useCashflow, useSummary, useTransactions } from '@/hooks/useFinance'
import { mensajeDeError } from '@/lib/api'
import { compacto } from '@/lib/charts'
import { RANGOS, type NombreRango, formatearFecha, mesCorto, rangoPorNombre } from '@/lib/dates'
import { type Currency, format, fromApi } from '@/lib/money'

const GRIS = '#94A3B8'

export function DashboardPage() {
  const { user } = useAuth()
  const [nombreRango, setNombreRango] = useState<NombreRango>('mes')
  const rango = rangoPorNombre(nombreRango)
  const moneda = user?.moneda_base ?? 'COP'

  const resumen = useSummary(rango)
  const flujo = useCashflow(rangoPorNombre(nombreRango === 'mes' ? 'semestre' : nombreRango))
  const gastos = useByCategory(rango, 'gasto')
  const recientes = useTransactions({ ...rango, page_size: 8 })

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tablero</h1>
          <p className="text-sm text-muted-foreground">
            Hola, {user?.nombre}. Así vas en el período seleccionado.
          </p>
        </div>
        <Select
          className="w-48"
          value={nombreRango}
          onChange={(e) => setNombreRango(e.target.value as NombreRango)}
          aria-label="Período"
        >
          {RANGOS.map((r) => (
            <option key={r.valor} value={r.valor}>
              {r.etiqueta}
            </option>
          ))}
        </Select>
      </header>

      {resumen.isError && <ErrorState mensaje={mensajeDeError(resumen.error)} />}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          titulo="Ingresos"
          valor={resumen.data?.ingresos}
          moneda={moneda}
          Icono={ArrowUpRight}
          clase="text-income"
          cargando={resumen.isPending}
        />
        <Kpi
          titulo="Gastos"
          valor={resumen.data?.gastos}
          moneda={moneda}
          Icono={ArrowDownRight}
          clase="text-expense"
          cargando={resumen.isPending}
        />
        <Kpi
          titulo="Balance del período"
          valor={resumen.data?.neto}
          moneda={moneda}
          Icono={Scale}
          colorear
          cargando={resumen.isPending}
        />
        <Kpi
          titulo="Saldo total"
          valor={resumen.data?.saldo_total}
          moneda={moneda}
          Icono={Wallet}
          detalle="Todas las cuentas activas, convertidas a tu moneda base"
          cargando={resumen.isPending}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Ingresos y gastos por mes</CardTitle>
          </CardHeader>
          <CardContent>
            {flujo.isPending ? (
              <Centro>
                <Spinner />
              </Centro>
            ) : !flujo.data?.length ? (
              <EmptyState titulo="Sin movimientos en el período" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={flujo.data}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="mes" tickFormatter={mesCorto} fontSize={12} tickLine={false} />
                  <YAxis
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    width={70}
                    tickFormatter={(v: number) => compacto(v, moneda)}
                  />
                  <Tooltip
                    formatter={(v: number, nombre) => [
                      format(fromApi(String(v), moneda)),
                      nombre === 'ingresos' ? 'Ingresos' : 'Gastos',
                    ]}
                    labelFormatter={(v: string) => mesCorto(v)}
                  />
                  <Legend
                    formatter={(v) => (v === 'ingresos' ? 'Ingresos' : 'Gastos')}
                    iconType="circle"
                  />
                  <Bar dataKey="ingresos" fill="hsl(142 71% 33%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="gastos" fill="hsl(0 72% 51%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>En qué se fue la plata</CardTitle>
          </CardHeader>
          <CardContent>
            {gastos.isPending ? (
              <Centro>
                <Spinner />
              </Centro>
            ) : !gastos.data?.items.length ? (
              <EmptyState titulo="Sin gastos en el período" />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={gastos.data.items}
                      dataKey={(item) => Number(item.total)}
                      nameKey="nombre"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={2}
                    >
                      {gastos.data.items.map((item) => (
                        <Cell key={item.nombre} fill={item.color ?? GRIS} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number) => format(fromApi(String(v), moneda))}
                    />
                  </PieChart>
                </ResponsiveContainer>

                <ul className="mt-3 space-y-1.5">
                  {gastos.data.items.slice(0, 5).map((item) => (
                    <li key={item.nombre} className="flex items-center gap-2 text-sm">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: item.color ?? GRIS }}
                      />
                      <span className="flex-1 truncate">{item.nombre}</span>
                      <span className="text-muted-foreground tabular">
                        {item.porcentaje.toFixed(0)}%
                      </span>
                      <Monto valor={item.total} moneda={moneda} className="w-28 text-right" />
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Últimos movimientos</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {recientes.isPending ? (
            <Centro>
              <Spinner />
            </Centro>
          ) : !recientes.data?.items.length ? (
            <EmptyState
              titulo="Todavía no hay movimientos"
              descripcion="Registra tu primer ingreso o gasto desde la sección Movimientos."
            />
          ) : (
            <Table>
              <thead>
                <tr className="border-b">
                  <Th>Fecha</Th>
                  <Th>Descripción</Th>
                  <Th>Categoría</Th>
                  <Th>Cuenta</Th>
                  <Th className="text-right">Monto</Th>
                </tr>
              </thead>
              <tbody>
                {recientes.data.items.map((t) => (
                  <Tr key={t.id}>
                    <Td className="whitespace-nowrap text-muted-foreground">
                      {formatearFecha(t.fecha)}
                    </Td>
                    <Td className="font-medium">{t.descripcion}</Td>
                    <Td className="text-muted-foreground">{t.category?.nombre ?? '—'}</Td>
                    <Td className="text-muted-foreground">{t.account.nombre}</Td>
                    <Td className="text-right">
                      <Monto valor={t.monto} moneda={t.moneda} colorear />
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>
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
  Icono: typeof Wallet
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

function Centro({ children }: { children: React.ReactNode }) {
  return <div className="flex h-[200px] items-center justify-center">{children}</div>
}

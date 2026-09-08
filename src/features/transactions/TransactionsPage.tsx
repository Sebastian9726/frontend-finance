import { ArrowLeftRight, Plus, Trash2 } from 'lucide-react'
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
  Input,
  Select,
  Spinner,
  Table,
  Td,
  Th,
  Tr,
} from '@/components/ui'
import {
  type FiltrosTransacciones,
  useAccounts,
  useCategories,
  useDeleteTransaction,
  useTransactions,
} from '@/hooks/useFinance'
import { mensajeDeError } from '@/lib/api'
import { RANGOS, type NombreRango, formatearFecha, rangoPorNombre } from '@/lib/dates'
import { TransactionForm, TransferForm } from './TransactionForm'

const POR_PAGINA = 25

export function TransactionsPage() {
  const cuentas = useAccounts()
  const categorias = useCategories()
  const borrar = useDeleteTransaction()

  const [nombreRango, setNombreRango] = useState<NombreRango>('mes')
  const [cuentaId, setCuentaId] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [tipo, setTipo] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [pagina, setPagina] = useState(1)
  const [dialogo, setDialogo] = useState<'movimiento' | 'traslado' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const filtros: FiltrosTransacciones = {
    ...rangoPorNombre(nombreRango),
    account_id: cuentaId || undefined,
    category_id: categoriaId || undefined,
    tipo: tipo || undefined,
    q: busqueda || undefined,
    page: pagina,
    page_size: POR_PAGINA,
  }
  const transacciones = useTransactions(filtros)

  // Cualquier cambio de filtro devuelve a la primera pagina: quedarse en la 4
  // de un resultado que ahora tiene 2 mostraria una tabla vacia sin explicacion.
  function alFiltrar<T>(set: (valor: T) => void) {
    return (valor: T) => {
      set(valor)
      setPagina(1)
    }
  }

  const total = transacciones.data?.total ?? 0
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA))

  async function eliminar(id: string, esTransferencia: boolean) {
    const mensaje = esTransferencia
      ? '¿Borrar este traslado? Se eliminarán sus dos movimientos.'
      : '¿Borrar este movimiento?'
    if (!window.confirm(mensaje)) return

    setError(null)
    try {
      await borrar.mutateAsync(id)
    } catch (fallo) {
      setError(mensajeDeError(fallo, 'No se pudo borrar'))
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Movimientos</h1>
          <p className="text-sm text-muted-foreground">
            {total} {total === 1 ? 'movimiento' : 'movimientos'} en el período
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setDialogo('traslado')}>
            <ArrowLeftRight className="h-4 w-4" />
            Trasladar
          </Button>
          <Button onClick={() => setDialogo('movimiento')}>
            <Plus className="h-4 w-4" />
            Nuevo
          </Button>
        </div>
      </header>

      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
          <Select
            value={nombreRango}
            onChange={(e) => alFiltrar(setNombreRango)(e.target.value as NombreRango)}
            aria-label="Período"
          >
            {RANGOS.map((r) => (
              <option key={r.valor} value={r.valor}>
                {r.etiqueta}
              </option>
            ))}
          </Select>

          <Select
            value={tipo}
            onChange={(e) => alFiltrar(setTipo)(e.target.value)}
            aria-label="Tipo"
          >
            <option value="">Todos los tipos</option>
            <option value="ingreso">Ingresos</option>
            <option value="gasto">Gastos</option>
            <option value="transferencia">Traslados</option>
          </Select>

          <Select
            value={cuentaId}
            onChange={(e) => alFiltrar(setCuentaId)(e.target.value)}
            aria-label="Cuenta"
          >
            <option value="">Todas las cuentas</option>
            {(cuentas.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </Select>

          <Select
            value={categoriaId}
            onChange={(e) => alFiltrar(setCategoriaId)(e.target.value)}
            aria-label="Categoría"
          >
            <option value="">Todas las categorías</option>
            {(categorias.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </Select>

          <Input
            value={busqueda}
            onChange={(e) => alFiltrar(setBusqueda)(e.target.value)}
            placeholder="Buscar descripción…"
            aria-label="Buscar"
          />
        </CardContent>
      </Card>

      {error && <ErrorState mensaje={error} />}
      {transacciones.isError && <ErrorState mensaje={mensajeDeError(transacciones.error)} />}

      <Card>
        <CardContent className="px-0 pt-0">
          {transacciones.isPending ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : !transacciones.data?.items.length ? (
            <EmptyState
              titulo="No hay movimientos"
              descripcion="Prueba con otro período o registra uno nuevo."
              accion={
                <Button onClick={() => setDialogo('movimiento')}>
                  <Plus className="h-4 w-4" />
                  Registrar movimiento
                </Button>
              }
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
                  <Th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {transacciones.data.items.map((t) => (
                  <Tr key={t.id}>
                    <Td className="whitespace-nowrap text-muted-foreground">
                      {formatearFecha(t.fecha)}
                    </Td>
                    <Td>
                      <div className="font-medium">{t.descripcion}</div>
                      {t.notas && (
                        <div className="text-xs text-muted-foreground">{t.notas}</div>
                      )}
                    </Td>
                    <Td>
                      {t.tipo === 'transferencia' ? (
                        <Badge className="text-muted-foreground">Traslado</Badge>
                      ) : t.category ? (
                        <Badge color={t.category.color}>{t.category.nombre}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </Td>
                    <Td className="text-muted-foreground">{t.account.nombre}</Td>
                    <Td className="text-right">
                      <Monto valor={t.monto} moneda={t.moneda} colorear />
                    </Td>
                    <Td>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Borrar ${t.descripcion}`}
                        onClick={() => void eliminar(t.id, t.transfer_group_id !== null)}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>

      {paginas > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Página {pagina} de {paginas}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagina === 1}
              onClick={() => setPagina((p) => p - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagina >= paginas}
              onClick={() => setPagina((p) => p + 1)}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      <Dialog
        open={dialogo === 'movimiento'}
        onClose={() => setDialogo(null)}
        title="Nuevo movimiento"
      >
        <TransactionForm onListo={() => setDialogo(null)} />
      </Dialog>

      <Dialog
        open={dialogo === 'traslado'}
        onClose={() => setDialogo(null)}
        title="Trasladar entre cuentas"
        description="No cuenta como ingreso ni como gasto: solo mueve el dinero."
      >
        <TransferForm onListo={() => setDialogo(null)} />
      </Dialog>
    </div>
  )
}

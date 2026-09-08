import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  ErrorState,
  Field,
  Input,
  Select,
  Spinner,
} from '@/components/ui'
import { useCategories, useCreateCategory, useDeleteCategory } from '@/hooks/useFinance'
import { mensajeDeError } from '@/lib/api'
import type { Category, CategoryType } from '@/lib/types'

export function CategoriesPage() {
  const categorias = useCategories()
  const borrar = useDeleteCategory()
  const [abierto, setAbierto] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const ingresos = (categorias.data ?? []).filter((c) => c.tipo === 'ingreso')
  const gastos = (categorias.data ?? []).filter((c) => c.tipo === 'gasto')

  async function eliminar(categoria: Category) {
    const confirmado = window.confirm(
      `¿Borrar "${categoria.nombre}"? Los movimientos que la usaban quedarán sin categoría, no se borran.`,
    )
    if (!confirmado) return

    setError(null)
    try {
      await borrar.mutateAsync(categoria.id)
    } catch (fallo) {
      setError(mensajeDeError(fallo))
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Categorías</h1>
          <p className="text-sm text-muted-foreground">
            Son tuyas: renómbralas o bórralas según cómo organices tus gastos.
          </p>
        </div>
        <Button onClick={() => setAbierto(true)}>
          <Plus className="h-4 w-4" />
          Nueva categoría
        </Button>
      </header>

      {error && <ErrorState mensaje={error} />}

      {categorias.isPending ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Grupo titulo="Gastos" items={gastos} onBorrar={eliminar} />
          <Grupo titulo="Ingresos" items={ingresos} onBorrar={eliminar} />
        </div>
      )}

      <Dialog open={abierto} onClose={() => setAbierto(false)} title="Nueva categoría">
        <CategoryForm onListo={() => setAbierto(false)} />
      </Dialog>
    </div>
  )
}

function Grupo({
  titulo,
  items,
  onBorrar,
}: {
  titulo: string
  items: Category[]
  onBorrar: (categoria: Category) => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {titulo}{' '}
          <span className="ml-1 text-sm font-normal text-muted-foreground">({items.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1">
          {items.map((categoria) => (
            <li
              key={categoria.id}
              className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-accent/50"
            >
              <Badge color={categoria.color} className="border-transparent">
                {categoria.nombre}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Borrar ${categoria.nombre}`}
                onClick={() => onBorrar(categoria)}
              >
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

const COLORES = [
  '#DC2626',
  '#EA580C',
  '#D97706',
  '#CA8A04',
  '#16A34A',
  '#0891B2',
  '#2563EB',
  '#7C3AED',
  '#DB2777',
  '#78716C',
]

function CategoryForm({ onListo }: { onListo: () => void }) {
  const crear = useCreateCategory()
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState<CategoryType>('gasto')
  const [color, setColor] = useState(COLORES[0]!)
  const [error, setError] = useState<string | null>(null)

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault()
    setError(null)
    try {
      await crear.mutateAsync({ nombre, tipo, color })
      onListo()
    } catch (fallo) {
      setError(mensajeDeError(fallo, 'No se pudo crear la categoría'))
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-4">
      <Field label="Nombre">
        <Input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
          autoFocus
          maxLength={120}
        />
      </Field>

      <Field label="Tipo">
        <Select value={tipo} onChange={(e) => setTipo(e.target.value as CategoryType)}>
          <option value="gasto">Gasto</option>
          <option value="ingreso">Ingreso</option>
        </Select>
      </Field>

      <Field label="Color">
        <div className="flex flex-wrap gap-2">
          {COLORES.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Color ${c}`}
              aria-pressed={color === c}
              onClick={() => setColor(c)}
              style={{ backgroundColor: c }}
              className={`h-7 w-7 rounded-full transition-transform ${
                color === c ? 'scale-110 ring-2 ring-ring ring-offset-2' : ''
              }`}
            />
          ))}
        </div>
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

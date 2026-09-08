import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { format, fromApi, parseInput, sum } from '@/lib/money'

interface DbHealth {
  status: string
  pgvector: string | null
}

/**
 * Pantalla de verificacion de la Fase 0.
 *
 * Confirma de una sola mirada que las piezas del andamiaje estan conectadas:
 * React renderiza, Tailwind aplica estilos, el backend responde a traves del
 * proxy y `money.ts` formatea sin perder centavos.
 *
 * Se reemplaza por el layout real de la aplicacion en la Fase 1.
 */
export function App() {
  const { data, isPending, isError, error } = useQuery<DbHealth>({
    queryKey: ['health', 'db'],
    queryFn: async () => (await axios.get<DbHealth>('/health/db')).data,
  })

  const ejemplos = ['1234567.89', '0.01', '-500.00'].map((raw) => fromApi(raw, 'COP'))
  const total = sum(ejemplos, 'COP')
  const escrito = parseInput('1.234.567,89', 'COP')

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 p-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Finanzas</h1>
        <p className="text-muted-foreground">Andamiaje verificado — Fase 0</p>
      </header>

      <section className="rounded-lg border bg-card p-5">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Backend
        </h2>
        {isPending && <p className="text-muted-foreground">Consultando…</p>}
        {isError && (
          <p className="text-destructive">
            Sin conexion: {error instanceof Error ? error.message : 'error desconocido'}
          </p>
        )}
        {data && (
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-muted-foreground">Estado</dt>
            <dd className="font-medium text-income">{data.status}</dd>
            <dt className="text-muted-foreground">pgvector</dt>
            <dd className="font-medium tabular">{data.pgvector ?? 'no instalado'}</dd>
          </dl>
        )}
      </section>

      <section className="rounded-lg border bg-card p-5">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Montos exactos
        </h2>
        <ul className="space-y-1 text-sm">
          {ejemplos.map((m, i) => (
            <li key={i} className="flex justify-between tabular">
              <span className="text-muted-foreground">unidades: {m.units}</span>
              <span className={m.units < 0 ? 'text-expense' : ''}>{format(m)}</span>
            </li>
          ))}
          <li className="flex justify-between border-t pt-1 font-medium tabular">
            <span>Suma</span>
            <span>{format(total)}</span>
          </li>
          <li className="flex justify-between text-muted-foreground tabular">
            <span>Escrito «1.234.567,89»</span>
            <span>{escrito ? format(escrito) : 'invalido'}</span>
          </li>
        </ul>
      </section>
    </main>
  )
}

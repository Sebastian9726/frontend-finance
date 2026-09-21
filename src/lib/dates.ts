/**
 * Fechas.
 *
 * Las fechas de la API son dias sin hora ("2026-06-15"). Se manipulan como
 * texto y no con `new Date(iso)`, porque ese constructor interpreta la cadena
 * como UTC medianoche y al mostrarla en Colombia (UTC-5) retrocede un dia: un
 * gasto del 1 de junio aparece como 31 de mayo.
 */

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const

function partes(iso: string): [number, number, number] {
  const [a = '0', m = '1', d = '1'] = iso.slice(0, 10).split('-')
  return [Number(a), Number(m), Number(d)]
}

/** "2026-06-15" -> "15 jun 2026" */
export function formatearFecha(iso: string): string {
  const [anio, mes, dia] = partes(iso)
  return `${dia} ${MESES[mes - 1]?.slice(0, 3)} ${anio}`
}

/** "2026-06-01" -> "junio 2026" */
export function formatearMes(iso: string): string {
  const [anio, mes] = partes(iso)
  return `${MESES[mes - 1]} ${anio}`
}

/** "2026-06-01" -> "jun" — para los ejes de las gráficas. */
export function mesCorto(iso: string): string {
  const [, mes] = partes(iso)
  return MESES[mes - 1]?.slice(0, 3) ?? ''
}

function aIso(fecha: Date): string {
  // Se usan los getters LOCALES, no toISOString(), que convierte a UTC y
  // puede devolver el día anterior.
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${fecha.getFullYear()}-${mes}-${dia}`
}

export function hoy(): string {
  return aIso(new Date())
}

export interface Rango {
  desde: string
  hasta: string
}

export function mesActual(): Rango {
  const ahora = new Date()
  return {
    desde: aIso(new Date(ahora.getFullYear(), ahora.getMonth(), 1)),
    hasta: aIso(new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0)),
  }
}

export function mesAnterior(): Rango {
  const ahora = new Date()
  return {
    desde: aIso(new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1)),
    hasta: aIso(new Date(ahora.getFullYear(), ahora.getMonth(), 0)),
  }
}

export function ultimosMeses(cantidad: number): Rango {
  const ahora = new Date()
  return {
    desde: aIso(new Date(ahora.getFullYear(), ahora.getMonth() - (cantidad - 1), 1)),
    hasta: aIso(new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0)),
  }
}

export function anioActual(): Rango {
  const anio = new Date().getFullYear()
  return { desde: `${anio}-01-01`, hasta: `${anio}-12-31` }
}

export type NombreRango = 'mes' | 'mes_anterior' | 'trimestre' | 'semestre' | 'anio'

export const RANGOS: { valor: NombreRango; etiqueta: string; calcular: () => Rango }[] = [
  { valor: 'mes', etiqueta: 'Este mes', calcular: mesActual },
  { valor: 'mes_anterior', etiqueta: 'Mes anterior', calcular: mesAnterior },
  { valor: 'trimestre', etiqueta: 'Últimos 3 meses', calcular: () => ultimosMeses(3) },
  { valor: 'semestre', etiqueta: 'Últimos 6 meses', calcular: () => ultimosMeses(6) },
  { valor: 'anio', etiqueta: 'Este año', calcular: anioActual },
]

export function rangoPorNombre(nombre: NombreRango): Rango {
  return (RANGOS.find((r) => r.valor === nombre) ?? RANGOS[0]!).calcular()
}

// ---------------------------------------------------------------------------
// Meses como año + número
// ---------------------------------------------------------------------------

/**
 * Un presupuesto no ocurre un día: es el mes entero. Por eso viaja como dos
 * enteros y no como una fecha, igual que en el backend. Así no hay forma de
 * compararlo por accidente contra un día suelto.
 */
export interface MesNumerico {
  anio: number
  mes: number
}

export function mesActualNumerico(): MesNumerico {
  const ahora = new Date()
  return { anio: ahora.getFullYear(), mes: ahora.getMonth() + 1 }
}

/** Avanza (o retrocede, con `n` negativo) sobre el calendario. */
export function sumarMeses({ anio, mes }: MesNumerico, n: number): MesNumerico {
  // Se opera sobre enteros, no sobre un Date: construir uno solo para sumar
  // meses trae de vuelta las zonas horarias que este módulo evita.
  const total = anio * 12 + (mes - 1) + n
  return { anio: Math.floor(total / 12), mes: (total % 12) + 1 }
}

/** `{ anio: 2026, mes: 6 }` -> "junio 2026" */
export function etiquetaMes({ anio, mes }: MesNumerico): string {
  return `${MESES[mes - 1]} ${anio}`
}

export function mismosMeses(a: MesNumerico, b: MesNumerico): boolean {
  return a.anio === b.anio && a.mes === b.mes
}

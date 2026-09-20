/**
 * Ayudas para las graficas.
 *
 * Recharts trabaja con `number`: necesita numeros para calcular geometria
 * (alto de una barra, punto de una linea). Esa conversion es la UNICA excepcion
 * permitida a la regla de que los montos no se tratan como numeros, y vive
 * confinada aqui y en los `dataKey` de los componentes.
 *
 * La regla que la hace segura: el numero se usa para PINTAR y nunca vuelve a
 * ser dinero. Las etiquetas y los tooltips se formatean desde el string
 * original con `fromApi`, no desde el numero que consumio el eje.
 */

import { type Currency, format, fromApi } from './money'

/**
 * Etiqueta corta para el eje Y ("4,5 M", "320 K").
 *
 * La division por un millon es aproximada a proposito: es para no llenar el
 * eje de ceros, no para informar una cifra.
 */
export function compacto(valor: number, moneda: Currency): string {
  if (Math.abs(valor) >= 1_000_000) {
    return `${(valor / 1_000_000).toLocaleString('es-CO', { maximumFractionDigits: 1 })} M`
  }
  if (Math.abs(valor) >= 1_000) {
    return `${(valor / 1_000).toLocaleString('es-CO', { maximumFractionDigits: 0 })} K`
  }
  return format(fromApi(String(valor), moneda), { showSymbol: false, decimals: 0 })
}

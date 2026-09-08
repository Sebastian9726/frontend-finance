import { cn } from '@/lib/utils'
import { type Currency, type Money, abs, format, fromApi, isNegative } from '@/lib/money'

/**
 * Muestra un monto que llega del API.
 *
 * Es el unico lugar donde la interfaz convierte el string del backend, para
 * que ningun componente lo pase por `parseFloat` ni lo trate como numero.
 */
export function Monto({
  valor,
  moneda,
  className,
  colorear = false,
  sinSigno = false,
}: {
  /** El string decimal tal como llega del API. */
  valor: string
  moneda: Currency
  className?: string
  /** Verde si es positivo, rojo si es negativo. */
  colorear?: boolean
  /** Muestra el valor absoluto: util cuando el signo ya lo dice el contexto. */
  sinSigno?: boolean
}) {
  const money = fromApi(valor, moneda)
  return (
    <MontoValor
      money={money}
      className={className}
      colorear={colorear}
      sinSigno={sinSigno}
    />
  )
}

export function MontoValor({
  money,
  className,
  colorear = false,
  sinSigno = false,
}: {
  money: Money
  className?: string
  colorear?: boolean
  sinSigno?: boolean
}) {
  const negativo = isNegative(money)
  return (
    <span
      className={cn(
        'tabular',
        colorear && (negativo ? 'text-expense' : 'text-income'),
        className,
      )}
    >
      {format(sinSigno ? abs(money) : money)}
    </span>
  )
}

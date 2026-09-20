import { useState } from 'react'
import { Button, ErrorState, Field, Input, Select, Spinner, Textarea } from '@/components/ui'
import { useCreateLiability } from '@/hooks/useFinance'
import { mensajeDeError } from '@/lib/api'
import { hoy } from '@/lib/dates'
import { type Currency, isNegative, parseInput, toApi } from '@/lib/money'
import { LIABILITY_TYPE_LABEL, type LiabilityType } from '@/lib/types'

export function LiabilityForm({ onListo }: { onListo: () => void }) {
  const crear = useCreateLiability()

  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState<LiabilityType>('hipoteca')
  const [moneda, setMoneda] = useState<Currency>('COP')
  const [saldoTexto, setSaldoTexto] = useState('')
  const [fechaSaldo, setFechaSaldo] = useState(hoy())
  const [principalTexto, setPrincipalTexto] = useState('')
  const [cuotaTexto, setCuotaTexto] = useState('')
  const [tasaTexto, setTasaTexto] = useState('')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [notas, setNotas] = useState('')
  const [error, setError] = useState<string | null>(null)

  /** Devuelve `undefined` si el texto no es un monto valido, para distinguir
   *  "en blanco" (null, valido) de "escrito mal" (error). */
  function montoOpcional(texto: string): string | null | undefined {
    if (!texto.trim()) return null
    const parseado = parseInput(texto, moneda)
    if (!parseado || isNegative(parseado)) return undefined
    return toApi(parseado)
  }

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault()
    setError(null)

    const saldo = parseInput(saldoTexto, moneda)
    if (!saldo) {
      setError('El saldo actual no es un monto válido.')
      return
    }
    // El saldo va POSITIVO: es lo que se debe. El signo lo pone la
    // consolidacion del patrimonio, que resta los pasivos.
    if (isNegative(saldo)) {
      setError('El saldo va en positivo: es lo que debes, no un monto con signo.')
      return
    }

    const principal = montoOpcional(principalTexto)
    if (principal === undefined) {
      setError('El monto original no es válido.')
      return
    }
    const cuota = montoOpcional(cuotaTexto)
    if (cuota === undefined) {
      setError('La cuota mensual no es un monto válido.')
      return
    }

    // La tasa de interes NO es dinero: es un porcentaje anual que viaja como
    // texto decimal simple. Por eso no pasa por parseInput ni por Money.
    const tasa = tasaTexto.trim()
    if (tasa && !/^\d+([.,]\d+)?$/.test(tasa)) {
      setError('La tasa de interés debe ser un porcentaje, por ejemplo 12,5.')
      return
    }

    if (fechaInicio && fechaFin && fechaFin < fechaInicio) {
      setError('La fecha de fin no puede ser anterior a la de inicio.')
      return
    }

    try {
      await crear.mutateAsync({
        nombre,
        tipo,
        moneda,
        saldo_actual: toApi(saldo),
        fecha_saldo: fechaSaldo,
        principal,
        cuota_mensual: cuota,
        tasa_interes: tasa ? tasa.replace(',', '.') : null,
        fecha_inicio: fechaInicio || null,
        fecha_fin: fechaFin || null,
        notas: notas.trim() || null,
      })
      onListo()
    } catch (fallo) {
      setError(mensajeDeError(fallo, 'No se pudo crear la deuda'))
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-4">
      <Field label="Nombre">
        <Input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Crédito hipotecario, Tarjeta Visa…"
          required
          autoFocus
          maxLength={120}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tipo">
          <Select value={tipo} onChange={(e) => setTipo(e.target.value as LiabilityType)}>
            {Object.entries(LIABILITY_TYPE_LABEL).map(([valor, etiqueta]) => (
              <option key={valor} value={valor}>
                {etiqueta}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Moneda" hint="No se puede cambiar después.">
          <Select value={moneda} onChange={(e) => setMoneda(e.target.value as Currency)}>
            <option value="COP">COP</option>
            <option value="USD">USD</option>
          </Select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Saldo actual" hint="Cuánto debes hoy. Va en positivo.">
          <Input
            value={saldoTexto}
            onChange={(e) => setSaldoTexto(e.target.value)}
            placeholder="185.000.000"
            inputMode="decimal"
            required
          />
        </Field>

        <Field label="Fecha del saldo">
          <Input
            type="date"
            value={fechaSaldo}
            onChange={(e) => setFechaSaldo(e.target.value)}
            required
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Monto original" hint="Opcional. Sirve para ver cuánto has abonado.">
          <Input
            value={principalTexto}
            onChange={(e) => setPrincipalTexto(e.target.value)}
            placeholder="210.000.000"
            inputMode="decimal"
          />
        </Field>

        <Field label="Cuota mensual" hint="Opcional.">
          <Input
            value={cuotaTexto}
            onChange={(e) => setCuotaTexto(e.target.value)}
            placeholder="1.950.000"
            inputMode="decimal"
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Tasa anual %" hint="Opcional.">
          <Input
            value={tasaTexto}
            onChange={(e) => setTasaTexto(e.target.value)}
            placeholder="11,8"
            inputMode="decimal"
          />
        </Field>

        <Field label="Inicio" hint="Opcional.">
          <Input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
          />
        </Field>

        <Field label="Fin" hint="Opcional.">
          <Input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
        </Field>
      </div>

      <Field label="Notas" hint="Opcional.">
        <Textarea
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          rows={2}
          placeholder="Entidad, número de obligación…"
        />
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

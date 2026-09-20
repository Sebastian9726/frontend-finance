import { useState } from 'react'
import { Button, ErrorState, Field, Input, Select, Spinner, Textarea } from '@/components/ui'
import { useCreateAsset } from '@/hooks/useFinance'
import { mensajeDeError } from '@/lib/api'
import { hoy } from '@/lib/dates'
import { type Currency, isNegative, parseInput, toApi } from '@/lib/money'
import { ASSET_TYPE_LABEL, type AssetType } from '@/lib/types'

export function AssetForm({ onListo }: { onListo: () => void }) {
  const crear = useCreateAsset()

  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState<AssetType>('inmueble')
  const [moneda, setMoneda] = useState<Currency>('COP')
  const [valorTexto, setValorTexto] = useState('')
  const [fechaValor, setFechaValor] = useState(hoy())
  const [costoTexto, setCostoTexto] = useState('')
  const [fechaAdquisicion, setFechaAdquisicion] = useState('')
  const [notas, setNotas] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault()
    setError(null)

    const valor = parseInput(valorTexto, moneda)
    if (!valor) {
      setError('El valor actual no es un monto válido.')
      return
    }
    // Refleja el CHECK `valor >= 0` de la base para que el error sea legible
    // aqui y no un 422 crudo. Un activo que vale menos que nada es una deuda.
    if (isNegative(valor)) {
      setError('El valor de un activo no puede ser negativo. Si debes dinero, regístralo como deuda.')
      return
    }

    // El costo es opcional: en blanco se manda null, y entonces el detalle no
    // reporta ganancia en vez de inventar una contra un costo de cero.
    let costo: string | null = null
    if (costoTexto.trim()) {
      const parseado = parseInput(costoTexto, moneda)
      if (!parseado || isNegative(parseado)) {
        setError('El costo de adquisición no es un monto válido.')
        return
      }
      costo = toApi(parseado)
    }

    try {
      await crear.mutateAsync({
        nombre,
        tipo,
        moneda,
        valor_actual: toApi(valor),
        fecha_valor: fechaValor,
        costo_adquisicion: costo,
        fecha_adquisicion: fechaAdquisicion || null,
        notas: notas.trim() || null,
      })
      onListo()
    } catch (fallo) {
      setError(mensajeDeError(fallo, 'No se pudo crear el activo'))
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-4">
      <Field label="Nombre">
        <Input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Apartamento, Carro, CDT…"
          required
          autoFocus
          maxLength={120}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tipo">
          <Select value={tipo} onChange={(e) => setTipo(e.target.value as AssetType)}>
            {Object.entries(ASSET_TYPE_LABEL).map(([valor, etiqueta]) => (
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
        <Field label="Valor actual" hint="Cuánto vale hoy.">
          <Input
            value={valorTexto}
            onChange={(e) => setValorTexto(e.target.value)}
            placeholder="350.000.000"
            inputMode="decimal"
            required
          />
        </Field>

        <Field
          label="Fecha del valor"
          hint="Si lo tienes desde antes, féchalo atrás y la serie lo incluye."
        >
          <Input
            type="date"
            value={fechaValor}
            onChange={(e) => setFechaValor(e.target.value)}
            required
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Costo de adquisición" hint="Opcional. Sirve para calcular la ganancia.">
          <Input
            value={costoTexto}
            onChange={(e) => setCostoTexto(e.target.value)}
            placeholder="300.000.000"
            inputMode="decimal"
          />
        </Field>

        <Field label="Fecha de adquisición" hint="Opcional.">
          <Input
            type="date"
            value={fechaAdquisicion}
            onChange={(e) => setFechaAdquisicion(e.target.value)}
          />
        </Field>
      </div>

      <Field label="Notas" hint="Opcional.">
        <Textarea
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          rows={2}
          placeholder="Matrícula, ubicación, referencia…"
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

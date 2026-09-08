import { describe, expect, it } from 'vitest'
import {
  MoneyError,
  add,
  compare,
  format,
  fromApi,
  money,
  parseInput,
  percentOf,
  sub,
  sum,
  toApi,
  zero,
} from './money'

describe('fromApi / toApi', () => {
  it('convierte el decimal del backend sin perder centavos', () => {
    expect(fromApi('1234567.89', 'COP').units).toBe(123456789)
    expect(fromApi('0.01', 'USD').units).toBe(1)
    expect(fromApi('-500.00', 'COP').units).toBe(-50000)
    expect(fromApi('0', 'COP').units).toBe(0)
  })

  it('completa los decimales faltantes', () => {
    expect(fromApi('1234567', 'COP').units).toBe(123456700)
    expect(fromApi('10.5', 'USD').units).toBe(1050)
  })

  it('hace el viaje redondo exacto', () => {
    for (const raw of ['1234567.89', '0.01', '-500.00', '999999999.99']) {
      expect(toApi(fromApi(raw, 'COP'))).toBe(raw)
    }
  })

  it('rechaza lo que no cumple el contrato del API', () => {
    expect(() => fromApi('1.234.567,89', 'COP')).toThrow(MoneyError)
    expect(() => fromApi('abc', 'COP')).toThrow(MoneyError)
    expect(() => fromApi('', 'COP')).toThrow(MoneyError)
  })
})

describe('exactitud aritmetica', () => {
  it('sumar mil veces 0.01 da exactamente 10.00', () => {
    const centavo = fromApi('0.01', 'COP')
    let total = zero('COP')
    for (let i = 0; i < 1000; i++) total = add(total, centavo)

    expect(total.units).toBe(1000)
    expect(toApi(total)).toBe('10.00')
  })

  it('evita el error clasico de 0.1 + 0.2', () => {
    const resultado = add(fromApi('0.1', 'USD'), fromApi('0.2', 'USD'))
    expect(toApi(resultado)).toBe('0.30')
    // El equivalente en punto flotante NO cumple esto:
    expect(0.1 + 0.2).not.toBe(0.3)
  })

  it('resta y compara', () => {
    const a = fromApi('100.00', 'COP')
    const b = fromApi('30.50', 'COP')
    expect(toApi(sub(a, b))).toBe('69.50')
    expect(compare(a, b)).toBeGreaterThan(0)
    expect(compare(b, a)).toBeLessThan(0)
  })

  it('suma una lista', () => {
    const items = ['10.10', '20.20', '30.30'].map((v) => fromApi(v, 'COP'))
    expect(toApi(sum(items, 'COP'))).toBe('60.60')
  })
})

describe('proteccion de moneda', () => {
  it('lanza al mezclar monedas', () => {
    const cop = fromApi('100.00', 'COP')
    const usd = fromApi('100.00', 'USD')
    expect(() => add(cop, usd)).toThrow(MoneyError)
    expect(() => sub(cop, usd)).toThrow(MoneyError)
    expect(() => compare(cop, usd)).toThrow(MoneyError)
    expect(() => percentOf(cop, usd)).toThrow(MoneyError)
  })

  it('rechaza unidades no enteras', () => {
    expect(() => money(10.5, 'COP')).toThrow(MoneyError)
  })
})

describe('parseInput', () => {
  it('acepta el formato colombiano', () => {
    expect(parseInput('1.234.567,89', 'COP')?.units).toBe(123456789)
    expect(parseInput('$ 1.234.567', 'COP')?.units).toBe(123456700)
    expect(parseInput('1.500', 'COP')?.units).toBe(150000)
  })

  it('acepta el punto decimal', () => {
    expect(parseInput('1234567.89', 'USD')?.units).toBe(123456789)
    expect(parseInput('1234.5', 'USD')?.units).toBe(123450)
  })

  it('acepta enteros y negativos', () => {
    expect(parseInput('1234567', 'COP')?.units).toBe(123456700)
    expect(parseInput('-250,75', 'COP')?.units).toBe(-25075)
  })

  it('devuelve null ante entrada invalida', () => {
    expect(parseInput('', 'COP')).toBeNull()
    expect(parseInput('   ', 'COP')).toBeNull()
    expect(parseInput('abc', 'COP')).toBeNull()
    expect(parseInput('-', 'COP')).toBeNull()
  })

  it('completa el viaje redondo hasta el API', () => {
    const m = parseInput('1.234.567,89', 'COP')!
    expect(toApi(m)).toBe('1234567.89')
    expect(fromApi(toApi(m), 'COP')).toEqual(m)
  })
})

describe('format', () => {
  it('oculta los centavos en COP cuando son cero', () => {
    const salida = format(fromApi('1234567.00', 'COP'))
    expect(salida).toContain('1.234.567')
    expect(salida).not.toContain(',00')
  })

  it('muestra los centavos en COP cuando existen', () => {
    expect(format(fromApi('1234567.89', 'COP'))).toContain(',89')
  })

  it('siempre muestra dos decimales en USD', () => {
    expect(format(fromApi('1234.50', 'USD'))).toContain('.50')
  })

  it('puede omitir el simbolo', () => {
    expect(format(fromApi('100.00', 'COP'), { showSymbol: false })).not.toContain('$')
  })
})

describe('percentOf', () => {
  it('calcula el porcentaje para pintar', () => {
    const gastado = fromApi('750000.00', 'COP')
    const limite = fromApi('1000000.00', 'COP')
    expect(percentOf(gastado, limite)).toBe(75)
  })

  it('devuelve 0 si el total es cero, sin dividir por cero', () => {
    expect(percentOf(fromApi('100.00', 'COP'), zero('COP'))).toBe(0)
  })
})

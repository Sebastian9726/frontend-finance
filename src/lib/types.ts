/**
 * Contrato de la API.
 *
 * Todo monto llega como `string` (ver `money.ts`): el backend serializa los
 * Decimal asi a proposito para que `JSON.parse` no los convierta a double.
 * Estos tipos lo hacen explicito para que nadie los trate como numeros.
 */

import type { Currency } from './money'

export type AccountType = 'efectivo' | 'banco' | 'tarjeta_credito' | 'inversion'
export type CategoryType = 'ingreso' | 'gasto'
export type TransactionType = 'ingreso' | 'gasto' | 'transferencia'

/** Monto decimal serializado como texto, p.ej. "1234567.89". */
export type MoneyString = string

export interface User {
  id: string
  email: string
  nombre: string
  moneda_base: Currency
}

export interface TokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  user: User
}

export interface Account {
  id: string
  nombre: string
  tipo: AccountType
  moneda: Currency
  saldo_inicial: MoneyString
  saldo_actual: MoneyString
  activa: boolean
}

export interface Category {
  id: string
  nombre: string
  tipo: CategoryType
  parent_id: string | null
  color: string | null
  icono: string | null
}

export interface AccountRef {
  id: string
  nombre: string
  moneda: Currency
}

export interface CategoryRef {
  id: string
  nombre: string
  color: string | null
  icono: string | null
}

export interface Transaction {
  id: string
  tipo: TransactionType
  monto: MoneyString
  moneda: Currency
  tasa_a_base: string
  monto_base: MoneyString
  fecha: string
  descripcion: string
  notas: string | null
  transfer_group_id: string | null
  account: AccountRef
  category: CategoryRef | null
}

export interface Page<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

export interface DashboardSummary {
  moneda_base: Currency
  desde: string
  hasta: string
  ingresos: MoneyString
  gastos: MoneyString
  neto: MoneyString
  saldo_total: MoneyString
  transacciones: number
}

export interface CashflowPoint {
  mes: string
  ingresos: MoneyString
  gastos: MoneyString
  neto: MoneyString
}

export interface CategorySlice {
  category_id: string | null
  nombre: string
  color: string | null
  total: MoneyString
  porcentaje: number
}

export interface CategoryBreakdown {
  tipo: CategoryType
  desde: string
  hasta: string
  total: MoneyString
  items: CategorySlice[]
}

export interface ExchangeRate {
  id: string
  fecha: string
  origen: Currency
  destino: Currency
  tasa: string
}

export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  efectivo: 'Efectivo',
  banco: 'Banco',
  tarjeta_credito: 'Tarjeta de crédito',
  inversion: 'Inversión',
}

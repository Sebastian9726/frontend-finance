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

// ---------------------------------------------------------------------------
// Patrimonio
// ---------------------------------------------------------------------------

export type AssetType = 'inmueble' | 'vehiculo' | 'inversion' | 'ahorro' | 'otro'
export type LiabilityType = 'hipoteca' | 'vehiculo' | 'tarjeta' | 'personal' | 'otro'

export interface Valuation {
  id: string
  fecha: string
  valor: MoneyString
  nota: string | null
}

export interface Asset {
  id: string
  nombre: string
  tipo: AssetType
  moneda: Currency
  costo_adquisicion: MoneyString | null
  fecha_adquisicion: string | null
  activo: boolean
  notas: string | null
  /** Derivado: el valor de la última valuación, no una columna. */
  valor_actual: MoneyString
  fecha_valor: string | null
  /** `null` cuando no se registró costo: sin punto de partida no hay ganancia. */
  ganancia: MoneyString | null
}

export interface AssetDetail extends Asset {
  valuaciones: Valuation[]
}

export interface Balance {
  id: string
  fecha: string
  saldo: MoneyString
  nota: string | null
}

export interface Liability {
  id: string
  nombre: string
  tipo: LiabilityType
  moneda: Currency
  principal: MoneyString | null
  /** Porcentaje anual. No es dinero: es una tasa para mostrar. */
  tasa_interes: string | null
  cuota_mensual: MoneyString | null
  fecha_inicio: string | null
  fecha_fin: string | null
  activa: boolean
  notas: string | null
  /** Derivado: el último saldo registrado. Va POSITIVO. */
  saldo_actual: MoneyString
  fecha_saldo: string | null
  abonado: MoneyString | null
}

export interface LiabilityDetail extends Liability {
  saldos: Balance[]
}

export interface NetWorthPoint {
  /** Siempre el último día del mes. */
  fecha: string
  total_activos: MoneyString
  total_pasivos: MoneyString
  patrimonio_neto: MoneyString
  /** Alguna conversión de ese mes usó la tasa de un día anterior. */
  tasa_estimada: boolean
}

export interface NetWorthSeries {
  moneda_base: Currency
  desde: string
  hasta: string
  puntos: NetWorthPoint[]
  variacion: MoneyString
  variacion_pct: number | null
}

export interface CompositionItem {
  id: string
  nombre: string
  tipo: string
  moneda: Currency
  valor_original: MoneyString
  valor_base: MoneyString
  fecha_valor: string | null
  porcentaje: number
}

export interface NetWorthComposition {
  moneda_base: Currency
  fecha: string
  total_activos: MoneyString
  total_pasivos: MoneyString
  patrimonio_neto: MoneyString
  activos: CompositionItem[]
  pasivos: CompositionItem[]
  tasa_estimada: boolean
  tasa_usd: string | null
}

// ---------------------------------------------------------------------------
// Planeación
// ---------------------------------------------------------------------------

/** Semáforo de un presupuesto. Lo decide el backend: el umbral vive allá. */
export type BudgetState = 'ok' | 'alerta' | 'excedido'

export interface Budget {
  id: string
  category_id: string
  anio: number
  mes: number
  monto_limite: MoneyString
  /** Porcentaje de ejecución a partir del cual avisa. No es dinero. */
  alerta_pct: string
}

export interface BudgetLine {
  id: string
  category_id: string
  categoria: string
  color: string | null
  monto_limite: MoneyString
  ejecutado: MoneyString
  /** Negativo cuando ya se pasó del límite. */
  disponible: MoneyString
  porcentaje: number
  alerta_pct: string
  estado: BudgetState
}

export interface UnbudgetedLine {
  category_id: string | null
  categoria: string
  color: string | null
  ejecutado: MoneyString
}

export interface BudgetStatus {
  moneda_base: Currency
  anio: number
  mes: number
  desde: string
  hasta: string
  total_limite: MoneyString
  total_ejecutado: MoneyString
  total_disponible: MoneyString
  total_sin_presupuesto: MoneyString
  lineas: BudgetLine[]
  sin_presupuesto: UnbudgetedLine[]
}

export interface BudgetCopyResult {
  anio: number
  mes: number
  copiados: number
  omitidos: number
}

export interface Contribution {
  id: string
  fecha: string
  monto: MoneyString
  nota: string | null
}

export interface Goal {
  id: string
  nombre: string
  moneda: Currency
  monto_objetivo: MoneyString
  fecha_objetivo: string | null
  account_id: string | null
  activa: boolean
  notas: string | null
  /** Derivado de los aportes, no una columna. */
  monto_actual: MoneyString
  monto_faltante: MoneyString
  porcentaje: number
  cumplida: boolean
  /** `null` mientras no haya historia suficiente para medir un ritmo. */
  aporte_mensual_promedio: MoneyString | null
  fecha_proyectada: string | null
  aporte_mensual_requerido: MoneyString | null
  en_riesgo: boolean
}

export interface GoalDetail extends Goal {
  aportes: Contribution[]
}

export const ASSET_TYPE_LABEL: Record<AssetType, string> = {
  inmueble: 'Inmueble',
  vehiculo: 'Vehículo',
  inversion: 'Inversión',
  ahorro: 'Ahorro',
  otro: 'Otro',
}

export const LIABILITY_TYPE_LABEL: Record<LiabilityType, string> = {
  hipoteca: 'Hipoteca',
  vehiculo: 'Vehículo',
  tarjeta: 'Tarjeta de crédito',
  personal: 'Crédito personal',
  otro: 'Otra',
}

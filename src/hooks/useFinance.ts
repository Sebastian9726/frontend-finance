/** Hooks de datos sobre TanStack Query. */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Rango } from '@/lib/dates'
import type {
  Account,
  Asset,
  AssetDetail,
  Balance,
  CashflowPoint,
  Category,
  CategoryBreakdown,
  DashboardSummary,
  ExchangeRate,
  Liability,
  LiabilityDetail,
  NetWorthComposition,
  NetWorthSeries,
  Page,
  Transaction,
  Valuation,
} from '@/lib/types'

// Las claves se centralizan para que invalidar sea inequivoco: un literal
// suelto y mal escrito no invalida nada y la pantalla se queda con datos
// viejos sin que nada falle a la vista.
export const claves = {
  cuentas: ['accounts'] as const,
  categorias: ['categories'] as const,
  transacciones: (filtros: unknown) => ['transactions', filtros] as const,
  resumen: (rango: Rango) => ['reports', 'summary', rango] as const,
  flujo: (rango: Rango) => ['reports', 'cashflow', rango] as const,
  porCategoria: (rango: Rango, tipo: string) =>
    ['reports', 'by-category', rango, tipo] as const,
  tasas: ['exchange-rates'] as const,
  activos: ['assets'] as const,
  activo: (id: string) => ['assets', id] as const,
  deudas: ['liabilities'] as const,
  deuda: (id: string) => ['liabilities', id] as const,
  serie: (rango: Rango) => ['networth', 'series', rango] as const,
  composicion: ['networth', 'composition'] as const,
}

/** Todo lo que cambia al crear, editar o borrar un movimiento. */
function invalidarTrasMovimiento(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['transactions'] })
  queryClient.invalidateQueries({ queryKey: ['reports'] })
  // Las cuentas tambien: su saldo depende de los movimientos.
  queryClient.invalidateQueries({ queryKey: claves.cuentas })
}

// ---------------------------------------------------------------------------
// Cuentas
// ---------------------------------------------------------------------------

export function useAccounts() {
  return useQuery({
    queryKey: claves.cuentas,
    queryFn: async () => (await api.get<Account[]>('/accounts')).data,
  })
}

export function useCreateAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (datos: Record<string, unknown>) =>
      (await api.post<Account>('/accounts', datos)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: claves.cuentas }),
  })
}

export function useUpdateAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...datos }: { id: string } & Record<string, unknown>) =>
      (await api.patch<Account>(`/accounts/${id}`, datos)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: claves.cuentas }),
  })
}

export function useDeleteAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => api.delete(`/accounts/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: claves.cuentas }),
  })
}

// ---------------------------------------------------------------------------
// Categorias
// ---------------------------------------------------------------------------

export function useCategories() {
  return useQuery({
    queryKey: claves.categorias,
    queryFn: async () => (await api.get<Category[]>('/categories')).data,
    // Cambian poco: no vale la pena refrescarlas en cada navegacion.
    staleTime: 5 * 60_000,
  })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (datos: Record<string, unknown>) =>
      (await api.post<Category>('/categories', datos)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: claves.categorias }),
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => api.delete(`/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: claves.categorias })
      // Las transacciones que la usaban quedaron sin categoria.
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['reports'] })
    },
  })
}

// ---------------------------------------------------------------------------
// Transacciones
// ---------------------------------------------------------------------------

export interface FiltrosTransacciones {
  desde?: string
  hasta?: string
  account_id?: string
  category_id?: string
  tipo?: string
  q?: string
  page?: number
  page_size?: number
}

export function useTransactions(filtros: FiltrosTransacciones) {
  return useQuery({
    queryKey: claves.transacciones(filtros),
    queryFn: async () => {
      const limpios = Object.fromEntries(
        Object.entries(filtros).filter(([, v]) => v !== undefined && v !== ''),
      )
      return (await api.get<Page<Transaction>>('/transactions', { params: limpios })).data
    },
    // Al cambiar de pagina o de filtro, se conserva la vista anterior mientras
    // llega la nueva: sin esto la tabla parpadea en vacio.
    placeholderData: (previo) => previo,
  })
}

export function useCreateTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (datos: Record<string, unknown>) =>
      (await api.post<Transaction>('/transactions', datos)).data,
    onSuccess: () => invalidarTrasMovimiento(queryClient),
  })
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...datos }: { id: string } & Record<string, unknown>) =>
      (await api.patch<Transaction>(`/transactions/${id}`, datos)).data,
    onSuccess: () => invalidarTrasMovimiento(queryClient),
  })
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => api.delete(`/transactions/${id}`),
    onSuccess: () => invalidarTrasMovimiento(queryClient),
  })
}

export function useCreateTransfer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (datos: Record<string, unknown>) =>
      (await api.post<Transaction[]>('/transactions/transfer', datos)).data,
    onSuccess: () => invalidarTrasMovimiento(queryClient),
  })
}

// ---------------------------------------------------------------------------
// Reportes
// ---------------------------------------------------------------------------

export function useSummary(rango: Rango) {
  return useQuery({
    queryKey: claves.resumen(rango),
    queryFn: async () =>
      (await api.get<DashboardSummary>('/reports/summary', { params: rango })).data,
  })
}

export function useCashflow(rango: Rango) {
  return useQuery({
    queryKey: claves.flujo(rango),
    queryFn: async () =>
      (await api.get<CashflowPoint[]>('/reports/cashflow', { params: rango })).data,
  })
}

export function useByCategory(rango: Rango, tipo: 'ingreso' | 'gasto') {
  return useQuery({
    queryKey: claves.porCategoria(rango, tipo),
    queryFn: async () =>
      (await api.get<CategoryBreakdown>('/reports/by-category', { params: { ...rango, tipo } }))
        .data,
  })
}

export function useExchangeRates() {
  return useQuery({
    queryKey: claves.tasas,
    queryFn: async () => (await api.get<ExchangeRate[]>('/exchange-rates')).data,
    staleTime: 5 * 60_000,
  })
}

export function useUpsertExchangeRate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (datos: Record<string, unknown>) =>
      (await api.post<ExchangeRate>('/exchange-rates', datos)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: claves.tasas })
      // El saldo consolidado se calcula con la tasa: cambiarla lo mueve.
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      // Y el patrimonio tambien: los snapshots que se calcularon con una tasa
      // estimada pueden rehacerse ahora con la tasa real.
      queryClient.invalidateQueries({ queryKey: ['networth'] })
    },
  })
}

// ---------------------------------------------------------------------------
// Patrimonio
// ---------------------------------------------------------------------------

/**
 * Toda mutacion de activos o deudas rehace la serie de patrimonio en el
 * backend, asi que en el frontend hay que invalidar las tres cosas juntas. Se
 * centraliza aqui para que no se olvide una: la grafica se quedaria mostrando
 * el patrimonio de antes del cambio, sin que nada falle a la vista.
 */
function invalidarTrasPatrimonio(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: claves.activos })
  queryClient.invalidateQueries({ queryKey: claves.deudas })
  queryClient.invalidateQueries({ queryKey: ['networth'] })
}

export function useAssets() {
  return useQuery({
    queryKey: claves.activos,
    queryFn: async () => (await api.get<Asset[]>('/assets')).data,
  })
}

export function useAsset(id: string | null) {
  return useQuery({
    queryKey: claves.activo(id ?? ''),
    queryFn: async () => (await api.get<AssetDetail>(`/assets/${id}`)).data,
    enabled: id !== null,
  })
}

export function useCreateAsset() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (datos: Record<string, unknown>) =>
      (await api.post<AssetDetail>('/assets', datos)).data,
    onSuccess: () => invalidarTrasPatrimonio(queryClient),
  })
}

export function useUpdateAsset() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...datos }: { id: string } & Record<string, unknown>) =>
      (await api.patch<AssetDetail>(`/assets/${id}`, datos)).data,
    onSuccess: () => invalidarTrasPatrimonio(queryClient),
  })
}

export function useDeleteAsset() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => api.delete(`/assets/${id}`),
    onSuccess: () => invalidarTrasPatrimonio(queryClient),
  })
}

export function useAddValuation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...datos }: { id: string } & Record<string, unknown>) =>
      (await api.post<Valuation>(`/assets/${id}/valuations`, datos)).data,
    onSuccess: (_datos, variables) => {
      invalidarTrasPatrimonio(queryClient)
      queryClient.invalidateQueries({ queryKey: claves.activo(variables.id) })
    },
  })
}

export function useDeleteValuation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, valuationId }: { id: string; valuationId: string }) =>
      api.delete(`/assets/${id}/valuations/${valuationId}`),
    onSuccess: (_datos, variables) => {
      invalidarTrasPatrimonio(queryClient)
      queryClient.invalidateQueries({ queryKey: claves.activo(variables.id) })
    },
  })
}

export function useLiabilities() {
  return useQuery({
    queryKey: claves.deudas,
    queryFn: async () => (await api.get<Liability[]>('/liabilities')).data,
  })
}

export function useLiability(id: string | null) {
  return useQuery({
    queryKey: claves.deuda(id ?? ''),
    queryFn: async () => (await api.get<LiabilityDetail>(`/liabilities/${id}`)).data,
    enabled: id !== null,
  })
}

export function useCreateLiability() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (datos: Record<string, unknown>) =>
      (await api.post<LiabilityDetail>('/liabilities', datos)).data,
    onSuccess: () => invalidarTrasPatrimonio(queryClient),
  })
}

export function useUpdateLiability() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...datos }: { id: string } & Record<string, unknown>) =>
      (await api.patch<LiabilityDetail>(`/liabilities/${id}`, datos)).data,
    onSuccess: () => invalidarTrasPatrimonio(queryClient),
  })
}

export function useDeleteLiability() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => api.delete(`/liabilities/${id}`),
    onSuccess: () => invalidarTrasPatrimonio(queryClient),
  })
}

export function useAddBalance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...datos }: { id: string } & Record<string, unknown>) =>
      (await api.post<Balance>(`/liabilities/${id}/balances`, datos)).data,
    onSuccess: (_datos, variables) => {
      invalidarTrasPatrimonio(queryClient)
      queryClient.invalidateQueries({ queryKey: claves.deuda(variables.id) })
    },
  })
}

export function useDeleteBalance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, balanceId }: { id: string; balanceId: string }) =>
      api.delete(`/liabilities/${id}/balances/${balanceId}`),
    onSuccess: (_datos, variables) => {
      invalidarTrasPatrimonio(queryClient)
      queryClient.invalidateQueries({ queryKey: claves.deuda(variables.id) })
    },
  })
}

export function useNetWorthSeries(rango: Rango) {
  return useQuery({
    queryKey: claves.serie(rango),
    queryFn: async () =>
      (await api.get<NetWorthSeries>('/networth/series', { params: rango })).data,
  })
}

export function useNetWorthComposition() {
  return useQuery({
    queryKey: claves.composicion,
    queryFn: async () =>
      (await api.get<NetWorthComposition>('/networth/composition')).data,
  })
}

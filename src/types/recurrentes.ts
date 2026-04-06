export type RecurrenteCategoria = 'suscripcion' | 'cargo_bancario'
export type RecurrenteEstado = 'confirmado' | 'posible'

export interface PagoRecurrente {
  id: string
  nombre: string
  monto: number | null        // null = monto desconocido
  dia_cobro: number | null    // día del mes, null = no determinado
  categoria: RecurrenteCategoria
  estado: RecurrenteEstado
  fechas_registradas: string[] // ISO dates observadas en historial
  notas?: string
}

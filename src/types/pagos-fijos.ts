export type PagoFijoCategoria = 'transferencia' | 'ahorro' | 'suscripcion' | 'cargo_bancario' | 'variable'

export interface PagoFijo {
  id: string
  nombre: string
  monto: number
  emoji: string
  categoria: PagoFijoCategoria
  dia_cobro?: number   // para suscripciones: día del mes que cobra
  notas?: string
}

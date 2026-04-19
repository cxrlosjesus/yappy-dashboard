export type PagoFijoCategoria = 'transferencia' | 'ahorro' | 'suscripcion' | 'cargo_bancario' | 'variable'

export interface PagoFijo {
  id: string
  nombre: string
  monto: number
  emoji: string
  categoria: PagoFijoCategoria
  dia_cobro?: number          // para suscripciones: día del mes que cobra
  notas?: string
  quincenas_restantes?: number // gasto temporal: cuántas quincenas faltan
  quincena_inicio?: string     // ID de quincena en que fue agregado (para decrementar)
}

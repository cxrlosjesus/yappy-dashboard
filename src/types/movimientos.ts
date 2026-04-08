export type Categoria =
  | 'Supermercado'
  | 'Comida'
  | 'Salidas'
  | 'Café'
  | 'Gasolina'
  | 'Suscripciones'
  | 'Farmacia'
  | 'Entretenimiento'
  | 'Educación'
  | 'Auto'
  | 'Banco'
  | 'Transferencia Recibida'
  | 'Transferencia Enviada'
  | 'Interés'
  | 'Otro'

export interface Movimiento {
  fecha: string        // YYYY-MM-DD
  descripcion: string  // nombre limpio del comercio o tipo de movimiento
  monto: number        // siempre positivo
  esGasto: boolean
  categoria: Categoria
  saldo: number
  esTarjeta: boolean
}

export interface ResumenMensual {
  mes: string                    // YYYY-MM
  label: string                  // "Abr 2026"
  gastosTarjeta: number
  transferenciasEnviadas: number
  ingresos: number
}

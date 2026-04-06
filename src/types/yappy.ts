export type TipoTransaccion = 'Recibido' | 'Enviado' | 'Pago'
export type EstadoTransaccion = 'Completado' | 'Pendiente' | 'Fallido'
export type CategoriaTransaccion = 'Personal' | 'Encargo' | 'Colecta'

export interface YappyTransaccion {
  id: string
  descripcion: string
  tipo: TipoTransaccion
  monto: number
  fecha: string
  de_para: string
  asunto_email: string
  estado: EstadoTransaccion
  notas?: string
  categoria: CategoriaTransaccion
}

// Resumen para el dashboard
export interface YappyResumen {
  totalRecibido: number
  totalEnviado: number
  totalPagos: number
  montoRecibido: number
  montoEnviado: number
  montoPagos: number
  transacciones: YappyTransaccion[]
}

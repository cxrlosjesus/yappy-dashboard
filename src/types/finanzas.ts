export interface GastoFijo {
  id: string
  nombre: string
  monto: number
  emoji: string
}

export interface CuentaAhorro {
  banco: string
  monto: number
}

export interface PlanFinanciero {
  ingreso_quincenal: number
  gastos_fijos: GastoFijo[]
  cuentas_ahorro: CuentaAhorro[]
  ahorro_extra_disponible: number
  gastos_personales_disponible: number
  proyeccion: {
    ahorro_actual: number
    meta: number
    mes_meta: string
  }
  fondo_emergencia: {
    meta: number
    gastos_mensuales: number
  }
}

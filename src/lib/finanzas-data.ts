import type { PlanFinanciero } from '@/types/finanzas'

export const PLAN_FINANCIERO: PlanFinanciero = {
  ingreso_quincenal: 860,

  gastos_fijos: [
    { id: 'depa',          nombre: 'Departamento',    monto: 174.50, emoji: '🏠' },
    { id: 'maestria',      nombre: 'Maestría',         monto: 80.00,  emoji: '🎓' },
    { id: 'poliza',        nombre: 'Póliza',           monto: 12.50,  emoji: '🛡️' },
    { id: 'telefono',      nombre: 'Teléfono',         monto: 12.55,  emoji: '📱' },
    { id: 'suscripciones', nombre: 'Suscripciones',    monto: 30.00,  emoji: '📺' },
    { id: 'comida_trabajo',nombre: 'Comida trabajo',   monto: 30.00,  emoji: '🍽️' },
    { id: 'super',         nombre: 'Súper',            monto: 100.00, emoji: '🛒' },
    { id: 'gasolina',      nombre: 'Gasolina',         monto: 50.00,  emoji: '⛽' },
  ],

  cuentas_ahorro: [
    { banco: 'Banco General', monto: 65 },
    { banco: 'Banistmo',      monto: 50 },
  ],

  ahorro_extra_disponible: 80,
  gastos_personales_disponible: 175,

  proyeccion: {
    ahorro_actual: 830,
    meta: 4000,
    mes_meta: 'Nov 2026',
  },

  fondo_emergencia: {
    meta: 3000,
    gastos_mensuales: 980,
  },
}

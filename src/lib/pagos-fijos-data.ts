import type { PagoFijo } from '@/types/pagos-fijos'

// Todos los pagos fijos quincenales unificados
export const PAGOS_FIJOS: PagoFijo[] = [
  // ── Transferencias obligatorias ────────────────────────────────────────────
  { id: 'depa',           nombre: 'Departamento',     monto: 174.50, emoji: '🏠', categoria: 'transferencia' },
  { id: 'maestria',       nombre: 'Maestría',          monto: 80.00,  emoji: '🎓', categoria: 'transferencia' },
  { id: 'poliza',         nombre: 'Póliza',            monto: 12.50,  emoji: '🛡️', categoria: 'transferencia' },
  { id: 'telefono',       nombre: 'Tigo',               monto: 12.55,  emoji: '📱', categoria: 'cargo_bancario', dia_cobro: 15 },

  // ── Ahorro ────────────────────────────────────────────────────────────────
  { id: 'ahorro-bg',      nombre: 'Ahorro Banco General', monto: 65.00, emoji: '💰', categoria: 'ahorro' },
  { id: 'ahorro-banistmo',nombre: 'Ahorro Banistmo',      monto: 50.00, emoji: '💰', categoria: 'ahorro' },
  { id: 'ahorro-extra',   nombre: 'Ahorro extra',         monto: 80.00, emoji: '🎯', categoria: 'ahorro' },

  // ── Gastos variables (presupuesto quincenal) ───────────────────────────────
  { id: 'super',          nombre: 'Súper',             monto: 100.00, emoji: '🛒', categoria: 'variable' },
  { id: 'gasolina',       nombre: 'Gasolina',          monto: 50.00,  emoji: '⛽', categoria: 'variable' },
  { id: 'comida-trabajo', nombre: 'Comida trabajo',    monto: 30.00,  emoji: '🍽️', categoria: 'variable' },

  // ── Suscripciones digitales ────────────────────────────────────────────────
  { id: 'claude',         nombre: 'Claude',            monto: 20.00,  emoji: '🤖', categoria: 'suscripcion', dia_cobro: 6  },
  { id: 'netflix',        nombre: 'Netflix',           monto: 13.99,  emoji: '📺', categoria: 'suscripcion', dia_cobro: 10 },
  { id: 'playstation',    nombre: 'PlayStation',       monto: 7.99,   emoji: '🎮', categoria: 'suscripcion', dia_cobro: 25 },
  { id: 'google-one',     nombre: 'Google One',        monto: 3.99,   emoji: '☁️', categoria: 'suscripcion', dia_cobro: 17 },
  { id: 'disney',         nombre: 'Disney+',           monto: 3.99,   emoji: '🏰', categoria: 'suscripcion', dia_cobro: 17 },

  // ── Cargos bancarios automáticos ──────────────────────────────────────────
  { id: 'membresia',      nombre: 'Membresía banco',   monto: 2.50,   emoji: '🏦', categoria: 'cargo_bancario', dia_cobro: 1 },
  { id: 'seguro-fraude',  nombre: 'Seguro fraude',     monto: 1.00,   emoji: '🏦', categoria: 'cargo_bancario', dia_cobro: 1 },
  { id: 'itbms',          nombre: 'ITBMS + impuesto',  monto: 0.23,   emoji: '🏦', categoria: 'cargo_bancario', dia_cobro: 1 },
]

'use client'

import Link from 'next/link'
import type { PlanFinanciero } from '@/types/finanzas'

function fmt(n: number) {
  return '$' + n.toLocaleString('es-PA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: '#aaa', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10, marginTop: 20 }}>
      {label}
    </div>
  )
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: '#fff', borderRadius: 16, padding: '16px', ...style }}>
      {children}
    </div>
  )
}

export default function FinanzasClient({ plan }: { plan: PlanFinanciero }) {
  const totalGastosFijos = plan.gastos_fijos.reduce((s, g) => s + g.monto, 0)
  const totalAhorroBancos = plan.cuentas_ahorro.reduce((s, c) => s + c.monto, 0)
  const disponible = plan.ingreso_quincenal - totalGastosFijos - totalAhorroBancos
  const totalAhorroQuincenal = totalAhorroBancos + plan.ahorro_extra_disponible

  // Proyección
  const mesesRestantes = 7
  const ahorroProyectado = plan.proyeccion.ahorro_actual + totalAhorroQuincenal * 2 * mesesRestantes

  // Barra fondo emergencia (basado en ahorro actual)
  const porcentajeFondo = Math.min((plan.proyeccion.ahorro_actual / plan.fondo_emergencia.meta) * 100, 100)

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', paddingBottom: 40 }}>

      {/* Header */}
      <div style={{ background: '#0057FF', color: '#fff', padding: '48px 20px 24px', borderRadius: '0 0 24px 24px' }}>
        <Link href="/dashboard" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, textDecoration: 'none' }}>
          ← Dashboard
        </Link>
        <div style={{ fontSize: 24, fontWeight: 700, marginTop: 8 }}>Plan Financiero</div>
        <div style={{ fontSize: 13, opacity: 0.75, marginTop: 2 }}>Quincena · Carlos</div>

        {/* Ingreso hero */}
        <div style={{ marginTop: 20, background: 'rgba(255,255,255,0.15)', borderRadius: 14, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>Ingreso quincenal</div>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{fmt(plan.ingreso_quincenal)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, opacity: 0.8 }}>Mensual</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{fmt(plan.ingreso_quincenal * 2)}</div>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 16px' }}>

        {/* Gastos fijos */}
        <SectionLabel label="Gastos fijos quincenales" />
        <Card>
          {plan.gastos_fijos.map((g, i) => (
            <div
              key={g.id}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 0',
                borderBottom: i < plan.gastos_fijos.length - 1 ? '0.5px solid #f0f0f0' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18 }}>{g.emoji}</span>
                <span style={{ fontSize: 14, color: '#333' }}>{g.nombre}</span>
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>{fmt(g.monto)}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, marginTop: 4, borderTop: '1.5px solid #111' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>Total</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#0057FF' }}>{fmt(totalGastosFijos)}</span>
          </div>
        </Card>

        {/* Ahorro */}
        <SectionLabel label="Ahorro quincenal" />
        <Card>
          {plan.cuentas_ahorro.map((c, i) => (
            <div
              key={c.banco}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 0',
                borderBottom: i < plan.cuentas_ahorro.length - 1 ? '0.5px solid #f0f0f0' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#1D9E75', display: 'inline-block' }} />
                <span style={{ fontSize: 14, color: '#333' }}>{c.banco}</span>
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>{fmt(c.monto)}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, marginTop: 4, borderTop: '1.5px solid #111' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>Total ahorro fijo</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#1D9E75' }}>{fmt(totalAhorroBancos)}</span>
          </div>
        </Card>

        {/* Dinero disponible */}
        <SectionLabel label="Dinero disponible" />
        <Card style={{ background: '#0057FF' }}>
          <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, marginBottom: 4 }}>
            Después de gastos y ahorro fijo
          </div>
          <div style={{ color: '#fff', fontSize: 34, fontWeight: 800 }}>{fmt(disponible)}</div>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 }}>por quincena</div>

          <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: '12px' }}>
              <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11 }}>Ahorro extra</div>
              <div style={{ color: '#fff', fontSize: 18, fontWeight: 700, marginTop: 2 }}>{fmt(plan.ahorro_extra_disponible)}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: '12px' }}>
              <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11 }}>Gastos personales</div>
              <div style={{ color: '#fff', fontSize: 18, fontWeight: 700, marginTop: 2 }}>{fmt(plan.gastos_personales_disponible)}</div>
            </div>
          </div>
        </Card>

        {/* Resumen ahorro total */}
        <SectionLabel label="Ahorro total" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Card>
            <div style={{ fontSize: 11, color: '#aaa', marginBottom: 4 }}>Quincenal</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#1D9E75' }}>{fmt(totalAhorroQuincenal)}</div>
          </Card>
          <Card>
            <div style={{ fontSize: 11, color: '#aaa', marginBottom: 4 }}>Mensual</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#1D9E75' }}>{fmt(totalAhorroQuincenal * 2)}</div>
          </Card>
        </div>

        {/* Proyección */}
        <SectionLabel label={`Proyección a ${plan.proyeccion.mes_meta}`} />
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: '#aaa' }}>Ahorro actual</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#111' }}>{fmt(plan.proyeccion.ahorro_actual)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: '#aaa' }}>Meta estimada</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0057FF' }}>{fmt(plan.proyeccion.meta)}+</div>
            </div>
          </div>
          <div style={{ background: '#f0f0f0', borderRadius: 8, height: 8, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 8,
              background: 'linear-gradient(90deg, #1D9E75, #0057FF)',
              width: `${Math.min((plan.proyeccion.ahorro_actual / plan.proyeccion.meta) * 100, 100)}%`,
              transition: 'width 0.5s ease',
            }} />
          </div>
          <div style={{ fontSize: 11, color: '#aaa', marginTop: 8, textAlign: 'right' }}>
            Proyectado: {fmt(ahorroProyectado)}
          </div>
        </Card>

        {/* Fondo de emergencia */}
        <SectionLabel label="Fondo de emergencia" />
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: '#aaa' }}>Meta</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#111' }}>{fmt(plan.fondo_emergencia.meta)}</div>
              <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>3 meses de gastos</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: '#aaa' }}>Gastos mensuales</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#111' }}>{fmt(plan.fondo_emergencia.gastos_mensuales)}</div>
            </div>
          </div>
          <div style={{ background: '#f0f0f0', borderRadius: 8, height: 8, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 8,
              background: '#BA7517',
              width: `${porcentajeFondo}%`,
              transition: 'width 0.5s ease',
            }} />
          </div>
          <div style={{ fontSize: 11, color: '#aaa', marginTop: 8, textAlign: 'right' }}>
            {porcentajeFondo.toFixed(0)}% completado
          </div>
        </Card>

      </div>
    </div>
  )
}

'use client'

import Link from 'next/link'

const CAT_COLORS: Record<string, string> = {
  Supermercado:  '#1D9E75',
  Comida:        '#E8503A',
  Café:          '#7B5EA7',
  Gasolina:      '#BA7517',
  Suscripciones: '#0057FF',
  Farmacia:      '#E91E63',
  Educación:     '#0097A7',
  Auto:          '#546E7A',
  Entretenimiento: '#FF9800',
  Banco:         '#888',
  Otro:          '#BBB',
}

function fmt(n: number) {
  return '$' + n.toLocaleString('es-PA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export interface ResumenData {
  saldoActual: number
  archivoFecha: string

  // Mes en curso
  mesLabel: string
  gastadoEsteMes: number
  proyectado: number
  diaActual: number
  diasEnMes: number

  // Comparativa vs mes anterior
  gastosMesAnterior: number
  mesAnteriorLabel: string

  // Transferencias del mes en curso
  transferenciaRecibida: number
  transferenciaEnviada: number

  // Plan vs real
  planVsReal: { label: string; real: number; mensual: number }[]

  // Top categorías del mes
  topCategorias: { cat: string; total: number; pct: number }[]

  // Recurrentes activos
  costoRecurrentesMensual: number
  costoRecurrentesAnual: number
  cantidadRecurrentes: number

  // Insights (máx 2 para la vista condensada)
  insights: { texto: string; tipo: 'positivo' | 'negativo' | 'neutro' }[]
}

export default function ResumenClient({ data }: { data: ResumenData }) {
  const pctVsAnterior = data.gastosMesAnterior > 0
    ? ((data.gastadoEsteMes - data.gastosMesAnterior) / data.gastosMesAnterior) * 100
    : null

  const pctMes = Math.min((data.diaActual / data.diasEnMes) * 100, 100)

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', paddingBottom: 40 }}>

      {/* Header */}
      <div style={{ background: '#0057FF', color: '#fff', padding: '48px 20px 24px', borderRadius: '0 0 24px 24px' }}>
        <Link href="/dashboard" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, textDecoration: 'none' }}>
          ← Dashboard
        </Link>
        <div style={{ fontSize: 24, fontWeight: 700, marginTop: 8 }}>Movimientos</div>
        <div style={{ fontSize: 13, opacity: 0.75, marginTop: 2 }}>
          Cuenta de ahorros · {data.archivoFecha}
        </div>

        {/* Saldo + proyección */}
        <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 14, padding: '14px 16px' }}>
            <div style={{ fontSize: 11, opacity: 0.8 }}>Saldo en archivo</div>
            <div style={{ fontSize: 24, fontWeight: 800, marginTop: 2 }}>{fmt(data.saldoActual)}</div>
            <div style={{ fontSize: 10, opacity: 0.6, marginTop: 2 }}>puede diferir del disponible</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 14, padding: '14px 16px' }}>
            <div style={{ fontSize: 11, opacity: 0.8 }}>Proyección {data.mesLabel}</div>
            <div style={{ fontSize: 24, fontWeight: 800, marginTop: 2 }}>{fmt(data.proyectado)}</div>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 16px' }}>

        {/* Este mes */}
        <div style={{ marginTop: 20, background: '#fff', borderRadius: 16, padding: '16px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#aaa', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 14 }}>
            {data.mesLabel}
          </div>

          {/* Gasto tarjeta + variación */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 11, color: '#aaa', marginBottom: 2 }}>Gastos tarjeta</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#111' }}>{fmt(data.gastadoEsteMes)}</div>
            </div>
            {pctVsAnterior !== null && (
              <div style={{
                padding: '6px 10px', borderRadius: 10, marginTop: 4,
                background: pctVsAnterior <= 0 ? '#E1F5EE' : '#FEE8E8',
                color: pctVsAnterior <= 0 ? '#0F6E56' : '#C62828',
                fontSize: 13, fontWeight: 700,
              }}>
                {pctVsAnterior > 0 ? '+' : ''}{pctVsAnterior.toFixed(0)}% vs {data.mesAnteriorLabel}
              </div>
            )}
          </div>

          {/* Barra de progreso del mes */}
          <div style={{ background: '#f0f0f0', borderRadius: 4, height: 6, overflow: 'hidden', marginBottom: 6 }}>
            <div style={{ height: '100%', width: `${pctMes}%`, background: '#0057FF', borderRadius: 4 }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 10, color: '#aaa' }}>Día {data.diaActual} de {data.diasEnMes}</span>
            <span style={{ fontSize: 10, color: '#BA7517', fontWeight: 600 }}>
              {fmt(data.gastadoEsteMes / data.diaActual)}/día
            </span>
          </div>

          {/* Transferencias */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 14, paddingTop: 14, borderTop: '0.5px solid #f0f0f0' }}>
            <div>
              <div style={{ fontSize: 10, color: '#888' }}>Recibido</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1D9E75', marginTop: 2 }}>{fmt(data.transferenciaRecibida)}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#888' }}>Enviado</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#378ADD', marginTop: 2 }}>{fmt(data.transferenciaEnviada)}</div>
            </div>
          </div>
        </div>

        {/* Plan vs Real */}
        <div style={{ marginTop: 12, background: '#fff', borderRadius: 16, padding: '16px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#aaa', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 14 }}>
            Plan vs real
          </div>
          {data.planVsReal.map(({ label, real, mensual }) => {
            const pct = mensual > 0 ? Math.min((real / mensual) * 100, 100) : 0
            const color = pct < 80 ? '#1D9E75' : pct < 100 ? '#BA7517' : '#E8503A'
            return (
              <div key={label} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: '#555' }}>{label}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color }}>
                    {fmt(real)} <span style={{ fontWeight: 400, color: '#bbb' }}>/ {fmt(mensual)}</span>
                  </span>
                </div>
                <div style={{ background: '#f0f0f0', borderRadius: 4, height: 5, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4 }} />
                </div>
              </div>
            )
          })}
        </div>

        {/* Top categorías */}
        {data.topCategorias.length > 0 && (
          <div style={{ marginTop: 12, background: '#fff', borderRadius: 16, padding: '16px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#aaa', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 14 }}>
              Top categorías · {data.mesLabel}
            </div>
            {data.topCategorias.map(({ cat, total, pct }) => (
              <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: CAT_COLORS[cat] ?? '#aaa', display: 'inline-block',
                }} />
                <span style={{ fontSize: 13, color: '#333', flex: 1 }}>{cat}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{fmt(total)}</span>
                <span style={{ fontSize: 10, color: '#aaa', width: 28, textAlign: 'right' }}>{pct.toFixed(0)}%</span>
              </div>
            ))}
          </div>
        )}

        {/* Recurrentes */}
        <div style={{ marginTop: 12, background: '#fff', borderRadius: 16, padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#aaa', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 }}>
              Suscripciones activas
            </div>
            <div style={{ fontSize: 11, color: '#888' }}>{data.cantidadRecurrentes} cargos detectados</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#0057FF' }}>{fmt(data.costoRecurrentesMensual)}<span style={{ fontSize: 11, fontWeight: 400, color: '#aaa' }}>/mes</span></div>
            <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>{fmt(data.costoRecurrentesAnual)}/año</div>
          </div>
        </div>

        {/* Insights */}
        {data.insights.length > 0 && (
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.insights.map((ins, i) => (
              <div key={i} style={{
                background: '#fff', borderRadius: 12, padding: '13px 14px',
                borderLeft: `3px solid ${ins.tipo === 'positivo' ? '#1D9E75' : ins.tipo === 'negativo' ? '#E8503A' : '#0057FF'}`,
                fontSize: 13, color: '#333', lineHeight: 1.5,
              }}>
                {ins.texto}
              </div>
            ))}
          </div>
        )}

        {/* Link al análisis completo */}
        <Link href="/analisis" style={{ textDecoration: 'none', display: 'block', marginTop: 20 }}>
          <div style={{
            background: '#F0F2F5', borderRadius: 16, padding: '16px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>Ver análisis completo</div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>Tendencias, historial, desglose por comercio</div>
            </div>
            <span style={{ fontSize: 18, color: '#0057FF' }}>→</span>
          </div>
        </Link>

      </div>
    </div>
  )
}

'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import type { PagoRecurrente } from '@/types/recurrentes'

const MESES_CORTO = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function formatMonto(n: number | null) {
  if (n === null) return '$?'
  return '$' + n.toLocaleString('es-PA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Calcula la próxima fecha de cobro basada en el día del mes */
function getProximoCobro(dia_cobro: number | null): { fecha: string; diasRestantes: number } | null {
  if (dia_cobro === null) return null
  const hoy = new Date()
  const diaHoy = hoy.getDate()
  const mes = hoy.getMonth()
  const año = hoy.getFullYear()

  let fecha: Date
  if (dia_cobro > diaHoy) {
    fecha = new Date(año, mes, dia_cobro)
  } else {
    fecha = new Date(año, mes + 1, dia_cobro)
  }

  const diff = Math.ceil((fecha.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
  const d = fecha.getDate()
  const m = fecha.getMonth()
  return { fecha: `${d} ${MESES_CORTO[m]}`, diasRestantes: diff }
}

function EstadoBadge({ estado }: { estado: PagoRecurrente['estado'] }) {
  const confirmado = estado === 'confirmado'
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6,
      background: confirmado ? '#E1F5EE' : '#FFF4E0',
      color: confirmado ? '#0F6E56' : '#9B5A00',
      letterSpacing: 0.2,
    }}>
      {confirmado ? 'Confirmado' : 'Posible'}
    </span>
  )
}

function PagoRow({ pago }: { pago: PagoRecurrente }) {
  const proximo = getProximoCobro(pago.dia_cobro)
  const urgente = proximo !== null && proximo.diasRestantes <= 5

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '13px 0', borderBottom: '0.5px solid #eee',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: '#111', marginBottom: 3 }}>
          {pago.nombre}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <EstadoBadge estado={pago.estado} />
          {pago.notas && (
            <span style={{ fontSize: 11, color: '#aaa' }}>{pago.notas}</span>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>
          {formatMonto(pago.monto)}
        </span>
        {proximo ? (
          <span style={{
            fontSize: 11, color: urgente ? '#BA4A00' : '#888',
            fontWeight: urgente ? 700 : 400,
          }}>
            {urgente ? `⚡ ${proximo.fecha}` : proximo.fecha}
          </span>
        ) : (
          <span style={{ fontSize: 11, color: '#ccc' }}>Fecha ?</span>
        )}
      </div>
    </div>
  )
}

function Seccion({ titulo, pagos, acento }: {
  titulo: string
  pagos: PagoRecurrente[]
  acento: string
}) {
  const total = pagos.reduce((s, p) => s + (p.monto ?? 0), 0)
  const soloConfirmados = pagos.filter(p => p.estado === 'confirmado')
  const totalConfirmado = soloConfirmados.reduce((s, p) => s + (p.monto ?? 0), 0)

  return (
    <div style={{ background: '#fff', borderRadius: 16, padding: '16px', marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: acento, display: 'inline-block' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>{titulo}</span>
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>
          {formatMonto(totalConfirmado)}
          {total > totalConfirmado && (
            <span style={{ fontSize: 11, color: '#aaa', fontWeight: 400 }}>/mes</span>
          )}
        </span>
      </div>
      <div style={{ fontSize: 11, color: '#aaa', marginBottom: 12 }}>
        {pagos.length} {pagos.length === 1 ? 'cargo' : 'cargos'} · {soloConfirmados.length} confirmados
      </div>
      {pagos.map(p => <PagoRow key={p.id} pago={p} />)}
    </div>
  )
}

export default function RecurrentesClient({ pagos }: { pagos: PagoRecurrente[] }) {
  const suscripciones = useMemo(() =>
    pagos.filter(p => p.categoria === 'suscripcion'), [pagos])

  const cargosBancarios = useMemo(() =>
    pagos.filter(p => p.categoria === 'cargo_bancario'), [pagos])

  const totalMensual = useMemo(() =>
    pagos.reduce((s, p) => s + (p.monto ?? 0), 0), [pagos])

  const proximosCobros = useMemo(() => {
    return pagos
      .filter(p => p.dia_cobro !== null && p.estado === 'confirmado')
      .map(p => ({ ...p, proximo: getProximoCobro(p.dia_cobro)! }))
      .filter(p => p.proximo.diasRestantes >= 0)
      .sort((a, b) => a.proximo.diasRestantes - b.proximo.diasRestantes)
      .slice(0, 3)
  }, [pagos])

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 0 40px' }}>

      {/* Header */}
      <div style={{ background: '#1A1A2E', color: '#fff', padding: '48px 20px 20px', borderRadius: '0 0 24px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <Link href="/dashboard" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: 13 }}>
            ← Dashboard
          </Link>
        </div>
        <div style={{ fontSize: 13, opacity: 0.6, marginBottom: 4 }}>Gastos fijos</div>
        <div style={{ fontSize: 24, fontWeight: 700 }}>Recurrentes</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 8 }}>
          <span style={{ fontSize: 28, fontWeight: 800 }}>{formatMonto(totalMensual)}</span>
          <span style={{ fontSize: 13, opacity: 0.6 }}>/ mes estimado</span>
        </div>
      </div>

      <div style={{ padding: '16px 16px 0' }}>

        {/* Próximos cobros */}
        {proximosCobros.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 16, padding: '16px', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 12 }}>
              Próximos cobros
            </div>
            {proximosCobros.map(p => {
              const urgente = p.proximo.diasRestantes <= 5
              return (
                <div key={p.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 0', borderBottom: '0.5px solid #eee',
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#111' }}>{p.nombre}</div>
                    <div style={{ fontSize: 11, color: urgente ? '#BA4A00' : '#888', fontWeight: urgente ? 700 : 400 }}>
                      {p.proximo.diasRestantes === 0 ? 'Hoy' : `en ${p.proximo.diasRestantes} días · ${p.proximo.fecha}`}
                    </div>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>
                    {formatMonto(p.monto)}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {/* Suscripciones */}
        <Seccion titulo="Suscripciones" pagos={suscripciones} acento="#7B5EA7" />

        {/* Cargos bancarios */}
        <Seccion titulo="Cargos bancarios" pagos={cargosBancarios} acento="#378ADD" />

      </div>
    </div>
  )
}

'use client'

import Link from 'next/link'
import { useState, useMemo } from 'react'
import type { Movimiento, ResumenMensual } from '@/types/movimientos'

// ── Colores ───────────────────────────────────────────────────────────────────

const CAT_COLORS: Record<string, string> = {
  Supermercado:             '#1D9E75',
  Comida:                   '#E8503A',
  Salidas:                  '#EC407A',
  Café:                     '#7B5EA7',
  Gasolina:                 '#BA7517',
  Suscripciones:            '#0057FF',
  Farmacia:                 '#E91E63',
  Entretenimiento:          '#FF9800',
  Educación:                '#0097A7',
  Auto:                     '#546E7A',
  Banco:                    '#888',
  'Transferencia Recibida': '#1D9E75',
  'Transferencia Enviada':  '#378ADD',
  Interés:                  '#4CAF50',
  Otro:                     '#BBB',
}

// Presupuesto mensual (quincenal × 2 del plan financiero)
const PRESUPUESTO: { cat: string; label: string; mensual: number }[] = [
  { cat: 'Supermercado',  label: 'Súper',         mensual: 200 },
  { cat: 'Comida',        label: 'Comida',         mensual: 60  },
  { cat: 'Gasolina',      label: 'Gasolina',       mensual: 100 },
  { cat: 'Suscripciones', label: 'Suscripciones',  mensual: 60  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return '$' + n.toLocaleString('es-PA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtFecha(s: string) {
  const [, mo, d] = s.split('-')
  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
  return `${parseInt(d)} ${meses[parseInt(mo) - 1]}`
}

// ── Componentes reutilizables ─────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, color: '#aaa',
      letterSpacing: 0.8, textTransform: 'uppercase',
      marginBottom: 10, marginTop: 20,
    }}>
      {label}
    </div>
  )
}

function Pill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: '6px 13px', borderRadius: 20, border: 'none', cursor: 'pointer',
      fontSize: 12, fontWeight: active ? 700 : 500, whiteSpace: 'nowrap',
      background: active ? '#0057FF' : '#F0F2F5',
      color: active ? '#fff' : '#555',
      flexShrink: 0,
    }}>
      {label}
    </button>
  )
}

function StatCard({ label, monto, color }: { label: string; monto: number; color: string }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 16, padding: '12px',
      display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <div style={{ fontSize: 10, color: '#888', fontWeight: 500, lineHeight: 1.3 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color, marginTop: 2 }}>{fmt(monto)}</div>
    </div>
  )
}

// Gráfico de barras verticales (CSS puro)
function BarChart({ data, color = '#0057FF', height = 100 }: {
  data: { label: string; value: number }[]
  color?: string
  height?: number
}) {
  const maxVal = Math.max(...data.map(d => d.value), 1)
  const barAreaHeight = height - 20

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height }}>
      {data.map((d, i) => (
        <div key={i} style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', height: '100%', justifyContent: 'flex-end',
        }}>
          <div style={{
            width: '100%',
            height: d.value > 0 ? Math.max((d.value / maxVal) * barAreaHeight, 3) : 0,
            background: color, borderRadius: '3px 3px 0 0',
          }} />
          <div style={{ fontSize: 9, color: '#aaa', marginTop: 3, textAlign: 'center', lineHeight: 1.2 }}>
            {d.label}
          </div>
        </div>
      ))}
    </div>
  )
}

// Gráfico de línea del saldo (SVG)
function SaldoLine({ data }: { data: { saldo: number }[] }) {
  if (data.length < 2) return null
  const W = 440, H = 70, pad = 4
  const minV = Math.min(...data.map(d => d.saldo))
  const maxV = Math.max(...data.map(d => d.saldo))
  const range = maxV - minV || 1

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * (W - pad * 2) + pad
    const y = H - pad - ((d.saldo - minV) / range) * (H - pad * 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')

  const areaPoints = `${pad},${H - pad} ${points} ${W - pad},${H - pad}`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H, display: 'block' }}>
      <defs>
        <linearGradient id="saldoGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0057FF" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#0057FF" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon fill="url(#saldoGrad)" points={areaPoints} />
      <polyline fill="none" stroke="#0057FF" strokeWidth="2"
        strokeLinejoin="round" strokeLinecap="round" points={points} />
    </svg>
  )
}

// ── Sheet para editar categoría de un merchant ────────────────────────────────

const TODAS_CATEGORIAS = [
  'Supermercado','Comida','Salidas','Café','Gasolina','Suscripciones',
  'Farmacia','Educación','Auto','Entretenimiento','Banco','Otro',
] as const

function EditarCategoriaSheet({ merchant, categoriaActual, onClose }: {
  merchant: string
  categoriaActual: string
  onClose: (recargado: boolean) => void
}) {
  const [saving, setSaving] = useState(false)
  const [selectedCat, setSelectedCat] = useState(categoriaActual)

  async function guardar() {
    if (selectedCat === categoriaActual) { onClose(false); return }
    setSaving(true)
    try {
      await fetch('/api/clasificaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchant, categoria: selectedCat }),
      })
      onClose(true)
    } finally {
      setSaving(false)
    }
  }

  async function resetear() {
    setSaving(true)
    try {
      await fetch('/api/clasificaciones', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchant }),
      })
      onClose(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div onClick={() => onClose(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200 }} />
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480, background: '#fff',
        borderRadius: '20px 20px 0 0', padding: '12px 20px 40px', zIndex: 201,
        boxShadow: '0 -4px 30px rgba(0,0,0,0.2)',
        maxHeight: '85vh', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: '#E0E0E0', margin: '0 auto 16px', flexShrink: 0 }} />

        <div style={{ fontSize: 16, fontWeight: 700, color: '#111', marginBottom: 4, flexShrink: 0 }}>{merchant}</div>
        <div style={{ fontSize: 12, color: '#aaa', marginBottom: 16, flexShrink: 0 }}>
          Categoría actual: <span style={{ color: CAT_COLORS[categoriaActual] ?? '#aaa', fontWeight: 600 }}>{categoriaActual}</span>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, marginBottom: 16 }}>
          {TODAS_CATEGORIAS.map(cat => {
            const activo = selectedCat === cat
            const color = CAT_COLORS[cat] ?? '#aaa'
            return (
              <button key={cat} onClick={() => setSelectedCat(cat)} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: activo ? `${color}18` : 'transparent',
                marginBottom: 4,
              }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                <span style={{ fontSize: 14, fontWeight: activo ? 700 : 400, color: activo ? color : '#333', flex: 1, textAlign: 'left' }}>
                  {cat}
                </span>
                {activo && <span style={{ fontSize: 14, color }}>✓</span>}
              </button>
            )
          })}
        </div>

        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button onClick={resetear} disabled={saving} style={{
            flex: 1, padding: '13px', borderRadius: 12, border: '1.5px solid #E0E0E0',
            background: '#fff', color: '#888', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
            Restablecer
          </button>
          <button onClick={guardar} disabled={saving || selectedCat === categoriaActual} style={{
            flex: 2, padding: '13px', borderRadius: 12, border: 'none',
            background: saving || selectedCat === categoriaActual ? '#ccc' : '#0057FF',
            color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}>
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </>
  )
}

// ── Bottom sheet de categoría ─────────────────────────────────────────────────

function CategoriaSheet({ cat, movimientos, onClose }: {
  cat: string
  movimientos: Movimiento[]
  onClose: () => void
}) {
  const [editingMerchant, setEditingMerchant] = useState<{ nombre: string; cat: string } | null>(null)

  const txs = movimientos
    .filter(m => m.esTarjeta && m.esGasto && m.categoria === cat)
    .sort((a, b) => b.monto - a.monto)

  // Merchants únicos para editar (agrupados)
  const merchants = Array.from(new Set(txs.map(m => m.descripcion)))

  const total = txs.reduce((s, m) => s + m.monto, 0)
  const color = CAT_COLORS[cat] ?? '#aaa'

  function handleEditClose(recargado: boolean) {
    setEditingMerchant(null)
    if (recargado) window.location.reload()
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100 }} />
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480, background: '#fff',
        borderRadius: '20px 20px 0 0', padding: '12px 20px 40px', zIndex: 101,
        boxShadow: '0 -4px 30px rgba(0,0,0,0.15)',
        maxHeight: '80vh', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: '#E0E0E0', margin: '0 auto 20px', flexShrink: 0 }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'inline-block' }} />
            <span style={{ fontSize: 18, fontWeight: 700, color: '#111' }}>{cat}</span>
          </div>
          <span style={{ fontSize: 18, fontWeight: 800, color }}>{fmt(total)}</span>
        </div>
        <div style={{ fontSize: 11, color: '#aaa', marginBottom: 12, flexShrink: 0 }}>
          {txs.length} {txs.length === 1 ? 'transacción' : 'transacciones'} · toca un comercio para reclasificar
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {txs.map((m, i) => (
            <div
              key={i}
              onClick={() => setEditingMerchant({ nombre: m.descripcion, cat: m.categoria })}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '11px 0', cursor: 'pointer',
                borderBottom: i < txs.length - 1 ? '0.5px solid #f0f0f0' : 'none',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, color: '#111', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {m.descripcion}
                </div>
                <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>{fmtFecha(m.fecha)}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 12 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>{fmt(m.monto)}</span>
                <span style={{ fontSize: 13, color: '#ddd' }}>✎</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {editingMerchant && (
        <EditarCategoriaSheet
          merchant={editingMerchant.nombre}
          categoriaActual={editingMerchant.cat}
          onClose={handleEditClose}
        />
      )}
    </>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function MovimientosClient({
  movimientos,
  resumenPorMes,
  mesesDisponibles,
  archivoFecha,
  saldoActual,
}: {
  movimientos: Movimiento[]
  resumenPorMes: ResumenMensual[]
  mesesDisponibles: string[]
  archivoFecha: string
  saldoActual: number
}) {
  const [mes, setMes] = useState(mesesDisponibles[0] ?? '')
  const [catSheet, setCatSheet] = useState<string | null>(null)

  const mesLabel = useMemo(
    () => resumenPorMes.find(r => r.mes === mes)?.label ?? mes,
    [resumenPorMes, mes]
  )

  // ── Movimientos del mes seleccionado ────────────────────────────────────────
  const movimientosMes = useMemo(
    () => movimientos.filter(m => m.fecha.startsWith(mes)),
    [movimientos, mes]
  )

  // ── Cards de resumen ────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    let gastosTarjeta = 0, transferRecibidas = 0, transferEnviadas = 0
    for (const m of movimientosMes) {
      if (m.categoria === 'Transferencia Recibida') transferRecibidas += m.monto
      else if (m.categoria === 'Transferencia Enviada') transferEnviadas += m.monto
      else if (m.esTarjeta && m.esGasto) gastosTarjeta += m.monto
    }
    return { gastosTarjeta, transferRecibidas, transferEnviadas }
  }, [movimientosMes])

  // ── Categorías ──────────────────────────────────────────────────────────────
  const porCategoria = useMemo(() => {
    const map = new Map<string, number>()
    for (const m of movimientosMes) {
      if (!m.esTarjeta || !m.esGasto) continue
      map.set(m.categoria, (map.get(m.categoria) ?? 0) + m.monto)
    }
    return Array.from(map.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([cat, total]) => ({
        cat, total,
        pct: stats.gastosTarjeta > 0 ? (total / stats.gastosTarjeta) * 100 : 0,
      }))
  }, [movimientosMes, stats.gastosTarjeta])

  // ── Top comercios ───────────────────────────────────────────────────────────
  const topComercios = useMemo(() => {
    const map = new Map<string, { total: number; veces: number }>()
    for (const m of movimientosMes) {
      if (!m.esTarjeta || !m.esGasto) continue
      const e = map.get(m.descripcion) ?? { total: 0, veces: 0 }
      e.total += m.monto; e.veces++
      map.set(m.descripcion, e)
    }
    return Array.from(map.entries())
      .sort(([, a], [, b]) => b.total - a.total)
      .slice(0, 8)
      .map(([nombre, d]) => ({ nombre, ...d }))
  }, [movimientosMes])

  // ── Gasto por día de la semana ──────────────────────────────────────────────
  const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  const porDia = useMemo(() => {
    const sums = Array(7).fill(0)
    for (const m of movimientosMes) {
      if (!m.esTarjeta || !m.esGasto) continue
      sums[new Date(m.fecha + 'T12:00:00').getDay()] += m.monto
    }
    return DIAS.map((label, i) => ({ label, value: sums[i] }))
  }, [movimientosMes])

  // ── Evolución mensual ───────────────────────────────────────────────────────
  const mensualData = useMemo(
    () => resumenPorMes.slice(-12).map(r => ({
      label: r.label.split(' ')[0],
      value: r.gastosTarjeta,
    })),
    [resumenPorMes]
  )

  // ── Saldo histórico (90 días) ───────────────────────────────────────────────
  const saldoHistorico = useMemo(() => {
    const seen = new Set<string>()
    const result: { fecha: string; saldo: number }[] = []
    for (const m of movimientos) {
      if (!seen.has(m.fecha)) { seen.add(m.fecha); result.push({ fecha: m.fecha, saldo: m.saldo }) }
    }
    result.reverse()
    return result.slice(-90)
  }, [movimientos])

  const saldoMin = saldoHistorico.length > 0 ? Math.min(...saldoHistorico.map(d => d.saldo)) : 0
  const saldoMax = saldoHistorico.length > 0 ? Math.max(...saldoHistorico.map(d => d.saldo)) : 0

  // ── [NUEVO] Proyección del mes actual ───────────────────────────────────────
  const proyeccion = useMemo(() => {
    const today = new Date()
    const ym = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
    const diasEnMes = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
    const diaActual = today.getDate()
    const gastado = movimientos
      .filter(m => m.fecha.startsWith(ym) && m.esTarjeta && m.esGasto)
      .reduce((s, m) => s + m.monto, 0)
    const proyectado = diaActual > 0 ? (gastado / diaActual) * diasEnMes : 0
    const label = resumenPorMes.find(r => r.mes === ym)?.label ?? ym
    return { gastado, proyectado, diaActual, diasEnMes, label, ym }
  }, [movimientos, resumenPorMes])

  // ── [NUEVO] Insights automáticos ────────────────────────────────────────────
  const insights = useMemo(() => {
    const today = new Date()
    const currentYM = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
    const completados = resumenPorMes.filter(r => r.mes < currentYM)
    const result: { texto: string; tipo: 'positivo' | 'negativo' | 'neutro' }[] = []

    // 1. MoM comparison (último mes completo vs anterior)
    const ultimo = completados[completados.length - 1]
    const penultimo = completados[completados.length - 2]
    if (ultimo && penultimo && penultimo.gastosTarjeta > 0) {
      const pct = ((ultimo.gastosTarjeta - penultimo.gastosTarjeta) / penultimo.gastosTarjeta) * 100
      result.push({
        texto: `En ${ultimo.label} gastaste ${Math.abs(pct).toFixed(0)}% ${pct >= 0 ? 'más' : 'menos'} en tarjeta que en ${penultimo.label}`,
        tipo: pct >= 0 ? 'negativo' : 'positivo',
      })
    }

    // 2. Día de mayor gasto promedio (toda la historia)
    const DIAS_NOM = ['domingos', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados']
    const dayTotals = Array(7).fill(0)
    const dayCounts = Array(7).fill(0)
    for (const m of movimientos) {
      if (!m.esTarjeta || !m.esGasto) continue
      const d = new Date(m.fecha + 'T12:00:00').getDay()
      dayTotals[d] += m.monto; dayCounts[d]++
    }
    const dayAvgs = dayTotals.map((t, i) => dayCounts[i] > 0 ? t / dayCounts[i] : 0)
    const maxDayIdx = dayAvgs.indexOf(Math.max(...dayAvgs))
    if (dayAvgs[maxDayIdx] > 0) {
      result.push({
        texto: `Los ${DIAS_NOM[maxDayIdx]} son tu día de mayor gasto promedio (${fmt(dayAvgs[maxDayIdx])} por salida)`,
        tipo: 'neutro',
      })
    }

    // 3. Tendencia últimos 3 vs anteriores 3 meses completos
    const last3 = completados.slice(-3)
    const prior3 = completados.slice(-6, -3)
    if (last3.length === 3 && prior3.length === 3) {
      const avgLast = last3.reduce((s, r) => s + r.gastosTarjeta, 0) / 3
      const avgPrior = prior3.reduce((s, r) => s + r.gastosTarjeta, 0) / 3
      if (avgPrior > 0) {
        const pct = ((avgLast - avgPrior) / avgPrior) * 100
        result.push({
          texto: `Tu gasto mensual promedio ${pct >= 0 ? 'subió' : 'bajó'} ${Math.abs(pct).toFixed(0)}% en los últimos 3 meses`,
          tipo: pct >= 0 ? 'negativo' : 'positivo',
        })
      }
    }

    // 4. Costo anual del café
    const totalMeses = resumenPorMes.length
    if (totalMeses >= 3) {
      const cafeTotal = movimientos.filter(m => m.categoria === 'Café' && m.esGasto).reduce((s, m) => s + m.monto, 0)
      if (cafeTotal > 0) {
        result.push({
          texto: `Gastas en promedio ${fmt((cafeTotal / totalMeses) * 12)} al año en café`,
          tipo: 'neutro',
        })
      }
    }

    return result
  }, [movimientos, resumenPorMes])

  // ── [NUEVO] Plan vs Real ─────────────────────────────────────────────────────
  const planVsReal = useMemo(() => {
    const catMap = new Map<string, number>()
    for (const m of movimientosMes) {
      if (!m.esTarjeta || !m.esGasto) continue
      catMap.set(m.categoria, (catMap.get(m.categoria) ?? 0) + m.monto)
    }
    return PRESUPUESTO.map(p => ({
      ...p,
      real: catMap.get(p.cat) ?? 0,
      pct: p.mensual > 0 ? Math.min(((catMap.get(p.cat) ?? 0) / p.mensual) * 100, 120) : 0,
    }))
  }, [movimientosMes])

  // ── [NUEVO] Recurrentes detectados ──────────────────────────────────────────
  const recurrentes = useMemo(() => {
    const byMerchant = new Map<string, Movimiento[]>()
    for (const m of movimientos) {
      if (!m.esTarjeta || !m.esGasto) continue
      const txs = byMerchant.get(m.descripcion) ?? []
      txs.push(m)
      byMerchant.set(m.descripcion, txs)
    }

    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 40)
    const cutoffStr = cutoff.toISOString().slice(0, 10)

    const result: { nombre: string; monto: number; meses: number; totalAcumulado: number; activo: boolean }[] = []

    for (const [nombre, txs] of byMerchant) {
      const mesesSet = new Set(txs.map(t => t.fecha.slice(0, 7)))
      if (mesesSet.size < 2) continue

      const amounts = txs.map(t => t.monto)
      const minAmt = Math.min(...amounts)
      const maxAmt = Math.max(...amounts)
      if (minAmt <= 0) continue

      const esSuscripcion = txs[0].categoria === 'Suscripciones'
      const variation = (maxAmt - minAmt) / minAmt

      if (esSuscripcion) {
        // Suscripciones: toleramos hasta 30% de variación (subidas de precio)
        // y no filtramos por frecuencia — siempre es 1 cargo/mes
        if (variation > 0.30) continue
      } else {
        // Otros merchants: monto consistente y no es una tienda frecuente
        if (variation > 0.12) continue
        if (txs.length / mesesSet.size > 1.5) continue
      }

      const lastSeen = [...txs].sort((a, b) => b.fecha.localeCompare(a.fecha))[0].fecha
      result.push({
        nombre,
        monto: amounts.reduce((s, a) => s + a, 0) / amounts.length,
        meses: mesesSet.size,
        totalAcumulado: amounts.reduce((s, a) => s + a, 0),
        activo: lastSeen >= cutoffStr,
      })
    }

    return result.sort((a, b) => b.meses - a.meses).slice(0, 15)
  }, [movimientos])

  const costoMensualRecurrentes = useMemo(
    () => recurrentes.filter(r => r.activo).reduce((s, r) => s + r.monto, 0),
    [recurrentes]
  )

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      <div style={{ maxWidth: 480, margin: '0 auto', paddingBottom: 40 }}>

        {/* Header */}
        <div style={{ background: '#0057FF', color: '#fff', padding: '48px 20px 24px', borderRadius: '0 0 24px 24px' }}>
          <Link href="/movimientos" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, textDecoration: 'none' }}>
            ← Movimientos
          </Link>
          <div style={{ fontSize: 24, fontWeight: 700, marginTop: 8 }}>Análisis</div>
          <div style={{ fontSize: 13, opacity: 0.75, marginTop: 2 }}>
            Cuenta de ahorros · actualizado {archivoFecha}
          </div>
          <div style={{
            marginTop: 20, background: 'rgba(255,255,255,0.15)',
            borderRadius: 14, padding: '14px 16px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <div style={{ fontSize: 11, opacity: 0.8 }}>Saldo en archivo</div>
              <div style={{ fontSize: 28, fontWeight: 800 }}>{fmt(saldoActual)}</div>
              <div style={{ fontSize: 10, opacity: 0.6, marginTop: 2 }}>puede diferir del disponible</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, opacity: 0.8 }}>Transacciones</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{movimientos.length.toLocaleString()}</div>
            </div>
          </div>
        </div>

        <div style={{ padding: '0 16px' }}>

          {/* Filtros de mes */}
          <div style={{ display: 'flex', gap: 8, marginTop: 16, marginBottom: 16, overflowX: 'auto', paddingBottom: 2 }}>
            {mesesDisponibles.slice(0, 24).map(m => (
              <Pill
                key={m}
                label={resumenPorMes.find(r => r.mes === m)?.label ?? m}
                active={mes === m}
                onClick={() => setMes(m)}
              />
            ))}
          </div>

          {/* Stats cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 4 }}>
            <StatCard label="Gastos tarjeta"    monto={stats.gastosTarjeta}    color="#E8503A" />
            <StatCard label="Transf. recibidas" monto={stats.transferRecibidas} color="#1D9E75" />
            <StatCard label="Transf. enviadas"  monto={stats.transferEnviadas}  color="#378ADD" />
          </div>
          <div style={{ fontSize: 11, color: '#bbb', textAlign: 'right', marginBottom: 4 }}>{mesLabel}</div>

          {/* ── PROYECCIÓN DEL MES ── */}
          {proyeccion.gastado > 0 && (
            <>
              <SectionLabel label={`Proyección · ${proyeccion.label}`} />
              <div style={{ background: '#fff', borderRadius: 16, padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 11, color: '#aaa', marginBottom: 2 }}>Proyectado al cerrar el mes</div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: '#111' }}>{fmt(proyeccion.proyectado)}</div>
                    <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
                      {fmt(proyeccion.gastado)} gastados en {proyeccion.diaActual} de {proyeccion.diasEnMes} días
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 10, color: '#aaa', marginBottom: 2 }}>Ritmo diario</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#BA7517' }}>
                      {fmt(proyeccion.gastado / proyeccion.diaActual)}
                    </div>
                    <div style={{ fontSize: 10, color: '#aaa' }}>por día</div>
                  </div>
                </div>
                <div style={{ marginTop: 14, background: '#f0f0f0', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 4, background: '#0057FF',
                    width: `${Math.min((proyeccion.diaActual / proyeccion.diasEnMes) * 100, 100)}%`,
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={{ fontSize: 10, color: '#aaa' }}>Día {proyeccion.diaActual}</span>
                  <span style={{ fontSize: 10, color: '#aaa' }}>Día {proyeccion.diasEnMes}</span>
                </div>
              </div>
            </>
          )}

          {/* ── INSIGHTS ── */}
          {insights.length > 0 && (
            <>
              <SectionLabel label="Resumen inteligente" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {insights.map((ins, i) => (
                  <div key={i} style={{
                    background: '#fff', borderRadius: 12, padding: '13px 14px',
                    borderLeft: `3px solid ${ins.tipo === 'positivo' ? '#1D9E75' : ins.tipo === 'negativo' ? '#E8503A' : '#0057FF'}`,
                    fontSize: 13, color: '#333', lineHeight: 1.5,
                  }}>
                    {ins.texto}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── PLAN VS REAL ── */}
          <SectionLabel label={`Plan vs real · ${mesLabel}`} />
          <div style={{ background: '#fff', borderRadius: 16, padding: '16px' }}>
            {planVsReal.map(({ cat, label, mensual, real, pct }, i) => {
              const color = pct < 80 ? '#1D9E75' : pct < 100 ? '#BA7517' : '#E8503A'
              return (
                <div key={cat} style={{ marginBottom: i < planVsReal.length - 1 ? 16 : 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 13, color: '#333', fontWeight: 500 }}>{label}</span>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 600, color }}>{fmt(real)}</span>
                      <span style={{ fontSize: 10, color: '#aaa', marginLeft: 4 }}>/ {fmt(mensual)}</span>
                    </div>
                  </div>
                  <div style={{ background: '#f0f0f0', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 4 }} />
                  </div>
                  {pct > 100 && (
                    <div style={{ fontSize: 10, color: '#E8503A', marginTop: 3 }}>
                      Excediste el presupuesto en {fmt(real - mensual)}
                    </div>
                  )}
                </div>
              )
            })}
            <div style={{ fontSize: 10, color: '#ccc', marginTop: 8, paddingTop: 10, borderTop: '0.5px solid #f5f5f5' }}>
              Basado en gastos fijos quincenal ×2
            </div>
          </div>

          {/* Saldo histórico */}
          <SectionLabel label="Saldo histórico (90 días)" />
          <div style={{ background: '#fff', borderRadius: 16, padding: '16px' }}>
            {saldoHistorico.length > 1 ? (
              <>
                <SaldoLine data={saldoHistorico} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                  <span style={{ fontSize: 10, color: '#aaa' }}>{saldoHistorico[0].fecha}</span>
                  <span style={{ fontSize: 10, color: '#aaa' }}>{saldoHistorico[saldoHistorico.length - 1].fecha}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={{ fontSize: 11, color: '#aaa' }}>Mín {fmt(saldoMin)}</span>
                  <span style={{ fontSize: 11, color: '#aaa' }}>Máx {fmt(saldoMax)}</span>
                </div>
              </>
            ) : (
              <span style={{ fontSize: 13, color: '#aaa' }}>Sin datos suficientes</span>
            )}
          </div>

          {/* Evolución mensual */}
          <SectionLabel label="Gastos tarjeta · últimos 12 meses" />
          <div style={{ background: '#fff', borderRadius: 16, padding: '16px' }}>
            <BarChart data={mensualData} color="#0057FF" height={120} />
          </div>

          {/* ── RECURRENTES ── */}
          {recurrentes.length > 0 && (
            <>
              <SectionLabel label="Cargos recurrentes detectados" />
              <div style={{ background: '#fff', borderRadius: 16, padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: '#888' }}>Costo mensual (activos)</span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#0057FF' }}>{fmt(costoMensualRecurrentes)}</span>
                </div>
                <div style={{ fontSize: 11, color: '#aaa', marginBottom: 14 }}>
                  Anual estimado: {fmt(costoMensualRecurrentes * 12)}
                </div>
                {recurrentes.map((r, i) => (
                  <div key={r.nombre} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 0',
                    borderBottom: i < recurrentes.length - 1 ? '0.5px solid #f0f0f0' : 'none',
                    opacity: r.activo ? 1 : 0.45,
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: '#111', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.nombre}
                      </div>
                      <div style={{ fontSize: 11, color: '#aaa', marginTop: 1 }}>
                        {r.meses} meses · acumulado {fmt(r.totalAcumulado)}
                        {!r.activo && ' · posiblemente cancelado'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{fmt(r.monto)}/mes</div>
                      <div style={{ fontSize: 10, color: '#aaa' }}>{fmt(r.monto * 12)}/año</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Categorías */}
          <SectionLabel label={`Categorías · ${mesLabel}`} />
          <div style={{ background: '#fff', borderRadius: 16, padding: '16px' }}>
            {porCategoria.length === 0 ? (
              <span style={{ fontSize: 13, color: '#aaa' }}>Sin gastos con tarjeta este mes</span>
            ) : (
              porCategoria.map(({ cat, total, pct }) => (
                <div key={cat} style={{ marginBottom: 14, cursor: 'pointer' }} onClick={() => setCatSheet(cat)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: CAT_COLORS[cat] ?? '#aaa', display: 'inline-block', flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: '#333', fontWeight: 500 }}>{cat}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{fmt(total)}</span>
                      <span style={{ fontSize: 10, color: '#aaa' }}>{pct.toFixed(0)}%</span>
                      <span style={{ fontSize: 12, color: '#ccc' }}>›</span>
                    </div>
                  </div>
                  <div style={{ background: '#f0f0f0', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: CAT_COLORS[cat] ?? '#aaa', borderRadius: 4 }} />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Día de la semana */}
          <SectionLabel label={`Gasto por día · ${mesLabel}`} />
          <div style={{ background: '#fff', borderRadius: 16, padding: '16px' }}>
            <BarChart data={porDia} color="#7B5EA7" height={110} />
          </div>

          {/* Top comercios */}
          <SectionLabel label={`Top comercios · ${mesLabel}`} />
          <div style={{ background: '#fff', borderRadius: 16, padding: '16px' }}>
            {topComercios.length === 0 ? (
              <span style={{ fontSize: 13, color: '#aaa' }}>Sin datos este mes</span>
            ) : (() => {
              const maxTotal = topComercios[0].total
              return topComercios.map(({ nombre, total, veces }, i) => (
                <div key={nombre} style={{
                  padding: '10px 0',
                  borderBottom: i < topComercios.length - 1 ? '0.5px solid #f0f0f0' : 'none',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: '#111', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {nombre}
                      </div>
                      <div style={{ fontSize: 11, color: '#aaa', marginTop: 1 }}>
                        {veces} {veces === 1 ? 'vez' : 'veces'}
                      </div>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#111', marginLeft: 12, flexShrink: 0 }}>
                      {fmt(total)}
                    </span>
                  </div>
                  <div style={{ background: '#f0f0f0', borderRadius: 4, height: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(total / maxTotal) * 100}%`, background: '#E8503A', borderRadius: 4 }} />
                  </div>
                </div>
              ))
            })()}
          </div>

        </div>
      </div>

      {catSheet && (
        <CategoriaSheet
          cat={catSheet}
          movimientos={movimientosMes}
          onClose={() => setCatSheet(null)}
        />
      )}
    </>
  )
}

import { getLatestMovimientosFile, parseMovimientos, buildResumenPorMes } from '@/lib/movimientos-parser'
import ResumenClient, { type ResumenData } from '../_components/ResumenClient'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const PRESUPUESTO = [
  { cat: 'Supermercado',  label: 'Súper',         mensual: 200 },
  { cat: 'Comida',        label: 'Comida',         mensual: 60  },
  { cat: 'Gasolina',      label: 'Gasolina',       mensual: 100 },
  { cat: 'Suscripciones', label: 'Suscripciones',  mensual: 60  },
]

export default async function MovimientosPage() {
  const file = await getLatestMovimientosFile()

  if (!file) {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '48px 20px' }}>
        <Link href="/dashboard" style={{ color: '#0057FF', fontSize: 13 }}>← Dashboard</Link>
        <p style={{ color: '#888', marginTop: 20, fontSize: 14 }}>
          No se encontró ningún archivo de movimientos en Downloads.
        </p>
      </div>
    )
  }

  const movimientos = parseMovimientos(file.content)
  const resumenPorMes = buildResumenPorMes(movimientos)

  const today = new Date()
  const currentYM = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  const diasEnMes = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const diaActual = today.getDate()

  // Mes anterior
  const prevDate = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const prevYM = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`

  const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  const mesLabel     = `${MESES[today.getMonth()]} ${today.getFullYear()}`
  const mesAntLabel  = `${MESES[prevDate.getMonth()]}`

  // Movimientos de cada mes
  const movsActual = movimientos.filter(m => m.fecha.startsWith(currentYM))
  const movsAnterior = movimientos.filter(m => m.fecha.startsWith(prevYM))

  // Gastos tarjeta
  const gastadoEsteMes     = movsActual.filter(m => m.esTarjeta && m.esGasto).reduce((s, m) => s + m.monto, 0)
  const gastosMesAnterior  = movsAnterior.filter(m => m.esTarjeta && m.esGasto).reduce((s, m) => s + m.monto, 0)
  const proyectado         = diaActual > 0 ? (gastadoEsteMes / diaActual) * diasEnMes : 0

  // Transferencias mes actual
  const transferenciaRecibida = movsActual.filter(m => m.categoria === 'Transferencia Recibida').reduce((s, m) => s + m.monto, 0)
  const transferenciaEnviada  = movsActual.filter(m => m.categoria === 'Transferencia Enviada').reduce((s, m) => s + m.monto, 0)

  // Plan vs real
  const catMapActual = new Map<string, number>()
  for (const m of movsActual) {
    if (!m.esTarjeta || !m.esGasto) continue
    catMapActual.set(m.categoria, (catMapActual.get(m.categoria) ?? 0) + m.monto)
  }
  const planVsReal = PRESUPUESTO.map(p => ({
    label:   p.label,
    mensual: p.mensual,
    real:    catMapActual.get(p.cat) ?? 0,
  }))

  // Top 4 categorías del mes
  const catTotals = new Map<string, number>()
  for (const m of movsActual) {
    if (!m.esTarjeta || !m.esGasto) continue
    catTotals.set(m.categoria, (catTotals.get(m.categoria) ?? 0) + m.monto)
  }
  const topCategorias = Array.from(catTotals.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4)
    .map(([cat, total]) => ({
      cat, total,
      pct: gastadoEsteMes > 0 ? (total / gastadoEsteMes) * 100 : 0,
    }))

  // Recurrentes activos
  const byMerchant = new Map<string, typeof movimientos>()
  for (const m of movimientos) {
    if (!m.esTarjeta || !m.esGasto) continue
    const txs = byMerchant.get(m.descripcion) ?? []
    txs.push(m)
    byMerchant.set(m.descripcion, txs)
  }
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 40)
  const cutoffStr = cutoff.toISOString().slice(0, 10)
  let costoMensual = 0
  let cantidadRecurrentes = 0
  for (const [, txs] of byMerchant) {
    const mesesSet = new Set(txs.map(t => t.fecha.slice(0, 7)))
    if (mesesSet.size < 2) continue
    const amounts = txs.map(t => t.monto)
    const minAmt = Math.min(...amounts)
    const maxAmt = Math.max(...amounts)
    if (minAmt <= 0) continue
    const esSuscripcion = txs[0].categoria === 'Suscripciones'
    const variation = (maxAmt - minAmt) / minAmt
    if (esSuscripcion) { if (variation > 0.30) continue }
    else { if (variation > 0.12 || txs.length / mesesSet.size > 1.5) continue }
    const lastSeen = [...txs].sort((a, b) => b.fecha.localeCompare(a.fecha))[0].fecha
    if (lastSeen >= cutoffStr) {
      costoMensual += amounts.reduce((s, a) => s + a, 0) / amounts.length
      cantidadRecurrentes++
    }
  }

  // Insights (solo los 2 más relevantes)
  const insights: ResumenData['insights'] = []
  const completados = resumenPorMes.filter(r => r.mes < currentYM)
  const ultimo = completados[completados.length - 1]
  const penultimo = completados[completados.length - 2]
  if (ultimo && penultimo && penultimo.gastosTarjeta > 0) {
    const pct = ((ultimo.gastosTarjeta - penultimo.gastosTarjeta) / penultimo.gastosTarjeta) * 100
    insights.push({
      texto: `En ${ultimo.label} gastaste ${Math.abs(pct).toFixed(0)}% ${pct >= 0 ? 'más' : 'menos'} en tarjeta que en ${penultimo.label}`,
      tipo: pct >= 0 ? 'negativo' : 'positivo',
    })
  }
  const last3 = completados.slice(-3)
  const prior3 = completados.slice(-6, -3)
  if (last3.length === 3 && prior3.length === 3) {
    const avgLast  = last3.reduce((s, r) => s + r.gastosTarjeta, 0) / 3
    const avgPrior = prior3.reduce((s, r) => s + r.gastosTarjeta, 0) / 3
    if (avgPrior > 0) {
      const pct = ((avgLast - avgPrior) / avgPrior) * 100
      insights.push({
        texto: `Tu gasto mensual promedio ${pct >= 0 ? 'subió' : 'bajó'} ${Math.abs(pct).toFixed(0)}% en los últimos 3 meses`,
        tipo: pct >= 0 ? 'negativo' : 'positivo',
      })
    }
  }

  const data: ResumenData = {
    saldoActual:              movimientos[0]?.saldo ?? 0,
    archivoFecha:             file.archivoFecha,
    mesLabel,
    gastadoEsteMes,
    proyectado,
    diaActual,
    diasEnMes,
    gastosMesAnterior,
    mesAnteriorLabel:         mesAntLabel,
    transferenciaRecibida,
    transferenciaEnviada,
    planVsReal,
    topCategorias,
    costoRecurrentesMensual:  costoMensual,
    costoRecurrentesAnual:    costoMensual * 12,
    cantidadRecurrentes,
    insights,
  }

  return <ResumenClient data={data} />
}

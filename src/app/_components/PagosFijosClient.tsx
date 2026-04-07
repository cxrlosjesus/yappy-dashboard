'use client'

import Link from 'next/link'
import { useState, useEffect, useMemo } from 'react'
import type { PagoFijo, PagoFijoCategoria } from '@/types/pagos-fijos'

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function fmt(n: number) {
  return '$' + n.toLocaleString('es-PA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function getQuincenaId(): string {
  const hoy = new Date()
  const mitad = hoy.getDate() <= 15 ? '1' : '2'
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-Q${mitad}`
}

function getQuincenaLabel(): string {
  const hoy = new Date()
  const mitad = hoy.getDate() <= 15 ? 'Primera' : 'Segunda'
  return `${mitad} quincena · ${MESES[hoy.getMonth()]} ${hoy.getFullYear()}`
}

function getProximoCobro(dia: number): string {
  const hoy = new Date()
  const diaHoy = hoy.getDate()
  let fecha: Date
  if (dia > diaHoy) {
    fecha = new Date(hoy.getFullYear(), hoy.getMonth(), dia)
  } else {
    fecha = new Date(hoy.getFullYear(), hoy.getMonth() + 1, dia)
  }
  const diff = Math.ceil((fecha.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
  if (diff === 0) return 'Hoy'
  if (diff === 1) return 'Mañana'
  return `${fecha.getDate()} ${MESES[fecha.getMonth()]}`
}

const CATEGORIA_CONFIG: Record<PagoFijoCategoria, { label: string; color: string }> = {
  transferencia:  { label: 'Transferencias',          color: '#0057FF' },
  ahorro:         { label: 'Ahorro',                  color: '#1D9E75' },
  variable:       { label: 'Gastos variables',        color: '#BA7517' },
  suscripcion:    { label: 'Suscripciones',           color: '#7B5EA7' },
  cargo_bancario: { label: 'Cargos bancarios',        color: '#378ADD' },
}

const ORDEN_CATEGORIAS: PagoFijoCategoria[] = [
  'transferencia', 'ahorro', 'variable', 'suscripcion', 'cargo_bancario'
]

function PagoItem({
  pago, checked, onToggle,
}: {
  pago: PagoFijo
  checked: boolean
  onToggle: () => void
}) {
  const proximo = pago.dia_cobro ? getProximoCobro(pago.dia_cobro) : null

  return (
    <div
      onClick={onToggle}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '13px 0', borderBottom: '0.5px solid #f0f0f0',
        cursor: 'pointer', opacity: checked ? 0.45 : 1,
        transition: 'opacity 0.2s',
      }}
    >
      {/* Checkbox */}
      <div style={{
        width: 22, height: 22, borderRadius: 6, flexShrink: 0,
        border: checked ? 'none' : '2px solid #DDD',
        background: checked ? '#1D9E75' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s',
      }}>
        {checked && <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>✓</span>}
      </div>

      {/* Emoji */}
      <span style={{ fontSize: 20, flexShrink: 0 }}>{pago.emoji}</span>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 500, color: '#111',
          textDecoration: checked ? 'line-through' : 'none',
        }}>
          {pago.nombre}
        </div>
        {proximo && (
          <div style={{ fontSize: 11, color: '#aaa', marginTop: 1 }}>{proximo}</div>
        )}
        {pago.notas && (
          <div style={{ fontSize: 11, color: '#aaa', marginTop: 1 }}>{pago.notas}</div>
        )}
      </div>

      {/* Monto */}
      <span style={{
        fontSize: 14, fontWeight: 700, color: '#111', flexShrink: 0,
        textDecoration: checked ? 'line-through' : 'none',
      }}>
        {fmt(pago.monto)}
      </span>
    </div>
  )
}

function Seccion({
  categoria, pagos, checked, onToggle,
}: {
  categoria: PagoFijoCategoria
  pagos: PagoFijo[]
  checked: Set<string>
  onToggle: (id: string) => void
}) {
  const config = CATEGORIA_CONFIG[categoria]
  const total = pagos.reduce((s, p) => s + p.monto, 0)
  const pagado = pagos.filter(p => checked.has(p.id)).reduce((s, p) => s + p.monto, 0)

  return (
    <div style={{ background: '#fff', borderRadius: 16, padding: '14px 16px', marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: config.color, display: 'inline-block' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>{config.label}</span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>{fmt(total)}</span>
          {pagado > 0 && pagado < total && (
            <span style={{ fontSize: 11, color: '#1D9E75', display: 'block' }}>{fmt(pagado)} pagado</span>
          )}
          {pagado === total && (
            <span style={{ fontSize: 11, color: '#1D9E75', display: 'block', fontWeight: 700 }}>✓ Listo</span>
          )}
        </div>
      </div>
      {pagos.map(p => (
        <PagoItem key={p.id} pago={p} checked={checked.has(p.id)} onToggle={() => onToggle(p.id)} />
      ))}
    </div>
  )
}

export default function PagosFijosClient({ pagos }: { pagos: PagoFijo[] }) {
  const quincenaId = getQuincenaId()
  const storageKey = `checklist_${quincenaId}`

  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [loaded, setLoaded] = useState(false)

  // Cargar desde localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) setChecked(new Set(JSON.parse(saved)))
    } catch {}
    setLoaded(true)
  }, [storageKey])

  // Guardar en localStorage al cambiar
  useEffect(() => {
    if (!loaded) return
    localStorage.setItem(storageKey, JSON.stringify(Array.from(checked)))
  }, [checked, storageKey, loaded])

  function toggle(id: string) {
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const totalGeneral = useMemo(() => pagos.reduce((s, p) => s + p.monto, 0), [pagos])
  const totalPagado = useMemo(() =>
    pagos.filter(p => checked.has(p.id)).reduce((s, p) => s + p.monto, 0),
  [pagos, checked])
  const porcentaje = totalGeneral > 0 ? (totalPagado / totalGeneral) * 100 : 0

  const porCategoria = useMemo(() => {
    const map = new Map<PagoFijoCategoria, PagoFijo[]>()
    for (const cat of ORDEN_CATEGORIAS) map.set(cat, [])
    for (const p of pagos) map.get(p.categoria)!.push(p)
    return map
  }, [pagos])

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', paddingBottom: 40 }}>

      {/* Header */}
      <div style={{ background: '#1A1A2E', color: '#fff', padding: '48px 20px 24px', borderRadius: '0 0 24px 24px' }}>
        <Link href="/dashboard" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: 13 }}>
          ← Dashboard
        </Link>
        <div style={{ fontSize: 13, opacity: 0.6, marginTop: 8, marginBottom: 4 }}>Checklist</div>
        <div style={{ fontSize: 24, fontWeight: 700 }}>Pagos fijos</div>
        <div style={{ fontSize: 13, opacity: 0.7, marginTop: 2 }}>{getQuincenaLabel()}</div>

        {/* Progreso */}
        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, opacity: 0.8 }}>
              {fmt(totalPagado)} <span style={{ opacity: 0.6 }}>de {fmt(totalGeneral)}</span>
            </span>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{porcentaje.toFixed(0)}%</span>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 8, height: 8, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 8,
              background: porcentaje === 100 ? '#1D9E75' : '#0057FF',
              width: `${porcentaje}%`,
              transition: 'width 0.4s ease',
            }} />
          </div>
        </div>

        {/* Resumen pagado / pendiente */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
          <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: '12px' }}>
            <div style={{ fontSize: 11, opacity: 0.7 }}>Pagado</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#4AE8A2' }}>{fmt(totalPagado)}</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: '12px' }}>
            <div style={{ fontSize: 11, opacity: 0.7 }}>Pendiente</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{fmt(totalGeneral - totalPagado)}</div>
          </div>
        </div>
      </div>

      <div style={{ padding: '16px 16px 0' }}>
        {ORDEN_CATEGORIAS.map(cat => {
          const items = porCategoria.get(cat)!
          if (items.length === 0) return null
          return (
            <Seccion
              key={cat}
              categoria={cat}
              pagos={items}
              checked={checked}
              onToggle={toggle}
            />
          )
        })}
      </div>
    </div>
  )
}

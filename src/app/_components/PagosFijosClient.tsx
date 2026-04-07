'use client'

import Link from 'next/link'
import { useState, useEffect, useMemo } from 'react'
import type { PagoFijo, PagoFijoCategoria } from '@/types/pagos-fijos'

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function fmt(n: number) {
  return '$' + n.toLocaleString('es-PA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ── Lógica de quincenas ────────────────────────────────────────────────────────

/** Próxima fecha de quincena (12 o 26) a partir de una fecha dada */
function getNextQuincena(from: Date): Date {
  const day = from.getDate()
  const m = from.getMonth()
  const y = from.getFullYear()
  if (day <= 12) return new Date(y, m, 12)
  if (day <= 26) return new Date(y, m, 26)
  return new Date(y, m + 1, 12)
}

/** Quincena anterior a una fecha de quincena */
function getPrevQuincena(q: Date): Date {
  if (q.getDate() === 12) return new Date(q.getFullYear(), q.getMonth() - 1, 26)
  return new Date(q.getFullYear(), q.getMonth(), 12)
}

/** Próxima fecha de cobro a partir de hoy */
function getNextDueDate(dia_cobro: number): Date {
  const hoy = new Date()
  const thisMonth = new Date(hoy.getFullYear(), hoy.getMonth(), dia_cobro)
  if (thisMonth > hoy) return thisMonth
  return new Date(hoy.getFullYear(), hoy.getMonth() + 1, dia_cobro)
}

/**
 * Dado un cobro en dia_cobro, calcula si la quincenaDate es una de las
 * dos quincenas que contribuyen a ese pago. Si sí, retorna monto/2.
 */
function getAllocacion(dia_cobro: number, monto: number, quincenaDate: Date): { amount: number; dueDate: Date } | null {
  const nextDue = getNextDueDate(dia_cobro)
  const nextDueTime = nextDue.getTime()

  // Generar candidatas alrededor del vencimiento
  const y = nextDue.getFullYear()
  const m = nextDue.getMonth()
  const candidatas = [
    new Date(y, m - 2, 26),
    new Date(y, m - 1, 12),
    new Date(y, m - 1, 26),
    new Date(y, m, 12),
    new Date(y, m, 26),
  ].filter(q => q.getTime() < nextDueTime)

  const Q2 = candidatas[candidatas.length - 1]
  const Q1 = candidatas[candidatas.length - 2]

  if (!Q1 || !Q2) return null

  const qTime = quincenaDate.getTime()
  if (qTime === Q1.getTime() || qTime === Q2.getTime()) {
    return { amount: monto / 2, dueDate: nextDue }
  }
  return null
}

// ── Tipos internos ─────────────────────────────────────────────────────────────

interface ChecklistItem {
  id: string
  nombre: string
  monto: number
  emoji: string
  categoria: PagoFijoCategoria
  nota?: string
}

function buildItems(pagos: PagoFijo[], quincenaDate: Date): ChecklistItem[] {
  const items: ChecklistItem[] = []
  for (const p of pagos) {
    if ((p.categoria === 'suscripcion' || p.categoria === 'cargo_bancario') && p.dia_cobro) {
      const alloc = getAllocacion(p.dia_cobro, p.monto, quincenaDate)
      if (alloc) {
        items.push({
          id: p.id,
          nombre: p.nombre,
          monto: alloc.amount,
          emoji: p.emoji,
          categoria: p.categoria,
          nota: `Para cobro del ${alloc.dueDate.getDate()} ${MESES[alloc.dueDate.getMonth()]}`,
        })
      }
    } else if (p.categoria !== 'suscripcion' && p.categoria !== 'cargo_bancario') {
      items.push({ id: p.id, nombre: p.nombre, monto: p.monto, emoji: p.emoji, categoria: p.categoria })
    }
  }
  return items
}

// ── Configuración visual ───────────────────────────────────────────────────────

const CATEGORIA_CONFIG: Record<PagoFijoCategoria, { label: string; color: string }> = {
  transferencia:  { label: 'Transferencias',    color: '#0057FF' },
  ahorro:         { label: 'Ahorro',            color: '#1D9E75' },
  variable:       { label: 'Gastos variables',  color: '#BA7517' },
  suscripcion:    { label: 'Suscripciones',     color: '#7B5EA7' },
  cargo_bancario: { label: 'Cargos bancarios',  color: '#378ADD' },
}

const ORDEN: PagoFijoCategoria[] = ['transferencia', 'ahorro', 'variable', 'suscripcion', 'cargo_bancario']

// ── Componentes ────────────────────────────────────────────────────────────────

function PagoItem({ item, checked, onToggle }: {
  item: ChecklistItem
  checked: boolean
  onToggle: () => void
}) {
  return (
    <div
      onClick={onToggle}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '13px 0', borderBottom: '0.5px solid #f0f0f0',
        cursor: 'pointer', opacity: checked ? 0.4 : 1,
        transition: 'opacity 0.2s',
      }}
    >
      <div style={{
        width: 22, height: 22, borderRadius: 6, flexShrink: 0,
        border: checked ? 'none' : '2px solid #DDD',
        background: checked ? '#1D9E75' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s',
      }}>
        {checked && <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>✓</span>}
      </div>

      <span style={{ fontSize: 20, flexShrink: 0 }}>{item.emoji}</span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: '#111', textDecoration: checked ? 'line-through' : 'none' }}>
          {item.nombre}
        </div>
        {item.nota && (
          <div style={{ fontSize: 11, color: '#aaa', marginTop: 1 }}>{item.nota}</div>
        )}
      </div>

      <span style={{ fontSize: 14, fontWeight: 700, color: '#111', flexShrink: 0, textDecoration: checked ? 'line-through' : 'none' }}>
        {fmt(item.monto)}
      </span>
    </div>
  )
}

function Seccion({ categoria, items, checked, onToggle }: {
  categoria: PagoFijoCategoria
  items: ChecklistItem[]
  checked: Set<string>
  onToggle: (id: string) => void
}) {
  if (items.length === 0) return null
  const config = CATEGORIA_CONFIG[categoria]
  const total = items.reduce((s, i) => s + i.monto, 0)
  const pagado = items.filter(i => checked.has(i.id)).reduce((s, i) => s + i.monto, 0)
  const listo = pagado === total

  return (
    <div style={{ background: '#fff', borderRadius: 16, padding: '14px 16px', marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: config.color, display: 'inline-block' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>{config.label}</span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>{fmt(total)}</span>
          {listo
            ? <span style={{ fontSize: 11, color: '#1D9E75', display: 'block', fontWeight: 700 }}>✓ Listo</span>
            : pagado > 0 && <span style={{ fontSize: 11, color: '#aaa', display: 'block' }}>{fmt(pagado)} pagado</span>
          }
        </div>
      </div>
      {items.map(i => (
        <PagoItem key={i.id} item={i} checked={checked.has(i.id)} onToggle={() => onToggle(i.id)} />
      ))}
    </div>
  )
}

// ── Página principal ───────────────────────────────────────────────────────────

export default function PagosFijosClient({ pagos }: { pagos: PagoFijo[] }) {
  const quincenaDate = useMemo(() => getNextQuincena(new Date()), [])
  const quincenaId   = `${quincenaDate.getFullYear()}-${quincenaDate.getMonth() + 1}-${quincenaDate.getDate()}`
  const storageKey   = `checklist_${quincenaId}`

  const quincenaLabel = `${quincenaDate.getDate()} ${MESES[quincenaDate.getMonth()]} ${quincenaDate.getFullYear()}`

  const items = useMemo(() => buildItems(pagos, quincenaDate), [pagos, quincenaDate])

  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) setChecked(new Set(JSON.parse(saved)))
    } catch {}
    setLoaded(true)
  }, [storageKey])

  useEffect(() => {
    if (!loaded) return
    localStorage.setItem(storageKey, JSON.stringify(Array.from(checked)))
  }, [checked, storageKey, loaded])

  function toggle(id: string) {
    setChecked(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const totalGeneral = useMemo(() => items.reduce((s, i) => s + i.monto, 0), [items])
  const totalPagado  = useMemo(() => items.filter(i => checked.has(i.id)).reduce((s, i) => s + i.monto, 0), [items, checked])
  const porcentaje   = totalGeneral > 0 ? (totalPagado / totalGeneral) * 100 : 0

  const porCategoria = useMemo(() => {
    const map = new Map<PagoFijoCategoria, ChecklistItem[]>()
    for (const cat of ORDEN) map.set(cat, [])
    for (const item of items) map.get(item.categoria)!.push(item)
    return map
  }, [items])

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', paddingBottom: 40 }}>

      <div style={{ background: '#1A1A2E', color: '#fff', padding: '48px 20px 24px', borderRadius: '0 0 24px 24px' }}>
        <Link href="/dashboard" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: 13 }}>
          ← Dashboard
        </Link>
        <div style={{ fontSize: 13, opacity: 0.6, marginTop: 8, marginBottom: 4 }}>Quincena del</div>
        <div style={{ fontSize: 24, fontWeight: 700 }}>Pagos fijos</div>
        <div style={{ fontSize: 15, fontWeight: 700, opacity: 0.9, marginTop: 2 }}>{quincenaLabel}</div>

        {/* Barra de progreso */}
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
              background: porcentaje === 100 ? '#1D9E75' : '#4A90FF',
              width: `${porcentaje}%`,
              transition: 'width 0.4s ease',
            }} />
          </div>
        </div>

        {/* Resumen */}
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
        {ORDEN.map(cat => (
          <Seccion
            key={cat}
            categoria={cat}
            items={porCategoria.get(cat)!}
            checked={checked}
            onToggle={toggle}
          />
        ))}
      </div>
    </div>
  )
}

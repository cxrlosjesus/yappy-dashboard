'use client'

import Link from 'next/link'
import { useState, useEffect, useMemo, useRef } from 'react'
import type { PagoFijo, PagoFijoCategoria } from '@/types/pagos-fijos'
import type { Factura } from '@/lib/facturas-queries'
import ChatPagos from './ChatPagos'
import ResumenFinanciero from './ResumenFinanciero'

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const STORAGE_LISTA = 'pagos_fijos_lista'
const INGRESO_QUINCENAL = 859.99

function fmt(n: number) {
  return '$' + n.toLocaleString('es-PA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ── Lógica de quincenas ────────────────────────────────────────────────────────

function getNextQuincena(from: Date): Date {
  const day = from.getDate()
  const m = from.getMonth()
  const y = from.getFullYear()
  if (day <= 12) return new Date(y, m, 12)
  if (day <= 26) return new Date(y, m, 26)
  return new Date(y, m + 1, 12)
}

function getNextDueDate(dia_cobro: number): Date {
  const hoy = new Date()
  const thisMonth = new Date(hoy.getFullYear(), hoy.getMonth(), dia_cobro)
  if (thisMonth > hoy) return thisMonth
  return new Date(hoy.getFullYear(), hoy.getMonth() + 1, dia_cobro)
}

function getAllocacion(dia_cobro: number, monto: number, quincenaDate: Date): { amount: number; dueDate: Date } | null {
  const nextDue = getNextDueDate(dia_cobro)
  const nextDueTime = nextDue.getTime()
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
  meta?: number
  acumulado?: number
}

function buildItems(pagos: PagoFijo[], quincenaDate: Date, facturas: Factura[]): ChecklistItem[] {
  const items: ChecklistItem[] = []
  const facturaMap = new Map<string, Factura>()
  for (const f of facturas) {
    if (!facturaMap.has(f.servicio)) facturaMap.set(f.servicio, f)
  }
  for (const p of pagos) {
    if ((p.categoria === 'suscripcion' || p.categoria === 'cargo_bancario') && p.dia_cobro) {
      const factura = facturaMap.get(p.nombre)
      if (factura) {
        const venc = new Date(factura.vencimiento + 'T12:00:00')
        const alloc = getAllocacion(venc.getDate(), factura.monto, quincenaDate)
        if (alloc) {
          items.push({
            id: p.id, nombre: p.nombre, monto: alloc.amount, emoji: p.emoji, categoria: p.categoria,
            nota: `Para cobro del ${alloc.dueDate.getDate()} ${MESES[alloc.dueDate.getMonth()]} · ${factura.mes}`,
          })
        }
      } else {
        const alloc = getAllocacion(p.dia_cobro, p.monto, quincenaDate)
        if (alloc) {
          items.push({
            id: p.id, nombre: p.nombre, monto: alloc.amount, emoji: p.emoji, categoria: p.categoria,
            nota: `Para cobro del ${alloc.dueDate.getDate()} ${MESES[alloc.dueDate.getMonth()]}`,
          })
        }
      }
    } else if (p.categoria !== 'suscripcion' && p.categoria !== 'cargo_bancario') {
      items.push({
        id: p.id, nombre: p.nombre, monto: p.monto, emoji: p.emoji, categoria: p.categoria,
        ...(p.meta !== undefined ? { meta: p.meta } : {}),
        ...(p.acumulado !== undefined ? { acumulado: p.acumulado } : {}),
      })
    }
  }
  return items
}

// ── Config visual ──────────────────────────────────────────────────────────────

const CATEGORIA_CONFIG: Record<PagoFijoCategoria, { label: string; color: string }> = {
  transferencia:  { label: 'Transferencias',   color: '#0057FF' },
  ahorro:         { label: 'Ahorro',           color: '#1D9E75' },
  variable:       { label: 'Gastos variables', color: '#BA7517' },
  suscripcion:    { label: 'Suscripciones',    color: '#7B5EA7' },
  cargo_bancario: { label: 'Cargos bancarios', color: '#378ADD' },
}

const ORDEN: PagoFijoCategoria[] = ['transferencia', 'ahorro', 'variable', 'suscripcion', 'cargo_bancario']

const EMOJIS_SUGERIDOS = ['🏠','🎓','🛡️','📱','💰','🎯','🛒','⛽','🍽️','🤖','📺','🎮','☁️','🏰','🏦','💳','🚗','💊','🐾','📦','✈️','🎵','📚','🏋️']

// ── Formulario nuevo pago ──────────────────────────────────────────────────────

interface FormNuevoPago {
  nombre: string
  monto: string
  emoji: string
  categoria: PagoFijoCategoria
  dia_cobro: string
  quincenas: string
  meta: string
  acumulado: string
}

function ModalNuevoPago({ onGuardar, onCerrar, pagoEditar }: {
  onGuardar: (p: PagoFijo) => void
  onCerrar: () => void
  pagoEditar?: PagoFijo  // si viene, es modo edición
}) {
  const [form, setForm] = useState<FormNuevoPago>({
    nombre:    pagoEditar?.nombre ?? '',
    monto:     pagoEditar?.monto  ? String(pagoEditar.monto) : '',
    emoji:     pagoEditar?.emoji  ?? '💳',
    categoria: pagoEditar?.categoria ?? 'variable',
    dia_cobro: pagoEditar?.dia_cobro ? String(pagoEditar.dia_cobro) : '',
    quincenas: pagoEditar?.quincenas_restantes ? String(pagoEditar.quincenas_restantes) : '',
    meta:      pagoEditar?.meta      ? String(pagoEditar.meta)      : '',
    acumulado: pagoEditar?.acumulado ? String(pagoEditar.acumulado) : '',
  })
  const [showEmojis, setShowEmojis] = useState(false)

  const necesitaDia = form.categoria === 'suscripcion' || form.categoria === 'cargo_bancario'

  function guardar() {
    if (!form.nombre.trim() || !form.monto) return
    const monto = parseFloat(form.monto)
    if (isNaN(monto) || monto <= 0) return
    const quincenasNum = form.quincenas ? parseInt(form.quincenas) : undefined
    const metaNum      = form.meta      ? parseFloat(form.meta)      : undefined
    const acumuladoNum = form.acumulado ? parseFloat(form.acumulado) : undefined
    const nuevo: PagoFijo = {
      id: pagoEditar?.id ?? `custom-${Date.now()}`,
      nombre: form.nombre.trim(),
      monto,
      emoji: form.emoji,
      categoria: form.categoria,
      ...(necesitaDia && form.dia_cobro ? { dia_cobro: parseInt(form.dia_cobro) } : {}),
      ...(quincenasNum && quincenasNum > 0 ? { quincenas_restantes: quincenasNum } : {}),
      ...(metaNum      && metaNum > 0      ? { meta: metaNum }           : {}),
      ...(acumuladoNum !== undefined        ? { acumulado: acumuladoNum } : {}),
    }
    onGuardar(nuevo)
  }

  return (
    <>
      <div onClick={onCerrar} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 300 }} />
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480, background: '#fff',
        borderRadius: '20px 20px 0 0', padding: '20px 20px 36px',
        zIndex: 400, boxShadow: '0 -4px 30px rgba(0,0,0,0.15)',
        maxHeight: '92vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>{pagoEditar ? 'Editar pago' : 'Nuevo pago fijo'}</span>
          <button onClick={onCerrar} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#999' }}>✕</button>
        </div>

        {/* Emoji picker */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 6, fontWeight: 600 }}>EMOJI</div>
          <button
            onClick={() => setShowEmojis(v => !v)}
            style={{ fontSize: 28, background: '#F5F5F7', border: 'none', borderRadius: 12, padding: '8px 14px', cursor: 'pointer' }}
          >
            {form.emoji}
          </button>
          {showEmojis && (
            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {EMOJIS_SUGERIDOS.map(e => (
                <button key={e} onClick={() => { setForm(f => ({ ...f, emoji: e })); setShowEmojis(false) }}
                  style={{ fontSize: 22, background: form.emoji === e ? '#E8E8FF' : '#F5F5F7', border: 'none', borderRadius: 8, padding: '4px 8px', cursor: 'pointer' }}>
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Nombre */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 6, fontWeight: 600 }}>NOMBRE</div>
          <input
            value={form.nombre}
            onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
            placeholder="Ej: Gym, Seguro, Netflix..."
            style={{ width: '100%', border: '1.5px solid #E8E8E8', borderRadius: 10, padding: '10px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* Monto */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 6, fontWeight: 600 }}>MONTO ($)</div>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.monto}
            onChange={e => setForm(f => ({ ...f, monto: e.target.value }))}
            placeholder="0.00"
            style={{ width: '100%', border: '1.5px solid #E8E8E8', borderRadius: 10, padding: '10px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* Categoría */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 6, fontWeight: 600 }}>CATEGORÍA</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {ORDEN.map(cat => (
              <button
                key={cat}
                onClick={() => setForm(f => ({ ...f, categoria: cat }))}
                style={{
                  padding: '8px', borderRadius: 8, border: '1.5px solid',
                  borderColor: form.categoria === cat ? CATEGORIA_CONFIG[cat].color : '#E8E8E8',
                  background: form.categoria === cat ? CATEGORIA_CONFIG[cat].color + '15' : '#fff',
                  color: form.categoria === cat ? CATEGORIA_CONFIG[cat].color : '#555',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}
              >
                {CATEGORIA_CONFIG[cat].label}
              </button>
            ))}
          </div>
        </div>

        {/* Día de cobro (solo suscripcion/cargo_bancario) */}
        {necesitaDia && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 6, fontWeight: 600 }}>DÍA DE COBRO (del mes)</div>
            <input
              type="number"
              min="1"
              max="31"
              value={form.dia_cobro}
              onChange={e => setForm(f => ({ ...f, dia_cobro: e.target.value }))}
              placeholder="Ej: 15"
              style={{ width: '100%', border: '1.5px solid #E8E8E8', borderRadius: 10, padding: '10px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        )}

        {/* Meta de ahorro (solo categoría ahorro) */}
        {form.categoria === 'ahorro' && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 6, fontWeight: 600 }}>META DE AHORRO (opcional)</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: '#aaa', marginBottom: 3 }}>Meta ($)</div>
                <input
                  type="number" min="0" step="1"
                  value={form.meta}
                  onChange={e => setForm(f => ({ ...f, meta: e.target.value }))}
                  placeholder="1000"
                  style={{ width: '100%', border: '1.5px solid #E8E8E8', borderRadius: 10, padding: '9px 10px', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: '#aaa', marginBottom: 3 }}>Llevas ($)</div>
                <input
                  type="number" min="0" step="1"
                  value={form.acumulado}
                  onChange={e => setForm(f => ({ ...f, acumulado: e.target.value }))}
                  placeholder="385"
                  style={{ width: '100%', border: '1.5px solid #E8E8E8', borderRadius: 10, padding: '9px 10px', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Duración */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 6, fontWeight: 600 }}>DURACIÓN</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {['', '1', '2', '3', '6'].map(v => (
              <button
                key={v}
                onClick={() => setForm(f => ({ ...f, quincenas: v }))}
                style={{
                  flex: 1, padding: '8px 4px', borderRadius: 8, border: '1.5px solid',
                  borderColor: form.quincenas === v ? '#1A1A2E' : '#E8E8E8',
                  background: form.quincenas === v ? '#1A1A2E' : '#fff',
                  color: form.quincenas === v ? '#fff' : '#555',
                  fontSize: 11, fontWeight: 600, cursor: 'pointer',
                }}
              >
                {v === '' ? 'Fijo' : `${v}Q`}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 10, color: '#aaa', marginTop: 4 }}>
            {form.quincenas ? `Se elimina automáticamente después de ${form.quincenas} quincena(s)` : 'Pago permanente'}
          </div>
        </div>

        <button
          onClick={guardar}
          disabled={!form.nombre.trim() || !form.monto}
          style={{
            width: '100%', padding: '14px', borderRadius: 12, border: 'none',
            background: form.nombre.trim() && form.monto ? '#1A1A2E' : '#E8E8E8',
            color: form.nombre.trim() && form.monto ? '#fff' : '#aaa',
            fontSize: 14, fontWeight: 700, cursor: form.nombre.trim() && form.monto ? 'pointer' : 'default',
          }}
        >
          {pagoEditar ? 'Guardar cambios' : 'Agregar pago'}
        </button>
      </div>
    </>
  )
}

// ── Vista edición: lista completa de pagos ─────────────────────────────────────

function VistaEdicion({ pagos, onEliminar, onAgregar, onEditar, onCerrar }: {
  pagos: PagoFijo[]
  onEliminar: (id: string) => void
  onAgregar: () => void
  onEditar: (p: PagoFijo) => void
  onCerrar: () => void
}) {
  const [confirmando, setConfirmando] = useState<string | null>(null)

  function handleEliminar(id: string) {
    if (confirmando === id) {
      onEliminar(id)
      setConfirmando(null)
    } else {
      setConfirmando(id)
      setTimeout(() => setConfirmando(null), 3000)
    }
  }

  const porCategoria = useMemo(() => {
    const map = new Map<PagoFijoCategoria, PagoFijo[]>()
    for (const cat of ORDEN) map.set(cat, [])
    for (const p of pagos) map.get(p.categoria)?.push(p)
    return map
  }, [pagos])

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', paddingBottom: 40 }}>
      {/* Header edición */}
      <div style={{ background: '#1A1A2E', color: '#fff', padding: '48px 20px 24px', borderRadius: '0 0 24px 24px' }}>
        <button onClick={onCerrar} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: 13, cursor: 'pointer', padding: 0 }}>
          ← Volver
        </button>
        <div style={{ fontSize: 24, fontWeight: 700, marginTop: 8 }}>Editar pagos fijos</div>
        <div style={{ fontSize: 13, opacity: 0.6, marginTop: 4 }}>{pagos.length} pagos configurados</div>
      </div>

      <div style={{ padding: '16px 16px 0' }}>
        {ORDEN.map(cat => {
          const items = porCategoria.get(cat) ?? []
          if (items.length === 0) return null
          const config = CATEGORIA_CONFIG[cat]
          return (
            <div key={cat} style={{ background: '#fff', borderRadius: 16, padding: '14px 16px', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: config.color, display: 'inline-block' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>{config.label}</span>
              </div>
              {items.map(p => (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '11px 0', borderBottom: '0.5px solid #f0f0f0',
                }}>
                  <span style={{ fontSize: 20 }}>{p.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 500, color: '#111' }}>{p.nombre}</span>
                      {p.quincenas_restantes !== undefined && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, background: '#FEF3C7', color: '#92400E',
                          borderRadius: 4, padding: '1px 5px',
                        }}>
                          {p.quincenas_restantes}Q
                        </span>
                      )}
                    </div>
                    {p.dia_cobro && (
                      <div style={{ fontSize: 11, color: '#aaa' }}>Cobra el día {p.dia_cobro}</div>
                    )}
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>{fmt(p.monto)}</span>
                  <button
                    onClick={() => onEditar(p)}
                    style={{
                      width: 28, height: 28, borderRadius: '50%', border: 'none',
                      background: '#EEF2FF', color: '#4338CA', fontSize: 13,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    ✏️
                  </button>
                  {confirmando === p.id ? (
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <button onClick={() => handleEliminar(p.id)} style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 8px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                        Eliminar
                      </button>
                      <button onClick={() => setConfirmando(null)} style={{ background: '#F0F0F0', color: '#555', border: 'none', borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer' }}>
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleEliminar(p.id)}
                      style={{
                        width: 28, height: 28, borderRadius: '50%', border: 'none',
                        background: '#FEE2E2', color: '#DC2626', fontSize: 14,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          )
        })}

        {/* Botón agregar */}
        <button
          onClick={onAgregar}
          style={{
            width: '100%', padding: '14px', borderRadius: 12, border: '2px dashed #DDD',
            background: '#fff', color: '#555', fontSize: 14, fontWeight: 600,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <span style={{ fontSize: 18 }}>+</span> Agregar pago fijo
        </button>
      </div>
    </div>
  )
}

// ── Componentes checklist ──────────────────────────────────────────────────────

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
        width: 24, height: 24, borderRadius: 7, flexShrink: 0,
        border: checked ? 'none' : '2px solid #E0E0E0',
        background: checked ? 'linear-gradient(135deg, #1D9E75, #4AE8A2)' : '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.18s cubic-bezier(0.4,0,0.2,1)',
        boxShadow: checked ? '0 2px 8px rgba(29,158,117,0.35)' : '0 1px 3px rgba(0,0,0,0.06)',
      }}>
        {checked && <span style={{ color: '#fff', fontSize: 13, fontWeight: 800 }}>✓</span>}
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

function Seccion({ categoria, items, checked, onToggle, colapsada, onToggleColapso }: {
  categoria: PagoFijoCategoria
  items: ChecklistItem[]
  checked: Set<string>
  onToggle: (id: string) => void
  colapsada: boolean
  onToggleColapso: () => void
}) {
  if (items.length === 0) return null
  const config = CATEGORIA_CONFIG[categoria]
  const total = items.reduce((s, i) => s + i.monto, 0)
  const pagado = items.filter(i => checked.has(i.id)).reduce((s, i) => s + i.monto, 0)
  const listo = pagado === total

  return (
    <div style={{ background: '#fff', borderRadius: 18, padding: '14px 16px', marginBottom: 10, boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
      {/* Cabecera — siempre visible, clickeable para colapsar */}
      <div
        onClick={onToggleColapso}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: colapsada ? 0 : 12 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: config.color, display: 'inline-block' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>{config.label}</span>
          {listo && <span style={{ fontSize: 10, color: '#1D9E75', fontWeight: 700, background: '#E8F8F2', borderRadius: 4, padding: '1px 5px' }}>✓</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>{fmt(total)}</span>
            {!listo && pagado > 0 && <span style={{ fontSize: 11, color: '#aaa', display: 'block' }}>{fmt(pagado)} pagado</span>}
          </div>
          <span style={{ fontSize: 12, color: '#bbb', transform: colapsada ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.2s', display: 'inline-block' }}>▼</span>
        </div>
      </div>

      {/* Contenido colapsable con animación */}
      <div style={{
        overflow: 'hidden',
        maxHeight: colapsada ? 0 : 2000,
        opacity: colapsada ? 0 : 1,
        transition: 'max-height 0.3s ease, opacity 0.2s ease',
      }}>
        {items.map(i => (
            <div key={i.id}>
              <PagoItem item={i} checked={checked.has(i.id)} onToggle={() => onToggle(i.id)} />
              {/* Meta de ahorro individual */}
              {i.meta !== undefined && i.acumulado !== undefined && (
                <div style={{ marginBottom: 10, padding: '8px 0 4px 34px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: '#888' }}>
                      Llevas <span style={{ fontWeight: 700, color: '#1D9E75' }}>{fmt(i.acumulado)}</span>
                    </span>
                    <span style={{ fontSize: 11, color: '#aaa' }}>Meta {fmt(i.meta)}</span>
                  </div>
                  <div style={{ background: '#F0F0F0', borderRadius: 6, height: 5, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 6,
                      background: i.acumulado >= i.meta ? '#1D9E75' : '#4A90FF',
                      width: `${Math.min((i.acumulado / i.meta) * 100, 100)}%`,
                      transition: 'width 0.4s ease',
                    }} />
                  </div>
                  <div style={{ fontSize: 10, color: '#aaa', marginTop: 3 }}>
                    {i.acumulado >= i.meta
                      ? '🎉 Meta alcanzada'
                      : `${((i.acumulado / i.meta) * 100).toFixed(0)}% · faltan ${fmt(i.meta - i.acumulado)}`}
                  </div>
                </div>
              )}
            </div>
        ))}
      </div>
    </div>
  )
}

// ── Página principal ───────────────────────────────────────────────────────────

export default function PagosFijosClient({ pagos: pagosIniciales, facturas }: { pagos: PagoFijo[]; facturas: Factura[] }) {
  const quincenaDate = useMemo(() => getNextQuincena(new Date()), [])
  const quincenaId   = `${quincenaDate.getFullYear()}-${quincenaDate.getMonth() + 1}-${quincenaDate.getDate()}`
  const storageKey   = `checklist_${quincenaId}`
  const quincenaLabel = `${quincenaDate.getDate()} ${MESES[quincenaDate.getMonth()]} ${quincenaDate.getFullYear()}`

  // Lista editable de pagos (inicializa desde localStorage o desde props)
  const [pagos, setPagos] = useState<PagoFijo[]>(pagosIniciales)
  const [listaLoaded, setListaLoaded] = useState(false)

  // Modo edición
  const [editando, setEditando] = useState(false)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [pagoEditar, setPagoEditar] = useState<PagoFijo | undefined>(undefined)

  // Secciones colapsadas
  const [colapsadas, setColapsadas] = useState<Set<PagoFijoCategoria>>(new Set())
  function toggleColapso(cat: PagoFijoCategoria) {
    setColapsadas(prev => {
      const next = new Set(prev)
      next.has(cat) ? next.delete(cat) : next.add(cat)
      return next
    })
  }

  // Checklist
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [loaded, setLoaded] = useState(false)

  // Toast
  const [toast, setToast] = useState<{ nombre: string; pagado: number; sobra: number } | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cargar lista y checklist desde localStorage
  useEffect(() => {
    try {
      const savedLista = localStorage.getItem(STORAGE_LISTA)
      if (savedLista) {
        let lista: PagoFijo[] = JSON.parse(savedLista)

        // Decrementar gastos temporales si la quincena cambió
        const ultimaQuincenaKey = 'ultima_quincena'
        const ultimaQuincena = localStorage.getItem(ultimaQuincenaKey)
        if (ultimaQuincena && ultimaQuincena !== quincenaId) {
          // Nueva quincena: decrementar y eliminar los que llegan a 0
          lista = lista
            .map(p => p.quincenas_restantes !== undefined
              ? { ...p, quincenas_restantes: p.quincenas_restantes - 1 }
              : p
            )
            .filter(p => p.quincenas_restantes === undefined || p.quincenas_restantes > 0)
          localStorage.setItem(STORAGE_LISTA, JSON.stringify(lista))
        }
        localStorage.setItem(ultimaQuincenaKey, quincenaId)
        setPagos(lista)
      }
    } catch {}
    setListaLoaded(true)

    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) setChecked(new Set(JSON.parse(saved)))
    } catch {}
    setLoaded(true)
  }, [storageKey, quincenaId])

  // Persistir lista cuando cambia
  useEffect(() => {
    if (!listaLoaded) return
    localStorage.setItem(STORAGE_LISTA, JSON.stringify(pagos))
  }, [pagos, listaLoaded])

  // Persistir checklist cuando cambia
  useEffect(() => {
    if (!loaded) return
    localStorage.setItem(storageKey, JSON.stringify(Array.from(checked)))
  }, [checked, storageKey, loaded])

  function toggle(id: string) {
    setChecked(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)

      // Solo mostrar toast al marcar (no al desmarcar)
      if (!prev.has(id)) {
        const item = items.find(i => i.id === id)
        if (item) {
          const nuevoPagado = items.filter(i => next.has(i.id)).reduce((s, i) => s + i.monto, 0)
          const sobra = INGRESO_QUINCENAL - nuevoPagado
          if (toastTimer.current) clearTimeout(toastTimer.current)
          setToast({ nombre: item.nombre, pagado: nuevoPagado, sobra })
          toastTimer.current = setTimeout(() => setToast(null), 3500)
        }
      }

      return next
    })
  }

  function eliminarPago(id: string) {
    setPagos(prev => prev.filter(p => p.id !== id))
    setChecked(prev => { const next = new Set(prev); next.delete(id); return next })
  }

  function agregarPago(nuevo: PagoFijo) {
    if (pagoEditar) {
      // Modo edición: reemplaza el pago existente
      setPagos(prev => prev.map(p => p.id === nuevo.id ? nuevo : p))
    } else {
      setPagos(prev => [...prev, nuevo])
    }
    setMostrarForm(false)
    setPagoEditar(undefined)
  }

  function abrirEditar(p: PagoFijo) {
    setPagoEditar(p)
    setMostrarForm(true)
  }

  const items = useMemo(() => buildItems(pagos, quincenaDate, facturas), [pagos, quincenaDate, facturas])
  const totalGeneral = useMemo(() => items.reduce((s, i) => s + i.monto, 0), [items])
  const totalPagado  = useMemo(() => items.filter(i => checked.has(i.id)).reduce((s, i) => s + i.monto, 0), [items, checked])
  const porcentaje   = totalGeneral > 0 ? (totalPagado / totalGeneral) * 100 : 0

  const porCategoria = useMemo(() => {
    const map = new Map<PagoFijoCategoria, ChecklistItem[]>()
    for (const cat of ORDEN) map.set(cat, [])
    for (const item of items) map.get(item.categoria)!.push(item)
    return map
  }, [items])

  // Vista edición
  if (editando) {
    return (
      <>
        <VistaEdicion
          pagos={pagos}
          onEliminar={eliminarPago}
          onAgregar={() => { setPagoEditar(undefined); setMostrarForm(true) }}
          onEditar={abrirEditar}
          onCerrar={() => setEditando(false)}
        />
        {mostrarForm && (
          <ModalNuevoPago
            onGuardar={agregarPago}
            onCerrar={() => { setMostrarForm(false); setPagoEditar(undefined) }}
            pagoEditar={pagoEditar}
          />
        )}
      </>
    )
  }

  // Vista checklist
  return (
    <div style={{ maxWidth: 480, margin: '0 auto', paddingBottom: 40, background: '#F2F3F7', minHeight: '100vh' }}>

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(160deg, #0D1B3E 0%, #1A1A2E 45%, #22103A 100%)',
        color: '#fff',
        padding: '52px 20px 28px',
        borderRadius: '0 0 28px 28px',
        boxShadow: '0 8px 32px rgba(13,27,62,0.35)',
      }}>
        {/* Nav */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/dashboard" style={{
            color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: 13,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            ← Dashboard
          </Link>
          <button
            onClick={() => setEditando(true)}
            style={{
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.85)', borderRadius: 20, padding: '5px 13px',
              fontSize: 12, fontWeight: 600, cursor: 'pointer', backdropFilter: 'blur(8px)',
            }}
          >
            ✏️ Editar
          </button>
        </div>

        {/* Título */}
        <div style={{ marginTop: 16, marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1.5, opacity: 0.4, textTransform: 'uppercase', marginBottom: 4 }}>
            Quincena del {quincenaLabel}
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: -0.5, lineHeight: 1 }}>
            Pagos fijos
          </div>
        </div>

        {/* Barra de progreso */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, opacity: 0.55 }}>
              {fmt(totalPagado)} de {fmt(totalGeneral)}
            </span>
            <span style={{
              fontSize: 15, fontWeight: 800,
              color: porcentaje === 100 ? '#4AE8A2' : 'rgba(255,255,255,0.9)',
              background: porcentaje === 100 ? 'rgba(74,232,162,0.15)' : 'rgba(255,255,255,0.08)',
              borderRadius: 20, padding: '2px 10px',
            }}>
              {porcentaje === 100 ? '✓ Completo' : `${porcentaje.toFixed(0)}%`}
            </span>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 10, height: 9, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 10,
              background: porcentaje === 100
                ? 'linear-gradient(90deg, #1D9E75, #4AE8A2)'
                : 'linear-gradient(90deg, #4A90FF, #7B5EA7)',
              width: `${porcentaje}%`,
              transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)',
              boxShadow: porcentaje > 0 ? '0 0 12px rgba(74,144,255,0.5)' : 'none',
            }} />
          </div>
        </div>

        {/* 2 tarjetas glassmorphism */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div style={{
            background: 'rgba(74,232,162,0.1)',
            border: '1px solid rgba(74,232,162,0.25)',
            borderRadius: 16, padding: '14px 16px',
            backdropFilter: 'blur(12px)',
          }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, color: '#4AE8A2', marginBottom: 6 }}>EN MANO AHORA</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#4AE8A2', lineHeight: 1, letterSpacing: -0.5 }}>
              {fmt(INGRESO_QUINCENAL - totalPagado)}
            </div>
            <div style={{ fontSize: 10, opacity: 0.4, marginTop: 4 }}>ingreso − lo pagado</div>
          </div>

          <div style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 16, padding: '14px 16px',
            backdropFilter: 'blur(12px)',
          }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, opacity: 0.5, marginBottom: 6 }}>AL TERMINAR TODO</div>
            <div style={{
              fontSize: 22, fontWeight: 900, lineHeight: 1, letterSpacing: -0.5,
              color: INGRESO_QUINCENAL - totalGeneral >= 0 ? '#fff' : '#FF6B6B',
            }}>
              {fmt(INGRESO_QUINCENAL - totalGeneral)}
            </div>
            <div style={{ fontSize: 10, opacity: 0.4, marginTop: 4 }}>después de todos los pagos</div>
          </div>
        </div>

        {/* Píldoras secundarias */}
        <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
          {[
            { label: 'Ingreso', value: fmt(INGRESO_QUINCENAL), color: 'rgba(255,255,255,0.06)' },
            { label: 'Pagado', value: fmt(totalPagado), color: 'rgba(74,232,162,0.08)' },
            { label: 'Por pagar', value: fmt(totalGeneral - totalPagado), color: 'rgba(255,255,255,0.06)' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              flex: 1, background: color, borderRadius: 10, padding: '7px 8px', textAlign: 'center',
              border: '1px solid rgba(255,255,255,0.07)',
            }}>
              <div style={{ fontSize: 9, opacity: 0.45, marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: 11, fontWeight: 700 }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── SECCIONES ──────────────────────────────────────────────────────── */}
      <div style={{ padding: '14px 14px 0' }}>
        {ORDEN.map(cat => (
          <Seccion
            key={cat}
            categoria={cat}
            items={porCategoria.get(cat)!}
            checked={checked}
            onToggle={toggle}
            colapsada={colapsadas.has(cat)}
            onToggleColapso={() => toggleColapso(cat)}
          />
        ))}
      </div>

      {/* ── TOAST ──────────────────────────────────────────────────────────── */}
      <style>{`
        @keyframes toastIn { from { transform: translateY(16px) translateX(-50%); opacity: 0 } to { transform: translateY(0) translateX(-50%); opacity: 1 } }
      `}</style>
      {toast && (
        <div style={{
          position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)',
          width: 'calc(100% - 28px)', maxWidth: 452,
          background: 'linear-gradient(135deg, #0D1B3E, #1A1A2E)',
          border: '1px solid rgba(74,232,162,0.2)',
          color: '#fff', borderRadius: 18, padding: '13px 16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.35), 0 0 0 1px rgba(74,232,162,0.1)',
          zIndex: 90, animation: 'toastIn 0.3s cubic-bezier(0.34,1.56,0.64,1)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 12, flexShrink: 0,
            background: 'linear-gradient(135deg, #1D9E75, #4AE8A2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 17, boxShadow: '0 0 14px rgba(74,232,162,0.35)',
          }}>✓</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 3 }}>
              {toast.nombre} pagado
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <span style={{ fontSize: 11, opacity: 0.55 }}>
                Pagado <span style={{ color: '#4AE8A2', fontWeight: 700, opacity: 1 }}>{fmt(toast.pagado)}</span>
              </span>
              <span style={{ fontSize: 11, opacity: 0.55 }}>
                En mano <span style={{ color: '#4AE8A2', fontWeight: 700, opacity: 1 }}>{fmt(toast.sobra)}</span>
              </span>
            </div>
          </div>
        </div>
      )}

      <ResumenFinanciero
        pagos={pagos}
        ingresoQuincenal={INGRESO_QUINCENAL}
        quincenaActualKey={quincenaId}
        totalItems={items.length}
      />

      <ChatPagos
        pagos={pagos}
        quincenaLabel={quincenaLabel}
        totalQuincena={totalGeneral}
        checkedIds={Array.from(checked)}
      />
    </div>
  )
}

'use client'

import Link from 'next/link'
import { useState, useEffect, useMemo } from 'react'
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
      items.push({ id: p.id, nombre: p.nombre, monto: p.monto, emoji: p.emoji, categoria: p.categoria })
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
  quincenas: string  // '' = permanente, número = temporal
}

function ModalNuevoPago({ onGuardar, onCerrar }: {
  onGuardar: (p: PagoFijo) => void
  onCerrar: () => void
}) {
  const [form, setForm] = useState<FormNuevoPago>({
    nombre: '', monto: '', emoji: '💳', categoria: 'variable', dia_cobro: '', quincenas: '',
  })
  const [showEmojis, setShowEmojis] = useState(false)

  const necesitaDia = form.categoria === 'suscripcion' || form.categoria === 'cargo_bancario'

  function guardar() {
    if (!form.nombre.trim() || !form.monto) return
    const monto = parseFloat(form.monto)
    if (isNaN(monto) || monto <= 0) return
    const quincenasNum = form.quincenas ? parseInt(form.quincenas) : undefined
    const nuevo: PagoFijo = {
      id: `custom-${Date.now()}`,
      nombre: form.nombre.trim(),
      monto,
      emoji: form.emoji,
      categoria: form.categoria,
      ...(necesitaDia && form.dia_cobro ? { dia_cobro: parseInt(form.dia_cobro) } : {}),
      ...(quincenasNum && quincenasNum > 0 ? { quincenas_restantes: quincenasNum } : {}),
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
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>Nuevo pago fijo</span>
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
          Agregar pago
        </button>
      </div>
    </>
  )
}

// ── Vista edición: lista completa de pagos ─────────────────────────────────────

function VistaEdicion({ pagos, onEliminar, onAgregar, onCerrar }: {
  pagos: PagoFijo[]
  onEliminar: (id: string) => void
  onAgregar: () => void
  onCerrar: () => void
}) {
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
                    onClick={() => onEliminar(p.id)}
                    style={{
                      width: 28, height: 28, borderRadius: '50%', border: 'none',
                      background: '#FEE2E2', color: '#DC2626', fontSize: 14,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    ✕
                  </button>
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

  // Checklist
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [loaded, setLoaded] = useState(false)

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
      return next
    })
  }

  function eliminarPago(id: string) {
    setPagos(prev => prev.filter(p => p.id !== id))
    setChecked(prev => { const next = new Set(prev); next.delete(id); return next })
  }

  function agregarPago(nuevo: PagoFijo) {
    setPagos(prev => [...prev, nuevo])
    setMostrarForm(false)
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
          onAgregar={() => setMostrarForm(true)}
          onCerrar={() => setEditando(false)}
        />
        {mostrarForm && (
          <ModalNuevoPago
            onGuardar={agregarPago}
            onCerrar={() => setMostrarForm(false)}
          />
        )}
      </>
    )
  }

  // Vista checklist
  return (
    <div style={{ maxWidth: 480, margin: '0 auto', paddingBottom: 40 }}>

      <div style={{ background: '#1A1A2E', color: '#fff', padding: '48px 20px 24px', borderRadius: '0 0 24px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Link href="/dashboard" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: 13 }}>
            ← Dashboard
          </Link>
          <button
            onClick={() => setEditando(true)}
            style={{
              background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff',
              borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}
          >
            ✏️ Editar lista
          </button>
        </div>

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

        {/* Ingreso y disponible */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: '10px 14px' }}>
          <div>
            <div style={{ fontSize: 11, opacity: 0.6 }}>Ingreso quincenal</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{fmt(INGRESO_QUINCENAL)}</div>
          </div>
          <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.15)' }} />
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, opacity: 0.6 }}>Disponible</div>
            <div style={{
              fontSize: 16, fontWeight: 800,
              color: INGRESO_QUINCENAL - totalGeneral >= 0 ? '#4AE8A2' : '#FF6B6B',
            }}>
              {fmt(INGRESO_QUINCENAL - totalGeneral)}
            </div>
          </div>
        </div>

        {/* Resumen */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
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

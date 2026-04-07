'use client'

import Link from 'next/link'
import { useState, useMemo, useCallback } from 'react'
import type { YappyResumen, YappyTransaccion, CategoriaTransaccion } from '@/types/yappy'

const COLORS = {
  recibido: { bg: '#E1F5EE', text: '#0F6E56', dot: '#1D9E75' },
  enviado:  { bg: '#E6F1FB', text: '#185FA5', dot: '#378ADD' },
  pago:     { bg: '#FAEEDA', text: '#854F0B', dot: '#BA7517' },
}

const CATEGORIA_COLORS: Record<CategoriaTransaccion, { bg: string; text: string }> = {
  Personal: { bg: '#F0F2F5',  text: '#555'    },
  Encargo:  { bg: '#FFF4C2',  text: '#7A5800' },
  Colecta:  { bg: '#DDF0FF',  text: '#0A5080' },
}

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function formatMonto(n: number) {
  return '$' + n.toLocaleString('es-PA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatFecha(s: string) {
  if (!s) return '—'
  const d = new Date(s + 'T12:00:00')
  return d.toLocaleDateString('es-PA', { day: '2-digit', month: 'short' })
}

function getThisWeekRange(): [string, string] {
  const now = new Date()
  const day = now.getDay() === 0 ? 6 : now.getDay() - 1
  const monday = new Date(now)
  monday.setDate(now.getDate() - day)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  return [fmt(monday), fmt(sunday)]
}

function getLastWeekRange(): [string, string] {
  const [thisStart] = getThisWeekRange()
  const sunday = new Date(thisStart)
  sunday.setDate(sunday.getDate() - 1)
  const monday = new Date(sunday)
  monday.setDate(sunday.getDate() - 6)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  return [fmt(monday), fmt(sunday)]
}

type FilterMode = 'todo' | 'semana' | 'semana_pasada' | `mes_${string}`

function StatCard({ label, count, monto, color }: {
  label: string; count: number; monto: number; color: typeof COLORS.recibido
}) {
  return (
    <div style={{ background: '#fff', borderRadius: 16, padding: '16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: color.dot, display: 'inline-block' }} />
        <span style={{ fontSize: 12, color: '#888', fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: '#111', lineHeight: 1.2 }}>{count}</div>
      <div style={{ fontSize: 12, color: color.text, background: color.bg, borderRadius: 8, padding: '3px 8px', alignSelf: 'flex-start' }}>
        {formatMonto(monto)}
      </div>
    </div>
  )
}

function TipoTag({ tipo }: { tipo: YappyTransaccion['tipo'] }) {
  const map = { Recibido: COLORS.recibido, Enviado: COLORS.enviado, Pago: COLORS.pago }
  const c = map[tipo]
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: c.bg, color: c.text }}>
      {tipo}
    </span>
  )
}

function CategoriaTag({ categoria }: { categoria: CategoriaTransaccion }) {
  if (categoria === 'Personal') return null
  const c = CATEGORIA_COLORS[categoria]
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: c.bg, color: c.text }}>
      {categoria}
    </span>
  )
}

function TransaccionRow({ t, onTap }: { t: YappyTransaccion; onTap: (t: YappyTransaccion) => void }) {
  const esPassthrough = t.categoria === 'Encargo' || t.categoria === 'Colecta'
  return (
    <div
      onClick={() => onTap(t)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 0', borderBottom: '0.5px solid #eee',
        opacity: esPassthrough ? 0.5 : 1,
        cursor: 'pointer',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {t.de_para || t.descripcion || '—'}
        </div>
        <div style={{ display: 'flex', gap: 5, marginTop: 3, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#aaa' }}>{formatFecha(t.fecha)}</span>
          <CategoriaTag categoria={t.categoria} />
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>{formatMonto(t.monto)}</span>
        <TipoTag tipo={t.tipo} />
      </div>
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

// ── Bottom Sheet ──────────────────────────────────────────────────────────────

const CATEGORIAS: CategoriaTransaccion[] = ['Personal', 'Encargo', 'Colecta']
const CATEGORIA_DESC: Record<CategoriaTransaccion, string> = {
  Personal: 'Es tuyo',
  Encargo:  'Lo pagaste por otro',
  Colecta:  'Dinero que reuniste para pagar algo',
}

function BottomSheet({ tx, onClose, onSaved }: {
  tx: YappyTransaccion
  onClose: () => void
  onSaved: (id: string, categoria: CategoriaTransaccion) => void
}) {
  const [selected, setSelected] = useState<CategoriaTransaccion>(tx.categoria)
  const [saving, setSaving] = useState(false)

  async function handleGuardar() {
    if (selected === tx.categoria) { onClose(); return }
    setSaving(true)
    try {
      const res = await fetch(`/api/transactions/${tx.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoria: selected }),
      })
      if (res.ok) {
        onSaved(tx.id, selected)
        onClose()
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100 }}
      />
      {/* Sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480,
        background: '#fff', borderRadius: '20px 20px 0 0',
        padding: '12px 20px 40px', zIndex: 101,
        boxShadow: '0 -4px 30px rgba(0,0,0,0.15)',
      }}>
        {/* Handle */}
        <div style={{ width: 36, height: 4, borderRadius: 2, background: '#E0E0E0', margin: '0 auto 20px' }} />

        {/* Tx info */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#111' }}>
            {tx.de_para || tx.descripcion || '—'}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#888' }}>{formatFecha(tx.fecha)}</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>{formatMonto(tx.monto)}</span>
            <TipoTag tipo={tx.tipo} />
          </div>
        </div>

        {/* Opciones */}
        <div style={{ fontSize: 12, color: '#aaa', marginBottom: 10, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>
          Categoría
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
          {CATEGORIAS.map(cat => {
            const activo = selected === cat
            const c = CATEGORIA_COLORS[cat]
            return (
              <button
                key={cat}
                onClick={() => setSelected(cat)}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '13px 16px', borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: activo ? c.bg : '#F7F8FA',
                  transition: 'background 0.15s',
                }}
              >
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 14, fontWeight: activo ? 700 : 500, color: activo ? c.text : '#333' }}>
                    {cat}
                  </div>
                  <div style={{ fontSize: 12, color: '#aaa', marginTop: 1 }}>{CATEGORIA_DESC[cat]}</div>
                </div>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                  border: `2px solid ${activo ? c.text : '#CCC'}`,
                  background: activo ? c.text : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {activo && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />}
                </div>
              </button>
            )
          })}
        </div>

        <button
          onClick={handleGuardar}
          disabled={saving}
          style={{
            width: '100%', padding: '15px', borderRadius: 14, border: 'none',
            background: saving ? '#aaa' : '#0057FF', color: '#fff',
            fontSize: 15, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
          }}
        >
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </>
  )
}

// ── Dashboard principal ───────────────────────────────────────────────────────

export default function DashboardClient({ resumen }: { resumen: YappyResumen }) {
  const [transacciones, setTransacciones] = useState(resumen.transacciones)
  const [filtro, setFiltro] = useState<FilterMode>('todo')
  const [busqueda, setBusqueda] = useState('')
  const [selectedTx, setSelectedTx] = useState<YappyTransaccion | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')

  async function handleSync() {
    setSyncing(true)
    setSyncMsg('')
    try {
      const res = await fetch('/api/sync-now', { method: 'POST' })
      const data = await res.json()
      if (data.ok) {
        setSyncMsg(data.nuevas > 0 ? `+${data.nuevas} nuevas` : 'Al día')
        if (data.nuevas > 0) window.location.reload()
      } else {
        setSyncMsg('Error')
      }
    } catch {
      setSyncMsg('Error')
    } finally {
      setSyncing(false)
    }
  }

  const handleSaved = useCallback((id: string, categoria: CategoriaTransaccion) => {
    setTransacciones(prev => prev.map(t => t.id === id ? { ...t, categoria } : t))
  }, [])

  const mesesDisponibles = useMemo(() => {
    const set = new Set<string>()
    for (const t of transacciones) {
      if (t.fecha) {
        const [y, m] = t.fecha.split('-')
        set.add(`${y}-${m}`)
      }
    }
    return Array.from(set).sort().reverse()
  }, [transacciones])

  const txFiltradas = useMemo(() => {
    let resultado = transacciones
    if (filtro === 'semana') {
      const [ini, fin] = getThisWeekRange()
      resultado = resultado.filter(t => t.fecha >= ini && t.fecha <= fin)
    } else if (filtro === 'semana_pasada') {
      const [ini, fin] = getLastWeekRange()
      resultado = resultado.filter(t => t.fecha >= ini && t.fecha <= fin)
    } else if (filtro.startsWith('mes_')) {
      const ym = filtro.replace('mes_', '')
      resultado = resultado.filter(t => t.fecha?.startsWith(ym))
    }
    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase()
      resultado = resultado.filter(t =>
        t.de_para?.toLowerCase().includes(q) ||
        t.descripcion?.toLowerCase().includes(q)
      )
    }
    return resultado
  }, [transacciones, filtro, busqueda])

  // Totales solo de transacciones Personal (excluye Encargo y Colecta)
  const resumenFiltrado = useMemo(() => {
    const r = { totalRecibido: 0, montoRecibido: 0, totalEnviado: 0, montoEnviado: 0, totalPagos: 0, montoPagos: 0 }
    for (const t of txFiltradas) {
      if (t.categoria !== 'Personal') continue
      if (t.tipo === 'Recibido') { r.totalRecibido++; r.montoRecibido += t.monto }
      else if (t.tipo === 'Enviado') { r.totalEnviado++; r.montoEnviado += t.monto }
      else if (t.tipo === 'Pago')    { r.totalPagos++;   r.montoPagos   += t.monto }
    }
    return r
  }, [txFiltradas])

  const passthroughCount = useMemo(() =>
    txFiltradas.filter(t => t.categoria !== 'Personal').length,
  [txFiltradas])

  const filtroLabel = useMemo(() => {
    if (filtro === 'todo') return `${transacciones.length} transacciones`
    if (filtro === 'semana') return 'Esta semana'
    if (filtro === 'semana_pasada') return 'Semana pasada'
    if (filtro.startsWith('mes_')) {
      const [y, m] = filtro.replace('mes_', '').split('-')
      return `${MESES[parseInt(m) - 1]} ${y}`
    }
    return ''
  }, [filtro, transacciones.length])

  return (
    <>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 0 40px' }}>
        <div style={{ background: '#0057FF', color: '#fff', padding: '48px 20px 20px', borderRadius: '0 0 24px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 4 }}>Panel personal</div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>Yappy</div>
              <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>{filtroLabel}</div>
            </div>
            <button
              onClick={handleSync}
              disabled={syncing}
              style={{
                background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 12,
                color: '#fff', padding: '8px 14px', fontSize: 13, fontWeight: 600,
                cursor: syncing ? 'not-allowed' : 'pointer', marginTop: 4,
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {syncing ? '⏳' : '🔄'} {syncing ? 'Sincronizando…' : syncMsg || 'Sincronizar'}
            </button>
          </div>
        </div>

        <div style={{ padding: '16px 16px 0' }}>

          {/* Filtros semana */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 10, overflowX: 'auto', paddingBottom: 2 }}>
            <Pill label="Todo"          active={filtro === 'todo'}          onClick={() => setFiltro('todo')} />
            <Pill label="Esta semana"   active={filtro === 'semana'}        onClick={() => setFiltro('semana')} />
            <Pill label="Semana pasada" active={filtro === 'semana_pasada'} onClick={() => setFiltro('semana_pasada')} />
          </div>

          {/* Filtros mes */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, overflowX: 'auto', paddingBottom: 2 }}>
            {mesesDisponibles.map(ym => {
              const [y, m] = ym.split('-')
              const key: FilterMode = `mes_${ym}`
              return <Pill key={ym} label={`${MESES[parseInt(m) - 1]} ${y}`} active={filtro === key} onClick={() => setFiltro(key)} />
            })}
          </div>

          {/* Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: passthroughCount > 0 ? 6 : 20 }}>
            <StatCard label="Recibido" count={resumenFiltrado.totalRecibido} monto={resumenFiltrado.montoRecibido} color={COLORS.recibido} />
            <StatCard label="Enviado"  count={resumenFiltrado.totalEnviado}  monto={resumenFiltrado.montoEnviado}  color={COLORS.enviado} />
            <StatCard label="Pagos"    count={resumenFiltrado.totalPagos}    monto={resumenFiltrado.montoPagos}    color={COLORS.pago} />
          </div>

          {/* Nota encargos excluidos */}
          {passthroughCount > 0 && (
            <div style={{ fontSize: 11, color: '#aaa', textAlign: 'right', marginBottom: 16 }}>
              {passthroughCount} encargo{passthroughCount > 1 ? 's/colectas' : '/colecta'} excluido{passthroughCount > 1 ? 's' : ''} de los totales
            </div>
          )}

          {/* Accesos rápidos */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <Link href="/recurrentes" style={{ textDecoration: 'none' }}>
              <div style={{
                background: '#fff', borderRadius: 16, padding: '14px 16px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#7B5EA7', display: 'inline-block' }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>Recurrentes</span>
                </div>
                <span style={{ fontSize: 13, color: '#aaa' }}>→</span>
              </div>
            </Link>
            <Link href="/finanzas" style={{ textDecoration: 'none' }}>
              <div style={{
                background: '#fff', borderRadius: 16, padding: '14px 16px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#1D9E75', display: 'inline-block' }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>Finanzas</span>
                </div>
                <span style={{ fontSize: 13, color: '#aaa' }}>→</span>
              </div>
            </Link>
          </div>

          {/* Lista */}
          <div style={{ background: '#fff', borderRadius: 16, padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#111' }}>Transacciones</div>
              <div style={{ fontSize: 12, color: '#aaa' }}>{txFiltradas.length} registros</div>
            </div>
            {txFiltradas.length === 0 ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: '#aaa', fontSize: 13 }}>
                Sin transacciones en este período.
              </div>
            ) : (
              txFiltradas.slice(0, 50).map(t => (
                <TransaccionRow key={t.id} t={t} onTap={setSelectedTx} />
              ))
            )}
            {txFiltradas.length > 50 && (
              <div style={{ padding: '12px 0 0', textAlign: 'center', color: '#aaa', fontSize: 12 }}>
                Mostrando 50 de {txFiltradas.length}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Sheet */}
      {selectedTx && (
        <BottomSheet
          tx={selectedTx}
          onClose={() => setSelectedTx(null)}
          onSaved={handleSaved}
        />
      )}
    </>
  )
}

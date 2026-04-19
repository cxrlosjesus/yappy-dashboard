'use client'

import { useState, useEffect } from 'react'
import type { PagoFijo } from '@/types/pagos-fijos'

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const STORAGE_META = 'meta_ahorro_quincenal'

function fmt(n: number) {
  return '$' + n.toLocaleString('es-PA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function quincenaLabel(key: string): string {
  // key = "checklist_YYYY-M-D"
  const parts = key.replace('checklist_', '').split('-')
  if (parts.length < 3) return key
  const y = parts[0], m = parseInt(parts[1]) - 1, d = parts[2]
  return `${d} ${MESES[m]} ${y}`
}

// ── Salud financiera ───────────────────────────────────────────────────────────

function getSalud(porcentajeAhorro: number): { label: string; color: string; bg: string; descripcion: string } {
  if (porcentajeAhorro >= 20) return {
    label: 'Excelente', color: '#1D9E75', bg: '#E8F8F2',
    descripcion: 'Estás ahorrando más del 20% de tu ingreso. Vas muy bien.',
  }
  if (porcentajeAhorro >= 10) return {
    label: 'Buena', color: '#BA7517', bg: '#FEF3C7',
    descripcion: 'Ahorras entre 10–20% del ingreso. Hay margen para mejorar.',
  }
  return {
    label: 'Por mejorar', color: '#DC2626', bg: '#FEE2E2',
    descripcion: 'Ahorras menos del 10% del ingreso. Considera reducir variables.',
  }
}

// ── Historial ──────────────────────────────────────────────────────────────────

interface EntradaHistorial {
  key: string
  label: string
  checkedIds: string[]
  fecha: Date
}

function cargarHistorial(quincenaActualKey: string): EntradaHistorial[] {
  const entradas: EntradaHistorial[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key || !key.startsWith('checklist_') || key === `checklist_${quincenaActualKey}`) continue
    try {
      const val = localStorage.getItem(key)
      const checkedIds: string[] = val ? JSON.parse(val) : []
      const parts = key.replace('checklist_', '').split('-')
      if (parts.length < 3) continue
      const fecha = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
      entradas.push({ key, label: quincenaLabel(key), checkedIds, fecha })
    } catch {}
  }
  return entradas.sort((a, b) => b.fecha.getTime() - a.fecha.getTime()).slice(0, 8)
}

// ── Componente principal ───────────────────────────────────────────────────────

interface Props {
  pagos: PagoFijo[]
  ingresoQuincenal: number
  quincenaActualKey: string
  totalItems: number  // cantidad de ítems en la quincena actual (para detectar si histórica fue completa)
}

export default function ResumenFinanciero({ pagos, ingresoQuincenal, quincenaActualKey, totalItems }: Props) {
  const [meta, setMeta] = useState(200)
  const [editandoMeta, setEditandoMeta] = useState(false)
  const [metaInput, setMetaInput] = useState('')
  const [historial, setHistorial] = useState<EntradaHistorial[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_META)
      if (saved) setMeta(parseFloat(saved))
    } catch {}
    setHistorial(cargarHistorial(quincenaActualKey))
    setLoaded(true)
  }, [quincenaActualKey])

  function guardarMeta() {
    const val = parseFloat(metaInput)
    if (!isNaN(val) && val > 0) {
      setMeta(val)
      localStorage.setItem(STORAGE_META, String(val))
    }
    setEditandoMeta(false)
  }

  if (!loaded) return null

  // Cálculos
  const ahorroActual = pagos
    .filter(p => p.categoria === 'ahorro')
    .reduce((s, p) => s + p.monto, 0)

  const porcentajeAhorro = (ahorroActual / ingresoQuincenal) * 100
  const porcentajeMeta   = Math.min((ahorroActual / meta) * 100, 100)
  const salud = getSalud(porcentajeAhorro)

  return (
    <div style={{ padding: '0 16px', marginTop: 0 }}>

      {/* ── Salud financiera ── */}
      <div style={{ background: salud.bg, borderRadius: 16, padding: '16px', marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 2 }}>SALUD FINANCIERA</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: salud.color }}>{salud.label}</div>
          </div>
          <div style={{
            background: salud.color, color: '#fff',
            borderRadius: 20, padding: '4px 12px', fontSize: 13, fontWeight: 700,
          }}>
            {porcentajeAhorro.toFixed(0)}% ahorro
          </div>
        </div>
        <div style={{ fontSize: 12, color: '#555', marginBottom: 12, lineHeight: 1.4 }}>
          {salud.descripcion}
        </div>

        {/* Desglose % del ingreso */}
        {(() => {
          const porCat = [
            { label: 'Transferencias', color: '#0057FF', monto: pagos.filter(p => p.categoria === 'transferencia').reduce((s,p) => s+p.monto, 0) },
            { label: 'Ahorro',         color: '#1D9E75', monto: ahorroActual },
            { label: 'Variables',      color: '#BA7517', monto: pagos.filter(p => p.categoria === 'variable').reduce((s,p) => s+p.monto, 0) },
            { label: 'Suscripciones',  color: '#7B5EA7', monto: pagos.filter(p => p.categoria === 'suscripcion').reduce((s,p) => s+p.monto/2, 0) },
            { label: 'Cargos',         color: '#378ADD', monto: pagos.filter(p => p.categoria === 'cargo_bancario').reduce((s,p) => s+p.monto/2, 0) },
          ].filter(c => c.monto > 0)

          return (
            <div>
              <div style={{ display: 'flex', height: 8, borderRadius: 8, overflow: 'hidden', marginBottom: 8 }}>
                {porCat.map(c => (
                  <div key={c.label} style={{ flex: c.monto, background: c.color }} />
                ))}
                <div style={{ flex: Math.max(0, ingresoQuincenal - porCat.reduce((s,c) => s+c.monto, 0)), background: '#E5E7EB' }} />
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>
                {porCat.map(c => (
                  <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.color, display: 'inline-block' }} />
                    <span style={{ fontSize: 10, color: '#555' }}>{c.label} {((c.monto / ingresoQuincenal) * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}
      </div>

      {/* ── Meta de ahorro ── */}
      <div style={{ background: '#fff', borderRadius: 16, padding: '16px', marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>Meta de ahorro quincenal</div>
          <button
            onClick={() => { setMetaInput(String(meta)); setEditandoMeta(true) }}
            style={{ background: 'none', border: 'none', fontSize: 12, color: '#888', cursor: 'pointer', fontWeight: 600 }}
          >
            Editar
          </button>
        </div>

        {editandoMeta ? (
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input
              type="number"
              value={metaInput}
              onChange={e => setMetaInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && guardarMeta()}
              autoFocus
              style={{ flex: 1, border: '1.5px solid #E8E8E8', borderRadius: 8, padding: '8px 10px', fontSize: 14, outline: 'none' }}
            />
            <button onClick={guardarMeta} style={{ background: '#1A1A2E', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
              OK
            </button>
          </div>
        ) : null}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 22, fontWeight: 800, color: '#1D9E75' }}>{fmt(ahorroActual)}</span>
          <span style={{ fontSize: 13, color: '#aaa', alignSelf: 'flex-end' }}>de {fmt(meta)}</span>
        </div>

        <div style={{ background: '#F0F0F0', borderRadius: 8, height: 10, overflow: 'hidden', marginBottom: 6 }}>
          <div style={{
            height: '100%', borderRadius: 8,
            background: porcentajeMeta === 100 ? '#1D9E75' : porcentajeMeta >= 70 ? '#4A90FF' : '#BA7517',
            width: `${porcentajeMeta}%`,
            transition: 'width 0.4s ease',
          }} />
        </div>

        <div style={{ fontSize: 12, color: '#888' }}>
          {porcentajeMeta >= 100
            ? '✓ Meta alcanzada esta quincena'
            : `Te faltan ${fmt(meta - ahorroActual)} para tu meta`}
        </div>
      </div>

      {/* ── Historial de quincenas ── */}
      {historial.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 16, padding: '16px', marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 12 }}>Historial de quincenas</div>
          {historial.map(h => {
            const n = h.checkedIds.length
            const completa = n > 0 && n >= totalItems
            return (
              <div key={h.key} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 0', borderBottom: '0.5px solid #f0f0f0',
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: completa ? '#E8F8F2' : '#F5F5F7',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16,
                }}>
                  {n === 0 ? '📋' : completa ? '✅' : '🔄'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{h.label}</div>
                  <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>
                    {n === 0 ? 'Sin registros' : `${n} pago${n !== 1 ? 's' : ''} marcado${n !== 1 ? 's' : ''}`}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  {completa
                    ? <div style={{ fontSize: 12, fontWeight: 700, color: '#1D9E75' }}>Completa</div>
                    : n > 0
                      ? <div style={{ fontSize: 12, fontWeight: 700, color: '#4A90FF' }}>Parcial</div>
                      : <div style={{ fontSize: 12, color: '#ccc' }}>—</div>
                  }
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

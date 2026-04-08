'use client'

import Link from 'next/link'
import { useState, useMemo } from 'react'

export interface GastosMes {
  mes: string
  label: string
  yappy: number
  tarjeta: number
  total: number
}

function fmt(n: number) {
  return '$' + n.toLocaleString('es-PA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ── Stacked Bar Chart ─────────────────────────────────────────────────────────

function BarChart({
  data,
  selectedMes,
  onSelect,
}: {
  data: GastosMes[]
  selectedMes: string
  onSelect: (mes: string) => void
}) {
  // Show last 12 months
  const visible = data.slice(-12)
  const maxTotal = Math.max(...visible.map(d => d.total), 1)

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 120, paddingTop: 8 }}>
      {visible.map(d => {
        const isSelected = d.mes === selectedMes
        const totalH = Math.round((d.total / maxTotal) * 96)
        const tarjetaH = Math.round((d.tarjeta / d.total) * totalH) || 0
        const yappyH = totalH - tarjetaH

        return (
          <div
            key={d.mes}
            onClick={() => onSelect(d.mes)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', cursor: 'pointer', gap: 4,
            }}
          >
            {/* Amount label on selected */}
            <div style={{ fontSize: 8, color: isSelected ? '#0057FF' : 'transparent', fontWeight: 700, lineHeight: 1 }}>
              {fmt(d.total).replace('$', '')}
            </div>

            {/* Stacked bar */}
            <div style={{
              width: '100%', display: 'flex', flexDirection: 'column',
              borderRadius: 4, overflow: 'hidden',
              outline: isSelected ? '2px solid #0057FF' : 'none',
              outlineOffset: 1,
            }}>
              {/* Yappy (top) */}
              <div style={{
                height: yappyH,
                background: isSelected ? '#E8503A' : '#FFCBB8',
                transition: 'height 0.2s',
              }} />
              {/* Tarjeta (bottom) */}
              <div style={{
                height: tarjetaH,
                background: isSelected ? '#0057FF' : '#BDD0F5',
                transition: 'height 0.2s',
              }} />
            </div>

            {/* Month label */}
            <div style={{
              fontSize: 8, color: isSelected ? '#0057FF' : '#aaa',
              fontWeight: isSelected ? 700 : 400, lineHeight: 1,
            }}>
              {d.label.slice(0, 3)}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function GastosClient({ data }: { data: GastosMes[] }) {
  const currentMes = useMemo(() => {
    if (data.length === 0) return ''
    return data[data.length - 1].mes
  }, [data])

  const [selectedMes, setSelectedMes] = useState(currentMes)

  const selected = useMemo(
    () => data.find(d => d.mes === selectedMes) ?? data[data.length - 1],
    [data, selectedMes]
  )

  const totalAcum = useMemo(
    () => data.reduce((s, d) => s + d.total, 0),
    [data]
  )

  const avgMensual = data.length > 0 ? totalAcum / data.length : 0

  const yappyPct = selected && selected.total > 0
    ? (selected.yappy / selected.total) * 100
    : 0
  const tarjetaPct = selected && selected.total > 0
    ? (selected.tarjeta / selected.total) * 100
    : 0

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', paddingBottom: 40 }}>

      {/* Header */}
      <div style={{ background: '#111827', color: '#fff', padding: '48px 20px 24px', borderRadius: '0 0 24px 24px' }}>
        <Link href="/dashboard" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, textDecoration: 'none' }}>
          ← Dashboard
        </Link>
        <div style={{ fontSize: 24, fontWeight: 700, marginTop: 8 }}>Gastos totales</div>
        <div style={{ fontSize: 13, opacity: 0.6, marginTop: 2 }}>Yappy + Tarjeta de débito</div>

        {/* Hero total acumulado */}
        <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 14, padding: '14px 16px' }}>
            <div style={{ fontSize: 11, opacity: 0.7 }}>Total acumulado</div>
            <div style={{ fontSize: 22, fontWeight: 800, marginTop: 2 }}>{fmt(totalAcum)}</div>
            <div style={{ fontSize: 10, opacity: 0.5, marginTop: 2 }}>{data.length} meses</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 14, padding: '14px 16px' }}>
            <div style={{ fontSize: 11, opacity: 0.7 }}>Promedio mensual</div>
            <div style={{ fontSize: 22, fontWeight: 800, marginTop: 2 }}>{fmt(avgMensual)}</div>
            <div style={{ fontSize: 10, opacity: 0.5, marginTop: 2 }}>por mes</div>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 16px' }}>

        {/* Gráfica + leyenda */}
        <div style={{ marginTop: 20, background: '#fff', borderRadius: 16, padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#aaa', letterSpacing: 0.8, textTransform: 'uppercase' }}>
              Últimos {Math.min(data.length, 12)} meses
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: '#E8503A', display: 'inline-block' }} />
                <span style={{ fontSize: 10, color: '#888' }}>Yappy</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: '#0057FF', display: 'inline-block' }} />
                <span style={{ fontSize: 10, color: '#888' }}>Tarjeta</span>
              </div>
            </div>
          </div>

          <BarChart data={data} selectedMes={selectedMes} onSelect={setSelectedMes} />
        </div>

        {/* Mes seleccionado */}
        {selected && (
          <>
            <div style={{ marginTop: 12, background: '#fff', borderRadius: 16, padding: '16px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#aaa', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 14 }}>
                {selected.label}
              </div>

              {/* Total */}
              <div style={{ fontSize: 32, fontWeight: 800, color: '#111', marginBottom: 16 }}>
                {fmt(selected.total)}
              </div>

              {/* Barra de proporción */}
              <div style={{ background: '#f0f0f0', borderRadius: 6, height: 10, overflow: 'hidden', marginBottom: 10, display: 'flex' }}>
                <div style={{ height: '100%', width: `${tarjetaPct}%`, background: '#0057FF' }} />
                <div style={{ height: '100%', width: `${yappyPct}%`, background: '#E8503A' }} />
              </div>

              {/* Yappy vs Tarjeta breakdown */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ background: '#FFF3F0', borderRadius: 12, padding: '12px 14px' }}>
                  <div style={{ fontSize: 10, color: '#C44226', fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 }}>
                    Yappy
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#111' }}>{fmt(selected.yappy)}</div>
                  <div style={{ fontSize: 10, color: '#aaa', marginTop: 2 }}>
                    {yappyPct.toFixed(0)}% del total
                  </div>
                </div>
                <div style={{ background: '#EFF4FF', borderRadius: 12, padding: '12px 14px' }}>
                  <div style={{ fontSize: 10, color: '#0040CC', fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 }}>
                    Tarjeta
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#111' }}>{fmt(selected.tarjeta)}</div>
                  <div style={{ fontSize: 10, color: '#aaa', marginTop: 2 }}>
                    {tarjetaPct.toFixed(0)}% del total
                  </div>
                </div>
              </div>
            </div>

            {/* Navegación entre meses */}
            <div style={{ marginTop: 10, display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
              {data.slice(-12).reverse().map(d => (
                <button
                  key={d.mes}
                  onClick={() => setSelectedMes(d.mes)}
                  style={{
                    padding: '6px 13px', borderRadius: 20, border: 'none', cursor: 'pointer',
                    fontSize: 12, fontWeight: d.mes === selectedMes ? 700 : 500, whiteSpace: 'nowrap', flexShrink: 0,
                    background: d.mes === selectedMes ? '#111827' : '#F0F2F5',
                    color: d.mes === selectedMes ? '#fff' : '#555',
                  }}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Links a fuentes */}
        <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Link href="/dashboard" style={{ textDecoration: 'none' }}>
            <div style={{ background: '#fff', borderRadius: 14, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#111' }}>Yappy</div>
                <div style={{ fontSize: 10, color: '#aaa', marginTop: 1 }}>Transacciones</div>
              </div>
              <span style={{ fontSize: 13, color: '#E8503A' }}>→</span>
            </div>
          </Link>
          <Link href="/movimientos" style={{ textDecoration: 'none' }}>
            <div style={{ background: '#fff', borderRadius: 14, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#111' }}>Tarjeta</div>
                <div style={{ fontSize: 10, color: '#aaa', marginTop: 1 }}>Banco · resumen</div>
              </div>
              <span style={{ fontSize: 13, color: '#0057FF' }}>→</span>
            </div>
          </Link>
        </div>

      </div>
    </div>
  )
}

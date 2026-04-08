import { getLatestMovimientosFile, parseMovimientos, buildResumenPorMes } from '@/lib/movimientos-parser'
import MovimientosClient from '../_components/MovimientosClient'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function AnalisisPage() {
  const file = getLatestMovimientosFile()

  if (!file) {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '48px 20px' }}>
        <Link href="/movimientos" style={{ color: '#0057FF', fontSize: 13 }}>← Movimientos</Link>
        <p style={{ color: '#888', marginTop: 20, fontSize: 14 }}>
          No se encontró ningún archivo de movimientos en Downloads.
        </p>
      </div>
    )
  }

  const movimientos = parseMovimientos(file.content)
  const resumenPorMes = buildResumenPorMes(movimientos)
  const mesesDisponibles = resumenPorMes.map(r => r.mes).reverse()
  const saldoActual = movimientos[0]?.saldo ?? 0

  return (
    <MovimientosClient
      movimientos={movimientos}
      resumenPorMes={resumenPorMes}
      mesesDisponibles={mesesDisponibles}
      archivoFecha={file.archivoFecha}
      saldoActual={saldoActual}
    />
  )
}

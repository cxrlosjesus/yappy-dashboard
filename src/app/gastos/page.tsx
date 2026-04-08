import { getTransacciones } from '@/lib/queries'
import { getLatestMovimientosFile, parseMovimientos } from '@/lib/movimientos-parser'
import GastosClient, { type GastosMes } from '@/app/_components/GastosClient'

export const dynamic = 'force-dynamic'

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

export default async function GastosPage() {
  const [transacciones, movimientosFile] = await Promise.all([
    getTransacciones(),
    getLatestMovimientosFile(),
  ])

  const movimientos = movimientosFile ? parseMovimientos(movimientosFile.content) : []

  const map = new Map<string, { yappy: number; tarjeta: number }>()

  function ensureMes(mes: string) {
    if (!map.has(mes)) map.set(mes, { yappy: 0, tarjeta: 0 })
    return map.get(mes)!
  }

  for (const t of transacciones) {
    if (!t.fecha) continue
    if (t.categoria !== 'Personal') continue
    if (t.tipo !== 'Pago' && t.tipo !== 'Enviado') continue
    ensureMes(t.fecha.slice(0, 7)).yappy += t.monto
  }

  for (const m of movimientos) {
    if (!m.esTarjeta || !m.esGasto) continue
    ensureMes(m.fecha.slice(0, 7)).tarjeta += m.monto
  }

  const gastosMes: GastosMes[] = Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, data]) => {
      const [y, mo] = mes.split('-')
      return {
        mes,
        label: `${MESES[parseInt(mo) - 1]} ${y}`,
        yappy: data.yappy,
        tarjeta: data.tarjeta,
        total: data.yappy + data.tarjeta,
      }
    })

  return <GastosClient data={gastosMes} />
}

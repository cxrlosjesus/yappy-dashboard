import PagosFijosClient from '@/app/_components/PagosFijosClient'
import { PAGOS_FIJOS } from '@/lib/pagos-fijos-data'
import { getFacturas } from '@/lib/facturas-queries'

export const dynamic = 'force-dynamic'

export default async function RecurrentesPage() {
  const facturas = await getFacturas()
  return <PagosFijosClient pagos={PAGOS_FIJOS} facturas={facturas} />
}

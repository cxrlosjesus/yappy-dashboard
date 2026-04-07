import PagosFijosClient from '@/app/_components/PagosFijosClient'
import { PAGOS_FIJOS } from '@/lib/pagos-fijos-data'

export default function RecurrentesPage() {
  return <PagosFijosClient pagos={PAGOS_FIJOS} />
}

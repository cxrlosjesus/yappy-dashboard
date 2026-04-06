import RecurrentesClient from '@/app/_components/RecurrentesClient'
import { PAGOS_RECURRENTES } from '@/lib/recurrentes-data'

export default function RecurrentesPage() {
  return <RecurrentesClient pagos={PAGOS_RECURRENTES} />
}

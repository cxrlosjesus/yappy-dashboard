import FinanzasClient from '@/app/_components/FinanzasClient'
import { PLAN_FINANCIERO } from '@/lib/finanzas-data'

export default function FinanzasPage() {
  return <FinanzasClient plan={PLAN_FINANCIERO} />
}

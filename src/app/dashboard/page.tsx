import { getResumen } from '@/lib/queries'
import DashboardClient from '../_components/DashboardClient'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const resumen = await getResumen()
  return <DashboardClient resumen={resumen} />
}

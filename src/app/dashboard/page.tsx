import { getResumen } from '@/lib/queries'
import DashboardClient from '../_components/DashboardClient'

// Server Component: fetches data server-side (más rápido en mobile)
export default async function DashboardPage() {
  const resumen = await getResumen()
  return <DashboardClient resumen={resumen} />
}

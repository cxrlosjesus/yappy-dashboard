import { NextResponse } from 'next/server'
import { getFacturas } from '@/lib/facturas-queries'

export const dynamic = 'force-dynamic'

export async function GET() {
  const facturas = await getFacturas()
  return NextResponse.json(facturas)
}

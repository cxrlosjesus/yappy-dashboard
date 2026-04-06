import { NextResponse } from 'next/server'
import { getResumen } from '@/lib/queries'

export async function GET() {
  try {
    const resumen = await getResumen()
    return NextResponse.json(resumen)
  } catch (error) {
    console.error('Error al obtener transacciones:', error)
    return NextResponse.json(
      { error: 'Error al conectar con Notion' },
      { status: 500 }
    )
  }
}

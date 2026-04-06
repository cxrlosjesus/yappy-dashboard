import { NextRequest, NextResponse } from 'next/server'
import { crearTransaccion } from '@/lib/queries'
import type { YappyTransaccion } from '@/types/yappy'

export async function POST(req: NextRequest) {
  // Verificar secret para acceso programático
  const secret = req.headers.get('x-sync-secret')
  if (!secret || secret !== process.env.AUTH_SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const transacciones: Omit<YappyTransaccion, 'id'>[] = Array.isArray(body)
      ? body
      : [body]

    for (const t of transacciones) {
      await crearTransaccion(t)
    }

    return NextResponse.json({
      ok: true,
      guardadas: transacciones.length,
    })
  } catch (error) {
    console.error('Error en sync:', error)
    return NextResponse.json({ error: 'Error al guardar' }, { status: 500 })
  }
}

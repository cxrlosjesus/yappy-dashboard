import { NextRequest, NextResponse } from 'next/server'
import { crearTransaccion } from '@/lib/queries'
import type { YappyTransaccion } from '@/types/yappy'

// Este endpoint recibe transacciones y las guarda en Notion
// Se llama manualmente (o desde Claude) con los datos del Gmail
export async function POST(req: NextRequest) {
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

import { NextRequest, NextResponse } from 'next/server'
import { actualizarCategoria } from '@/lib/queries'
import type { CategoriaTransaccion } from '@/types/yappy'

const CATEGORIAS_VALIDAS: CategoriaTransaccion[] = ['Personal', 'Encargo', 'Colecta']

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json()
    const { categoria } = body as { categoria: CategoriaTransaccion }

    if (!CATEGORIAS_VALIDAS.includes(categoria)) {
      return NextResponse.json({ error: 'Categoría inválida' }, { status: 400 })
    }

    await actualizarCategoria(params.id, categoria)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
  }
}

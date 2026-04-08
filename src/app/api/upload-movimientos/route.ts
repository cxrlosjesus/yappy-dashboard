import { NextRequest, NextResponse } from 'next/server'
import { put, list, del } from '@vercel/blob'

export async function POST(req: NextRequest) {
  const form = await req.formData()
  const file = form.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 })
  }

  if (!file.name.endsWith('.txt')) {
    return NextResponse.json({ error: 'Solo se aceptan archivos .txt' }, { status: 400 })
  }

  // Nombre canónico para que el parser lo encuentre por fecha
  const dateMatch = file.name.match(/(\d{4}-\d{2}-\d{2})\.txt$/)
  const fecha = dateMatch ? dateMatch[1] : new Date().toISOString().slice(0, 10)
  const blobName = `movimientos/ULTIMOS-MOVIMIENTOS-CUENTA-DE-AHORROS-${fecha}.txt`

  const arrayBuffer = await file.arrayBuffer()
  const blob = await put(blobName, arrayBuffer, {
    access: 'private',
    contentType: 'text/plain; charset=utf-8',
    addRandomSuffix: false,
  })

  // Eliminar archivos anteriores del mismo prefijo para no acumular
  const { blobs: existing } = await list({ prefix: 'movimientos/' })
  for (const b of existing) {
    if (b.url !== blob.url) {
      await del(b.url)
    }
  }

  return NextResponse.json({ ok: true, url: blob.url, fecha })
}

export async function GET() {
  const { blobs } = await list({ prefix: 'movimientos/' })
  const sorted = blobs
    .filter(b => b.pathname.endsWith('.txt'))
    .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())

  return NextResponse.json({
    archivo: sorted[0]
      ? { nombre: sorted[0].pathname, fecha: sorted[0].uploadedAt, url: sorted[0].url }
      : null,
  })
}

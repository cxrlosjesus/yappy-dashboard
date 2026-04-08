import { NextRequest, NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'

const OVERRIDES_PATH = path.join(process.cwd(), 'data', 'overrides.json')

function loadOverrides(): { categorias: Record<string, string> } {
  if (!fs.existsSync(OVERRIDES_PATH)) return { categorias: {} }
  try { return JSON.parse(fs.readFileSync(OVERRIDES_PATH, 'utf-8')) }
  catch { return { categorias: {} } }
}

// GET — devuelve todos los overrides actuales
export async function GET() {
  return NextResponse.json(loadOverrides())
}

// POST — guarda o actualiza la categoría de un merchant
export async function POST(req: NextRequest) {
  const { merchant, categoria } = await req.json()
  if (!merchant || !categoria) {
    return NextResponse.json({ error: 'Faltan campos' }, { status: 400 })
  }
  const overrides = loadOverrides()
  overrides.categorias[merchant] = categoria
  fs.mkdirSync(path.dirname(OVERRIDES_PATH), { recursive: true })
  fs.writeFileSync(OVERRIDES_PATH, JSON.stringify(overrides, null, 2))
  return NextResponse.json({ ok: true })
}

// DELETE — elimina el override de un merchant (vuelve al automático)
export async function DELETE(req: NextRequest) {
  const { merchant } = await req.json()
  const overrides = loadOverrides()
  delete overrides.categorias[merchant]
  fs.writeFileSync(OVERRIDES_PATH, JSON.stringify(overrides, null, 2))
  return NextResponse.json({ ok: true })
}

import { NextRequest, NextResponse } from 'next/server'
import { crearTransaccion, getTransacciones } from '@/lib/queries'
import type { YappyTransaccion } from '@/types/yappy'

async function getAccessToken(): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN!,
      grant_type:    'refresh_token',
    }),
  })
  const data = await res.json()
  if (!data.access_token) throw new Error(`OAuth error: ${JSON.stringify(data)}`)
  return data.access_token
}

function parsearTransaccion(snippet: string, subject: string, dateStr: string): Omit<YappyTransaccion, 'id'> | null {
  const fecha = new Date(dateStr).toISOString().slice(0, 10)

  let tipo: YappyTransaccion['tipo']
  if (snippet.includes('Te enviaron')) {
    tipo = 'Recibido'
  } else if (snippet.includes('Pagaste')) {
    tipo = 'Pago'
  } else if (snippet.includes('Enviaste')) {
    tipo = 'Enviado'
  } else {
    return null
  }

  const montoMatch = snippet.match(/\$(\d+(?:\.\d{2})?)/)
  if (!montoMatch) return null
  const monto = parseFloat(montoMatch[1])

  let de_para = ''
  let notas = ''

  if (tipo === 'Recibido') {
    const m = snippet.match(/Enviado por ([^0-9]+?)(?:\d|\*{4})/)
    if (m) de_para = m[1].trim()
    const msg = snippet.match(/Mensaje ([^C]+?) Confirmación/)
    if (msg) notas = msg[1].trim()
  } else if (tipo === 'Enviado') {
    const m = snippet.match(/Enviado a ([^0-9]+?)\d{6,}/)
    if (m) de_para = m[1].trim()
  } else if (tipo === 'Pago') {
    const m = snippet.match(/Pagado a ([^0-9]+?)(?:\d{6,}|\s+Fecha)/)
    if (m) de_para = m[1].trim()
    const msg = snippet.match(/Mensaje ([^C]+?) Confirmación/)
    if (msg) notas = msg[1].trim()
  }

  const conf = snippet.match(/Confirmación ([A-Z]{5}-\d{8})/)
  const confirmacion = conf ? conf[1] : ''

  return {
    descripcion: confirmacion,
    tipo,
    monto,
    fecha,
    de_para,
    asunto_email: subject,
    estado: 'Completado',
    notas,
    categoria: 'Personal',
  }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.AUTH_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const accessToken = await getAccessToken()

    // Obtener confirmaciones existentes para evitar duplicados
    const existentes = await getTransacciones()
    const confirmacionesExistentes = new Set(existentes.map(t => t.descripcion).filter(Boolean))

    // Buscar desde la última transacción o últimos 2 días
    let desde = new Date()
    desde.setDate(desde.getDate() - 2)
    if (existentes.length > 0) {
      const fechas = existentes.map(t => t.fecha).filter(Boolean).sort()
      const ultima = new Date(fechas[fechas.length - 1])
      ultima.setDate(ultima.getDate() - 1)
      if (ultima > desde) desde = ultima
    }
    const desdeStr = desde.toISOString().slice(0, 10).replace(/-/g, '/')

    // Buscar correos de Yappy
    const listRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=from:notificaciones@yappy.com.pa%20after:${desdeStr}&maxResults=50`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    const { messages = [] } = await listRes.json()

    const nuevas: Omit<YappyTransaccion, 'id'>[] = []

    for (const msg of messages) {
      const detRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=Date`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )
      const data = await detRes.json()

      const subject = data.payload?.headers?.find((h: any) => h.name === 'Subject')?.value ?? ''
      const date    = data.payload?.headers?.find((h: any) => h.name === 'Date')?.value ?? ''
      const snippet = data.snippet ?? ''

      if (!subject.includes('Yappy')) continue
      if (subject.includes('cuenta principal') || subject.includes('Cambiaste')) continue

      const tx = parsearTransaccion(snippet, subject, date)
      if (!tx) continue
      if (tx.descripcion && confirmacionesExistentes.has(tx.descripcion)) continue

      nuevas.push(tx)
    }

    for (const tx of nuevas) {
      await crearTransaccion(tx)
    }

    return NextResponse.json({ ok: true, nuevas: nuevas.length, revisadas: messages.length })
  } catch (error: any) {
    console.error('Error en cron:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

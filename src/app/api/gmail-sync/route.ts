import { NextRequest, NextResponse } from 'next/server'
import { crearTransaccion, getTransacciones } from '@/lib/queries'
import { crearFactura, getUltimaFactura } from '@/lib/facturas-queries'
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

// ── Parser de Yappy ────────────────────────────────────────────────────────────

function parsearTransaccion(snippet: string, subject: string, dateStr: string): Omit<YappyTransaccion, 'id'> | null {
  const fecha = new Date(dateStr).toISOString().slice(0, 10)

  let tipo: YappyTransaccion['tipo']
  if (snippet.includes('Te enviaron')) tipo = 'Recibido'
  else if (snippet.includes('Pagaste')) tipo = 'Pago'
  else if (snippet.includes('Enviaste')) tipo = 'Enviado'
  else return null

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
  return {
    descripcion: conf ? conf[1] : '',
    tipo, monto, fecha, de_para,
    asunto_email: subject,
    estado: 'Completado',
    notas,
    categoria: 'Personal',
  }
}

// ── Parser de Tigo ─────────────────────────────────────────────────────────────

const MESES_ES: Record<string, string> = {
  enero:'01', febrero:'02', marzo:'03', abril:'04', mayo:'05', junio:'06',
  julio:'07', agosto:'08', septiembre:'09', octubre:'10', noviembre:'11', diciembre:'12',
}

function parsearTigo(body: string, emailId: string): { monto: number; vencimiento: string; mes: string } | null {
  const montoMatch = body.match(/B\/\.\s*(\d+\.\d{2})/)
  if (!montoMatch) return null
  const monto = parseFloat(montoMatch[1])

  const fechaMatch = body.match(/Pagar Antes de:\s*(\d+)\s+de\s+(\w+)\s+de\s+(\d{4})/i)
  if (!fechaMatch) return null

  const dia = fechaMatch[1].padStart(2, '0')
  const mesNombre = fechaMatch[2].toLowerCase()
  const año = fechaMatch[3]
  const mesNum = MESES_ES[mesNombre]
  if (!mesNum) return null

  const vencimiento = `${año}-${mesNum}-${dia}`
  const mes = `${fechaMatch[2]} ${año}`

  return { monto, vencimiento, mes }
}

function decodeBase64(data: string): string {
  return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8')
}

function extractBody(payload: any): string {
  if (payload.body?.data) return decodeBase64(payload.body.data)
  if (payload.parts) {
    for (const part of payload.parts) {
      const text = extractBody(part)
      if (text) return text
    }
  }
  return ''
}

// ── Handler principal ──────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.AUTH_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const accessToken = await getAccessToken()

    // ── Sync Yappy ──────────────────────────────────────────────────────────────
    const existentes = await getTransacciones()
    const confirmacionesExistentes = new Set(existentes.map(t => t.descripcion).filter(Boolean))

    let desde = new Date()
    desde.setDate(desde.getDate() - 2)
    if (existentes.length > 0) {
      const fechas = existentes.map(t => t.fecha).filter(Boolean).sort()
      const ultima = new Date(fechas[fechas.length - 1])
      ultima.setDate(ultima.getDate() - 1)
      if (ultima > desde) desde = ultima
    }
    const desdeStr = desde.toISOString().slice(0, 10).replace(/-/g, '/')

    const yappyRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=from:notificaciones@yappy.com.pa%20after:${desdeStr}&maxResults=50`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    const { messages: yappyMsgs = [] } = await yappyRes.json()

    const nuevasYappy: Omit<YappyTransaccion, 'id'>[] = []
    for (const msg of yappyMsgs) {
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
      nuevasYappy.push(tx)
    }
    for (const tx of nuevasYappy) await crearTransaccion(tx)

    // ── Sync Tigo ───────────────────────────────────────────────────────────────
    const tigoRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=from:facturacion@tigo.com.pa&maxResults=5`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    const { messages: tigoMsgs = [] } = await tigoRes.json()

    let nuevasTigo = 0
    for (const msg of tigoMsgs) {
      // Verificar si ya existe esta factura por emailId
      const existing = await getUltimaFactura('Tigo')
      if (existing?.emailId === msg.id) continue

      const fullRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )
      const fullData = await fullRes.json()
      const body = extractBody(fullData.payload)

      const parsed = parsearTigo(body, msg.id)
      if (!parsed) continue

      // Solo guardar si es una factura nueva (diferente vencimiento)
      if (existing?.vencimiento === parsed.vencimiento) continue

      await crearFactura({
        servicio: 'Tigo',
        monto: parsed.monto,
        vencimiento: parsed.vencimiento,
        mes: parsed.mes,
        estado: 'Pendiente',
        emailId: msg.id,
      })
      nuevasTigo++
      break // Solo la más reciente
    }

    return NextResponse.json({
      ok: true,
      nuevas_yappy: nuevasYappy.length,
      nuevas_tigo: nuevasTigo,
      revisadas: yappyMsgs.length,
    })
  } catch (error: any) {
    console.error('Error en sync:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

import * as fs from 'fs'
import * as path from 'path'
import { list } from '@vercel/blob'
import type { Movimiento, Categoria, ResumenMensual } from '@/types/movimientos'

const DOWNLOADS_DIR = 'D:/core/Downloads'
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

// ── Categorización por keywords ───────────────────────────────────────────────

const CATEGORY_RULES: { words: string[]; cat: Categoria }[] = [
  {
    words: ['SUPER 99', 'REY VIA', 'REY ', 'EL MACHETAZO', 'EL COSTO', 'SUPER XTRA',
            'MINI CENTRO', 'MINIMARKET', 'PRETELT GOURMET', 'COOPERATIVA JUAN',
            'XTRA TRANSISMICA'],
    cat: 'Supermercado',
  },
  {
    // Restaurantes, bares, salidas sociales
    words: ['THAT 70S SHOW', 'ANNISA', 'ORIGINAL ROCK', 'PER TUTTI',
            'NACIONSUSHI', 'NACION SUSHI', 'SUSHI', 'RESTAUR', 'GRILL',
            'BRAVO', 'PRETELT GOURMET'],
    cat: 'Salidas',
  },
  {
    // Comida rápida, calle, delivery, fast food
    words: ['SUBWAY', 'ROSTY POLLO', 'POLLO', 'LENA', 'PIZZA', 'PEDIDOSYA',
            'FONDA', 'YOGEN FRUZ', 'AM PM', 'PANADERIA', 'COCINA',
            'MC DONALDS', 'MCDONALDS', 'BURGER KING', 'KFC',
            'DAIRY QUEEN', 'DOMINO', 'WENDY', 'BURGER'],
    cat: 'Comida',
  },
  {
    words: ['COFFEE', 'ROAST', 'NICOLINA', 'DURAN COFFEE', 'CAFE', 'CAFFÉ', 'CAFETERIA'],
    cat: 'Café',
  },
  {
    words: ['TEXACO', 'TERPEL', 'SERVITIGER', 'SRVICNT', 'ESTACION',
            'GASOLINERA', 'COMBUSTIBLE', '99943360'],
    cat: 'Gasolina',
  },
  {
    words: ['NETFLIX', 'YOUTUBE', 'PLAYSTATION', 'GOOGLE', 'SPOTIFY',
            'AMAZON', 'APPLE', 'DISNEY', 'HBO', 'PRIME', 'APC BUR'],
    cat: 'Suscripciones',
  },
  {
    words: ['FARMACIA', 'PHARMACY', 'FARMA'],
    cat: 'Farmacia',
  },
  {
    words: ['U.TECNOLOGICA', 'UTEC', 'UNIVERSIDAD', 'COLEGIO', 'INSTITUTO',
            'MAESTRIA', 'ESCUELA'],
    cat: 'Educación',
  },
  {
    words: ['AUTO REPUESTO', 'AUTOREPUESTO', 'REPUESTO', 'LUBRICANTE',
            'TALLER', 'MECANICA', 'LLANTA', 'FRENO'],
    cat: 'Auto',
  },
  {
    words: ['ENTRETENIMIENTO', 'CINE', 'TEATRO', 'MUSEO', 'PARQUE'],
    cat: 'Entretenimiento',
  },
]

function categorize(desc: string): Categoria {
  const upper = desc.toUpperCase()

  if (upper.includes('BANCA MOVIL TRANSFERENCIA DE')) return 'Transferencia Recibida'
  if (upper.includes('BANCA MOVIL TRANSFERENCIA A')) return 'Transferencia Enviada'
  if (upper.includes('INTERES CUENTA')) return 'Interés'
  if (/SEGURO DE FRAUDE|COBRO DE MEMBRESIA|ITBMS|IMPUESTO SEGURO/.test(upper)) return 'Banco'

  for (const rule of CATEGORY_RULES) {
    if (rule.words.some(w => upper.includes(w))) return rule.cat
  }

  return 'Otro'
}

function extractMerchant(desc: string): string {
  // Elimina el sufijo de tarjeta: -4187-94XX-XXXX-9011
  const match = desc.match(/^(.*?)-?4187/i)
  if (match) return match[1].replace(/-+$/, '').trim()
  return desc.trim()
}

function parseDate(raw: string): string {
  // DD/MM/YYYY → YYYY-MM-DD
  const [d, m, y] = raw.trim().split('/')
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
}

// ── Parser principal ──────────────────────────────────────────────────────────

function loadOverrides(): Record<string, string> {
  try {
    const p = path.join(process.cwd(), 'data', 'overrides.json')
    if (!fs.existsSync(p)) return {}
    return JSON.parse(fs.readFileSync(p, 'utf-8')).categorias ?? {}
  } catch {
    return {}
  }
}

export function parseMovimientos(content: string): Movimiento[] {
  const lines = content
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean)

  const overrides = loadOverrides()
  const result: Movimiento[] = []

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(';')
    if (parts.length < 6) continue

    const fechaRaw    = parts[0].trim()
    const ref         = parts[1].trim()
    const desc        = parts[2].trim()
    const cargosRaw   = parts[3].trim()
    const pagosRaw    = parts[4].trim()
    const saldoRaw    = parts[5].trim()

    const cargos = parseFloat(cargosRaw || '0') || 0   // negativo = débito
    const pagos  = parseFloat(pagosRaw  || '0') || 0   // positivo = crédito
    const saldo  = parseFloat(saldoRaw  || '0') || 0

    const esGasto  = cargos < 0
    const monto    = esGasto ? Math.abs(cargos) : pagos
    const esTarjeta = ref === '46'
    let categoria = categorize(desc)

    let descripcion: string
    if (categoria === 'Transferencia Recibida' || categoria === 'Transferencia Enviada') {
      descripcion = categoria === 'Transferencia Recibida'
        ? 'Transferencia recibida'
        : 'Transferencia enviada'
    } else if (categoria === 'Interés') {
      descripcion = 'Interés cuenta de ahorros'
    } else if (esTarjeta) {
      descripcion = extractMerchant(desc)
    } else {
      descripcion = desc
    }

    // Aplicar override manual si existe
    if (overrides[descripcion]) {
      categoria = overrides[descripcion] as Categoria
    }

    result.push({
      fecha: parseDate(fechaRaw),
      descripcion,
      monto,
      esGasto,
      categoria,
      saldo,
      esTarjeta,
    })
  }

  return result
}

// ── Resumen por mes ───────────────────────────────────────────────────────────

export function buildResumenPorMes(movimientos: Movimiento[]): ResumenMensual[] {
  const map = new Map<string, { gastosTarjeta: number; transferenciasEnviadas: number; ingresos: number }>()

  for (const m of movimientos) {
    const mes = m.fecha.slice(0, 7)
    if (!map.has(mes)) map.set(mes, { gastosTarjeta: 0, transferenciasEnviadas: 0, ingresos: 0 })
    const r = map.get(mes)!

    if (m.categoria === 'Transferencia Recibida' || m.categoria === 'Interés') {
      r.ingresos += m.monto
    } else if (m.categoria === 'Transferencia Enviada') {
      r.transferenciasEnviadas += m.monto
    } else if (m.esTarjeta && m.esGasto) {
      r.gastosTarjeta += m.monto
    }
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, data]) => {
      const [y, mo] = mes.split('-')
      return {
        mes,
        label: `${MESES[parseInt(mo) - 1]} ${y}`,
        ...data,
      }
    })
}

// ── Lectura del archivo ───────────────────────────────────────────────────────

// Intenta leer desde Vercel Blob; si no hay token o no hay archivos, cae al filesystem local.
export async function getLatestMovimientosFile(): Promise<{ content: string; archivoFecha: string } | null> {
  // ── Vercel Blob ──
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { blobs } = await list({ prefix: 'movimientos/' })
      const sorted = blobs
        .filter(b => b.pathname.endsWith('.txt'))
        .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())

      if (sorted.length > 0) {
        const blob = sorted[0]
        const res = await fetch(blob.url)
        const content = await res.text()
        const dateMatch = blob.pathname.match(/(\d{4}-\d{2}-\d{2})\.txt$/)
        const archivoFecha = dateMatch ? dateMatch[1] : blob.uploadedAt.toISOString().slice(0, 10)
        return { content, archivoFecha }
      }
    } catch {
      // si falla Blob, cae al filesystem
    }
  }

  // ── Filesystem local (dev) ──
  if (!fs.existsSync(DOWNLOADS_DIR)) return null

  const files = fs
    .readdirSync(DOWNLOADS_DIR)
    .filter(f => f.startsWith('ULTIMOS-MOVIMIENTOS-CUENTA-DE-AHORROS-') && f.endsWith('.txt'))
    .sort()
    .reverse()

  if (files.length === 0) return null

  const latest = files[0]
  const dateMatch = latest.match(/(\d{4}-\d{2}-\d{2})\.txt$/)
  const archivoFecha = dateMatch ? dateMatch[1] : 'desconocida'

  const content = fs.readFileSync(path.join(DOWNLOADS_DIR, latest), 'utf-8')
  return { content, archivoFecha }
}

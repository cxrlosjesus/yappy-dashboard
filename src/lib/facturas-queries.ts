import { notion } from './notion'
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints'

const DB_ID = process.env.NOTION_FACTURAS_DB_ID!

export interface Factura {
  id: string
  servicio: string
  monto: number
  vencimiento: string
  mes: string
  estado: 'Pendiente' | 'Pagado'
  emailId: string
}

function pageToFactura(page: PageObjectResponse): Factura {
  const props = page.properties as any
  return {
    id: page.id,
    servicio: props['Servicio']?.title?.[0]?.plain_text ?? '',
    monto: props['Monto']?.number ?? 0,
    vencimiento: props['Vencimiento']?.date?.start ?? '',
    mes: props['Mes']?.rich_text?.[0]?.plain_text ?? '',
    estado: props['Estado']?.select?.name ?? 'Pendiente',
    emailId: props['Email ID']?.rich_text?.[0]?.plain_text ?? '',
  }
}

export async function getFacturas(): Promise<Factura[]> {
  const res = await notion.databases.query({
    database_id: DB_ID,
    sorts: [{ property: 'Vencimiento', direction: 'descending' }],
    page_size: 20,
  })
  return res.results
    .filter((p): p is PageObjectResponse => p.object === 'page')
    .map(pageToFactura)
}

export async function getUltimaFactura(servicio: string): Promise<Factura | null> {
  const res = await notion.databases.query({
    database_id: DB_ID,
    filter: { property: 'Servicio', title: { equals: servicio } },
    sorts: [{ property: 'Vencimiento', direction: 'descending' }],
    page_size: 1,
  })
  const pages = res.results.filter((p): p is PageObjectResponse => p.object === 'page')
  return pages.length > 0 ? pageToFactura(pages[0]) : null
}

export async function crearFactura(data: Omit<Factura, 'id'>): Promise<void> {
  await notion.pages.create({
    parent: { database_id: DB_ID },
    properties: {
      Servicio:     { title: [{ text: { content: data.servicio } }] },
      Monto:        { number: data.monto },
      Vencimiento:  { date: { start: data.vencimiento } },
      Mes:          { rich_text: [{ text: { content: data.mes } }] },
      Estado:       { select: { name: data.estado } },
      'Email ID':   { rich_text: [{ text: { content: data.emailId } }] },
    },
  })
}

import { notion, DATABASE_ID } from './notion'
import type { YappyTransaccion, YappyResumen, CategoriaTransaccion } from '@/types/yappy'
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints'

function pageToTransaccion(page: PageObjectResponse): YappyTransaccion {
  const props = page.properties as any
  return {
    id: page.id,
    descripcion: props['Descripción']?.title?.[0]?.plain_text ?? '',
    tipo: props['Tipo']?.select?.name ?? 'Enviado',
    monto: props['Monto']?.number ?? 0,
    fecha: props['Fecha']?.date?.start ?? '',
    de_para: props['De / Para']?.rich_text?.[0]?.plain_text ?? '',
    asunto_email: props['Asunto Email']?.rich_text?.[0]?.plain_text ?? '',
    estado: props['Estado']?.select?.name ?? 'Completado',
    notas: props['Notas']?.rich_text?.[0]?.plain_text ?? '',
    categoria: (props['Categoria']?.select?.name ?? 'Personal') as CategoriaTransaccion,
  }
}

// ✅ Trae TODAS las transacciones paginando (Notion devuelve max 100 por llamada)
export async function getTransacciones(): Promise<YappyTransaccion[]> {
  const results: PageObjectResponse[] = []
  let cursor: string | undefined = undefined

  do {
    const response = await notion.databases.query({
      database_id: DATABASE_ID,
      sorts: [{ property: 'Fecha', direction: 'descending' }],
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    })

    results.push(
      ...response.results.filter((p): p is PageObjectResponse => p.object === 'page')
    )

    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined
  } while (cursor)

  return results.map(pageToTransaccion)
}

export async function getResumen(): Promise<YappyResumen> {
  const transacciones = await getTransacciones()

  const recibidos = transacciones.filter(t => t.tipo === 'Recibido')
  const enviados  = transacciones.filter(t => t.tipo === 'Enviado')
  const pagos     = transacciones.filter(t => t.tipo === 'Pago')

  const sum = (arr: YappyTransaccion[]) =>
    arr.reduce((acc, t) => acc + t.monto, 0)

  return {
    totalRecibido: recibidos.length,
    totalEnviado:  enviados.length,
    totalPagos:    pagos.length,
    montoRecibido: sum(recibidos),
    montoEnviado:  sum(enviados),
    montoPagos:    sum(pagos),
    transacciones,
  }
}

export async function actualizarCategoria(
  id: string,
  categoria: CategoriaTransaccion
): Promise<void> {
  await notion.pages.update({
    page_id: id,
    properties: {
      Categoria: { select: { name: categoria } },
    },
  })
}

export async function crearTransaccion(
  data: Omit<YappyTransaccion, 'id'>
): Promise<void> {
  await notion.pages.create({
    parent: { database_id: DATABASE_ID },
    properties: {
      Descripción:    { title: [{ text: { content: data.descripcion } }] },
      Tipo:           { select: { name: data.tipo } },
      Monto:          { number: data.monto },
      Fecha:          { date: { start: data.fecha } },
      'De / Para':    { rich_text: [{ text: { content: data.de_para } }] },
      'Asunto Email': { rich_text: [{ text: { content: data.asunto_email } }] },
      Estado:         { select: { name: data.estado } },
      Notas:          { rich_text: [{ text: { content: data.notas ?? '' } }] },
    },
  })
}
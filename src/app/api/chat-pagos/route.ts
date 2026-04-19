import Groq from 'groq-sdk'
import type { PagoFijo } from '@/types/pagos-fijos'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

interface ChatRequest {
  message: string
  pagos: PagoFijo[]
  quincenaLabel: string
  totalQuincena: number
  checkedIds: string[]
}

function buildSystemPrompt(pagos: PagoFijo[], quincenaLabel: string, totalQuincena: number, checkedIds: string[]): string {
  const pagados = pagos.filter(p => checkedIds.includes(p.id))
  const pendientes = pagos.filter(p => !checkedIds.includes(p.id))

  const totalPagado = pagados.reduce((s, p) => s + p.monto, 0)
  const totalPendiente = pendientes.reduce((s, p) => s + p.monto, 0)

  const formatPago = (p: PagoFijo) => `  - ${p.nombre}: $${p.monto.toFixed(2)} (${p.categoria})`

  const INGRESO = 859.99
  const disponible = INGRESO - totalQuincena

  return `Eres un asesor financiero personal amigable y directo. Conoces perfectamente las finanzas del usuario.

## Contexto de la quincena actual (${quincenaLabel})

**Ingreso quincenal:** $${INGRESO.toFixed(2)}
**Total pagos fijos:** $${totalQuincena.toFixed(2)}
**Disponible después de pagos fijos:** $${disponible.toFixed(2)}
**Ya pagado:** $${totalPagado.toFixed(2)}
**Pendiente:** $${totalPendiente.toFixed(2)}

### Pagos ya completados:
${pagados.length > 0 ? pagados.map(formatPago).join('\n') : '  (ninguno aún)'}

### Pagos pendientes:
${pendientes.length > 0 ? pendientes.map(formatPago).join('\n') : '  (todos pagados)'}

### Todos los pagos fijos del usuario por categoría:
- **Transferencias obligatorias:** Departamento $174.50, Maestría $80.00, Póliza $12.50
- **Ahorro:** Banco General $65.00, Banistmo $50.00, Ahorro extra $80.00
- **Gastos variables (presupuesto quincenal):** Súper $100.00, Gasolina $50.00, Comida trabajo $30.00
- **Suscripciones:** Claude $20.00 (día 6), Netflix $13.99 (día 10), PlayStation $7.99 (día 25), Google One $3.99 (día 17), Disney+ $3.99 (día 17)
- **Cargos bancarios:** Membresía $2.50, Seguro fraude $1.00, ITBMS $0.23

## Tu rol
- Cuando el usuario mencione un gasto adicional, analiza qué categorías puede recortar y en cuánto
- Da recomendaciones concretas con montos específicos, no consejos genéricos
- Si el gasto se repite varias quincenas, muestra el impacto acumulado
- Sugiere prioridades: primero proteger ahorro, luego ajustar variables
- Usa un tono conversacional, breve y directo — el usuario ya sabe de sus finanzas
- Responde siempre en español
- Usa formato markdown ligero (negritas, listas) pero sin exagerar`
}

export async function POST(req: Request) {
  const body: ChatRequest = await req.json()
  const { message, pagos, quincenaLabel, totalQuincena, checkedIds } = body

  if (!message?.trim()) {
    return new Response('Mensaje requerido', { status: 400 })
  }

  const systemPrompt = buildSystemPrompt(pagos, quincenaLabel, totalQuincena, checkedIds)

  try {
    const stream = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      stream: true,
      max_tokens: 1024,
    })

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content ?? ''
            if (text) controller.enqueue(new TextEncoder().encode(text))
          }
        } catch {
          controller.enqueue(new TextEncoder().encode('Error al leer la respuesta.'))
        } finally {
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  } catch (err: unknown) {
    const msg = (err as Error).message ?? ''
    console.error('[chat-pagos] Error:', msg)

    let mensaje = `Error: ${msg}`
    if (msg.includes('401') || msg.includes('invalid_api_key')) {
      mensaje = 'API key de Groq inválida. Verifica GROQ_API_KEY en .env.local.'
    } else if (msg.includes('429')) {
      mensaje = 'Límite de Groq alcanzado. Intenta en un momento.'
    }

    return new Response(mensaje, { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
  }
}

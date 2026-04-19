'use client'

import { useState, useRef, useEffect } from 'react'
import type { PagoFijo } from '@/types/pagos-fijos'

interface Mensaje {
  rol: 'user' | 'assistant'
  texto: string
}

const SUGERENCIAS = [
  'Tendré un gasto extra de $200 por 3 quincenas, ¿cómo lo manejo?',
  '¿Qué recorto si necesito ahorrar $100 más esta quincena?',
  '¿En qué categoría gasto más y cómo mejorar?',
  '¿Cuánto me sobra después de todos los pagos fijos?',
]

function MensajeBurbuja({ mensaje }: { mensaje: Mensaje }) {
  const esUser = mensaje.rol === 'user'
  return (
    <div style={{
      display: 'flex',
      justifyContent: esUser ? 'flex-end' : 'flex-start',
      marginBottom: 10,
    }}>
      {!esUser && (
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: '#1A1A2E', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, flexShrink: 0, marginRight: 8, marginTop: 2,
        }}>
          C
        </div>
      )}
      <div style={{
        maxWidth: '80%',
        background: esUser ? '#1A1A2E' : '#F5F5F7',
        color: esUser ? '#fff' : '#111',
        borderRadius: esUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        padding: '10px 13px',
        fontSize: 13.5,
        lineHeight: 1.5,
        whiteSpace: 'pre-wrap',
      }}>
        {mensaje.texto}
        {mensaje.texto === '' && (
          <span style={{ display: 'inline-block', width: 6, height: 14, background: '#999', borderRadius: 2, animation: 'blink 1s infinite' }} />
        )}
      </div>
    </div>
  )
}

interface Props {
  pagos: PagoFijo[]
  quincenaLabel: string
  totalQuincena: number
  checkedIds: string[]
}

export default function ChatPagos({ pagos, quincenaLabel, totalQuincena, checkedIds }: Props) {
  const [abierto, setAbierto] = useState(false)
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [input, setInput] = useState('')
  const [cargando, setCargando] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (abierto) endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes, abierto])

  useEffect(() => {
    if (abierto && mensajes.length === 0) {
      setMensajes([{
        rol: 'assistant',
        texto: `Hola! Conozco tus pagos fijos de la quincena del ${quincenaLabel}.\n\n¿En qué te puedo ayudar? Puedes preguntarme cómo manejar un gasto extra, qué recortar, o cómo optimizar tus finanzas.`,
      }])
    }
  }, [abierto, mensajes.length, quincenaLabel])

  async function enviar(texto: string) {
    if (!texto.trim() || cargando) return

    const userMsg: Mensaje = { rol: 'user', texto: texto.trim() }
    const assistantMsg: Mensaje = { rol: 'assistant', texto: '' }

    setMensajes(prev => [...prev, userMsg, assistantMsg])
    setInput('')
    setCargando(true)

    try {
      const res = await fetch('/api/chat-pagos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: texto.trim(),
          pagos,
          quincenaLabel,
          totalQuincena,
          checkedIds,
        }),
      })

      if (!res.ok || !res.body) throw new Error('Error en respuesta')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        setMensajes(prev => {
          const next = [...prev]
          next[next.length - 1] = { rol: 'assistant', texto: next[next.length - 1].texto + chunk }
          return next
        })
      }
    } catch {
      setMensajes(prev => {
        const next = [...prev]
        next[next.length - 1] = { rol: 'assistant', texto: 'Ocurrió un error. Verifica que ANTHROPIC_API_KEY esté configurada.' }
        return next
      })
    } finally {
      setCargando(false)
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      enviar(input)
    }
  }

  return (
    <>
      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes slideUp { from{transform:translateY(20px);opacity:0} to{transform:translateY(0);opacity:1} }
      `}</style>

      {/* Botón flotante */}
      {!abierto && (
        <button
          onClick={() => setAbierto(true)}
          style={{
            position: 'fixed', bottom: 24, right: 20,
            width: 52, height: 52, borderRadius: '50%',
            background: '#1A1A2E', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
            zIndex: 100,
          }}
          title="Consultar con Claude"
        >
          💬
        </button>
      )}

      {/* Panel de chat */}
      {abierto && (
        <div style={{
          position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: 480,
          height: '70vh', maxHeight: 560,
          background: '#fff', borderRadius: '20px 20px 0 0',
          boxShadow: '0 -4px 30px rgba(0,0,0,0.15)',
          display: 'flex', flexDirection: 'column',
          zIndex: 200, animation: 'slideUp 0.25s ease',
        }}>
          {/* Header */}
          <div style={{
            padding: '14px 16px', borderBottom: '0.5px solid #f0f0f0',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', background: '#1A1A2E',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 14, fontWeight: 700,
              }}>C</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>Asesor financiero</div>
                <div style={{ fontSize: 11, color: '#1D9E75', fontWeight: 600 }}>● Claude · Quincena {quincenaLabel}</div>
              </div>
            </div>
            <button
              onClick={() => setAbierto(false)}
              style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#999', padding: 4 }}
            >✕</button>
          </div>

          {/* Mensajes */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
            {mensajes.map((m, i) => <MensajeBurbuja key={i} mensaje={m} />)}
            <div ref={endRef} />
          </div>

          {/* Sugerencias rápidas (solo al inicio) */}
          {mensajes.length <= 1 && (
            <div style={{ padding: '0 14px 8px', display: 'flex', gap: 6, overflowX: 'auto', flexShrink: 0 }}>
              {SUGERENCIAS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => enviar(s)}
                  style={{
                    background: '#F5F5F7', border: 'none', borderRadius: 20,
                    padding: '7px 12px', fontSize: 11.5, color: '#333',
                    cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{
            padding: '10px 14px 16px', borderTop: '0.5px solid #f0f0f0',
            display: 'flex', gap: 8, alignItems: 'flex-end', flexShrink: 0,
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Escribe tu consulta..."
              disabled={cargando}
              rows={1}
              style={{
                flex: 1, border: '1.5px solid #E8E8E8', borderRadius: 12,
                padding: '9px 12px', fontSize: 13.5, resize: 'none',
                outline: 'none', fontFamily: 'inherit', lineHeight: 1.4,
                background: cargando ? '#fafafa' : '#fff',
              }}
            />
            <button
              onClick={() => enviar(input)}
              disabled={cargando || !input.trim()}
              style={{
                width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                background: input.trim() && !cargando ? '#1A1A2E' : '#E8E8E8',
                border: 'none', cursor: input.trim() && !cargando ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, transition: 'background 0.2s',
              }}
            >
              {cargando ? '⏳' : '↑'}
            </button>
          </div>
        </div>
      )}

      {/* Overlay */}
      {abierto && (
        <div
          onClick={() => setAbierto(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)',
            zIndex: 150,
          }}
        />
      )}
    </>
  )
}

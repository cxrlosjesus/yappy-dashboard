'use client'

import Link from 'next/link'
import { useState, useRef } from 'react'

export default function UploadClient({
  archivoActual,
}: {
  archivoActual: { nombre: string; fecha: string } | null
}) {
  const [estado, setEstado] = useState<'idle' | 'uploading' | 'ok' | 'error'>('idle')
  const [mensaje, setMensaje] = useState('')
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function upload(file: File) {
    if (!file.name.endsWith('.txt')) {
      setEstado('error')
      setMensaje('Solo se aceptan archivos .txt del banco')
      return
    }
    setEstado('uploading')
    setMensaje('')
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await fetch('/api/upload-movimientos', { method: 'POST', body: form })
      const data = await res.json()
      if (data.ok) {
        setEstado('ok')
        setMensaje(`Archivo subido correctamente · ${data.fecha}`)
      } else {
        setEstado('error')
        setMensaje(data.error ?? 'Error al subir')
      }
    } catch {
      setEstado('error')
      setMensaje('Error de red')
    }
  }

  function handleFiles(files: FileList | null) {
    if (files && files[0]) upload(files[0])
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ background: '#111827', color: '#fff', padding: '48px 20px 28px', borderRadius: '0 0 24px 24px' }}>
        <Link href="/dashboard" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, textDecoration: 'none' }}>
          ← Dashboard
        </Link>
        <div style={{ fontSize: 24, fontWeight: 700, marginTop: 8 }}>Subir movimientos</div>
        <div style={{ fontSize: 13, opacity: 0.6, marginTop: 2 }}>
          Archivo TXT del banco · Cuenta de ahorros
        </div>
      </div>

      <div style={{ padding: '20px 16px' }}>

        {/* Archivo actual */}
        <div style={{ background: '#fff', borderRadius: 16, padding: '16px', marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#aaa', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 }}>
            Archivo en la nube
          </div>
          {archivoActual ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>📄</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{archivoActual.nombre}</div>
                <div style={{ fontSize: 11, color: '#aaa', marginTop: 1 }}>Subido el {archivoActual.fecha}</div>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: '#aaa' }}>Ningún archivo subido todavía</div>
          )}
        </div>

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
          onClick={() => inputRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? '#0057FF' : '#DDD'}`,
            borderRadius: 16, padding: '36px 20px',
            textAlign: 'center', cursor: 'pointer',
            background: dragging ? '#F0F4FF' : '#FAFAFA',
            transition: 'all 0.15s',
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 10 }}>
            {estado === 'uploading' ? '⏳' : estado === 'ok' ? '✅' : '📂'}
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#333' }}>
            {estado === 'uploading' ? 'Subiendo…' : 'Toca para seleccionar el archivo'}
          </div>
          <div style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>
            ULTIMOS-MOVIMIENTOS-CUENTA-DE-AHORROS-YYYY-MM-DD.txt
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".txt"
            style={{ display: 'none' }}
            onChange={e => handleFiles(e.target.files)}
          />
        </div>

        {/* Mensaje de estado */}
        {mensaje && (
          <div style={{
            marginTop: 12, padding: '13px 16px', borderRadius: 12,
            background: estado === 'ok' ? '#E1F5EE' : '#FEE8E8',
            color: estado === 'ok' ? '#0F6E56' : '#C62828',
            fontSize: 13, fontWeight: 600,
          }}>
            {mensaje}
          </div>
        )}

        {/* Links rápidos tras subir */}
        {estado === 'ok' && (
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Link href="/movimientos" style={{ textDecoration: 'none' }}>
              <div style={{ background: '#0057FF', color: '#fff', borderRadius: 14, padding: '14px 18px', fontSize: 14, fontWeight: 700, textAlign: 'center' }}>
                Ver resumen →
              </div>
            </Link>
            <Link href="/analisis" style={{ textDecoration: 'none' }}>
              <div style={{ background: '#F0F2F5', color: '#333', borderRadius: 14, padding: '14px 18px', fontSize: 14, fontWeight: 600, textAlign: 'center' }}>
                Ver análisis completo →
              </div>
            </Link>
          </div>
        )}

        {/* Instrucciones */}
        <div style={{ marginTop: 20, background: '#fff', borderRadius: 16, padding: '16px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#aaa', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 }}>
            Cómo obtener el archivo
          </div>
          {[
            'Entra a la banca en línea del banco',
            'Ve a Cuenta de Ahorros → Movimientos',
            'Exporta como TXT (últimos movimientos)',
            'Sube el archivo aquí',
          ].map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'flex-start' }}>
              <span style={{
                width: 20, height: 20, borderRadius: '50%', background: '#F0F2F5',
                color: '#555', fontSize: 11, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                {i + 1}
              </span>
              <span style={{ fontSize: 13, color: '#555', lineHeight: 1.4 }}>{step}</span>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}

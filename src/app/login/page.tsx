'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    if (res.ok) {
      router.replace('/dashboard')
    } else {
      setError('Contraseña incorrecta')
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#f5f5f5', padding: 20,
    }}>
      <div style={{ width: '100%', maxWidth: 360 }}>

        {/* Logo / Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, background: '#0057FF',
            margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 26 }}>💰</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#111' }}>Yappy Dashboard</div>
          <div style={{ fontSize: 14, color: '#aaa', marginTop: 4 }}>Panel personal · Carlos</div>
        </div>

        {/* Card */}
        <div style={{ background: '#fff', borderRadius: 20, padding: '28px 24px', boxShadow: '0 2px 20px rgba(0,0,0,0.06)' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 8 }}>
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoFocus
                required
                style={{
                  width: '100%', padding: '13px 14px', borderRadius: 12,
                  border: error ? '1.5px solid #E53935' : '1.5px solid #E8E8E8',
                  fontSize: 16, outline: 'none', boxSizing: 'border-box',
                  background: '#FAFAFA', color: '#111',
                }}
              />
              {error && (
                <div style={{ fontSize: 12, color: '#E53935', marginTop: 6 }}>{error}</div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !password}
              style={{
                width: '100%', padding: '14px', borderRadius: 12, border: 'none',
                background: loading || !password ? '#B0C4FF' : '#0057FF',
                color: '#fff', fontSize: 15, fontWeight: 700,
                cursor: loading || !password ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        </div>

      </div>
    </div>
  )
}

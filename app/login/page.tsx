'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Login() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    if (res.ok) {
      router.replace('/')
    } else {
      setError('Contraseña incorrecta')
      setLoading(false)
    }
  }

  return (
    <main style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f2f2f0',
      fontFamily: "'Segoe UI', Arial, sans-serif",
    }}>
      <form onSubmit={handleSubmit} style={{
        background: '#fff',
        padding: '40px 48px',
        borderRadius: 12,
        boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        minWidth: 300,
      }}>
        <div style={{ fontWeight: 700, fontSize: 20, color: '#222', marginBottom: 4 }}>
          CuboDemo
        </div>
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={e => setPassword(e.target.value)}
          autoFocus
          style={{
            padding: '10px 14px',
            border: '1px solid #ddd',
            borderRadius: 8,
            fontSize: 15,
            outline: 'none',
          }}
        />
        {error && (
          <div style={{ color: '#e74c3c', fontSize: 13 }}>{error}</div>
        )}
        <button
          type="submit"
          disabled={loading || !password}
          style={{
            padding: '10px 0',
            background: '#333',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 15,
            fontWeight: 600,
            cursor: loading || !password ? 'not-allowed' : 'pointer',
            opacity: loading || !password ? 0.6 : 1,
          }}
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </main>
  )
}

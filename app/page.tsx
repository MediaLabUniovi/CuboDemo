'use client'

import { useEffect, useRef, useState } from 'react'

const POLL_INTERVAL = 800
const BLOCKED_KEY = 'cubodemo_blocked_macs'

interface HistoryEntry {
  image: string
  mac: string
  time: Date
}

function formatTime(d: Date) {
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function emotionLabel(image: string) {
  return image.replace(/\.[^.]+$/, '').toUpperCase()
}

function loadBlocked(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(BLOCKED_KEY)
    return raw ? new Set(JSON.parse(raw)) : new Set()
  } catch {
    return new Set()
  }
}

function saveBlocked(blocked: Set<string>) {
  localStorage.setItem(BLOCKED_KEY, JSON.stringify([...blocked]))
}

export default function Home() {
  const [currentImage, setCurrentImage] = useState('e0.png')
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [seenMacs, setSeenMacs] = useState<string[]>([])
  const [blocked, setBlocked] = useState<Set<string>>(new Set())
  const [macPanelOpen, setMacPanelOpen] = useState(false)

  const lastImageRef = useRef('')
  const blockedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const b = loadBlocked()
    setBlocked(b)
    blockedRef.current = b
  }, [])

  useEffect(() => {
    async function poll() {
      try {
        const res = await fetch('/api/state', { cache: 'no-store' })
        if (!res.ok) return
        const data: { image: string; mac: string; macs: string[] } = await res.json()

        // Actualizar lista de MACs conocidas
        if (data.macs?.length) {
          setSeenMacs(prev => {
            const next = [...prev]
            data.macs.forEach(m => { if (!next.includes(m)) next.push(m) })
            return next
          })
        }

        if (data.image !== lastImageRef.current) {
          const mac = data.mac || ''
          const isBlocked = mac ? blockedRef.current.has(mac) : false

          if (!isBlocked) {
            if (lastImageRef.current) {
              setHistory(prev =>
                [{ image: lastImageRef.current, mac, time: new Date() }, ...prev].slice(0, 50)
              )
            }
            lastImageRef.current = data.image
            setCurrentImage(data.image)
          }
        }
      } catch { /* red caída */ }
    }

    poll()
    const id = setInterval(poll, POLL_INTERVAL)
    return () => clearInterval(id)
  }, [])

  function toggleBlocked(mac: string) {
    setBlocked(prev => {
      const next = new Set(prev)
      if (next.has(mac)) next.delete(mac); else next.add(mac)
      saveBlocked(next)
      blockedRef.current = next
      return next
    })
  }

  return (
    <main style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      background: '#f2f2f0',
      fontFamily: "'Segoe UI', Arial, sans-serif",
      overflow: 'hidden',
      position: 'relative',
    }}>

      {/* Botón hamburguesa */}
      <button
        onClick={() => setMacPanelOpen(o => !o)}
        title="Filtrar MACs"
        style={{
          position: 'fixed',
          top: 16,
          right: 16,
          zIndex: 200,
          width: 40,
          height: 40,
          border: 'none',
          borderRadius: 8,
          background: macPanelOpen ? '#333' : '#fff',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 5,
          padding: 0,
        }}
      >
        {[0, 1, 2].map(i => (
          <span key={i} style={{
            display: 'block',
            width: 18,
            height: 2,
            borderRadius: 2,
            background: macPanelOpen ? '#fff' : '#333',
          }} />
        ))}
      </button>

      {/* Panel izquierdo: imagen actual — 2/3 */}
      <section style={{
        flex: '0 0 66.666%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
      }}>
        <img
          key={currentImage}
          src={`/${currentImage}`}
          alt={emotionLabel(currentImage)}
          style={{
            maxWidth: '70%',
            maxHeight: '70%',
            objectFit: 'contain',
          }}
        />
        <span style={{ color: '#888', fontSize: 13, letterSpacing: 1 }}>
          {emotionLabel(currentImage)}
        </span>
      </section>

      {/* Separador */}
      <div style={{ width: 1, background: '#d8d8d4', flexShrink: 0 }} />

      {/* Panel derecho: historial — 1/3 */}
      <section style={{
        flex: '0 0 33.333%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '20px 20px 12px',
          borderBottom: '1px solid #d8d8d4',
          fontWeight: 600,
          fontSize: 14,
          color: '#555',
          letterSpacing: 0.5,
        }}>
          HISTORIAL
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {history.length === 0 && (
            <p style={{ color: '#aaa', fontSize: 13, padding: '20px', margin: 0 }}>
              Sin cambios aún...
            </p>
          )}
          {history.map((entry, i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '10px 20px',
              borderBottom: '1px solid #e8e8e4',
              background: i === 0 ? '#ebebea' : 'transparent',
            }}>
              <img
                src={`/${entry.image}`}
                alt={emotionLabel(entry.image)}
                style={{ width: 40, height: 40, objectFit: 'contain', flexShrink: 0 }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#333' }}>
                  {emotionLabel(entry.image)}
                </div>
                {entry.mac && (
                  <div style={{ fontSize: 11, color: '#aaa', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {entry.mac}
                  </div>
                )}
                <div style={{ fontSize: 11, color: '#999', marginTop: 1 }}>
                  {formatTime(entry.time)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Overlay oscuro */}
      {macPanelOpen && (
        <div
          onClick={() => setMacPanelOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.25)',
          }}
        />
      )}

      {/* Panel MACs (slide-in desde la derecha) */}
      <aside style={{
        position: 'fixed',
        top: 0,
        right: macPanelOpen ? 0 : '-360px',
        width: 340,
        height: '100vh',
        background: '#fff',
        boxShadow: '-4px 0 20px rgba(0,0,0,0.15)',
        zIndex: 150,
        display: 'flex',
        flexDirection: 'column',
        transition: 'right 0.25s ease',
      }}>
        <div style={{
          padding: '20px 20px 14px',
          borderBottom: '1px solid #eee',
          fontWeight: 700,
          fontSize: 15,
          color: '#333',
        }}>
          Dispositivos (MACs)
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {seenMacs.length === 0 && (
            <p style={{ color: '#aaa', fontSize: 13, padding: '16px 20px', margin: 0 }}>
              Aún no se han recibido mensajes con MAC.
            </p>
          )}
          {seenMacs.map(mac => {
            const isBlocked = blocked.has(mac)
            return (
              <label
                key={mac}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 20px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #f0f0f0',
                  background: isBlocked ? '#fafafa' : '#fff',
                }}
              >
                <input
                  type="checkbox"
                  checked={!isBlocked}
                  onChange={() => toggleBlocked(mac)}
                  style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#4a90d9' }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13,
                    fontFamily: 'monospace',
                    color: isBlocked ? '#aaa' : '#222',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {mac}
                  </div>
                  <div style={{ fontSize: 11, color: isBlocked ? '#ccc' : '#4a90d9', marginTop: 2 }}>
                    {isBlocked ? 'Bloqueado' : 'Permitido'}
                  </div>
                </div>
              </label>
            )
          })}
        </div>
        <div style={{ padding: '12px 20px', borderTop: '1px solid #eee', fontSize: 11, color: '#aaa' }}>
          La selección se guarda en el navegador
        </div>
      </aside>
    </main>
  )
}

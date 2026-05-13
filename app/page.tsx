'use client'

import { useEffect, useRef, useState } from 'react'

const POLL_INTERVAL = 800
const STORAGE_KEY = 'cubodemo_mac_config'

interface HistoryEntry {
  image: string
  mac: string
  time: Date
}

interface MacConfig {
  defaultPolicy: 'allow' | 'deny'
  overrides: string[] // MACs that go against the default
  manualMacs: string[] // MACs añadidas manualmente
}

function formatTime(d: Date) {
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function emotionLabel(image: string) {
  return image.replace(/\.[^.]+$/, '').toUpperCase()
}

function loadConfig(): MacConfig {
  if (typeof window === 'undefined') return { defaultPolicy: 'allow', overrides: [], manualMacs: [] }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : { defaultPolicy: 'allow', overrides: [], manualMacs: [] }
  } catch {
    return { defaultPolicy: 'allow', overrides: [], manualMacs: [] }
  }
}

function saveConfig(config: MacConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}

function isAllowed(mac: string, policy: 'allow' | 'deny', overrides: Set<string>): boolean {
  const isOverride = overrides.has(mac)
  return policy === 'allow' ? !isOverride : isOverride
}

export default function Home() {
  const [currentImage, setCurrentImage] = useState('e0.png')
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [seenMacs, setSeenMacs] = useState<string[]>([])
  const [macPanelOpen, setMacPanelOpen] = useState(false)
  const [manualInput, setManualInput] = useState('')

  const [defaultPolicy, setDefaultPolicy] = useState<'allow' | 'deny'>('allow')
  const [overrides, setOverrides] = useState<Set<string>>(new Set())

  const lastImageRef = useRef('')
  const policyRef = useRef<'allow' | 'deny'>('allow')
  const overridesRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const cfg = loadConfig()
    setDefaultPolicy(cfg.defaultPolicy)
    const ov = new Set(cfg.overrides)
    setOverrides(ov)
    overridesRef.current = ov
    policyRef.current = cfg.defaultPolicy
    if (cfg.manualMacs.length) setSeenMacs(cfg.manualMacs)
  }, [])

  useEffect(() => {
    async function poll() {
      try {
        const res = await fetch('/api/state', { cache: 'no-store' })
        if (!res.ok) return
        const data: { image: string; mac: string; macs: string[] } = await res.json()

        if (data.macs?.length) {
          setSeenMacs(prev => {
            const next = [...prev]
            data.macs.forEach(m => { if (m && !next.includes(m)) next.push(m) })
            return next
          })
        }

        if (data.image !== lastImageRef.current) {
          const mac = data.mac || ''
          const allowed = mac ? isAllowed(mac, policyRef.current, overridesRef.current) : true

          if (allowed) {
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

  function updateConfig(newPolicy: 'allow' | 'deny', newOverrides: Set<string>, manualMacs: string[]) {
    policyRef.current = newPolicy
    overridesRef.current = newOverrides
    saveConfig({ defaultPolicy: newPolicy, overrides: Array.from(newOverrides), manualMacs })
  }

  function togglePolicy() {
    const next: 'allow' | 'deny' = defaultPolicy === 'allow' ? 'deny' : 'allow'
    const newOverrides = new Set<string>()
    setDefaultPolicy(next)
    setOverrides(newOverrides)
    updateConfig(next, newOverrides, seenMacs.filter(m => !m.startsWith('__')))
  }

  function toggleMac(mac: string) {
    setOverrides(prev => {
      const next = new Set(prev)
      if (next.has(mac)) next.delete(mac); else next.add(mac)
      overridesRef.current = next
      updateConfig(policyRef.current, next, seenMacs)
      return next
    })
  }

  function addManualMac() {
    const mac = manualInput.trim().toUpperCase()
    if (!mac || seenMacs.includes(mac)) { setManualInput(''); return }
    const next = [...seenMacs, mac]
    setSeenMacs(next)
    setManualInput('')
    updateConfig(policyRef.current, overridesRef.current, next)
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
          position: 'fixed', top: 16, right: 16, zIndex: 200,
          width: 40, height: 40, border: 'none', borderRadius: 8,
          background: macPanelOpen ? '#333' : '#fff',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          cursor: 'pointer',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 5, padding: 0,
        }}
      >
        {[0, 1, 2].map(i => (
          <span key={i} style={{
            display: 'block', width: 18, height: 2, borderRadius: 2,
            background: macPanelOpen ? '#fff' : '#333',
          }} />
        ))}
      </button>

      {/* Panel izquierdo: imagen actual — 2/3 */}
      <section style={{
        flex: '0 0 66.666%',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 16,
      }}>
        <img
          key={currentImage}
          src={`/${currentImage}`}
          alt={emotionLabel(currentImage)}
          style={{ maxWidth: '70%', maxHeight: '70%', objectFit: 'contain' }}
        />
        <span style={{ color: '#888', fontSize: 13, letterSpacing: 1 }}>
          {emotionLabel(currentImage)}
        </span>
      </section>

      {/* Separador */}
      <div style={{ width: 1, background: '#d8d8d4', flexShrink: 0 }} />

      {/* Panel derecho: historial — 1/3 */}
      <section style={{ flex: '0 0 33.333%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{
          padding: '20px 20px 12px', borderBottom: '1px solid #d8d8d4',
          fontWeight: 600, fontSize: 14, color: '#555', letterSpacing: 0.5,
        }}>
          HISTORIAL
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {history.length === 0 && (
            <p style={{ color: '#aaa', fontSize: 13, padding: '20px', margin: 0 }}>Sin cambios aún...</p>
          )}
          {history.map((entry, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '10px 20px', borderBottom: '1px solid #e8e8e4',
              background: i === 0 ? '#ebebea' : 'transparent',
            }}>
              <img src={`/${entry.image}`} alt={emotionLabel(entry.image)}
                style={{ width: 40, height: 40, objectFit: 'contain', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#333' }}>{emotionLabel(entry.image)}</div>
                {entry.mac && (
                  <div style={{ fontSize: 11, color: '#aaa', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {entry.mac}
                  </div>
                )}
                <div style={{ fontSize: 11, color: '#999', marginTop: 1 }}>{formatTime(entry.time)}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Overlay */}
      {macPanelOpen && (
        <div onClick={() => setMacPanelOpen(false)} style={{
          position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.25)',
        }} />
      )}

      {/* Panel MACs */}
      <aside style={{
        position: 'fixed', top: 0, right: macPanelOpen ? 0 : '-380px',
        width: 360, height: '100vh', background: '#fff',
        boxShadow: '-4px 0 20px rgba(0,0,0,0.15)',
        zIndex: 150, display: 'flex', flexDirection: 'column',
        transition: 'right 0.25s ease',
      }}>
        {/* Cabecera */}
        <div style={{ padding: '20px 20px 14px', borderBottom: '1px solid #eee', fontWeight: 700, fontSize: 15, color: '#333' }}>
          Dispositivos (MACs)
        </div>

        {/* Política por defecto */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #eee', background: '#fafafa' }}>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 8, fontWeight: 600, letterSpacing: 0.4 }}>
            POLÍTICA POR DEFECTO
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => defaultPolicy !== 'allow' && togglePolicy()}
              style={{
                flex: 1, padding: '8px 0', border: '1.5px solid',
                borderColor: defaultPolicy === 'allow' ? '#4a90d9' : '#ddd',
                borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                background: defaultPolicy === 'allow' ? '#e8f2fc' : '#fff',
                color: defaultPolicy === 'allow' ? '#2a70b9' : '#888',
              }}
            >
              Todos permitidos
            </button>
            <button
              onClick={() => defaultPolicy !== 'deny' && togglePolicy()}
              style={{
                flex: 1, padding: '8px 0', border: '1.5px solid',
                borderColor: defaultPolicy === 'deny' ? '#e74c3c' : '#ddd',
                borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                background: defaultPolicy === 'deny' ? '#fdecea' : '#fff',
                color: defaultPolicy === 'deny' ? '#c0392b' : '#888',
              }}
            >
              Todos denegados
            </button>
          </div>
        </div>

        {/* Añadir MAC manual */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid #eee' }}>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 8, fontWeight: 600, letterSpacing: 0.4 }}>
            AÑADIR MAC MANUAL
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              placeholder="AA:BB:CC:DD:EE:FF"
              value={manualInput}
              onChange={e => setManualInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addManualMac()}
              style={{
                flex: 1, padding: '8px 10px', border: '1px solid #ddd',
                borderRadius: 8, fontSize: 13, fontFamily: 'monospace', outline: 'none',
              }}
            />
            <button
              onClick={addManualMac}
              disabled={!manualInput.trim()}
              style={{
                padding: '8px 14px', background: '#333', color: '#fff',
                border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                opacity: manualInput.trim() ? 1 : 0.4,
              }}
            >
              Añadir
            </button>
          </div>
        </div>

        {/* Lista de MACs */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {seenMacs.length === 0 && (
            <p style={{ color: '#aaa', fontSize: 13, padding: '16px 20px', margin: 0 }}>
              Aún no se han recibido MACs.
            </p>
          )}
          {seenMacs.map(mac => {
            const allowed = isAllowed(mac, defaultPolicy, overrides)
            const isOverride = overrides.has(mac)
            return (
              <label key={mac} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 20px', cursor: 'pointer',
                borderBottom: '1px solid #f0f0f0',
                background: !allowed ? '#fafafa' : '#fff',
              }}>
                <input
                  type="checkbox"
                  checked={allowed}
                  onChange={() => toggleMac(mac)}
                  style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#4a90d9' }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, fontFamily: 'monospace',
                    color: allowed ? '#222' : '#aaa',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {mac}
                  </div>
                  <div style={{ fontSize: 11, marginTop: 2, color: allowed ? '#4a90d9' : '#e74c3c' }}>
                    {allowed ? 'Permitido' : 'Denegado'}
                    {isOverride && (
                      <span style={{ color: '#aaa', marginLeft: 6 }}>
                        (excepción)
                      </span>
                    )}
                  </div>
                </div>
              </label>
            )
          })}
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid #eee', fontSize: 11, color: '#aaa' }}>
          La configuración se guarda en el navegador
        </div>
      </aside>
    </main>
  )
}

interface State {
  image: string
  mac: string
}

// Fallback en memoria para desarrollo local
let memoryState: State = { image: 'e0.png', mac: '' }
const memoryMacs = new Set<string>()

export async function getState(): Promise<{ image: string; mac: string; macs: string[] }> {
  if (process.env.KV_REST_API_URL) {
    const { kv } = await import('@vercel/kv')
    const state = (await kv.get<State>('currentState')) ?? { image: 'e0.png', mac: '' }
    const macs = (await kv.smembers<string[]>('seenMacs')) ?? []
    return { ...state, macs }
  }
  return { ...memoryState, macs: [...memoryMacs] }
}

export async function setState(image: string, mac: string): Promise<void> {
  if (process.env.KV_REST_API_URL) {
    const { kv } = await import('@vercel/kv')
    await kv.set('currentState', { image, mac })
    if (mac) await kv.sadd('seenMacs', mac)
  } else {
    memoryState = { image, mac }
    if (mac) memoryMacs.add(mac)
  }
}

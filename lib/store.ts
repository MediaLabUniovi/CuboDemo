interface State {
  image: string
  mac: string
}

// Fallback en memoria para desarrollo local (sin Redis)
let memoryState: State = { image: 'e0.png', mac: '' }
const memoryMacs = new Set<string>()

function isRedisConfigured() {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
}

async function getRedis() {
  const { Redis } = await import('@upstash/redis')
  return new Redis({
    url: process.env.KV_REST_API_URL!,
    token: process.env.KV_REST_API_TOKEN!,
  })
}

export async function getState(): Promise<{ image: string; mac: string; macs: string[] }> {
  if (isRedisConfigured()) {
    const redis = await getRedis()
    const state = (await redis.get<State>('currentState')) ?? { image: 'e0.png', mac: '' }
    const macs = (await redis.smembers('seenMacs')) as string[]
    return { ...state, macs }
  }
  return { ...memoryState, macs: Array.from(memoryMacs) }
}

export async function setState(image: string, mac: string): Promise<void> {
  if (isRedisConfigured()) {
    const redis = await getRedis()
    await redis.set('currentState', { image, mac })
    if (mac) await redis.sadd('seenMacs', mac)
  } else {
    memoryState = { image, mac }
    if (mac) memoryMacs.add(mac)
  }
}

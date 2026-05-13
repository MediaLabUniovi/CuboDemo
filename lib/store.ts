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

export async function getState(): Promise<{ image: string; mac: string; macs: string[]; aliases: Record<string, string> }> {
  if (isRedisConfigured()) {
    const redis = await getRedis()
    const state = (await redis.get<State>('currentState')) ?? { image: 'e0.png', mac: '' }
    const macs = (await redis.smembers('seenMacs')) as string[]
    const aliases = (await redis.hgetall('macAliases') ?? {}) as Record<string, string>
    return { ...state, macs, aliases }
  }
  return { ...memoryState, macs: Array.from(memoryMacs), aliases: {} }
}

export async function setAlias(mac: string, alias: string): Promise<void> {
  if (isRedisConfigured()) {
    const redis = await getRedis()
    if (alias) await redis.hset('macAliases', { [mac]: alias })
    else await redis.hdel('macAliases', mac)
  }
}

export async function deleteMac(mac: string): Promise<void> {
  if (isRedisConfigured()) {
    const redis = await getRedis()
    await redis.srem('seenMacs', mac)
    await redis.hdel('macAliases', mac)
  } else {
    memoryMacs.delete(mac)
  }
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

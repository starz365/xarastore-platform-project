import Redis from "ioredis"

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379"

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  enableReadyCheck: true,
})

redis.on("error", (err) => {
  console.error("Redis error:", err.message)
})

type RateLimitResult = {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

async function slidingWindow(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {

  const now = Date.now()
  const windowStart = now - windowSeconds * 1000

  const redisKey = `ratelimit:${key}`

  const pipeline = redis.pipeline()

  pipeline.zremrangebyscore(redisKey, 0, windowStart)
  pipeline.zcard(redisKey)
  pipeline.zadd(redisKey, now, `${now}-${Math.random()}`)
  pipeline.expire(redisKey, windowSeconds)

  const [, countResult] = await pipeline.exec()

  const count = countResult?.[1] as number

  const remaining = Math.max(limit - count - 1, 0)

  return {
    success: count < limit,
    limit,
    remaining,
    reset: windowSeconds,
  }
}

export const ratelimit = {
  api: (id: string) => slidingWindow(`api:${id}`, 100, 60),
  auth: (id: string) => slidingWindow(`auth:${id}`, 10, 60),
  newsletter: (id: string) => slidingWindow(`newsletter:${id}`, 3, 3600),
  contact: (id: string) => slidingWindow(`contact:${id}`, 5, 3600),
  payment: (id: string) => slidingWindow(`payment:${id}`, 20, 60),
  analytics: (id: string) => slidingWindow(`analytics:${id}`, 50, 60),
  search: (id: string) => slidingWindow(`search:${id}`, 30, 60),
  global: (id: string) => slidingWindow(`global:${id}`, 1000, 86400),
}

export async function rateLimitMiddleware(
  request: Request,
  limiter: keyof typeof ratelimit = "api"
) {

  const identifier =
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    "anonymous"

  return ratelimit[limiter](identifier)
}

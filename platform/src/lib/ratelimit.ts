import { createHash } from 'node:crypto'
import type { Payload } from 'payload'
import { q } from './db'

/** Fixed-window rate limit keyed by a salted hash (raw IPs are never stored). */
export async function rateLimit(payload: Payload, bucket: string, rawKey: string, max: number, windowSec: number) {
  const salt = process.env.PAYLOAD_SECRET ?? ''
  const keyHash = createHash('sha256').update(salt + rawKey).digest('hex').slice(0, 32)
  const windowStart = new Date(Math.floor(Date.now() / (windowSec * 1000)) * windowSec * 1000)
  const [row] = await q(payload,
    `INSERT INTO civic.rate_limits (bucket, key_hash, window_start, hits) VALUES ($1,$2,$3,1)
     ON CONFLICT (bucket, key_hash, window_start) DO UPDATE SET hits = civic.rate_limits.hits + 1 RETURNING hits`,
    [bucket, keyHash, windowStart])
  return { allowed: Number(row.hits) <= max, retryAfter: windowSec }
}

export const clientKey = (headers: Headers) =>
  headers.get('x-forwarded-for')?.split(',')[0]?.trim() || headers.get('x-real-ip') || 'local'

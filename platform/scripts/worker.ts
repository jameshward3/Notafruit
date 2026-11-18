/**
 * Durable background worker (separate process from the web server).
 * Every tick: enqueue due scheduled tasks (publication sweep, outbox delivery,
 * search reconcile) and run queued jobs (including CSV imports). Jobs live in
 * Postgres (payload-jobs), so a crash or restart loses nothing; tasks are
 * idempotent. Visitor requests never trigger these actions.
 *
 *   pnpm worker            # loop forever (production / docker compose)
 *   pnpm worker --once     # single tick (cron-style hosts, tests)
 */
import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../src/payload.config'

const once = process.argv.includes('--once')
const intervalMs = Number(process.env.WORKER_INTERVAL_MS ?? 30_000)
const payload = await getPayload({ config })
let stopping = false
for (const sig of ['SIGINT', 'SIGTERM'] as const) process.on(sig, () => { stopping = true })

async function tick() {
  const started = Date.now()
  try {
    await payload.jobs.handleSchedules({ allQueues: true })
    const r = await payload.jobs.run({ allQueues: true, limit: 50 })
    console.log(JSON.stringify({ level: 'info', msg: 'worker tick', ms: Date.now() - started, ...((r as any)?.jobStatus ? { jobs: Object.keys((r as any).jobStatus).length } : {}) }))
  } catch (e) {
    console.error(JSON.stringify({ level: 'error', msg: 'worker tick failed', error: (e as Error).message }))
  }
}

do {
  await tick()
  if (once || stopping) break
  await new Promise((r) => setTimeout(r, intervalMs))
} while (!stopping)
process.exit(0)

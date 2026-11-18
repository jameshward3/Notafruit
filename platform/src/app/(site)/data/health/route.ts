import { q } from '@/lib/db'
import { getClient } from '@/lib/payload'

/**
 * Health + freshness for monitoring. Returns no personal data.
 * 503 when the database is unreachable or the worker has not completed a job recently.
 */
export const dynamic = 'force-dynamic'
export async function GET() {
  const started = Date.now()
  try {
    const payload = await getClient()
    const [jobs] = await q(payload, `SELECT max(completed_at) AS last_completed, count(*) FILTER (WHERE has_error) AS errored FROM payload_jobs WHERE created_at > now() - interval '1 day'`)
    const [outbox] = await q(payload, `SELECT count(*) FILTER (WHERE status='failed') AS failed, count(*) FILTER (WHERE status='pending' AND created_at < now() - interval '15 minutes') AS stale FROM outbox`)
    const lastJob = jobs.last_completed ? new Date(jobs.last_completed) : null
    const workerFresh = !!lastJob && Date.now() - lastJob.getTime() < 10 * 60_000
    const body = { status: workerFresh ? 'ok' : 'degraded', db: 'ok', dbLatencyMs: Date.now() - started, worker: { lastJobCompletedAt: lastJob?.toISOString() ?? null, fresh: workerFresh, erroredJobs24h: Number(jobs.errored) }, outbox: { failed: Number(outbox.failed), stalePending: Number(outbox.stale) } }
    return Response.json(body, { status: workerFresh ? 200 : 503, headers: { 'cache-control': 'no-store' } })
  } catch {
    return Response.json({ status: 'down', db: 'unreachable' }, { status: 503, headers: { 'cache-control': 'no-store' } })
  }
}

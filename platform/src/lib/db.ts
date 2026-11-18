/**
 * Parameterized raw SQL for application-managed tables in the `civic` schema
 * (PostGIS geometry and the search index). Payload/Drizzle never manages that
 * schema, so its schema push/migrations cannot drop these tables.
 */
import type { Payload } from 'payload'

type Pool = { query: (text: string, params?: unknown[]) => Promise<{ rows: any[]; rowCount: number | null }> }

export const pool = (payload: Payload): Pool => (payload.db as unknown as { pool: Pool }).pool

export async function q<T = any>(payload: Payload, text: string, params: unknown[] = []): Promise<T[]> {
  const res = await pool(payload).query(text, params)
  return res.rows as T[]
}

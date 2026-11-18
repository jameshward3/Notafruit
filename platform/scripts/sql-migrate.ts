/**
 * Applies sql/*.sql once each, in order, inside a transaction, recording a
 * checksum. Refuses to run if an applied file was edited afterwards.
 */
import 'dotenv/config'
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import pg from 'pg'

const dir = path.resolve(import.meta.dirname, '../sql')
const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
await client.connect()
await client.query(`CREATE SCHEMA IF NOT EXISTS civic;
  CREATE TABLE IF NOT EXISTS civic.schema_migrations (filename text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())`)
const applied = new Map(
  (await client.query('SELECT filename, checksum FROM civic.schema_migrations')).rows.map((r) => [r.filename, r.checksum]),
)
for (const file of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
  const sqlText = readFileSync(path.join(dir, file), 'utf8')
  const sum = createHash('sha256').update(sqlText).digest('hex')
  if (applied.has(file)) {
    if (applied.get(file) !== sum) throw new Error(`${file} changed after being applied; add a new migration instead.`)
    continue
  }
  await client.query('BEGIN')
  try {
    await client.query(sqlText)
    await client.query('INSERT INTO civic.schema_migrations (filename, checksum) VALUES ($1, $2)', [file, sum])
    await client.query('COMMIT')
    console.log(`applied ${file}`)
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  }
}
await client.end()
console.log('civic schema up to date')

/** Resets the dedicated test database and applies all migrations. Refuses to touch a DB not named *_test. */
import { execSync } from 'node:child_process'
import pg from 'pg'

export default async function setup() {
  const url = process.env.TEST_DATABASE_URL ?? 'postgres://orange:orange_dev@localhost:5432/orange_platform_test'
  if (!/_test(\?|$)/.test(url)) throw new Error('Refusing to reset a database whose name does not end in _test')
  const c = new pg.Client({ connectionString: url })
  await c.connect()
  await c.query('DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS civic CASCADE; CREATE SCHEMA public;')
  await c.end()
  const env = { ...process.env, DATABASE_URL: url, PAYLOAD_SECRET: 'test-secret-0123456789abcdef0123456789', NODE_OPTIONS: '--no-deprecation' }
  execSync('pnpm exec payload migrate', { env, stdio: 'pipe' })
  execSync('pnpm exec tsx scripts/sql-migrate.ts', { env, stdio: 'pipe' })
}

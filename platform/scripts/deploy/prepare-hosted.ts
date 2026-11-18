/**
 * Prepares the hosted review database (Supabase) after the dump is restored:
 *  - removes the shared-password development staff accounts (*@orange.test)
 *  - creates (or resets) ONE administrator from ADMIN_EMAIL / ADMIN_PASSWORD
 *  - uploads ./media files to the S3-compatible bucket (Supabase Storage)
 *
 * Reads platform/.env.production.local (never committed). Run from platform/:
 *   tsx scripts/deploy/prepare-hosted.ts
 */
import { config as loadEnv } from 'dotenv'
loadEnv({ path: '.env.production.local', override: true })
// The DB password lives on its own line; insert it (URL-encoded) into the connection strings.
for (const k of ['DATABASE_URL', 'SUPABASE_SESSION_URL']) {
  if (process.env[k]?.includes('[YOUR-PASSWORD]') && process.env.SUPABASE_DB_PASSWORD) {
    process.env[k] = process.env[k]!.replace('[YOUR-PASSWORD]', encodeURIComponent(process.env.SUPABASE_DB_PASSWORD))
  }
}

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

const need = ['DATABASE_URL', 'PAYLOAD_SECRET', 'ADMIN_EMAIL', 'ADMIN_PASSWORD', 'S3_BUCKET', 'S3_ENDPOINT', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY']
const missing = need.filter((k) => !process.env[k])
if (missing.length) { console.error(`Missing in .env.production.local: ${missing.join(', ')}`); process.exit(1) }
if ((process.env.ADMIN_PASSWORD ?? '').length < 14) { console.error('ADMIN_PASSWORD must be at least 14 characters.'); process.exit(1) }

const { getPayload } = await import('payload')
const { default: config } = await import('../../src/payload.config')
const payload = await getPayload({ config })

const dev = await payload.delete({ collection: 'users', where: { email: { like: '@orange.test' } }, overrideAccess: true })
console.log(`removed ${dev.docs.length} development staff accounts`)
const email = process.env.ADMIN_EMAIL!
const existing = await payload.find({ collection: 'users', where: { email: { equals: email } }, limit: 1, overrideAccess: true })
const data = { email, name: 'Administrator', roles: ['administrator'], canEmergencyPublish: true, password: process.env.ADMIN_PASSWORD! }
if (existing.docs[0]) await payload.update({ collection: 'users', id: existing.docs[0].id, data: data as any, overrideAccess: true })
else await payload.create({ collection: 'users', data: data as any, overrideAccess: true })
console.log('administrator account ready')

// Media: same keys the S3 adapter uses (file name at bucket root).
// Supabase Storage does not accept the SDK's default request checksums (they break the signature).
const s3 = new S3Client({ endpoint: process.env.S3_ENDPOINT, region: process.env.S3_REGION ?? 'us-east-1', forcePathStyle: true,
  requestChecksumCalculation: 'WHEN_REQUIRED', responseChecksumValidation: 'WHEN_REQUIRED',
  credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID!, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY! } })
const TYPES: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', avif: 'image/avif' }
let n = 0
for (const name of readdirSync('media')) {
  const p = join('media', name)
  if (!statSync(p).isFile()) continue
  await s3.send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: name, Body: readFileSync(p), ContentType: TYPES[name.split('.').pop()!.toLowerCase()] ?? 'application/octet-stream' }))
  n++
}
console.log(`uploaded ${n} media files`)
process.exit(0)

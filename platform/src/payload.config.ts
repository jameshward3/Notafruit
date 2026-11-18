import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { s3Storage } from '@payloadcms/storage-s3'
import path from 'path'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { BudgetDatasets, BudgetLines, ImportBatches, Places, Projects, Wards } from './collections/data'
import { Departments, Events, Notices, Officials, ProjectUpdates, SeasonalFeatures, Services } from './collections/editorial'
import { Legislation, Meetings, Votes } from './collections/records'
import { AuditEvents, LinkChecks, Media, Outbox, Redirects, ServiceRequests, SourceRecords, Subscriptions, Users } from './collections/system'
import { tasks } from './jobs/tasks'
import { userOf, isAdmin } from './access/roles'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

if (process.env.NODE_ENV === 'production' && (process.env.PAYLOAD_SECRET ?? '').length < 32) {
  throw new Error('PAYLOAD_SECRET must be at least 32 characters in production.')
}

const s3Enabled = !!process.env.S3_BUCKET

export default buildConfig({
  serverURL: process.env.PUBLIC_SITE_URL || undefined,
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
    meta: { titleSuffix: ' — Orange Township CMS (staging)' },
  },
  collections: [
    // Content
    Services, Notices, Events, SeasonalFeatures, Media,
    // Council & records
    Meetings, Legislation, Votes,
    // Projects & data
    Projects, ProjectUpdates, BudgetDatasets, BudgetLines, ImportBatches,
    // Places & maps
    Wards, Places,
    // Directory
    Departments, Officials,
    // Residents & notifications
    ServiceRequests, Subscriptions, Outbox,
    // Provenance & admin
    SourceRecords, Redirects, AuditEvents, LinkChecks, Users,
  ],
  localization: {
    locales: [
      { code: 'en', label: 'English' },
      { code: 'es', label: 'Español' },
      { code: 'ht', label: 'Kreyòl ayisyen' },
    ],
    defaultLocale: 'en',
    fallback: true,
  },
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URL || '' },
    // Schema changes go through committed migrations only (src/migrations).
    push: false,
    migrationDir: path.resolve(dirname, 'migrations'),
  }),
  graphQL: { disable: true },
  jobs: {
    tasks,
    // Job runs are visible to administrators in the admin UI (payload-jobs).
    jobsCollectionOverrides: ({ defaultJobsCollection }) => ({
      ...defaultJobsCollection,
      admin: { ...defaultJobsCollection.admin, hidden: false, group: 'Administration' },
      access: { ...defaultJobsCollection.access, read: ({ req }) => isAdmin(userOf(req)) },
    }),
    deleteJobOnComplete: false,
  },
  upload: { limits: { fileSize: 25_000_000 } },
  csrf: [process.env.PUBLIC_SITE_URL ?? 'http://localhost:3000'],
  cors: [],
  sharp,
  plugins: s3Enabled
    ? [
        s3Storage({
          collections: { media: true },
          bucket: process.env.S3_BUCKET!,
          config: {
            endpoint: process.env.S3_ENDPOINT,
            region: process.env.S3_REGION ?? 'us-east-1',
            forcePathStyle: true,
            credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '', secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '' },
          },
        }),
      ]
    : [],
})

import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    globalSetup: ['./tests/globalSetup.ts'],
    include: ['tests/unit/**/*.spec.ts', 'tests/int/**/*.int.spec.ts'],
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 120_000,
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? 'postgres://orange:orange_dev@localhost:5432/orange_platform_test',
      PAYLOAD_SECRET: 'test-secret-0123456789abcdef0123456789',
      PUBLIC_SITE_URL: 'http://localhost:3000',
      MAIL_TRANSPORT: 'capture',
      MAIL_CAPTURE_DIR: 'test-results/mail',
      PRIVATE_UPLOAD_DIR: 'test-results/imports',
      GEOCODER_PROVIDER: 'none',
    },
  },
})

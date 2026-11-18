import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

const config = [
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off', // Payload's dynamic doc shapes; types are generated in payload-types.ts
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@next/next/no-img-element': 'off', // CMS media already provides responsive sizes
    },
  },
  { ignores: ['.next/', 'node_modules/', 'src/migrations/', 'src/payload-types.ts', 'src/app/(payload)/', 'public/vendor/', 'test-results/', 'playwright-report/'] },
]
export default config

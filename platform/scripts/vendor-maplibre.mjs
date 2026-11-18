// Copies the MapLibre worker (and its shared chunk) to /public so the map can
// load it as a same-origin module worker. Runs before dev/build so the copy
// always matches the installed, pinned version.
import { copyFileSync, mkdirSync } from 'node:fs'
const src = 'node_modules/maplibre-gl/dist', dst = 'public/vendor/maplibre'
mkdirSync(dst, { recursive: true })
for (const f of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) copyFileSync(`${src}/${f}`, `${dst}/${f}`)
console.log('maplibre worker vendored')

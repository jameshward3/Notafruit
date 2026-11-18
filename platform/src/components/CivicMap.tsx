'use client'
/**
 * MapLibre map with an always-available HTML alternative (the list rendered by
 * the page). Basemap tiles come from NEXT_PUBLIC_MAP_STYLE_URL (provider
 * adapter); without one the map draws only platform data on a neutral canvas.
 * Guide §6: project status = line pattern + symbol (not color alone); ward fills
 * only from verified geometry; unverified maps carry an "Illustrative" banner.
 */
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import 'maplibre-gl/dist/maplibre-gl.css'
import { GROUP_STYLE, groupOf } from '@/lib/projectStatus'

type FC = { type: 'FeatureCollection'; features: any[] }
export type MapProps = {
  label: string
  projects?: FC
  places?: FC
  wards?: FC | null
  linkBase?: string
  placesLinkBase?: string
  /** True when any drawn geometry is not verified. */
  illustrative?: boolean
  /** Official municipal boundary (drawn as a dashed outline with the outside greyed). */
  boundary?: { geometry: { type: string; coordinates: any }; custodian: string; verification: string } | null
}

/**
 * Basemap: NEXT_PUBLIC_MAP_STYLE_URL (vector style) wins; otherwise NEXT_PUBLIC_BASEMAP
 * = 'osm' (default; OpenStreetMap standard tiles, as on the project owner's paving map) or 'none'.
 * OSM's tile servers are for light use only — production needs a provider (docs/operations.md).
 */
export function baseStyle(): any {
  const styleUrl = process.env.NEXT_PUBLIC_MAP_STYLE_URL
  if (styleUrl) return styleUrl
  const bg = { id: 'bg', type: 'background', paint: { 'background-color': '#EEF1F4' } }
  if (process.env.NEXT_PUBLIC_BASEMAP === 'none') return { version: 8, sources: {}, layers: [bg] }
  return {
    version: 8,
    sources: { osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, maxzoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' } },
    // Slightly desaturated so platform data stays legible (guide §6: neutral, low-saturation basemap).
    layers: [bg, { id: 'osm', type: 'raster', source: 'osm', paint: { 'raster-saturation': -0.35 } }],
  }
}

export const outerRings = (g: { type: string; coordinates: any }) => (g.type === 'Polygon' ? [g.coordinates[0]] : g.type === 'MultiPolygon' ? g.coordinates.map((p: any) => p[0]) : [])

const WORK = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/></svg>'
const CHECK = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>'

const midpoint = (g: any): [number, number] | null => {
  const coords = g.type === 'LineString' ? g.coordinates : g.type === 'MultiLineString' ? g.coordinates.flat() : g.type === 'Point' ? [g.coordinates] : null
  return coords?.length ? coords[Math.floor(coords.length / 2)] : null
}

export function CivicMap({ label, projects, places, wards, linkBase, placesLinkBase, illustrative, boundary }: MapProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    let map: any
    let cancelled = false
    ;(async () => {
      try {
        const maplibregl = await import('maplibre-gl')
        if (cancelled || !ref.current) return
        maplibregl.setWorkerUrl('/vendor/maplibre/maplibre-gl-worker.mjs')
        map = new maplibregl.Map({
          container: ref.current,
          style: baseStyle(),
          center: [-74.233, 40.770], zoom: 13.4, attributionControl: { compact: false },
          cooperativeGestures: true, // no forced scroll capture
        })
        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-left')
        // Basemap tiles can fail (offline, provider limits); platform data still draws, so don't log each tile.
        map.on('error', (e: any) => { if (e?.sourceId !== 'osm' && !/tile/i.test(String(e?.error?.url ?? e?.error?.message ?? ''))) console.error(e?.error ?? e) })
        const bounds = new maplibregl.LngLatBounds()
        map.on('load', () => {
          if (boundary) {
            // Same treatment as the project owner's paving map: grey outside the city, dashed navy outline.
            const world = [[-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85]]
            map.addSource('city-mask', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [world, ...outerRings(boundary.geometry)] } } })
            map.addLayer({ id: 'city-mask', type: 'fill', source: 'city-mask', paint: { 'fill-color': '#8A929D', 'fill-opacity': 0.5 } })
            map.addSource('city', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: boundary.geometry }, attribution: 'Boundary: U.S. Census Bureau (City of Orange township)' })
            map.addLayer({ id: 'city-line', type: 'line', source: 'city', paint: { 'line-color': '#132538', 'line-width': 2.5, 'line-dasharray': [2.8, 2] } })
            outerRings(boundary.geometry).flat().forEach((c: [number, number]) => bounds.extend(c))
          }
          if (wards?.features.length) {
            map.addSource('wards', { type: 'geojson', data: wards })
            map.addLayer({ id: 'ward-fill', type: 'fill', source: 'wards', paint: { 'fill-color': ['match', ['get', 'ward'], 'north', '#5688B0', 'south', '#C49A43', 'east', '#438F88', 'west', '#956582', '#ccc'], 'fill-opacity': 0.35 } })
            map.addLayer({ id: 'ward-line', type: 'line', source: 'wards', paint: { 'line-color': '#0B2035', 'line-width': 1.5 } })
          }
          if (projects?.features.length) {
            const data = { ...projects, features: projects.features.map((f: any) => ({ ...f, properties: { ...f.properties, group: groupOf(f.properties.phase) } })) }
            map.addSource('projects', { type: 'geojson', data })
            for (const [group, st] of Object.entries(GROUP_STYLE)) {
              map.addLayer({ id: `proj-${group}`, type: 'line', source: 'projects', filter: ['==', ['get', 'group'], group],
                paint: { 'line-color': st.color, 'line-width': 6, ...(st.dash ? { 'line-dasharray': st.dash } : {}) } })
            }
            for (const f of data.features) {
              const st = GROUP_STYLE[f.properties.group as keyof typeof GROUP_STYLE]
              const mid = midpoint(f.geometry)
              ;(f.geometry.type === 'LineString' ? f.geometry.coordinates : []).forEach((c: [number, number]) => bounds.extend(c))
              if (st.symbol && mid) {
                const el = document.createElement('div')
                el.className = 'map-marker'
                el.style.background = st.color
                el.setAttribute('aria-hidden', 'true') // the list carries the same information
                el.innerHTML = st.symbol === 'work' ? WORK : CHECK
                if (linkBase && f.properties.slug) el.addEventListener('click', () => router.push(`${linkBase}/${f.properties.slug}`))
                new maplibregl.Marker({ element: el }).setLngLat(mid).addTo(map)
              }
            }
            map.on('click', (e: any) => {
              const f = map.queryRenderedFeatures(e.point).find((x: any) => x.layer.id.startsWith('proj-') && x.properties?.slug)
              if (f && linkBase) router.push(`${linkBase}/${f.properties.slug}`)
            })
          }
          if (places?.features.length) {
            map.addSource('places', { type: 'geojson', data: places })
            map.addLayer({ id: 'places', type: 'circle', source: 'places', paint: { 'circle-radius': 8, 'circle-color': ['match', ['get', 'jurisdiction'], 'municipal', '#0B2035', '#FFFFFF'], 'circle-stroke-color': '#0B2035', 'circle-stroke-width': 3 } })
            places.features.forEach((f: any) => bounds.extend(f.geometry.coordinates))
            map.on('click', 'places', (e: any) => { const s = e.features?.[0]?.properties?.slug; const base = placesLinkBase ?? linkBase; if (s && base) router.push(`${base}/${s}`) })
          }
          if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 60, maxZoom: 15, duration: 0 })
        })
      } catch {
        setError('The interactive map could not load. All information is available in the list.')
      }
    })()
    return () => { cancelled = true; map?.remove() }
  }, [projects, places, wards, boundary, linkBase, placesLinkBase, router])

  return (
    <figure style={{ margin: 0, position: 'relative' }}>
      {illustrative && <p className="map-banner" role="note">Illustrative map — not for address or ward determination</p>}
      <div ref={ref} className="map-frame" role="region" aria-label={`${label} (interactive map; the same information is in the list)`} />
      {error && <p role="status" className="alert alert--warning">{error}</p>}
      <figcaption className="meta">
        {boundary ? <>Dashed line: City of Orange township boundary ({boundary.verification === 'verified' ? 'official record' : 'unverified'}, {boundary.custodian.split(' —')[0]}); areas outside the City are greyed. </> : null}
        {process.env.NEXT_PUBLIC_BASEMAP === 'none' && !process.env.NEXT_PUBLIC_MAP_STYLE_URL ? 'Basemap off in this environment — only platform data is drawn.' : 'Street basemap © OpenStreetMap contributors.'}
      </figcaption>
    </figure>
  )
}

export function ProjectLegend() {
  return (
    <ul className="map-legend" aria-label="Project status legend" style={{ listStyle: 'none', padding: 0 }}>
      {Object.values(GROUP_STYLE).map((st) => (
        <li key={st.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <svg width="40" height="12" aria-hidden="true"><line x1="0" y1="6" x2="40" y2="6" stroke={st.color} strokeWidth="5" strokeDasharray={st.dash ? st.dash.map((d) => d * 5).join(' ') : undefined} /></svg>
          {st.symbol && <span className="map-marker" style={{ background: st.color, width: 20, height: 20 }} aria-hidden="true" dangerouslySetInnerHTML={{ __html: st.symbol === 'work' ? WORK : CHECK }} />}
          {st.label}
        </li>
      ))}
    </ul>
  )
}

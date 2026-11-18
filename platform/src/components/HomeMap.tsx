'use client'
/**
 * Lite ward map for the homepage hero. Floating ward tabs and a floating details
 * card. First click on a ward (map or tab) selects and zooms; a second click on
 * the same ward opens Explore Orange at that ward. Full details live on /explore.
 */
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import 'maplibre-gl/dist/maplibre-gl.css'
import { ArrowRight } from 'lucide-react'
import type { WardStats } from '@/lib/gis'
import type { Strings } from '@/lib/strings'
import { baseStyle, outerRings } from './CivicMap'
import { WARD_COLORS, type WardRep } from './WardMap'

type FC = { type: 'FeatureCollection'; features: any[] }
export type HomeMapProps = {
  boundary: { geometry: any } | null
  wards: FC | null
  stats: WardStats[]
  places: FC
  reps: Record<string, WardRep[]>
  s: Strings
}
const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
const ORDER = ['north', 'east', 'south', 'west']

export function HomeMap({ boundary, wards, stats, places, reps, s }: HomeMapProps) {
  const router = useRouter()
  const ref = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const hoverRef = useRef<any>(null)
  const selRef = useRef<string | null>(null)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const [ward, setWard] = useState<string | null>(null)
  const byWard = useMemo(() => new Map(stats.map((x) => [x.ward, x])), [stats])
  const wn = (w: string) => (s as any)[`ward_${w}`] ?? w
  const cityBox = useMemo(() => {
    const pts = boundary ? outerRings(boundary.geometry).flat() : []
    if (!pts.length) return null
    const xs = pts.map((p: number[]) => p[0]), ys = pts.map((p: number[]) => p[1])
    return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] as [number, number, number, number]
  }, [boundary])

  /** First click selects; a second click on the selected ward opens Explore Orange. */
  const choose = (w: string | null) => {
    if (w && selRef.current === w) { router.push(`/explore?ward=${w}`); return }
    selRef.current = w
    setWard(w)
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const maplibregl = await import('maplibre-gl')
        if (cancelled || !ref.current) return
        maplibregl.setWorkerUrl('/vendor/maplibre/maplibre-gl-worker.mjs')
        const map = new maplibregl.Map({ container: ref.current, style: baseStyle(), center: [-74.236, 40.770], zoom: 13, attributionControl: { compact: true }, cooperativeGestures: true, dragRotate: false, pitchWithRotate: false })
        mapRef.current = map
        hoverRef.current = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 10, className: 'map-hover' })
        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right')
        map.on('error', (e: any) => { if (e?.sourceId !== 'osm' && !/tile/i.test(String(e?.error?.url ?? e?.error?.message ?? ''))) console.error(e?.error ?? e) })
        map.on('load', () => {
          if (boundary) {
            const world = [[-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85]]
            map.addSource('city-mask', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [world, ...outerRings(boundary.geometry)] } } })
            map.addLayer({ id: 'city-mask', type: 'fill', source: 'city-mask', paint: { 'fill-color': '#0B2035', 'fill-opacity': 0.55 } })
          }
          if (wards) {
            map.addSource('wards', { type: 'geojson', data: wards })
            map.addLayer({ id: 'ward-fill', type: 'fill', source: 'wards', paint: { 'fill-color': ['match', ['get', 'ward'], 'north', WARD_COLORS.north, 'south', WARD_COLORS.south, 'east', WARD_COLORS.east, 'west', WARD_COLORS.west, '#ccc'], 'fill-opacity': 0.45 } })
            map.addLayer({ id: 'ward-line', type: 'line', source: 'wards', paint: { 'line-color': '#FFFFFF', 'line-width': 2 } })
            map.addLayer({ id: 'ward-selected', type: 'line', source: 'wards', filter: ['==', ['get', 'ward'], ''], paint: { 'line-color': '#B79B59', 'line-width': 5 } })
          }
          map.addSource('places', { type: 'geojson', data: { ...places, features: places.features.filter((f: any) => ['school', 'park'].includes(f.properties.kind)) } })
          map.addLayer({ id: 'places', type: 'circle', source: 'places', paint: { 'circle-radius': 5, 'circle-color': ['match', ['get', 'kind'], 'park', '#2E7D4F', '#7A4E9C'], 'circle-stroke-color': '#fff', 'circle-stroke-width': 2 } })
          map.on('click', (e: any) => {
            const w = map.queryRenderedFeatures(e.point, { layers: ['ward-fill'] })[0]
            choose(w ? w.properties.ward : null)
          })
          map.on('mousemove', (e: any) => {
            const hits = map.queryRenderedFeatures(e.point, { layers: ['places', 'ward-fill'] })
            const p = hits.find((h: any) => h.layer.id === 'places')
            const w = hits.find((h: any) => h.layer.id === 'ward-fill')
            map.getCanvas().style.cursor = w || p ? 'pointer' : ''
            if (p) hoverRef.current.setLngLat(e.lngLat).setHTML(`<strong>${esc(p.properties.name)}</strong>`).addTo(map)
            else if (w) hoverRef.current.setLngLat(e.lngLat).setHTML(`<strong>${esc(wn(w.properties.ward))}</strong>`).addTo(map)
            else hoverRef.current.remove()
          })
          map.on('mouseout', () => hoverRef.current.remove())
          setReady(true)
        })
      } catch { setFailed(true) }
    })()
    return () => { cancelled = true; mapRef.current?.remove(); mapRef.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return
    map.setFilter('ward-selected', ['==', ['get', 'ward'], ward ?? ''])
    map.setPaintProperty('ward-fill', 'fill-opacity', ward ? ['case', ['==', ['get', 'ward'], ward], 0.15, 0.55] : 0.45)
    const box = ward ? byWard.get(ward)?.bbox : cityBox
    if (box) map.fitBounds([[box[0], box[1]], [box[2], box[3]]], { padding: { top: 70, bottom: ward ? 190 : 50, left: 30, right: 30 }, duration: 650 })
  }, [ward, ready, byWard, cityBox])

  const st = ward ? byWard.get(ward) : null
  const km = (x: WardStats) => x.roadKm.interstate + x.roadKm.state_or_county + x.roadKm.local + x.roadKm.other
  const rep = ward ? reps[ward]?.[0] : null

  return (
    <div className="homemap">
      <div ref={ref} className="homemap__canvas" role="region" aria-label={s.homeMapAria} />
      {failed && <p className="homemap__fail">{s.mapError}</p>}
      <div className="homemap__tabs" role="toolbar" aria-label={s.chooseWard}>
        <button type="button" className={!ward ? 'is-on' : undefined} aria-pressed={!ward} onClick={() => choose(null)}>{s.wholeCity}</button>
        {ORDER.filter((w) => byWard.has(w)).map((w) => (
          <button key={w} type="button" className={ward === w ? 'is-on' : undefined} aria-pressed={ward === w} style={{ ['--wc' as any]: WARD_COLORS[w] }}
            onClick={() => choose(w)} title={ward === w ? s.openExplore : undefined}>{wn(w)}</button>
        ))}
      </div>
      <div className="homemap__card" aria-live="polite">
        {st ? (
          <>
            <div className="homemap__cardhead">
              <i style={{ background: WARD_COLORS[st.ward] }} aria-hidden="true" />
              <strong>{wn(st.ward)}</strong>
            </div>
            {rep && (
              <p className="homemap__rep">
                {rep.photo ? <img src={rep.photo} alt="" width={36} height={36} /> : null}
                <span><a href={`/government/officials/${rep.slug}`}>{rep.name}</a><br /><span className="homemap__meta">{s.representation}</span></span>
              </p>
            )}
            <dl className="homemap__stats">
              <div><dt>{s.area}</dt><dd>{s.sqmi.replace('{n}', (st.areaKm2 * 0.386102).toFixed(2))}</dd></div>
              <div><dt>{s.roads}</dt><dd>{s.mi.replace('{n}', (km(st) * 0.621371).toFixed(1))}</dd></div>
              <div><dt>{s.schools}</dt><dd>{st.places.school ?? 0}</dd></div>
              <div><dt>{s.parks}</dt><dd>{st.places.park ?? 0}</dd></div>
              <div><dt>{s.electionDistricts}</dt><dd>{st.districts.length}</dd></div>
            </dl>
            <a className="homemap__go" href={`/explore?ward=${st.ward}`}>{s.openExplore} <ArrowRight size={16} aria-hidden="true" /></a>
          </>
        ) : (
          <p className="homemap__hint">{s.homeMapHint}</p>
        )}
      </div>
    </div>
  )
}

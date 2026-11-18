'use client'
/**
 * Interactive ward explorer. Click a ward (on the map or in the panel) to zoom to
 * it and see its representatives and figures. Layers toggle instantly.
 * The page also renders the same information as lists (non-map alternative).
 */
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { WardStats } from '@/lib/gis'
import { GROUP_STYLE, groupOf } from '@/lib/projectStatus'
import { t as dict, type Strings } from '@/lib/strings'
import { baseStyle, outerRings } from './CivicMap'

type FC = { type: 'FeatureCollection'; features: any[] }
export type WardRep = { name: string; office: string; slug: string; photo?: string | null }
export type WardMapProps = {
  boundary: { geometry: any; custodian: string; verification: string } | null
  wards: { verification: string; custodian: string; fc: FC } | null
  stats: WardStats[]
  districts: FC | null
  roads: FC
  places: FC
  projects: FC
  reps: Record<string, WardRep[]>
  initialWard?: string | null
  /** Ward pages lock the view to one ward. */
  lockWard?: boolean
  /** Interface strings for the current language (defaults to English). */
  strings?: Strings
}

export const WARD_COLORS: Record<string, string> = { north: '#5688B0', south: '#C49A43', east: '#438F88', west: '#956582' }
const KM_TO_MI = 0.621371
const ROAD_COLORS: Record<string, string> = { interstate: '#B4452F', state_or_county: '#C98A1B', local: '#4A5866', other: '#8A929D' }
const PLACE_LAYERS = [
  { key: 'schools', label: 'schools', kinds: ['school'], color: '#7A4E9C' },
  { key: 'parks', label: 'parks', kinds: ['park'], color: '#2E7D4F' },
  { key: 'facilities', label: 'facilities', kinds: ['facility', 'library', 'transit', 'historic_site'], color: '#0B2035' },
] as const
type LayerKey = 'wards' | 'districts' | 'roads' | 'projects' | (typeof PLACE_LAYERS)[number]['key']
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

export function WardMap(props: WardMapProps) {
  const { boundary, wards, stats, districts, roads, places, projects, reps, lockWard } = props
  const L = props.strings ?? dict('en')
  const WARD_NAME = (w: string) => (L as any)[`ward_${w}`] ?? w
  const fmtMi = (km: number) => L.mi.replace('{n}', (km * KM_TO_MI).toFixed(1))
  const ROAD_LABEL: Record<string, string> = { interstate: L.legendInterstate, state_or_county: L.legendStateRoute, local: L.legendLocal, other: L.legendOther }
  const layerLabel = (k: string) => (L as any)[k] as string
  const ref = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const popupRef = useRef<any>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ward, setWard] = useState<string | null>(props.initialWard ?? null)
  /** Selected election district, e.g. "south-03" (ward-district). */
  const [district, setDistrict] = useState<string | null>(null)
  const hoverRef = useRef<any>(null)
  const [on, setOn] = useState<Record<LayerKey, boolean>>({ wards: true, districts: false, roads: true, projects: true, schools: true, parks: true, facilities: true })
  const byWard = useMemo(() => new Map(stats.map((s) => [s.ward, s])), [stats])
  const cityBox = useMemo(() => {
    const pts = boundary ? outerRings(boundary.geometry).flat() : []
    if (!pts.length) return null
    const xs = pts.map((p: number[]) => p[0]), ys = pts.map((p: number[]) => p[1])
    return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] as [number, number, number, number]
  }, [boundary])
  const districtBox = useMemo(() => {
    const m = new Map<string, [number, number, number, number]>()
    for (const f of districts?.features ?? []) {
      const pts = outerRings(f.geometry).flat()
      const xs = pts.map((p: number[]) => p[0]), ys = pts.map((p: number[]) => p[1])
      m.set(`${f.properties.ward}-${f.properties.district}`, [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)])
    }
    return m
  }, [districts])
  const unverified = wards?.verification !== 'verified'

  // ---- create map once
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const maplibregl = await import('maplibre-gl')
        if (cancelled || !ref.current) return
        maplibregl.setWorkerUrl('/vendor/maplibre/maplibre-gl-worker.mjs')
        const map = new maplibregl.Map({ container: ref.current, style: baseStyle(), center: [-74.236, 40.770], zoom: 13.3, attributionControl: { compact: false }, cooperativeGestures: true })
        mapRef.current = map
        popupRef.current = new maplibregl.Popup({ closeButton: true, maxWidth: '280px' })
        hoverRef.current = new maplibregl.Popup({ closeButton: false, closeOnClick: false, maxWidth: '260px', offset: 10, className: 'map-hover' })
        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-left')
        // Basemap tiles can fail (offline, provider limits); platform data still draws, so don't log each tile.
        map.on('error', (e: any) => { if (e?.sourceId !== 'osm' && !/tile/i.test(String(e?.error?.url ?? e?.error?.message ?? ''))) console.error(e?.error ?? e) })
        map.on('load', () => {
          if (boundary) {
            const world = [[-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85]]
            map.addSource('city-mask', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [world, ...outerRings(boundary.geometry)] } } })
            map.addLayer({ id: 'city-mask', type: 'fill', source: 'city-mask', paint: { 'fill-color': '#8A929D', 'fill-opacity': 0.5 } })
          }
          if (wards) {
            map.addSource('wards', { type: 'geojson', data: wards.fc, attribution: 'Wards: NJ Office of GIS' })
            map.addLayer({ id: 'ward-fill', type: 'fill', source: 'wards', paint: { 'fill-color': ['match', ['get', 'ward'], 'north', WARD_COLORS.north, 'south', WARD_COLORS.south, 'east', WARD_COLORS.east, 'west', WARD_COLORS.west, '#ccc'], 'fill-opacity': 0.32 } })
            map.addLayer({ id: 'ward-line', type: 'line', source: 'wards', paint: { 'line-color': '#0B2035', 'line-width': 2 } })
            map.addLayer({ id: 'ward-selected', type: 'line', source: 'wards', filter: ['==', ['get', 'ward'], ''], paint: { 'line-color': '#0B2035', 'line-width': 5 } })
          }
          if (districts) {
            // No glyph source on the raster basemap, so districts are identified by click popup rather than text labels.
            map.addSource('districts', { type: 'geojson', data: districts })
            map.addLayer({ id: 'districts-fill', type: 'fill', source: 'districts', layout: { visibility: 'none' }, paint: { 'fill-color': '#000', 'fill-opacity': 0 } })
            map.addLayer({ id: 'districts', type: 'line', source: 'districts', layout: { visibility: 'none' }, paint: { 'line-color': '#0B2035', 'line-width': 1.2, 'line-dasharray': [1, 1.5] } })
            map.addLayer({ id: 'district-selected', type: 'line', source: 'districts', filter: ['==', ['get', 'district'], '__none__'], paint: { 'line-color': '#B4452F', 'line-width': 4 } })
          }
          map.addSource('roads', { type: 'geojson', data: roads, attribution: 'Roads: U.S. Census Bureau TIGER' })
          map.addLayer({ id: 'roads', type: 'line', source: 'roads', paint: { 'line-color': ['match', ['get', 'roadClass'], 'interstate', ROAD_COLORS.interstate, 'state_or_county', ROAD_COLORS.state_or_county, 'local', ROAD_COLORS.local, ROAD_COLORS.other], 'line-width': ['match', ['get', 'roadClass'], 'interstate', 4, 'state_or_county', 3, 1.6], 'line-opacity': 0.85 } })
          map.addLayer({ id: 'roads-hit', type: 'line', source: 'roads', paint: { 'line-color': '#000', 'line-width': 12, 'line-opacity': 0 } })
          if (projects.features.length) {
            const data = { ...projects, features: projects.features.map((f: any) => ({ ...f, properties: { ...f.properties, group: groupOf(f.properties.phase) } })) }
            map.addSource('projects', { type: 'geojson', data })
            for (const [group, st] of Object.entries(GROUP_STYLE)) {
              map.addLayer({ id: `proj-${group}`, type: 'line', source: 'projects', filter: ['==', ['get', 'group'], group], paint: { 'line-color': st.color, 'line-width': 6, ...(st.dash ? { 'line-dasharray': st.dash } : {}) } })
            }
          }
          map.addSource('places', { type: 'geojson', data: places })
          for (const l of PLACE_LAYERS) {
            map.addLayer({ id: `places-${l.key}`, type: 'circle', source: 'places', filter: ['in', ['get', 'kind'], ['literal', l.kinds]],
              paint: { 'circle-radius': 7, 'circle-color': ['match', ['get', 'jurisdiction'], 'municipal', l.color, '#FFFFFF'], 'circle-stroke-color': l.color, 'circle-stroke-width': 3 } })
          }

          const show = (e: any, html: string) => popupRef.current.setLngLat(e.lngLat).setHTML(html).addTo(map)
          map.on('click', (e: any) => {
            const hits = map.queryRenderedFeatures(e.point)
            const place = hits.find((h: any) => h.layer.id.startsWith('places-'))
            if (place) {
              const p = place.properties
              return show(e, `<strong>${esc(p.name)}</strong><br><span class="meta">${esc(p.kindLabel ?? p.kind)}${p.ward ? ` · ${esc(WARD_NAME(p.ward))}` : ''}</span><br><a href="/explore/places/${encodeURIComponent(p.slug)}">Details</a>`)
            }
            const proj = hits.find((h: any) => h.layer.id.startsWith('proj-'))
            if (proj?.properties?.slug) return show(e, `<strong>${esc(proj.properties.label)}</strong><br><a href="/projects/${encodeURIComponent(proj.properties.slug)}">Project details</a>`)
            // Streets are identified on hover; a click selects the district (when shown) or the ward and zooms to it.
            const d = hits.find((h: any) => h.layer.id === 'districts-fill')
            if (d && (!lockWard || d.properties.ward === props.initialWard)) {
              if (!lockWard) setWard(d.properties.ward)
              return setDistrict(`${d.properties.ward}-${d.properties.district}`)
            }
            const w = hits.find((h: any) => h.layer.id === 'ward-fill')
            if (w && !lockWard) { setDistrict(null); setWard(w.properties.ward) }
          })
          const hover = (e: any, html: string) => hoverRef.current.setLngLat(e.lngLat).setHTML(html).addTo(map)
          map.on('mousemove', (e: any) => {
            const hits = map.queryRenderedFeatures(e.point)
            const place = hits.find((h: any) => h.layer.id.startsWith('places-'))
            if (place) return hover(e, `<strong>${esc(place.properties.name)}</strong><br><span class="meta">${esc(place.properties.kindLabel ?? place.properties.kind)} · ${esc(L.clickForDetails)}</span>`)
            const road = hits.find((h: any) => h.layer.id === 'roads-hit')
            if (road) {
              const p = road.properties
              return hover(e, `<strong>${esc(p.name)}</strong><br><span class="meta">${esc(ROAD_LABEL[p.roadClass])} · ${(p.lengthM * 0.000621371).toFixed(2)} mi ${esc(L.segment)}${p.wards ? ` · ${esc(String(p.wards).split(',').map(WARD_NAME).join(', '))}` : ''}</span>`)
            }
            hoverRef.current.remove()
          })
          map.on('mouseout', () => hoverRef.current.remove())
          for (const id of ['ward-fill', 'districts-fill', ...PLACE_LAYERS.map((l) => `places-${l.key}`)]) {
            map.on('mouseenter', id, () => { map.getCanvas().style.cursor = 'pointer' })
            map.on('mouseleave', id, () => { map.getCanvas().style.cursor = '' })
          }
          setReady(true)
        })
      } catch {
        setError(L.mapError)
      }
    })()
    return () => { cancelled = true; mapRef.current?.remove(); mapRef.current = null }
    // Data is static for the life of the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- react to selection
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return
    popupRef.current?.remove()
    if (map.getLayer('ward-selected')) map.setFilter('ward-selected', ['==', ['get', 'ward'], ward ?? ''])
    if (map.getLayer('ward-fill')) map.setPaintProperty('ward-fill', 'fill-opacity', ward ? ['case', ['==', ['get', 'ward'], ward], 0.18, 0.5] : 0.32)
    const [dw, dn] = district?.split('-') ?? []
    if (map.getLayer('district-selected')) map.setFilter('district-selected', district ? ['all', ['==', ['get', 'ward'], dw], ['==', ['get', 'district'], dn]] : ['==', ['get', 'district'], '__none__'])
    const box = district ? districtBox.get(district) : ward ? byWard.get(ward)?.bbox : cityBox
    if (box) map.fitBounds([[box[0], box[1]], [box[2], box[3]]], { padding: 40, duration: 700 })
    if (!lockWard) {
      const u = new URL(window.location.href)
      if (ward) u.searchParams.set('ward', ward); else u.searchParams.delete('ward')
      window.history.replaceState(null, '', u.toString())
    }
  }, [ward, district, ready, byWard, cityBox, districtBox, lockWard])

  // ---- react to layer toggles
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return
    const vis = (id: string, v: boolean) => map.getLayer(id) && map.setLayoutProperty(id, 'visibility', v ? 'visible' : 'none')
    ;['ward-fill', 'ward-line', 'ward-selected'].forEach((id) => vis(id, on.wards))
    ;['districts', 'districts-fill', 'district-selected'].forEach((id) => vis(id, on.districts || !!district))
    ;['roads', 'roads-hit'].forEach((id) => vis(id, on.roads))
    Object.keys(GROUP_STYLE).forEach((g) => vis(`proj-${g}`, on.projects))
    PLACE_LAYERS.forEach((l) => vis(`places-${l.key}`, on[l.key]))
  }, [on, ready, district])

  const s = ward ? byWard.get(ward) : null
  const wardPlaces = (kinds: readonly string[]) => places.features.filter((f: any) => kinds.includes(f.properties.kind) && (!ward || f.properties.ward === ward))
  const totalKm = (x: WardStats) => x.roadKm.interstate + x.roadKm.state_or_county + x.roadKm.local + x.roadKm.other

  return (
    <div className="wardmap">
      <div className="wardmap__map">
        {unverified && wards && <p className="map-banner" role="note">{L.wardBanner}</p>}
        <div ref={ref} className="map-frame" role="region" aria-label={L.mapAria} />
        {error && <p role="status" className="alert alert--warning">{error}</p>}
        <fieldset className="wardmap__layers">
          <legend className="label">{L.showOnMap}</legend>
          {([['wards', L.layerWards], ['districts', L.layerDistricts], ['roads', L.layerRoads], ...PLACE_LAYERS.map((l) => [l.key, layerLabel(l.label)]), ['projects', L.layerProjects]] as [LayerKey, string][]).map(([k, label]) => (
            <label key={k}><input type="checkbox" checked={on[k]} onChange={(e) => setOn((o) => ({ ...o, [k]: e.target.checked }))} /> {label}</label>
          ))}
        </fieldset>
        <ul className="map-legend" aria-label={L.legend} style={{ listStyle: 'none', padding: 0 }}>
          {Object.entries(WARD_COLORS).map(([w, c]) => <li key={w}><i className="wardmap__sw" style={{ background: c, opacity: 0.6 }} aria-hidden="true" />{WARD_NAME(w)}</li>)}
          {(['interstate', 'state_or_county', 'local'] as const).map((r) => <li key={r}><i className="wardmap__ln" style={{ borderColor: ROAD_COLORS[r] }} aria-hidden="true" />{ROAD_LABEL[r]}</li>)}
          {PLACE_LAYERS.map((l) => <li key={l.key}><i className="wardmap__dot" style={{ background: l.color }} aria-hidden="true" />{layerLabel(l.label)}</li>)}
          <li><i className="wardmap__dot" style={{ background: '#fff', border: '3px solid #0B2035' }} aria-hidden="true" />{L.legendOtherAgency}</li>
        </ul>
        <p className="meta">{L.mapSources}</p>
      </div>

      <aside className="wardmap__panel panel" aria-live="polite" aria-label={L.wardDetails}>
        {!lockWard && (
          <nav aria-label={L.chooseWard} className="wardmap__chooser">
            <button type="button" className={`wardmap__btn${!ward ? ' is-on' : ''}`} aria-pressed={!ward} onClick={() => { setDistrict(null); setWard(null) }}>{L.wholeCity}</button>
            {stats.map((x) => (
              <button key={x.ward} type="button" className={`wardmap__btn${ward === x.ward ? ' is-on' : ''}`} aria-pressed={ward === x.ward} onClick={() => { setDistrict(null); setWard(x.ward) }} style={{ ['--wc' as any]: WARD_COLORS[x.ward] }}>{WARD_NAME(x.ward)}</button>
            ))}
          </nav>
        )}
        {s ? (
          <>
            <h2 style={{ fontSize: 'var(--fs-h3)', marginTop: 8 }}><i className="wardmap__sw" style={{ background: WARD_COLORS[s.ward] }} aria-hidden="true" />{WARD_NAME(s.ward)}</h2>
            <h3 className="label">{L.representation}</h3>
            {(reps[s.ward] ?? []).length ? (
              <ul className="wardmap__reps">{reps[s.ward].map((r) => (
                <li key={r.slug}>{r.photo ? <img src={r.photo} alt="" width={44} height={44} /> : <span className="wardmap__avatar" aria-hidden="true">{r.name[0]}</span>}
                  <span><a href={`/government/officials/${r.slug}`}>{r.name}</a><br /><span className="meta">{r.office}</span></span></li>))}</ul>
            ) : <p className="meta">{L.councilNotListed}</p>}
            {(reps['at-large'] ?? []).length > 0 && <p className="meta">{L.alsoAtLarge.replace('{n}', String(reps['at-large'].length))} <Link href="/government/officials">{L.allOfficials}</Link></p>}
            <dl className="wardmap__stats">
              <div><dt>{L.area}</dt><dd>{L.sqmi.replace('{n}', (s.areaKm2 * 0.386102).toFixed(2))}</dd></div>
              <div><dt>{L.roads}</dt><dd>{fmtMi(totalKm(s))} <span className="meta">({L.namedStreets.replace('{n}', String(s.streetNames))})</span></dd></div>
              <div><dt>{L.localStreets}</dt><dd>{fmtMi(s.roadKm.local)}</dd></div>
              <div><dt>{L.stateCounty}</dt><dd>{fmtMi(s.roadKm.state_or_county + s.roadKm.interstate)}</dd></div>
              <div className="wardmap__wide"><dt>{L.electionDistricts} <span className="meta">({L.selectToZoom})</span></dt><dd>{s.districts.length ? <span className="wardmap__chips">{s.districts.map((d) => { const k = `${s.ward}-${d}`; return <button key={k} type="button" className={`wardmap__chip${district === k ? ' is-on' : ''}`} aria-pressed={district === k} onClick={() => setDistrict(district === k ? null : k)}>{s.ward[0].toUpperCase()}-{d}</button> })}</span> : '—'}</dd></div>
              <div><dt>{L.legislativeDistrict}</dt><dd>{s.legislative.join(', ') || '—'}</dd></div>
              <div><dt>{L.congressionalDistrict}</dt><dd>{s.congressional.join(', ') || '—'}</dd></div>
              <div><dt>{L.schools}</dt><dd>{s.places.school ?? 0}</dd></div>
              <div><dt>{L.parks}</dt><dd>{s.places.park ?? 0}</dd></div>
              <div><dt>{L.facilities}</dt><dd>{(s.places.facility ?? 0) + (s.places.library ?? 0) + (s.places.transit ?? 0)}</dd></div>
              <div><dt>{L.mappedProjects}</dt><dd>{s.projects}</dd></div>
            </dl>
            {PLACE_LAYERS.map((l) => { const list = wardPlaces(l.kinds); return list.length ? (
              <details key={l.key}><summary>{layerLabel(l.label)} ({list.length})</summary><ul>{list.map((f: any) => <li key={f.properties.slug}><a href={`/explore/places/${f.properties.slug}`}>{f.properties.name}</a></li>)}</ul></details>
            ) : null })}
            {!lockWard && <p><a href={`/explore/wards/${s.ward}`}>{L.openWardPage.replace('{ward}', WARD_NAME(s.ward))}</a></p>}
          </>
        ) : (
          <>
            <h2 style={{ fontSize: 'var(--fs-h3)', marginTop: 8 }}>{L.cityName}</h2>
            <p>{L.mapIntro}</p>
            <table className="wardmap__table"><caption className="label">{L.wardsAtGlance}</caption>
              <thead><tr><th scope="col">{L.colWard}</th><th scope="col">{L.colArea}</th><th scope="col">{L.colRoads}</th><th scope="col">{L.colSchools}</th><th scope="col">{L.colParks}</th></tr></thead>
              <tbody>{stats.map((x) => <tr key={x.ward}><th scope="row"><button type="button" className="linklike" onClick={() => { setDistrict(null); setWard(x.ward) }}>{WARD_NAME(x.ward)}</button></th><td>{L.sqmi.replace('{n}', (x.areaKm2 * 0.386102).toFixed(2))}</td><td>{fmtMi(totalKm(x))}</td><td>{x.places.school ?? 0}</td><td>{x.places.park ?? 0}</td></tr>)}</tbody>
            </table>
          </>
        )}
      </aside>
    </div>
  )
}

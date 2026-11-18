import type { WardRep } from '@/components/WardMap'
import { human } from '@/components/ui'
import { districtsGeoJSON, municipalGeoJSON, placesGeoJSON, projectGeoJSON, roadsGeoJSON, wardGeoJSON, wardOfPlaces, wardStats } from './gis'
import { photoUrl } from './officials'
import { getClient } from './payload'
import { findPublic } from './public'

/** Data for the ward explorer (shared with ward pages). */
export async function explorerData() {
  const payload = await getClient()
  const [placesRes, projectsRes, officialsRes, wards, districts, roads, boundary] = await Promise.all([
    findPublic('places', { sort: 'name', limit: 500 }),
    findPublic('projects', { limit: 300 }),
    findPublic('officials', { where: { category: { equals: 'council' } }, depth: 1, limit: 50, sort: 'sortOrder' }),
    wardGeoJSON(payload), districtsGeoJSON(payload), roadsGeoJSON(payload), municipalGeoJSON(payload),
  ])
  const places = placesRes.docs as any[]
  const projects = projectsRes.docs as any[]
  const [pts, proj, wardByPlace, stats] = await Promise.all([
    placesGeoJSON(payload, places), projectGeoJSON(payload, projects.map((p) => p.id)), wardOfPlaces(payload, places.map((p) => p.id)), wardStats(payload, projects.map((p) => p.id)),
  ])
  pts.features.forEach((f: any) => { const p = places.find((x) => x.slug === f.properties.slug); f.properties.ward = p ? wardByPlace.get(p.id) ?? null : null; f.properties.kindLabel = human(f.properties.kind) })
  const byId = new Map(projects.map((p) => [p.id, p]))
  proj.features.forEach((ft: any) => { const p = byId.get(ft.properties.projectId); ft.properties.phase = p?.phase; ft.properties.slug = p?.slug })
  const reps: Record<string, WardRep[]> = {}
  for (const o of officialsRes.docs as any[]) if (o.ward) (reps[o.ward] ??= []).push({ name: o.name, office: o.office, slug: o.slug, photo: photoUrl(o) })
  return { places, projects, pts, proj, wardByPlace, stats, reps, wards, districts, roads, boundary }
}


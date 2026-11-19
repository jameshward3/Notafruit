/**
 * Parks and recreation places in the City of Orange Township, with who owns or runs each
 * (City, Essex County, private). Idempotent; published as unverified with sources.
 *
 * Locations: the City's own park pages (orangenj.gov) and owner sites name each park;
 * map points are the centre of the matching park/court/playground features in
 * OpenStreetMap (© OpenStreetMap contributors, ODbL), checked to fall inside the City boundary.
 *
 *   tsx scripts/load-parks.ts
 */
import 'dotenv/config'
import { getPayload, type CollectionSlug } from 'payload'
import config from '../src/payload.config'

const payload = await getPayload({ config })
const sys = { overrideAccess: true, context: { system: true, skipNotify: true } } as const
const NOW = new Date().toISOString()
async function upsert(collection: CollectionSlug, key: string, data: Record<string, any>) {
  const found = await payload.find({ collection, where: { [key]: { equals: data[key] } }, limit: 1, depth: 0, overrideAccess: true })
  if (found.docs[0]) return payload.update({ collection, id: found.docs[0].id, data, ...sys } as any) as any
  return payload.create({ collection, data, ...sys } as any) as any
}
const source = (url: string, title: string, owner: string, ownerType: string, notes: string) =>
  upsert('source-records', 'url', { title, url, owner, ownerType, retrievedAt: NOW, status: 'captured', notes })

const osm = await source('https://www.openstreetmap.org/copyright', 'OpenStreetMap park, playground and sports-court features (Overpass API)', 'OpenStreetMap contributors', 'third_party',
  'Map points for parks are the centre of matching OpenStreetMap features (© OpenStreetMap contributors, ODbL). Checked to fall inside the City boundary.')
const city = (path: string, title: string) => source(`https://orangenj.gov/${path}`, `${title} (orangenj.gov)`, 'City of Orange Township', 'official', 'City page listing this park under Public Works > Parks.')

type Park = { name: string; slug: string; jurisdiction: 'municipal' | 'county' | 'other'; address?: string; summary: string; lat: number; lng: number; sources: number[] }
const parks: Park[] = [
  { name: 'Monte Irvin Orange Park', slug: 'monte-irvin-orange-park', jurisdiction: 'county', address: 'Center Street and South Harrison Street, Orange, NJ 07050',
    summary: 'Essex County park of about 47.6 acres between Central Avenue and Center and Harrison Streets, one of the original Essex County parks designed by the Olmsted Brothers. Athletic fields, walking paths, a playground and free summer concerts. Run by the Essex County Department of Parks, Recreation and Cultural Affairs, not the City: contact the County for permits and maintenance.',
    lat: 40.76012, lng: -74.23156,
    sources: [(await source('https://essexcountyparks.org/parks/monte-irvin-orange-park', 'Monte Irvin Orange Park (Essex County Parks)', 'Essex County Department of Parks, Recreation and Cultural Affairs', 'government', 'County park page: size, location and history.')).id, osm.id] },
  { name: 'Military Park', slug: 'military-park', jurisdiction: 'municipal',
    summary: 'City park with the City\'s historic monuments. A full renovation added a walking path, rearranged the monuments, new trees and plantings, walkway lighting, flag poles, gathering areas and benches.',
    lat: 40.76962, lng: -74.22432, sources: [(await city('377/Military-Park', 'Military Park')).id, osm.id] },
  { name: 'Ropes Playground', slug: 'ropes-playground', jurisdiction: 'municipal', address: 'Washington Street, Bradford Street and Berryman Place, Orange, NJ 07050',
    summary: 'City park at the corner of Washington Street, Bradford Street and Berryman Place, being refurbished with a playground, spray park, basketball court, shade structure with picnic tables, lighting, benches and fencing.',
    lat: 40.78424, lng: -74.22661, sources: [(await city('375/Ropes-Playground', 'Ropes Playground')).id, osm.id] },
  { name: 'Metcalf Park', slug: 'metcalf-park', jurisdiction: 'municipal', address: 'Valley Street and Argyle Avenue, Orange, NJ 07050',
    summary: 'City park with a playground, basketball courts, tennis courts and a baseball field. The City has listed repairs to the ball field (regrading, sod, infield and warning track) and the basketball court.',
    lat: 40.75975, lng: -74.25310,
    sources: [(await city('376/Metcalf-Baseball-Park', 'Metcalf Baseball Park')).id, (await city('386/Metcalf-Basketball-Park', 'Metcalf Basketball Park')).id, osm.id] },
  { name: 'Central Playground', slug: 'central-playground', jurisdiction: 'municipal', address: '371 Central Avenue, Orange, NJ 07050',
    summary: 'City playground and courts on Central Avenue with basketball, volleyball and tennis courts and a ball field. Small parking lot and street parking.',
    lat: 40.76656, lng: -74.23700, sources: [(await city('390/Central-Playground', 'Central Playground')).id, osm.id] },
  { name: 'Colgate Park', slug: 'colgate-park', jurisdiction: 'municipal', address: 'North Day Street, Orange, NJ 07050',
    summary: 'Small City park off North Day Street with a playground and basketball courts (also listed as the Colgate skatepark). Listed by the City under Parks; exact boundaries to be confirmed with Public Works.',
    lat: 40.77461, lng: -74.22708, sources: [(await city('402/Colgate-Park', 'Colgate Park')).id, osm.id] },
  { name: 'Berkeley Tennis Club', slug: 'berkeley-tennis-club', jurisdiction: 'other', address: '311 Tremont Place, Orange, NJ 07050',
    summary: 'Private, member-owned tennis club in the Seven Oaks section of Orange with six clay courts. Not a City facility: membership and court use are arranged with the club (berkeleytennis.com).',
    lat: 40.75875, lng: -74.24381,
    sources: [(await source('https://patch.com/new-jersey/southorange/berkeley-tennis-club-in-orange-is-open-for-new-members', 'Berkeley Tennis Club in Orange is open for new members (Patch)', 'Patch Media', 'third_party', 'News item giving the club\'s address in the Seven Oaks section of Orange.')).id, osm.id] },
]
for (const p of parks) {
  await upsert('places', 'slug', {
    name: p.name, slug: p.slug, kind: 'park', jurisdiction: p.jurisdiction, address: p.address, summary: p.summary,
    latitude: p.lat, longitude: p.lng, sources: p.sources, workflowStatus: 'published', publishedAt: NOW, verificationStatus: 'unverified',
  })
}
console.log(`parks: ${parks.length} (${parks.filter((p) => p.jurisdiction === 'municipal').length} City, ${parks.filter((p) => p.jurisdiction === 'county').length} County, ${parks.filter((p) => p.jurisdiction === 'other').length} private)`)
process.exit(0)

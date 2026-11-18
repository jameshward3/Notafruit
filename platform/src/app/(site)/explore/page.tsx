import Link from 'next/link'
import { DemoFlag, Notice, PageBand, StatusBadge, WardChip, human } from '@/components/ui'
import { WardLookup } from '@/components/WardLookup'
import { WardMap } from '@/components/WardMap'
import { CITY_HALL } from '@/lib/facts'
import { explorerData } from '@/lib/explorer'
import { one, pick, type SP } from '@/lib/params'
import { getLocale, t, wardName } from '@/lib/i18n'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Explore Orange' }
const WARDS = ['north', 'south', 'east', 'west'] as const
const JUR: Record<string, string> = { municipal: 'City of Orange Township', county: 'Essex County', state: 'State of New Jersey', school_district: 'Orange Board of Education', other: 'Other / private' }

export default async function Explore({ searchParams }: { searchParams: SP }) {
  const locale = await getLocale()
  const L = t(locale)
  const sp = await searchParams
  const ward = pick(one(sp.ward), WARDS) ?? null
  const d = await explorerData()
  const placesShown = ward ? d.places.filter((p) => d.wardByPlace.get(p.id) === ward) : d.places
  const mapWards = d.wards ? { verification: d.wards.verification, custodian: d.wards.custodian, fc: d.wards.fc } : null

  return (
    <>
      <PageBand eyebrow={L.explore} title={L.wardsTitle}><p style={{ color: '#DCE3EA' }}>{L.exploreLede}</p></PageBand>
      <div className="container section">
        {d.wards && d.wards.verification !== 'verified' && (
          <Notice tone="info" title={L.wardLinesTitle}>
            {L.wardLinesBody} <a href={`tel:${CITY_HALL.phoneTel}`}>{CITY_HALL.phone}</a>.
          </Notice>
        )}
        <WardMap boundary={d.boundary} wards={mapWards as any} stats={d.stats?.stats ?? []} districts={d.districts as any} roads={d.roads as any} places={d.pts as any} projects={d.proj as any} reps={d.reps} initialWard={ward} strings={L} />

        <div style={{ marginTop: 32 }}><WardLookup /></div>

        <h2 style={{ marginTop: 32 }}>{ward ? L.placesIn.replace('{ward}', wardName(L, ward)) : L.allPlaces} ({placesShown.length})</h2>
        <p className="meta">{L.listNote}</p>
        <div className="table-wrap" tabIndex={0} role="region" aria-label="Places table (scrolls sideways on small screens)"><table>
          <caption className="sr-only">Places</caption>
          <thead><tr><th scope="col">{L.colPlace}</th><th scope="col">{L.colType}</th><th scope="col">{L.colOperatedBy}</th><th scope="col">{L.colWardMap}</th></tr></thead>
          <tbody>{placesShown.map((p) => { const w = d.wardByPlace.get(p.id); return (
            <tr key={p.id}><td><Link href={`/explore/places/${p.slug}`}>{p.name}</Link> <DemoFlag show={p.verificationStatus === 'demo'} text="Sample" /></td><td>{human(p.kind)}</td><td>{JUR[p.jurisdiction]}</td><td>{w ? <span className={`ward-chip ward-chip--${w}`}>{wardName(L, w)}</span> : L.notDetermined}</td></tr>
          ) })}</tbody>
        </table></div>

        {d.projects.length > 0 && <>
          <h2 style={{ marginTop: 32 }}>{L.projects} ({d.projects.length})</h2>
          <div className="table-wrap" tabIndex={0} role="region" aria-label="Projects table (scrolls sideways on small screens)"><table>
            <caption className="sr-only">Projects</caption>
            <thead><tr><th scope="col">{L.colProject}</th><th scope="col">{L.colStatus}</th><th scope="col">{L.colWard}</th></tr></thead>
            <tbody>{d.projects.map((p) => <tr key={p.id}><td><Link href={`/projects/${p.slug}`}>{p.title}</Link> <DemoFlag show={p.verificationStatus === 'demo'} text="Sample" /></td><td><StatusBadge status={p.phase} /></td><td>{(p.wards ?? []).map((w: string) => <WardChip key={w} ward={w} />)}</td></tr>)}</tbody>
          </table></div>
        </>}
      </div>
    </>
  )
}

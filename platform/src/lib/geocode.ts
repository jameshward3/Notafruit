/**
 * Geocoder adapter. Providers:
 *  - "census": US Census Bureau geocoder (public, no key). Requires outbound
 *    access to geocoding.geo.census.gov in the deployment network policy.
 *  - "fixture": development-only fixed addresses, always labeled illustrative.
 *  - "none" (default): geocoding unavailable; UI falls back to directory.
 * Raw addresses are never logged.
 */
export type GeocodeResult =
  | { status: 'ok'; lng: number; lat: number; matched: string; confidence: 'exact' | 'approximate'; provider: string; illustrative: boolean }
  | { status: 'no_match' }
  | { status: 'multiple'; options: string[] }
  | { status: 'unavailable'; reason: string }

const FIXTURES: Record<string, { lng: number; lat: number; matched: string }> = {
  // Development fixture: City Hall's published address. Coordinates are approximate and for testing only.
  '29 north day street': { lng: -74.2326, lat: 40.7704, matched: '29 N Day St, Orange, NJ 07050 (development fixture)' },
}

export async function geocode(address: string): Promise<GeocodeResult> {
  const provider = process.env.GEOCODER_PROVIDER ?? 'none'
  const input = address.trim().slice(0, 200)
  if (input.length < 5) return { status: 'no_match' }

  if (provider === 'fixture') {
    const key = input.toLowerCase().replace(/[.,]/g, '').replace(/\s+/g, ' ').replace(/\b(orange|nj|new jersey|07050)\b/g, '').trim()
    const hit = Object.entries(FIXTURES).find(([k]) => key.startsWith(k))
    return hit ? { status: 'ok', ...hit[1], confidence: 'exact', provider: 'fixture', illustrative: true } : { status: 'no_match' }
  }

  if (provider === 'census') {
    const url = new URL('https://geocoding.geo.census.gov/geocoder/locations/onelineaddress')
    url.searchParams.set('address', /07050|orange/i.test(input) ? input : `${input}, Orange, NJ 07050`)
    url.searchParams.set('benchmark', 'Public_AR_Current')
    url.searchParams.set('format', 'json')
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(6000), redirect: 'error' })
      if (!res.ok) return { status: 'unavailable', reason: 'The address service is not responding.' }
      const json = (await res.json()) as { result?: { addressMatches?: { matchedAddress: string; coordinates: { x: number; y: number } }[] } }
      const m = json.result?.addressMatches ?? []
      if (m.length === 0) return { status: 'no_match' }
      if (m.length > 1) return { status: 'multiple', options: m.slice(0, 5).map((x) => x.matchedAddress) }
      return { status: 'ok', lng: m[0].coordinates.x, lat: m[0].coordinates.y, matched: m[0].matchedAddress, confidence: 'exact', provider: 'census', illustrative: false }
    } catch {
      return { status: 'unavailable', reason: 'The address service is not responding.' }
    }
  }
  return { status: 'unavailable', reason: 'Address lookup is not configured.' }
}

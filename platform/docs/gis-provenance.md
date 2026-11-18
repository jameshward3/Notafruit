# GIS provenance
**Municipal boundary: loaded and verified (2026-11-17).** Source: U.S. Census Bureau TIGERweb County Subdivisions,
"City of Orange township", GEOID 3401313045 (legal boundary reported by the municipality through the Boundary and
Annexation Survey). File: `data/boundaries/orange-municipal-census-3401313045.geojson` (SHA-256 d709b224…214e),
loaded by `scripts/load-boundary.ts`. Valid polygon, 5.736 km².

**Comparison with the ZIP 07050 polygon** embedded in the project owner's paving map
(jameshward3.github.io/OrangeStreetPaving, shown on jw4o.com): 98% overlap; the ZIP polygon includes 0.050 km² outside
the City, omits 0.096 km² of the City, and departs from the legal line by up to 79 m. Maps now use the same visual
treatment as that map (OpenStreetMap basemap, grey outside the City, dashed navy outline) with the Census legal line.

**Ward boundaries: still not loaded.** Ward lookup therefore returns "Ward boundaries are not yet verified" and the
explorer shows a directory. This is deliberate: ZIP 07050 and map screenshots are not ward
geometry, and outlines are never divided into invented quadrants.

## What is needed from a custodian (City Engineering / Clerk / Essex County GIS)
For the municipal boundary and each ward: file (Shapefile/GeoPackage/GeoJSON), source CRS (likely EPSG:3424 NJ State
Plane ft), effective date, adopting ordinance/resolution or redistricting reference, custodian contact, license.

## Load procedure
1. Create a `source-records` row (owner, URL, retrieved date, SHA-256 of the file).
2. Insert a `civic.boundary_versions` row (`kind`, `custodian`, `source_crs`, `effective_from`, `verification='unverified'`).
3. Load geometry transformed explicitly: `ST_Multi(ST_Transform(ST_SetSRID(geom, 3424), 4326))`. Do not "fix" source
   geometry silently; if `ST_IsValid` fails, record it and ask the custodian.
4. Run `validateWardVersion()` (`src/lib/gis.ts`): invalid rings, overlap m², gap m² vs municipal outline, area outside city.
   Investigate any non-zero values with the custodian.
5. Only after sign-off, set `verification='verified'`. Older versions get `effective_to`.

## Lookup semantics (`lookupWard`)
geocoder match → inside verified municipal boundary? → point-in-polygon against the verified ward version effective on
the date → if within 15 m of a ward edge or matched by >1 ward: **ambiguous** (ask the Clerk) → if inside the city but no
ward: **unavailable** (data gap, never guessed). Demo/unverified geometry yields "illustrative", never authoritative, and
only outside production.

## Illustrative geometry present
`civic.project_geometries` rows with `verification='demo'` (4 sample line segments near Orange; not real project
locations). `place_points`: City Hall (approximate, unverified) and three sample places (demo).

## Providers
Geocoder adapter (`src/lib/geocode.ts`): `none` (default), `fixture` (dev), `census` (US Census Bureau, public; outbound
access must be allowed). Basemap: `NEXT_PUBLIC_MAP_STYLE_URL` (choose a provider whose terms permit municipal use; do
not use public OSM tiles beyond their usage policy). Attribution is shown by MapLibre's attribution control.

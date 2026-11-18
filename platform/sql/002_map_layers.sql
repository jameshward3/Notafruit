-- Reference map layers from public government sources (provenance in source-records).

-- Election districts belong to a ward boundary version.
CREATE TABLE civic.election_districts (
  id                  serial PRIMARY KEY,
  boundary_version_id integer NOT NULL REFERENCES civic.boundary_versions(id) ON DELETE CASCADE,
  ward_slug           text NOT NULL CHECK (ward_slug IN ('north', 'south', 'east', 'west')),
  district            text NOT NULL,           -- e.g. "02" (as published)
  congressional       text,
  legislative         text,
  county_commission   text,
  geom                geometry(MultiPolygon, 4326) NOT NULL CHECK (ST_IsValid(geom)),
  UNIQUE (boundary_version_id, ward_slug, district)
);
CREATE INDEX election_districts_gix ON civic.election_districts USING gist (geom);

-- Road centerlines clipped to the municipal boundary.
CREATE TABLE civic.road_segments (
  id               serial PRIMARY KEY,
  source_oid       text NOT NULL,
  name             text,
  mtfcc            text NOT NULL,              -- Census feature class (S1100 primary, S1200 secondary, S1400 local …)
  road_class       text NOT NULL CHECK (road_class IN ('interstate', 'state_or_county', 'local', 'other')),
  source_record_id integer,
  geom             geometry(MultiLineString, 4326) NOT NULL,
  length_m         double precision NOT NULL,
  UNIQUE (source_oid)
);
CREATE INDEX road_segments_gix ON civic.road_segments USING gist (geom);
CREATE INDEX road_segments_name_idx ON civic.road_segments (lower(name));

-- Application-managed tables (outside Payload's schema management).
-- Linked to Payload documents by stable integer ids. Spatial data stored in
-- EPSG:4326; distance checks cast to geography (metres).
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE SCHEMA IF NOT EXISTS civic;

-- Every geometry belongs to a boundary version with provenance.
CREATE TABLE civic.boundary_versions (
  id              serial PRIMARY KEY,
  kind            text NOT NULL CHECK (kind IN ('municipal', 'ward')),
  label           text NOT NULL,
  custodian       text NOT NULL,             -- e.g. "City of Orange Township Engineering" / "Essex County GIS"
  source_url      text,
  source_record_id integer,                  -- Payload source-records.id
  source_crs      text NOT NULL,             -- CRS as delivered (e.g. EPSG:3424); stored transformed to 4326
  effective_from  date,
  effective_to    date,
  verification    text NOT NULL CHECK (verification IN ('verified', 'unverified', 'demo')),
  checksum_sha256 text,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE civic.municipal_geometries (
  id                  serial PRIMARY KEY,
  boundary_version_id integer NOT NULL REFERENCES civic.boundary_versions(id) ON DELETE RESTRICT,
  geom                geometry(MultiPolygon, 4326) NOT NULL CHECK (ST_IsValid(geom))
);
CREATE INDEX municipal_geometries_gix ON civic.municipal_geometries USING gist (geom);

CREATE TABLE civic.ward_geometries (
  id                  serial PRIMARY KEY,
  boundary_version_id integer NOT NULL REFERENCES civic.boundary_versions(id) ON DELETE RESTRICT,
  ward_slug           text NOT NULL CHECK (ward_slug IN ('north', 'south', 'east', 'west')),
  geom                geometry(MultiPolygon, 4326) NOT NULL CHECK (ST_IsValid(geom)),
  UNIQUE (boundary_version_id, ward_slug)
);
CREATE INDEX ward_geometries_gix ON civic.ward_geometries USING gist (geom);

CREATE TABLE civic.place_points (
  place_id     integer PRIMARY KEY,           -- Payload places.id
  geom         geometry(Point, 4326) NOT NULL,
  verification text NOT NULL CHECK (verification IN ('verified', 'unverified', 'demo'))
);
CREATE INDEX place_points_gix ON civic.place_points USING gist (geom);

CREATE TABLE civic.project_geometries (
  id           serial PRIMARY KEY,
  project_id   integer NOT NULL,              -- Payload projects.id
  label        text,
  geom         geometry(Geometry, 4326) NOT NULL CHECK (ST_IsValid(geom)),
  verification text NOT NULL CHECK (verification IN ('verified', 'unverified', 'demo'))
);
CREATE INDEX project_geometries_gix ON civic.project_geometries USING gist (geom);
CREATE INDEX project_geometries_project_idx ON civic.project_geometries (project_id);

-- Search index: ONLY published, public content is ever written here
-- (enforced in src/lib/search.ts; removed on unpublish/expiry/delete).
CREATE TABLE civic.search_documents (
  collection    text NOT NULL,
  doc_id        text NOT NULL,
  title         text NOT NULL,
  identifier    text,                         -- e.g. "Ordinance 40-2026"
  body          text NOT NULL DEFAULT '',
  url           text NOT NULL,
  content_type  text NOT NULL,
  department    text,
  ward          text,
  doc_date      timestamptz,
  is_demo       boolean NOT NULL DEFAULT false,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  tsv tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(identifier, '')), 'A') ||
    setweight(to_tsvector('english', title), 'A') ||
    setweight(to_tsvector('english', body), 'C')
  ) STORED,
  PRIMARY KEY (collection, doc_id)
);
CREATE INDEX search_documents_tsv_idx ON civic.search_documents USING gin (tsv);
CREATE INDEX search_documents_title_trgm ON civic.search_documents USING gin (title gin_trgm_ops);
CREATE INDEX search_documents_ident_trgm ON civic.search_documents USING gin (identifier gin_trgm_ops);

-- Rate limiting for public forms and geocoding (keyed by salted hash, never raw IP).
CREATE TABLE civic.rate_limits (
  bucket      text NOT NULL,
  key_hash    text NOT NULL,
  window_start timestamptz NOT NULL,
  hits        integer NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, key_hash, window_start)
);

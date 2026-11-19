-- Street addresses for ZIP 07050 (NJ Office of GIS NG911 Address Points), used for
-- address autocomplete and ward lookup without an outside geocoder. One row per
-- distinct full address (apartment units collapsed). Provenance in source-records.
CREATE TABLE civic.address_points (
  id           serial PRIMARY KEY,
  full_addr    text NOT NULL,              -- as published, e.g. "349 Fairview Avenue"
  norm         text NOT NULL,              -- normalized for prefix search, e.g. "349 fairview ave"
  street_norm  text NOT NULL,              -- normalized street only, e.g. "fairview ave"
  house_number integer,
  post_comm    text,                       -- postal community, e.g. "Orange"
  post_code    text NOT NULL,
  muni_code    text,                       -- incorporated municipality (GNIS code as published)
  lng          double precision NOT NULL,
  lat          double precision NOT NULL,
  UNIQUE (full_addr, post_code)
);
CREATE INDEX address_points_norm_idx ON civic.address_points (norm text_pattern_ops);
CREATE INDEX address_points_street_idx ON civic.address_points (street_norm text_pattern_ops);

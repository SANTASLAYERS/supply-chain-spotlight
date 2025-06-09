-- Earthquake data schema migration
CREATE TABLE earthquakes (
  id        TEXT PRIMARY KEY,
  mag       NUMERIC(4,1),
  place     TEXT,
  time      TIMESTAMPTZ,      -- origin time
  updated   TIMESTAMPTZ,
  lat       NUMERIC(8,5),
  lon       NUMERIC(8,5),
  depth_km  NUMERIC(5,1)
);

CREATE TABLE kpi_quake_daily (
  day           DATE PRIMARY KEY,
  total_count   INT,
  avg_mag       NUMERIC(4,2),
  max_mag       NUMERIC(4,1),
  big_quakes    INT          -- count of mag ≥ 5.0
); 
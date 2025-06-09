CREATE TABLE IF NOT EXISTS orders (
  order_id       TEXT PRIMARY KEY,
  created_at     TIMESTAMPTZ,
  destination    TEXT
);

CREATE TABLE IF NOT EXISTS shipments (
  id             SERIAL PRIMARY KEY,
  order_id       TEXT REFERENCES orders(order_id),
  status         TEXT,
  eta            TIMESTAMPTZ,
  location       TEXT,
  event_time     TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS kpi_daily (
  day            DATE PRIMARY KEY,
  avg_lead_days  NUMERIC(6,2),
  on_time_pct    NUMERIC(5,2),
  late_count     INT,
  total_count    INT
);

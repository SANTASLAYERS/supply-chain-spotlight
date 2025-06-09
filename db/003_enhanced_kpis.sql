-- Enhanced KPI schema migration
-- Add hourly KPI tracking table
CREATE TABLE kpi_quake_hourly (
  hour_start     TIMESTAMPTZ PRIMARY KEY,
  total_count    INT,
  avg_mag        NUMERIC(4,2),
  max_mag        NUMERIC(4,1),
  avg_depth      NUMERIC(5,1),
  max_depth      NUMERIC(5,1),
  shallow_count  INT,  -- depth < 10km
  mag_0_1        INT,
  mag_1_2        INT, 
  mag_2_3        INT,
  mag_3_4        INT,
  mag_4_5        INT,
  mag_5_plus     INT
);

-- Enhance daily table with new columns
ALTER TABLE kpi_quake_daily ADD COLUMN IF NOT EXISTS avg_depth NUMERIC(5,1);
ALTER TABLE kpi_quake_daily ADD COLUMN IF NOT EXISTS max_depth NUMERIC(5,1);
ALTER TABLE kpi_quake_daily ADD COLUMN IF NOT EXISTS shallow_count INT;
ALTER TABLE kpi_quake_daily ADD COLUMN IF NOT EXISTS mag_0_1 INT;
ALTER TABLE kpi_quake_daily ADD COLUMN IF NOT EXISTS mag_1_2 INT;
ALTER TABLE kpi_quake_daily ADD COLUMN IF NOT EXISTS mag_2_3 INT;
ALTER TABLE kpi_quake_daily ADD COLUMN IF NOT EXISTS mag_3_4 INT;
ALTER TABLE kpi_quake_daily ADD COLUMN IF NOT EXISTS mag_4_5 INT;
ALTER TABLE kpi_quake_daily ADD COLUMN IF NOT EXISTS last_hour_count INT;
ALTER TABLE kpi_quake_daily ADD COLUMN IF NOT EXISTS last_6h_count INT; 
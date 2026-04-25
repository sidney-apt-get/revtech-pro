ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS imei text,
  ADD COLUMN IF NOT EXISTS imei2 text,
  ADD COLUMN IF NOT EXISTS battery_capacity_original integer,
  ADD COLUMN IF NOT EXISTS battery_capacity_current integer,
  ADD COLUMN IF NOT EXISTS battery_health_percent integer,
  ADD COLUMN IF NOT EXISTS battery_cycles integer,
  ADD COLUMN IF NOT EXISTS device_color text,
  ADD COLUMN IF NOT EXISTS storage_gb integer,
  ADD COLUMN IF NOT EXISTS ram_gb integer,
  ADD COLUMN IF NOT EXISTS condition_grade text CHECK (condition_grade IN ('A','B','C','D','Para peças'));

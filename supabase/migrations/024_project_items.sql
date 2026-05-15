-- Migration 024: Project Items — link inventory to service orders
-- Allows technicians to attach stock items (new, cannibalized, harvested) to a project/OS

CREATE TABLE IF NOT EXISTS project_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id          UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  inventory_item_id   UUID REFERENCES inventory(id) ON DELETE SET NULL,
  item_name           TEXT NOT NULL,         -- snapshot at time of linking
  item_category       TEXT,                  -- snapshot
  item_type           TEXT NOT NULL DEFAULT 'used',
    -- 'used'        = item from new stock, consumed in repair
    -- 'cannibalized'= reused/recovered part from another device
    -- 'harvested'   = hardware removed from this device for resale
  quantity            INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_cost           NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE project_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own project_items"
  ON project_items FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index for fast lookups by project
CREATE INDEX idx_project_items_project ON project_items(project_id);
CREATE INDEX idx_project_items_inventory ON project_items(inventory_item_id);

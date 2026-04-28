-- Track which defect entries were auto-created from project completions
ALTER TABLE defect_database
  ADD COLUMN IF NOT EXISTS auto_created boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS source_project_id uuid REFERENCES projects(id) ON DELETE SET NULL;

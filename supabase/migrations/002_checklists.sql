CREATE TABLE IF NOT EXISTS checklists (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  type text CHECK (type IN ('reception','delivery')),
  items jsonb DEFAULT '[]',
  photos jsonb DEFAULT '[]',
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE checklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_checklists" ON checklists
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = checklists.project_id
      AND projects.user_id = auth.uid()
    )
  );

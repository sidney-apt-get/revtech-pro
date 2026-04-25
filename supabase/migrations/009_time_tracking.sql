CREATE TABLE IF NOT EXISTS time_entries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL,
  ended_at timestamptz,
  duration_minutes integer,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_time" ON time_entries
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS time_entries_project_id_idx ON time_entries(project_id);
CREATE INDEX IF NOT EXISTS time_entries_user_id_idx ON time_entries(user_id);

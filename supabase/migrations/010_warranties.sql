CREATE TABLE IF NOT EXISTS warranties (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  warranty_months integer DEFAULT 3,
  starts_at date NOT NULL,
  expires_at date NOT NULL,
  terms text,
  status text DEFAULT 'active' CHECK (status IN ('active','expired','claimed')),
  claim_description text,
  claimed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE warranties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_warranties" ON warranties
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS warranties_project_id_idx ON warranties(project_id);
CREATE INDEX IF NOT EXISTS warranties_user_id_idx ON warranties(user_id);
CREATE INDEX IF NOT EXISTS warranties_expires_at_idx ON warranties(expires_at);

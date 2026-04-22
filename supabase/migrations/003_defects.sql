CREATE TABLE IF NOT EXISTS defect_database (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  equipment_type text NOT NULL,
  brand text,
  model text,
  common_defect text NOT NULL,
  likely_cause text,
  required_parts text[],
  avg_repair_time_hours decimal,
  avg_parts_cost decimal,
  difficulty text CHECK (difficulty IN ('Fácil','Médio','Difícil')),
  success_rate integer,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE defect_database ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_defects" ON defect_database
  FOR ALL USING (auth.uid() = user_id);

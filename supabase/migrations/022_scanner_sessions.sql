CREATE TABLE IF NOT EXISTS scanner_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  token text UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  status text DEFAULT 'waiting'
    CHECK (status IN ('waiting','paired','scanning','result')),
  result_type text CHECK (result_type IN ('barcode','photo','cancelled')),
  result_value text,
  ai_result jsonb,
  paired_at timestamptz,
  expires_at timestamptz DEFAULT (now() + interval '30 minutes'),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE scanner_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_sessions" ON scanner_sessions
  FOR ALL USING (auth.uid() = user_id);

-- Política pública para o telemóvel aceder pelo token
CREATE POLICY "public_read_by_token" ON scanner_sessions
  FOR SELECT USING (true);

CREATE POLICY "public_update_by_token" ON scanner_sessions
  FOR UPDATE USING (true);

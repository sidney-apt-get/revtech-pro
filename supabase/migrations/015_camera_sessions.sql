CREATE TABLE IF NOT EXISTS camera_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token text UNIQUE NOT NULL,
  context text CHECK (context IN ('project','inventory')),
  item_id uuid,
  status text DEFAULT 'waiting'
    CHECK (status IN ('waiting','photo_taken','processed','expired')),
  photo_url text,
  ai_result jsonb,
  expires_at timestamptz DEFAULT (now() + interval '10 minutes'),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE camera_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_sessions" ON camera_sessions
  FOR ALL USING (auth.uid() = user_id);

-- Allow public read/update via token (for mobile camera page without auth)
CREATE POLICY "public_token_update" ON camera_sessions
  FOR UPDATE USING (expires_at > now() AND status = 'waiting')
  WITH CHECK (status IN ('photo_taken','expired'));

-- Bucket for camera photos (run in Supabase Storage dashboard or via API)
-- CREATE BUCKET camera-photos WITH public = true;

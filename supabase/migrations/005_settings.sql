CREATE TABLE IF NOT EXISTS app_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  company_name text DEFAULT 'RevTech',
  company_subtitle text DEFAULT 'Oficina · Livingston',
  company_location text DEFAULT 'Livingston, Scotland',
  logo_url text,
  primary_color text DEFAULT '#4F8EF7',
  accent_color text DEFAULT '#6C63FF',
  currency text DEFAULT 'GBP',
  currency_symbol text DEFAULT '£',
  vat_rate decimal DEFAULT 20,
  ticket_prefix text DEFAULT 'RT',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_settings" ON app_settings
  FOR ALL USING (auth.uid() = user_id);

-- Storage bucket for logos (run in Supabase Dashboard > Storage)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('logos', 'logos', true)
-- ON CONFLICT DO NOTHING;

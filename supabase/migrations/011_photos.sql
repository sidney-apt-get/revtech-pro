-- Galeria de fotos por projecto e fase
CREATE TABLE IF NOT EXISTS project_photos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  phase text CHECK (phase IN (
    'recepcao',
    'diagnostico',
    'reparacao',
    'concluido',
    'entrega'
  )),
  photo_url text NOT NULL,
  caption text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE project_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_photos" ON project_photos
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS project_photos_project_id_idx ON project_photos(project_id);
CREATE INDEX IF NOT EXISTS project_photos_user_id_idx ON project_photos(user_id);

-- Observações por fase em cada projecto
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS obs_recepcao text,
  ADD COLUMN IF NOT EXISTS obs_diagnostico text,
  ADD COLUMN IF NOT EXISTS obs_reparacao text,
  ADD COLUMN IF NOT EXISTS obs_conclusao text;

-- Storage bucket público para fotos de projectos
-- (executa no Supabase SQL Editor ou via dashboard)
INSERT INTO storage.buckets (id, name, public)
  VALUES ('project-photos', 'project-photos', true)
  ON CONFLICT (id) DO NOTHING;

-- RLS para o storage: pasta raiz = user_id
CREATE POLICY IF NOT EXISTS "users_upload_photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'project-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY IF NOT EXISTS "public_read_photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'project-photos');

CREATE POLICY IF NOT EXISTS "users_delete_own_photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'project-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

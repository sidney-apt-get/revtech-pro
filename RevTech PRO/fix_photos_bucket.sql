-- ============================================================
-- CORRECÇÃO: Bucket de fotos de projectos
-- Executar no Supabase SQL Editor
-- ============================================================

-- 1. Criar bucket (se não existir)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'project-photos',
    'project-photos',
    true,
    10485760,   -- 10 MB por ficheiro
    ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/gif','image/heic','image/heif']
  )
  ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/gif','image/heic','image/heif'];

-- 2. Políticas de storage
DROP POLICY IF EXISTS "users_upload_photos" ON storage.objects;
CREATE POLICY "users_upload_photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'project-photos'
    AND auth.uid() IS NOT NULL
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "public_read_photos" ON storage.objects;
CREATE POLICY "public_read_photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'project-photos');

DROP POLICY IF EXISTS "users_delete_own_photos" ON storage.objects;
CREATE POLICY "users_delete_own_photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'project-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "users_update_own_photos" ON storage.objects;
CREATE POLICY "users_update_own_photos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'project-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 3. Políticas da tabela project_photos
-- A política FOR ALL com USING funciona para leitura mas pode falhar
-- em INSERT para alguns utilizadores. Substituir por políticas explícitas:
DROP POLICY IF EXISTS "users_own_photos" ON project_photos;

CREATE POLICY "photos_select" ON project_photos
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "photos_insert" ON project_photos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "photos_update" ON project_photos
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "photos_delete" ON project_photos
  FOR DELETE USING (auth.uid() = user_id);

-- Verificação final
SELECT id, name, public, file_size_limit FROM storage.buckets WHERE id = 'project-photos';

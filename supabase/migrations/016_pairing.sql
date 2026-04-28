-- Fase 1: Adicionar colunas de pareamento permanente
ALTER TABLE camera_sessions
  ADD COLUMN IF NOT EXISTS paired boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS device_name text,
  ADD COLUMN IF NOT EXISTS last_active timestamptz,
  ADD COLUMN IF NOT EXISTS session_type text
    DEFAULT 'single' CHECK (session_type IN ('single','paired')),
  ADD COLUMN IF NOT EXISTS barcode text;

-- Índice para sessões activas por token
CREATE INDEX IF NOT EXISTS camera_sessions_token_idx
  ON camera_sessions(session_token)
  WHERE status != 'expired';

-- Recriar políticas para suportar sessões paired
DROP POLICY IF EXISTS "public_token_update" ON camera_sessions;

-- Câmara de uso único: uma foto por sessão
CREATE POLICY "public_single_update" ON camera_sessions
  FOR UPDATE USING (
    expires_at > now()
    AND status = 'waiting'
    AND (session_type IS NULL OR session_type = 'single')
  )
  WITH CHECK (status IN ('photo_taken','expired'));

-- Scanner pareado: múltiplas interacções enquanto não expirar
CREATE POLICY "public_paired_update" ON camera_sessions
  FOR UPDATE USING (
    expires_at > now()
    AND session_type = 'paired'
  );

-- Leitura pública por token (necessário para a página do scanner no telemóvel)
DROP POLICY IF EXISTS "public_token_select" ON camera_sessions;
CREATE POLICY "public_token_select" ON camera_sessions
  FOR SELECT USING (true);

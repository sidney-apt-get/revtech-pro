-- 025_audit_log.sql
-- Tabela de auditoria completa para registo de todas as alterações com PIN

CREATE TABLE IF NOT EXISTS audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email  text,
  action_type text NOT NULL,   -- 'delete' | 'edit' | 'create' | 'status_change' | 'financial_edit'
  entity_type text NOT NULL,   -- 'project' | 'inventory' | 'rma' | 'order' | 'expense' | 'contact'
  entity_id   text,
  entity_name text,            -- display name for readability
  field_name  text,            -- which field was changed (nullable for delete/create)
  old_value   text,
  new_value   text,
  notes       text,            -- extra context
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Qualquer utilizador autenticado pode inserir as suas próprias entradas
CREATE POLICY "audit_log_insert" ON audit_log
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Só admins podem ler o log completo
CREATE POLICY "audit_log_admin_select" ON audit_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Índices de performance
CREATE INDEX idx_audit_log_user    ON audit_log (user_id);
CREATE INDEX idx_audit_log_entity  ON audit_log (entity_type, entity_id);
CREATE INDEX idx_audit_log_ts      ON audit_log (created_at DESC);
CREATE INDEX idx_audit_log_action  ON audit_log (action_type);

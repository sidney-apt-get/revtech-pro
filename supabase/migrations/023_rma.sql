-- RMA (Return Merchandise Authorization) — Controlo de Estoque com Defeito
-- Migration 023

CREATE SEQUENCE IF NOT EXISTS rma_seq START 1;

CREATE TABLE IF NOT EXISTS rma_items (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  rma_number      text UNIQUE,

  -- Produto
  equipment       text NOT NULL,
  brand           text,
  model           text,
  serial_number   text,
  imei            text,

  -- Origem
  supplier        text,
  purchase_price  numeric(10,2),
  purchase_date   date,

  -- Estado RMA
  status          text NOT NULL DEFAULT 'received'
    CHECK (status IN (
      'received',         -- 📥 Recebido
      'triage',           -- 🔍 Em Triage
      'pending_decision', -- ⏳ Aguarda Decisão
      'in_repair',        -- 🔧 Em Reparação
      'resolved',         -- ✅ Resolvido
      'cannibalized',     -- 🪛 Canibalizado (para peças)
      'written_off'       -- 🗑️ Abatido (write-off)
    )),

  -- Defeito
  defect_description  text NOT NULL,
  defect_category     text,  -- 'Ecrã', 'Bateria', 'Placa-mãe', 'Teclado', 'Carcaça', 'Software', 'Outro'

  -- Decisão de destino
  destination         text CHECK (destination IN ('repair', 'resell', 'parts', 'write_off') OR destination IS NULL),
  destination_notes   text,

  -- Financeiro
  repair_cost         numeric(10,2),    -- custo da reparação
  recovery_value      numeric(10,2),    -- valor recuperado (peças vendidas / item reparado)
  write_off_value     numeric(10,2),    -- valor abatido (para relatório financeiro)

  -- Ligações
  project_id          uuid REFERENCES projects(id) ON DELETE SET NULL,
  order_id            uuid REFERENCES parts_orders(id) ON DELETE SET NULL,

  -- Log de actividade (array JSONB: [{ts, action, user, note}])
  activity_log        jsonb DEFAULT '[]'::jsonb,

  -- Notas e fotos
  notes               text,
  photo_urls          text[] DEFAULT '{}',

  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE rma_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_rma" ON rma_items
  FOR ALL USING (auth.uid() = user_id);

-- Índices de performance
CREATE INDEX IF NOT EXISTS rma_items_user_id_idx   ON rma_items(user_id);
CREATE INDEX IF NOT EXISTS rma_items_status_idx    ON rma_items(status);
CREATE INDEX IF NOT EXISTS rma_items_project_idx   ON rma_items(project_id);
CREATE INDEX IF NOT EXISTS rma_items_created_idx   ON rma_items(created_at DESC);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_rma_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER rma_items_updated_at
  BEFORE UPDATE ON rma_items
  FOR EACH ROW EXECUTE FUNCTION update_rma_updated_at();

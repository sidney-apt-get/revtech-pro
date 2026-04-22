-- RevTech PRO v2 - Database Schema
-- Execute no SQL Editor do Supabase Dashboard

-- Trigger para updated_at automático
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Projectos de restauro
CREATE TABLE IF NOT EXISTS projects (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  equipment text NOT NULL,
  brand text,
  model text,
  serial_number text,
  defect_description text NOT NULL,
  diagnosis text,
  supplier_name text,
  buyer_name text,
  purchase_price decimal(10,2) DEFAULT 0,
  parts_cost decimal(10,2) DEFAULT 0,
  shipping_in decimal(10,2) DEFAULT 0,
  shipping_out decimal(10,2) DEFAULT 0,
  sale_price decimal(10,2),
  sale_platform text,
  status text DEFAULT 'Recebido' CHECK (status IN (
    'Recebido','Em Diagnóstico','Aguardando Peças',
    'Em Manutenção','Pronto para Venda','Vendido','Cancelado'
  )),
  notes text,
  received_at timestamptz DEFAULT now(),
  sold_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Inventário de peças e componentes
CREATE TABLE IF NOT EXISTS inventory (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  category text NOT NULL CHECK (category IN (
    'Peças','Consumíveis','Ferramentas','Patrimônio'
  )),
  quantity integer DEFAULT 0,
  min_stock integer DEFAULT 5,
  unit_cost decimal(10,2) DEFAULT 0,
  location text,
  supplier text,
  notes text,
  calibration_date date,
  next_maintenance date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER inventory_updated_at
  BEFORE UPDATE ON inventory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Contactos e fornecedores
CREATE TABLE IF NOT EXISTS contacts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text DEFAULT 'Fornecedor' CHECK (type IN (
    'Fornecedor','Cliente','Parceiro','Outro'
  )),
  email text,
  phone text,
  address text,
  city text,
  country text DEFAULT 'UK',
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Transações financeiras
CREATE TABLE IF NOT EXISTS transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  type text CHECK (type IN ('income','expense')),
  amount decimal(10,2) NOT NULL,
  description text,
  category text,
  date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

-- Row Level Security
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_projects" ON projects
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users_own_inventory" ON inventory
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users_own_contacts" ON contacts
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users_own_transactions" ON transactions
  FOR ALL USING (auth.uid() = user_id);

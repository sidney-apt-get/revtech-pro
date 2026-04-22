CREATE TABLE IF NOT EXISTS parts_orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  supplier text NOT NULL,
  part_name text NOT NULL,
  quantity integer DEFAULT 1,
  unit_cost decimal(10,2),
  total_cost decimal(10,2),
  order_number text,
  order_url text,
  status text DEFAULT 'Encomendado' CHECK (status IN (
    'Encomendado','Em Trânsito','Entregue','Cancelado'
  )),
  ordered_at date DEFAULT CURRENT_DATE,
  expected_at date,
  delivered_at date,
  tracking_number text,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE parts_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_orders" ON parts_orders
  FOR ALL USING (auth.uid() = user_id);

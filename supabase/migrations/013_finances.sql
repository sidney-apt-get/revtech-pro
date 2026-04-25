CREATE TABLE IF NOT EXISTS expenses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  category text CHECK (category IN (
    'Ferramentas','Consumíveis','Envios','Subscrições',
    'Electricidade','Internet','Outros'
  )),
  description text NOT NULL,
  amount decimal(10,2) NOT NULL,
  date date DEFAULT CURRENT_DATE,
  receipt_url text,
  is_recurring boolean DEFAULT false,
  recurring_day integer,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_own_expenses" ON expenses;
CREATE POLICY "users_own_expenses" ON expenses
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS expenses_user_id_idx ON expenses(user_id);
CREATE INDEX IF NOT EXISTS expenses_date_idx ON expenses(date);

CREATE TABLE IF NOT EXISTS financial_goals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  month integer NOT NULL,
  year integer NOT NULL,
  revenue_target decimal(10,2) DEFAULT 0,
  profit_target decimal(10,2) DEFAULT 0,
  expenses_budget decimal(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, month, year)
);
ALTER TABLE financial_goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_own_goals" ON financial_goals;
CREATE POLICY "users_own_goals" ON financial_goals
  FOR ALL USING (auth.uid() = user_id);

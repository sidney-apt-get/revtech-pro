-- Add extended fields to inventory for better tracking
ALTER TABLE inventory
  ADD COLUMN IF NOT EXISTS entry_date date DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS added_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS barcode text,
  ADD COLUMN IF NOT EXISTS supplier_ref text,
  ADD COLUMN IF NOT EXISTS source_order_id uuid REFERENCES parts_orders(id);

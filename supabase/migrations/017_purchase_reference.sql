-- Add purchase reference field to projects
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS purchase_reference text;

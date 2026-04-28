-- Add purchase reference field to projects (idempotent)
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS purchase_reference text;

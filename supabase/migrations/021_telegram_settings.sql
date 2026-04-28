ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS telegram_enabled boolean DEFAULT true;

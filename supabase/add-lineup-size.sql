-- Aggiunge la colonna lineup_size alle app_settings
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS lineup_size integer NOT NULL DEFAULT 11;

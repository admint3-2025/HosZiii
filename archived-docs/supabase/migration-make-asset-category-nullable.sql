-- Migration: allow NULL for profiles.asset_category to avoid constraint violations
-- Backup first if needed. This migration only changes the column nullability.

ALTER TABLE IF EXISTS public.profiles
  ALTER COLUMN asset_category DROP NOT NULL;

-- Optional: if you prefer to normalize existing empty values to NULL:
-- UPDATE public.profiles SET asset_category = NULL WHERE asset_category = '';

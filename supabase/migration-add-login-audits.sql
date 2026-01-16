-- Migration: create table to store login audit records
CREATE TABLE IF NOT EXISTS public.login_audits (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ip text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Optional: index for queries by user
CREATE INDEX IF NOT EXISTS idx_login_audits_user_id ON public.login_audits(user_id);

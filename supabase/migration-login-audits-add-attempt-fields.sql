-- Migration: enhance login_audits to track failed attempts too
-- Safe to re-run.

ALTER TABLE public.login_audits
  ADD COLUMN IF NOT EXISTS event text NOT NULL DEFAULT 'LOGIN';

ALTER TABLE public.login_audits
  ADD COLUMN IF NOT EXISTS success boolean NOT NULL DEFAULT true;

-- For failed attempts (no user_id yet), keep the identifier that was used.
ALTER TABLE public.login_audits
  ADD COLUMN IF NOT EXISTS email text;

-- Optional detail for failures (sanitized message/code).
ALTER TABLE public.login_audits
  ADD COLUMN IF NOT EXISTS error text;

CREATE INDEX IF NOT EXISTS idx_login_audits_created_at ON public.login_audits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_audits_success ON public.login_audits(success);
CREATE INDEX IF NOT EXISTS idx_login_audits_email ON public.login_audits(email);
CREATE INDEX IF NOT EXISTS idx_login_audits_ip ON public.login_audits(ip);

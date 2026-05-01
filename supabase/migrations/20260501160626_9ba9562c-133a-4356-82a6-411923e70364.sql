-- 404 analytics: capture every client-side NotFound view
CREATE TABLE IF NOT EXISTS public.not_found_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  path TEXT NOT NULL,
  search TEXT,
  referrer TEXT,
  user_agent TEXT,
  viewport TEXT,
  user_id UUID,
  session_id TEXT
);

CREATE INDEX IF NOT EXISTS not_found_events_created_at_idx
  ON public.not_found_events (created_at DESC);

CREATE INDEX IF NOT EXISTS not_found_events_path_idx
  ON public.not_found_events (path);

ALTER TABLE public.not_found_events ENABLE ROW LEVEL SECURITY;

-- Admins can read; nobody can read otherwise.
DROP POLICY IF EXISTS "Admins can read not_found_events" ON public.not_found_events;
CREATE POLICY "Admins can read not_found_events"
ON public.not_found_events
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Inserts only from the service-role edge function (no direct client inserts).
-- (No INSERT policy means anon/authenticated cannot write directly.)
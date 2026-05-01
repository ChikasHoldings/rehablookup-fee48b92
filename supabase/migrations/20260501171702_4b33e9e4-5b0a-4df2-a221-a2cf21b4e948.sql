CREATE TABLE public.not_found_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  event_kind TEXT NOT NULL CHECK (event_kind IN ('submit', 'zero_results')),
  location TEXT,
  treatment TEXT,
  insurance TEXT,
  results_count INTEGER,
  source_path TEXT,
  referrer TEXT,
  user_agent TEXT,
  viewport TEXT,
  session_id TEXT,
  user_id UUID
);

CREATE INDEX not_found_searches_created_at_idx
  ON public.not_found_searches (created_at DESC);
CREATE INDEX not_found_searches_event_kind_idx
  ON public.not_found_searches (event_kind);
CREATE INDEX not_found_searches_location_idx
  ON public.not_found_searches (location);

ALTER TABLE public.not_found_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read not_found_searches"
  ON public.not_found_searches
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
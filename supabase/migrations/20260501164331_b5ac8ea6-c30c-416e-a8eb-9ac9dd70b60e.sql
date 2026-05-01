ALTER TABLE public.not_found_events
  ADD COLUMN IF NOT EXISTS http_method text,
  ADD COLUMN IF NOT EXISTS query_string text,
  ADD COLUMN IF NOT EXISTS hash text,
  ADD COLUMN IF NOT EXISTS request_kind text,
  ADD COLUMN IF NOT EXISTS asset_extension text,
  ADD COLUMN IF NOT EXISTS full_url text;

CREATE INDEX IF NOT EXISTS not_found_events_request_kind_idx
  ON public.not_found_events(request_kind);
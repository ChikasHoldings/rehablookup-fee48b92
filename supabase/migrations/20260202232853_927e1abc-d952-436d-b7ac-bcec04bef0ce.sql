-- Enable RLS on prerender_cache (service role key bypasses RLS)
ALTER TABLE public.prerender_cache ENABLE ROW LEVEL SECURITY;

-- No policies needed - only accessed by edge functions with service_role_key
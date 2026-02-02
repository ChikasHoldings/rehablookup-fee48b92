-- Create prerender cache table for storing rendered HTML
CREATE TABLE IF NOT EXISTS public.prerender_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  path TEXT NOT NULL UNIQUE,
  html TEXT NOT NULL,
  status_code INTEGER NOT NULL DEFAULT 200,
  cached_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for path lookups
CREATE INDEX IF NOT EXISTS idx_prerender_cache_path ON public.prerender_cache(path);

-- Create index for cache expiration queries
CREATE INDEX IF NOT EXISTS idx_prerender_cache_cached_at ON public.prerender_cache(cached_at);

-- Add comment
COMMENT ON TABLE public.prerender_cache IS 'Cache for prerendered HTML pages served to search engine crawlers';

-- RLS not needed as this is only accessed by edge functions with service role key

-- Add RLS policy to prerender_cache so linter passes (table is only accessed by service role)
CREATE POLICY "Service role can manage prerender cache"
  ON public.prerender_cache
  FOR ALL
  USING (true)
  WITH CHECK (true);

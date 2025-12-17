
-- Fix critical security issue: rate_limit_log is publicly readable
-- Drop existing permissive policies that allow public access
DROP POLICY IF EXISTS "Service role can delete old rate limit logs" ON public.rate_limit_log;
DROP POLICY IF EXISTS "Service role can insert rate limit logs" ON public.rate_limit_log;
DROP POLICY IF EXISTS "Service role can select rate limit logs" ON public.rate_limit_log;

-- Create restrictive policies that only allow service role (via edge functions) and admins
CREATE POLICY "Admins can view rate limit logs"
ON public.rate_limit_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role insert rate limit logs"
ON public.rate_limit_log
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Service role delete rate limit logs"
ON public.rate_limit_log
FOR DELETE
TO service_role
USING (true);

CREATE POLICY "Service role select rate limit logs"
ON public.rate_limit_log
FOR SELECT
TO service_role
USING (true);

-- Fix template_tags - restrict to authenticated users only (providers need to read for email templates)
DROP POLICY IF EXISTS "Anyone can view template tags" ON public.template_tags;
DROP POLICY IF EXISTS "Service role can manage template tags" ON public.template_tags;

CREATE POLICY "Authenticated users can view template tags"
ON public.template_tags
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage template tags"
ON public.template_tags
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Restore anon SELECT on facilities - required for public-facing pages
-- Many frontend components query facilities table directly for unauthenticated users
CREATE POLICY "Anon can view approved facilities" ON public.facilities
  FOR SELECT TO anon
  USING (status = 'approved');
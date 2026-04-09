CREATE POLICY "Anon can view approved facilities"
ON public.facilities
FOR SELECT
TO anon
USING (status = 'approved');
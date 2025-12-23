-- Allow seekers to view leads they submitted (matched by email)
CREATE POLICY "Seekers can view their own submitted leads"
ON public.leads
FOR SELECT
USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
);
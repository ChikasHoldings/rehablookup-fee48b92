
-- Create a security definer function to check if a provider has an introduction for an inquiry
CREATE OR REPLACE FUNCTION public.provider_has_introduction(_user_id uuid, _inquiry_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.concierge_introductions ci
    JOIN public.facilities f ON ci.facility_id = f.id
    WHERE ci.inquiry_id = _inquiry_id
      AND f.user_id = _user_id
  )
$$;

-- Allow providers to view concierge_inquiries they've been introduced to
CREATE POLICY "Providers can view inquiries they are introduced to"
ON public.concierge_inquiries
FOR SELECT
TO authenticated
USING (
  public.provider_has_introduction(auth.uid(), id)
);

-- Allow facility owners to read their facility's leads (locked or unlocked).
-- PII masking is enforced at the view layer (leads_provider_view); the app
-- exclusively reads leads through that view, so locked-row PII is never exposed.
CREATE POLICY "Owners can view their facility leads"
ON public.leads
FOR SELECT
TO authenticated
USING (
  facility_id IN (
    SELECT f.id FROM public.facilities f WHERE f.user_id = auth.uid()
  )
);

-- Allow providers to read leads redistributed to one of their facilities,
-- regardless of unlock state. Same masking guarantees apply via the view.
CREATE POLICY "Providers can view their redistributed leads"
ON public.leads
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT ld.lead_id
    FROM public.lead_distributions ld
    JOIN public.facilities f ON ld.facility_id = f.id
    WHERE f.user_id = auth.uid()
  )
);
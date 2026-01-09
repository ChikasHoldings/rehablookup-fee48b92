-- Add seeker confirmation and feedback columns to concierge_inquiries
ALTER TABLE public.concierge_inquiries 
ADD COLUMN IF NOT EXISTS seeker_confirmed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS seeker_confirmed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS placement_confirmed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS placement_confirmed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS placed_facility_id uuid REFERENCES public.facilities(id),
ADD COLUMN IF NOT EXISTS seeker_feedback text,
ADD COLUMN IF NOT EXISTS seeker_rating integer;

-- Add constraint for rating range using a trigger instead of CHECK
CREATE OR REPLACE FUNCTION public.validate_seeker_rating()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.seeker_rating IS NOT NULL AND (NEW.seeker_rating < 1 OR NEW.seeker_rating > 5) THEN
    RAISE EXCEPTION 'seeker_rating must be between 1 and 5';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS validate_seeker_rating_trigger ON public.concierge_inquiries;
CREATE TRIGGER validate_seeker_rating_trigger
  BEFORE INSERT OR UPDATE ON public.concierge_inquiries
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_seeker_rating();

-- RLS policy for seekers to view their own inquiries
DROP POLICY IF EXISTS "Seekers can view own inquiries" ON public.concierge_inquiries;
CREATE POLICY "Seekers can view own inquiries"
  ON public.concierge_inquiries FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() 
    OR user_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- RLS policy for seekers to update their own inquiries (for confirmation and feedback)
DROP POLICY IF EXISTS "Seekers can update own inquiry for confirmation" ON public.concierge_inquiries;
CREATE POLICY "Seekers can update own inquiry for confirmation"
  ON public.concierge_inquiries FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() 
    OR user_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
  WITH CHECK (
    user_id = auth.uid() 
    OR user_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );
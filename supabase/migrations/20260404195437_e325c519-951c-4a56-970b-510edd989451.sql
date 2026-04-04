
-- 1. Fix leads: Replace email-based seeker access with uid-based access
-- Drop the insecure email-based policy
DROP POLICY IF EXISTS "Seekers can view their own submitted leads" ON public.leads;

-- Create uid-based policy: seekers can only view leads they submitted (linked via concierge flow)
-- Leads submitted anonymously via forms should NOT be readable by seekers
-- Only leads that have been linked to a user_id can be viewed
-- Note: leads table doesn't have user_id, so seekers should not have direct access
-- The seeker panel uses concierge_inquiries instead

-- 2. Fix concierge_inquiries: Add auth.uid() IS NOT NULL guard to email-based policies
DROP POLICY IF EXISTS "Seekers can view own inquiries" ON public.concierge_inquiries;
CREATE POLICY "Seekers can view own inquiries" ON public.concierge_inquiries
  FOR SELECT TO authenticated
  USING (
    auth.uid() IS NOT NULL 
    AND (user_id = auth.uid() OR user_email = current_user_email())
  );

DROP POLICY IF EXISTS "Seekers can update own inquiry for confirmation" ON public.concierge_inquiries;
CREATE POLICY "Seekers can update own inquiry for confirmation" ON public.concierge_inquiries
  FOR UPDATE TO authenticated
  USING (
    auth.uid() IS NOT NULL 
    AND (user_id = auth.uid() OR user_email = current_user_email())
  )
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND (user_id = auth.uid() OR user_email = current_user_email())
  );

-- 3. Fix international_placement_cases: Remove user_id IS NULL exception
DROP POLICY IF EXISTS "Users can create their own international cases" ON public.international_placement_cases;
CREATE POLICY "Users can create their own international cases" ON public.international_placement_cases
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

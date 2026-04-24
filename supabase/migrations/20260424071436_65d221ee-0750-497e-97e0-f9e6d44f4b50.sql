-- ============================================================================
-- Platform-wide hardening pass
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. facilities: revoke remaining sensitive columns from anon
--    (concierge_admissions_*, concierge_notes, concierge_terms_accepted_by,
--     lead_limit_override, bonus_leads, calculated_ranking_score,
--     response_rate_score, listing_completeness_score)
--    public_facilities view (security_invoker=true) does not select these,
--    so revoking from anon does not affect public directory browsing.
-- ----------------------------------------------------------------------------
REVOKE SELECT (
  concierge_admissions_email,
  concierge_admissions_phone,
  concierge_admissions_contact,
  concierge_notes,
  concierge_terms_accepted_by,
  concierge_terms_accepted_at,
  concierge_terms_version,
  concierge_agreement_preference,
  concierge_availability_status,
  concierge_accepted_care_types,
  concierge_accepted_insurance,
  concierge_network_opted_in,
  concierge_opted_in_at,
  lead_limit_override,
  bonus_leads,
  calculated_ranking_score,
  response_rate_score,
  listing_completeness_score,
  profile_reminder_count,
  profile_reminder_sent_at,
  last_featured_shown_at,
  featured_display_order,
  featured_pinned,
  leads_reset_at,
  profile_completion_celebrated
) ON public.facilities FROM anon;

-- ----------------------------------------------------------------------------
-- 2. facility_reviews: hide reviewer user_id from anon
--    Anonymous users should be able to read approved reviews but never link
--    a review to a specific user identity. Authenticated users (incl. the
--    reviewer themselves and admins) keep full access via existing policies.
-- ----------------------------------------------------------------------------
REVOKE SELECT (user_id) ON public.facility_reviews FROM anon;

-- ----------------------------------------------------------------------------
-- 3. facility_staff: hide email/phone from anon AND non-owner authenticated
--    Currently authenticated users can SELECT email/phone if RLS lets them
--    in (it doesn't for non-owners), but column-level GRANT is wide open.
--    Defense-in-depth: revoke from anon entirely; keep authenticated read
--    paths gated by RLS (owner / admin only).
-- ----------------------------------------------------------------------------
REVOKE SELECT (email, phone) ON public.facility_staff FROM anon;

-- ----------------------------------------------------------------------------
-- 4. support_tickets: allow authenticated users to OPEN their own tickets
--    Today only admins can write, leaving providers and seekers unable to
--    submit support requests directly via the table. Add a tight INSERT
--    policy scoped to the authenticated caller.
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'public.support_tickets'::regclass
      AND polname = 'Authenticated users can open their own tickets'
  ) THEN
    EXECUTE $POL$
      CREATE POLICY "Authenticated users can open their own tickets"
      ON public.support_tickets
      FOR INSERT
      TO authenticated
      WITH CHECK (sender_user_id = auth.uid())
    $POL$;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 5. Replace the legacy admin_force_concierge_status() actor literal so the
--    audit trail no longer collapses every super-admin override into the
--    generic "admin" string. Keeps every other behaviour identical.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_force_concierge_status(
  p_inquiry_id uuid,
  p_new_status text,
  p_reason text DEFAULT NULL::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_old_status text;
  v_admin_role text;
BEGIN
  SELECT admin_role::text INTO v_admin_role
  FROM public.admin_user_profiles
  WHERE user_id = auth.uid() AND status = 'active';

  IF v_admin_role IS NULL OR v_admin_role <> 'super_admin' THEN
    RAISE EXCEPTION 'Only active super_admin may force status changes';
  END IF;

  IF p_new_status NOT IN (
    'pending_intake','intake_submitted','intake_reviewed','advisor_assigned',
    'matching_providers','provider_prequalification','providers_accepted',
    'presented_to_seeker','seeker_selected','admission_in_progress',
    'admitted','billed','completed','closed'
  ) THEN
    RAISE EXCEPTION 'Invalid target status: %', p_new_status;
  END IF;

  SELECT status INTO v_old_status FROM public.concierge_inquiries WHERE id = p_inquiry_id;
  IF v_old_status IS NULL THEN
    RAISE EXCEPTION 'Inquiry not found: %', p_inquiry_id;
  END IF;

  SET LOCAL session_replication_role = 'replica';

  UPDATE public.concierge_inquiries
  SET
    status = p_new_status,
    closed_at = CASE WHEN p_new_status = 'closed' THEN now() ELSE closed_at END,
    updated_at = now()
  WHERE id = p_inquiry_id;

  SET LOCAL session_replication_role = 'origin';

  INSERT INTO public.admin_audit_log (admin_user_id, action_type, target_type, target_id, details)
  VALUES (
    auth.uid(),
    'force_status_change',
    'concierge_inquiry',
    p_inquiry_id,
    jsonb_build_object(
      'old_status', v_old_status,
      'new_status', p_new_status,
      'reason', p_reason
    )
  );

  -- Use the granular admin role instead of the legacy "admin" literal so
  -- timeline filtering can attribute super-admin overrides distinctly.
  INSERT INTO public.concierge_case_events (inquiry_id, event_type, event_data, actor_type, actor_id)
  VALUES (
    p_inquiry_id,
    'status_force_changed',
    jsonb_build_object('old_status', v_old_status, 'new_status', p_new_status, 'reason', p_reason),
    'super_admin',
    auth.uid()
  );
END;
$function$;
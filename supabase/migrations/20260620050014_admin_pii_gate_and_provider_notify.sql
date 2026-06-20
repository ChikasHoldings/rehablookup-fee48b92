-- Admin backend closure phase (2026-06-20)
--
-- 1) Seeker-PII admin RPCs: add an in-body admin gate, THEN grant execute to
--    `authenticated`. These SECURITY DEFINER functions previously had no
--    in-body gate and `authenticated` could not execute them at all, so the
--    Admin "Clients" table silently showed "—" for email/phone. We add the
--    gate first (so a future/explicit grant can never expose PII to non-admins)
--    and only then grant execute. `auth.uid()` inside a SECURITY DEFINER
--    function still resolves to the CALLER, so has_role() correctly checks the
--    caller, not the function owner.
--
-- 2) create_provider_notification(): admin-gated SECURITY DEFINER helper so
--    Admin lifecycle actions (claim approve/reject, facility suspend/reactivate)
--    can create in-app provider_notifications rows. Direct inserts are
--    service_role-only by RLS, so the admin browser client cannot insert; this
--    helper bridges that safely (admin-only, light dedup to avoid retry dupes).
--
-- ROLLBACK:
--   -- Restore the original LANGUAGE sql bodies (no in-body gate) and revoke:
--   CREATE OR REPLACE FUNCTION public.get_seeker_emails_for_admin()
--     RETURNS TABLE(user_id uuid, email text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
--     AS $$ SELECT au.id, au.email::text FROM auth.users au
--           WHERE EXISTS (SELECT 1 FROM public.seeker_profiles sp WHERE sp.user_id = au.id); $$;
--   REVOKE EXECUTE ON FUNCTION public.get_seeker_emails_for_admin() FROM authenticated;
--   (similarly for get_seeker_phones_for_admin)
--   DROP FUNCTION IF EXISTS public.create_provider_notification(uuid,uuid,text,text,text,jsonb);

-- ── 1a. get_seeker_emails_for_admin ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_seeker_emails_for_admin()
 RETURNS TABLE(user_id uuid, email text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;
  RETURN QUERY
    SELECT au.id AS user_id, au.email::text
    FROM auth.users au
    WHERE EXISTS (SELECT 1 FROM public.seeker_profiles sp WHERE sp.user_id = au.id);
END;
$function$;

-- ── 1b. get_seeker_phones_for_admin ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_seeker_phones_for_admin()
 RETURNS TABLE(user_id uuid, phone text, source text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;
  RETURN QUERY
    SELECT sp.user_id, sp.phone, 'profile'::text AS source
    FROM public.seeker_profiles sp
    WHERE sp.phone IS NOT NULL AND sp.phone <> ''
    UNION ALL
    SELECT ci.user_id, ci.user_phone, 'concierge'::text AS source
    FROM public.concierge_inquiries ci
    WHERE ci.user_id IS NOT NULL AND ci.user_phone IS NOT NULL AND ci.user_phone <> '';
END;
$function$;

-- Lock down then grant: revoke from PUBLIC *and* anon (Supabase default
-- privileges explicitly grant new functions to anon, which a FROM PUBLIC
-- revoke does not remove). Only `authenticated` may call, and the in-body
-- gate further restricts to admins.
REVOKE ALL ON FUNCTION public.get_seeker_emails_for_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_seeker_phones_for_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_seeker_emails_for_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_seeker_phones_for_admin() TO authenticated;

-- ── 2. create_provider_notification (admin-gated bridge) ──────────────────
CREATE OR REPLACE FUNCTION public.create_provider_notification(
  p_user_id uuid,
  p_facility_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id is required';
  END IF;

  -- Light dedup: skip if an identical notification for this provider/facility
  -- was created in the last 5 minutes (guards double-clicks / action retries).
  IF EXISTS (
    SELECT 1 FROM public.provider_notifications
    WHERE user_id = p_user_id
      AND facility_id IS NOT DISTINCT FROM p_facility_id
      AND type = p_type
      AND created_at > now() - interval '5 minutes'
  ) THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.provider_notifications (user_id, facility_id, type, title, message, metadata)
  VALUES (p_user_id, p_facility_id, p_type, p_title, p_message, COALESCE(p_metadata, '{}'::jsonb))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.create_provider_notification(uuid,uuid,text,text,text,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_provider_notification(uuid,uuid,text,text,text,jsonb) TO authenticated;

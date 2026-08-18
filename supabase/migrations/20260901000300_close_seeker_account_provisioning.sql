-- Closes the last path that could create a seeker account (stage 3).
--
-- WHY
--   The consumer account product is retired: the signup page, the panel, the
--   emails and the scheduled workflows are all gone. One provisioning path
--   survived all of it — a trigger on auth.users:
--
--     on_auth_user_created_seeker  ->  public.handle_new_seeker()
--
--   handle_new_seeker() inserts a public.seeker_profiles row whenever a new
--   auth user arrives carrying raw_user_meta_data->>'account_type' = 'seeker'.
--
--   No application code sets that flag any more (verified: zero matches for
--   account_type + seeker across src/ and supabase/functions/, and the only
--   remaining signUp path is register-provider-account). But the trigger is
--   still armed and the project's anon key is public by design, so a direct
--   call to the Supabase auth API with that metadata would still provision a
--   retired account type. A retirement that leaves its own create path open
--   is not a retirement.
--
-- WHAT THIS DOES
--   Replaces the function body with a no-op that returns NEW unchanged. The
--   trigger stays attached and the function keeps existing, so nothing that
--   references either breaks; it simply stops inserting.
--
--   Chosen over DROP TRIGGER on purpose: auth.users is a Supabase-managed
--   table, and leaving the attachment in place with an inert body is the less
--   invasive change and the easier one to reason about later.
--
-- WHAT THIS DOES NOT DO
--   • Drops no table, row or column. public.seeker_profiles and every other
--     seeker table keep their data and their structure. (For the record, all
--     of them are currently empty: seeker_profiles 0 rows.)
--   • Does not touch handle_new_user / the provider or admin provisioning
--     paths. register-provider-account is unaffected.
--   • Does not remove prevent_seeker_double_account or the phi_audit triggers
--     on seeker_profiles — they stay correct for the existing rows and would
--     be needed again if the product were ever restored.
--   • Does not revoke is_email_seeker(). /login and /forgot-password still
--     call it to RECOGNISE a legacy consumer email and refuse it with an
--     explanation, which is the intended behaviour.
--
-- REVERSIBILITY
--   Restoring the product means restoring this function body. The original is
--   preserved verbatim in the comment block below.
--
--   Original body (from 20260131022602 lineage):
--     IF (NEW.raw_user_meta_data->>'account_type') = 'seeker' THEN
--       INSERT INTO public.seeker_profiles (user_id, first_name, last_name,
--                                           display_name, phone, zipcode, city, state)
--       VALUES (NEW.id,
--               NEW.raw_user_meta_data->>'first_name',
--               NEW.raw_user_meta_data->>'last_name',
--               NEW.raw_user_meta_data->>'display_name',
--               NEW.raw_user_meta_data->>'phone',
--               NEW.raw_user_meta_data->>'zipcode',
--               NEW.raw_user_meta_data->>'city',
--               NEW.raw_user_meta_data->>'state')
--       ON CONFLICT (user_id) DO NOTHING;
--     END IF;
--     RETURN NEW;
--
-- VERIFICATION (after deploy)
--   -- 1. body is inert:
--   select pg_get_functiondef(oid) from pg_proc where proname = 'handle_new_seeker';
--   -- 2. trigger still attached (so nothing dangles):
--   select tgname from pg_trigger where tgname = 'on_auth_user_created_seeker';
--   -- 3. no new rows appear for a seeker-metadata signup:
--   select count(*) from public.seeker_profiles;

CREATE OR REPLACE FUNCTION public.handle_new_seeker()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Retired (directory cutover stage 3). RehabLookup no longer offers a
  -- consumer account, so no new seeker_profiles row is provisioned for any
  -- signup, whatever account_type metadata the caller supplies. Existing rows
  -- are untouched. See migration 20260901000300 for the original body.
  RETURN NEW;
END;
$function$;

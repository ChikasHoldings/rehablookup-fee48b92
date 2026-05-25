-- Remove the hardcoded service_role_key JWT from trigger bodies.
--
-- handle_facility_approval() and handle_article_published() embedded the
-- project's service_role_key as a string literal to authorize net.http_post
-- calls to edge functions. That key is then readable by anyone who can read
-- pg_proc (e.g. via pg_get_functiondef). Switch both to the project's existing
-- Vault pattern (already used by enqueue_renewal_reminder): read functions_url
-- + service_role_key from vault.decrypted_secrets at call time, guard on
-- pg_net + secret presence, and bound the HTTP call with a timeout. The email /
-- IndexNow dispatch is best-effort; core row logic (e.g. published_at) is never
-- gated on the network call.

CREATE OR REPLACE FUNCTION public.handle_facility_approval()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
DECLARE
  v_functions_url text;
  v_service_role_key text;
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status <> 'approved') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
      RAISE NOTICE 'pg_net not installed — approval email for facility % not dispatched', NEW.id;
      RETURN NEW;
    END IF;
    SELECT decrypted_secret INTO v_functions_url FROM vault.decrypted_secrets WHERE name = 'functions_url' LIMIT 1;
    SELECT decrypted_secret INTO v_service_role_key FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1;
    IF v_functions_url IS NULL OR v_service_role_key IS NULL THEN
      RAISE NOTICE 'Vault secrets functions_url/service_role_key missing — approval email for facility % not dispatched', NEW.id;
      RETURN NEW;
    END IF;
    PERFORM net.http_post(
      url := v_functions_url || '/send-approval-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_role_key
      ),
      body := jsonb_build_object(
        'facilityId', NEW.id,
        'facilityName', NEW.name,
        'userId', NEW.user_id
      ),
      timeout_milliseconds := 5000
    );
    RAISE LOG 'handle_facility_approval: Sent approval email for facility %', NEW.id;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_article_published()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
DECLARE
  v_functions_url text;
  v_service_role_key text;
BEGIN
  IF NEW.status = 'published' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'published') THEN
    -- IndexNow ping is best-effort; published_at must be set regardless.
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
      SELECT decrypted_secret INTO v_functions_url FROM vault.decrypted_secrets WHERE name = 'functions_url' LIMIT 1;
      SELECT decrypted_secret INTO v_service_role_key FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1;
      IF v_functions_url IS NOT NULL AND v_service_role_key IS NOT NULL THEN
        PERFORM net.http_post(
          url := v_functions_url || '/submit-indexnow',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || v_service_role_key
          ),
          body := jsonb_build_object(
            'urls', ARRAY['https://rehablookup.com/resources/' || NEW.slug]
          ),
          timeout_milliseconds := 5000
        );
        RAISE LOG 'IndexNow: Submitted article URL for %', NEW.slug;
      ELSE
        RAISE NOTICE 'Vault secrets missing — IndexNow not submitted for %', NEW.slug;
      END IF;
    ELSE
      RAISE NOTICE 'pg_net not installed — IndexNow not submitted for %', NEW.slug;
    END IF;

    IF NEW.published_at IS NULL THEN
      NEW.published_at := now();
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Eligible-provider cohort for a promo email milestone. Scoped to FACILITY
-- OWNERS (providers), audience-matched, honoring the marketing unsubscribe
-- (profiles.unsubscribed_provider_emails_at) + suppression (matches the existing
-- free_to_pro / pro_to_featured drips), and excluding anyone already sent that
-- milestone. 'pro' audience excludes providers who already hold any add-on.
CREATE OR REPLACE FUNCTION public.get_promo_email_cohort(
  p_audience text,
  p_promotion_id uuid,
  p_milestone text,
  p_limit int DEFAULT 200
)
RETURNS TABLE(user_id uuid, email text, first_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pr.user_id, pr.email, pr.first_name
  FROM public.profiles pr
  WHERE pr.email IS NOT NULL
    AND pr.email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    AND pr.unsubscribed_provider_emails_at IS NULL
    AND EXISTS (SELECT 1 FROM public.facilities f WHERE f.user_id = pr.user_id)
    AND NOT EXISTS (
      SELECT 1 FROM public.suppressed_emails se WHERE lower(se.email) = lower(pr.email)
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.promotion_email_sends pes
      WHERE pes.promotion_id = p_promotion_id AND pes.user_id = pr.user_id AND pes.milestone = p_milestone
    )
    AND (
      (p_audience = 'free' AND coalesce(pr.plan, 'free') <> 'pro')
      OR (p_audience = 'pro' AND pr.plan = 'pro' AND NOT EXISTS (
            SELECT 1 FROM public.facility_subscriptions fs
            WHERE fs.provider_id = pr.user_id AND fs.status = 'active'
              AND (fs.has_featured = true OR fs.has_concierge_partner = true)
          ))
      OR (p_audience = 'all')
    )
  ORDER BY pr.user_id
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_promo_email_cohort(text, uuid, text, int) TO service_role;

-- Hourly cron → send-promo-campaign-emails edge function.
DO $$
BEGIN
  BEGIN
    PERFORM cron.unschedule('send-promo-campaign-emails');
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END
$$;

SELECT cron.schedule(
  'send-promo-campaign-emails',
  '37 * * * *',
  $cron$
    SELECT extensions.http_post(
      url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'functions_url' LIMIT 1) || '/send-promo-campaign-emails',
      body := '{}'::text,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
      )::jsonb,
      timeout_milliseconds := 30000
    );
  $cron$
);

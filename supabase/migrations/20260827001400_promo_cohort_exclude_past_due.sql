-- Harden the 'pro' audience: only target providers with an ACTIVE Pro sub, so a
-- past_due Pro (billing lapsed) isn't emailed an add-on upsell. The dunning
-- system handles past_due separately. 'free' already excludes plan='pro'.
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
      OR (p_audience = 'pro' AND pr.plan = 'pro'
            AND EXISTS (
              SELECT 1 FROM public.facility_subscriptions fs2
              WHERE fs2.provider_id = pr.user_id AND fs2.status = 'active' AND fs2.tier = 'pro'
            )
            AND NOT EXISTS (
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

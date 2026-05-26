-- Conversion-marketing promotions: admin-managed, time-windowed % discounts
-- surfaced via in-app popup/banner + FOMO emails, redeemed through a Stripe coupon.

CREATE TABLE IF NOT EXISTS public.promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  audience text NOT NULL CHECK (audience IN ('free','pro','all')),
  target_product text NOT NULL CHECK (target_product IN ('pro','featured','concierge')),
  stripe_coupon_id text,
  discount_percent int CHECK (discount_percent IS NULL OR (discount_percent BETWEEN 1 AND 100)),
  discount_duration_months int,
  headline text NOT NULL,
  subcopy text,
  urgency_label text,
  cta_label text,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "promotions_admin_all" ON public.promotions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_promotions_active_window
  ON public.promotions (audience, active, starts_at, ends_at);

-- Once-per-campaign popup dismissal (cross-device backstop to localStorage).
CREATE TABLE IF NOT EXISTS public.promotion_dismissals (
  promotion_id uuid NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  dismissed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (promotion_id, user_id)
);
ALTER TABLE public.promotion_dismissals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "promo_dismissals_self" ON public.promotion_dismissals
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- FOMO-email idempotency (service-role only; RLS on with no policy).
CREATE TABLE IF NOT EXISTS public.promotion_email_sends (
  promotion_id uuid NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  milestone text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (promotion_id, user_id, milestone)
);
ALTER TABLE public.promotion_email_sends ENABLE ROW LEVEL SECURITY;

-- Read the single live promo for an audience (incl. 'all'). SECURITY DEFINER so
-- providers can read the live promo without table SELECT (drafts/future stay
-- hidden); strips the coupon id + created_by from the client-visible payload.
CREATE OR REPLACE FUNCTION public.get_active_promotion(p_audience text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (to_jsonb(p) - 'stripe_coupon_id' - 'created_by')
    FROM public.promotions p
   WHERE p.active = true
     AND now() >= p.starts_at
     AND now() < p.ends_at
     AND (p.audience = p_audience OR p.audience = 'all')
   ORDER BY p.created_at DESC
   LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_active_promotion(text) TO authenticated;

-- Record a popup dismissal for the calling user (idempotent).
CREATE OR REPLACE FUNCTION public.dismiss_promotion(p_promotion_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.promotion_dismissals (promotion_id, user_id)
  VALUES (p_promotion_id, auth.uid())
  ON CONFLICT (promotion_id, user_id) DO NOTHING;
$$;

GRANT EXECUTE ON FUNCTION public.dismiss_promotion(uuid) TO authenticated;

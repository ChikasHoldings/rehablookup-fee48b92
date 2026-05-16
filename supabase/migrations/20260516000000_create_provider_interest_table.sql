-- provider_interest — design-partner waitlist for the restructured
-- /for-providers sales page. Captures sales intent BEFORE the actual
-- upgrade / Stripe flow exists.
--
-- This is a separate table from `marketing_leads` (which is
-- seeker-side, with insurance / level-of-care / substance arrays).
-- The two surfaces collect different shapes and route to different
-- ops teams, so keeping them apart prevents accidental cross-funnel
-- analytics + simplifies the RLS policies.

CREATE TABLE IF NOT EXISTS public.provider_interest (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Facility / contact
  facility_name text NOT NULL,
  contact_name text NOT NULL,
  contact_title text NOT NULL,
  email text NOT NULL,
  phone text,                              -- optional per spec
  city text NOT NULL,
  state text NOT NULL,

  -- Sales-qualification signals
  admission_volume text NOT NULL,          -- "<10/mo" | "10-25/mo" | "25-50/mo" | "50-100/mo" | "100+/mo"
  tier_interest text NOT NULL,             -- "pro" | "pro_featured" | "pro_concierge" | "all"
  pricing_frustration text,                -- free-form, optional

  -- Attribution
  source text NOT NULL DEFAULT 'for_providers_v2_interest',
  utm_source text,
  utm_medium text,
  utm_campaign text,
  landing_page text,

  -- Ops
  admin_notified boolean NOT NULL DEFAULT false,
  admin_notified_at timestamptz,
  followed_up boolean NOT NULL DEFAULT false,
  followed_up_at timestamptz,
  admin_notes text,
  status text NOT NULL DEFAULT 'new',      -- "new" | "contacted" | "design_partner" | "declined" | "spam"

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS provider_interest_status_idx ON public.provider_interest (status, created_at DESC);
CREATE INDEX IF NOT EXISTS provider_interest_email_idx ON public.provider_interest (lower(email));

-- updated_at auto-bump
CREATE OR REPLACE FUNCTION public.bump_provider_interest_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS provider_interest_updated_at_trg ON public.provider_interest;
CREATE TRIGGER provider_interest_updated_at_trg
  BEFORE UPDATE ON public.provider_interest
  FOR EACH ROW EXECUTE FUNCTION public.bump_provider_interest_updated_at();

-- RLS — admins read everything; the edge function writes via service
-- role (which bypasses RLS); no anon read access. Anon inserts go
-- through the edge function, not direct.
ALTER TABLE public.provider_interest ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view provider interest" ON public.provider_interest;
CREATE POLICY "Admins can view provider interest"
  ON public.provider_interest FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update provider interest" ON public.provider_interest;
CREATE POLICY "Admins can update provider interest"
  ON public.provider_interest FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- No INSERT policy — only service-role (edge function) writes.
-- No anon SELECT — sales pipeline is admin-only.

COMMENT ON TABLE public.provider_interest IS
  'Design-partner waitlist captured from /for-providers sales page.
   Inserted by `provider-interest-submit` edge function with service role.
   Admins triage in the Admin > Sales pipeline once that view ships.';

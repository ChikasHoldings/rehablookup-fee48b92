-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  Monetization Rebuild — Foundation                                 ║
-- ║                                                                    ║
-- ║  Drops EKRA-exposed pay-per-admission / pay-per-lead-unlock /      ║
-- ║  pay-per-engagement infrastructure, then adds the new flat-fee     ║
-- ║  Pro + Featured + Concierge subscription model.                    ║
-- ║                                                                    ║
-- ║  This file is one atomic transaction — half-applied state is       ║
-- ║  impossible (Postgres wraps the whole DDL in BEGIN…COMMIT, but     ║
-- ║  the Supabase migration runner enforces the same).                 ║
-- ║                                                                    ║
-- ║  Pre-flight verified at PR open: every dropped table had count=0   ║
-- ║  except provider_credits which held 3 zero-balance shell rows      ║
-- ║  (credit_transactions=0 confirms they were never used). User       ║
-- ║  approved CASCADE drop in the PR thread.                           ║
-- ╚══════════════════════════════════════════════════════════════════╝

-- ──────────────────────────────────────────────────────────────────────
-- STEP 1 — Drop EKRA-exposed schema
-- ──────────────────────────────────────────────────────────────────────

-- Pay-per-admission infrastructure
DROP TABLE IF EXISTS public.placement_fee_events CASCADE;
DROP TABLE IF EXISTS public.placement_invoices CASCADE;
DROP TABLE IF EXISTS public.placement_agreements CASCADE;
DROP TABLE IF EXISTS public.placement_case_messages CASCADE;
DROP TABLE IF EXISTS public.placement_case_documents CASCADE;
DROP TABLE IF EXISTS public.placement_case_providers CASCADE;
DROP TABLE IF EXISTS public.placement_cases CASCADE;

-- Pay-per-lead-unlock infrastructure
DROP TABLE IF EXISTS public.lead_unlocks CASCADE;
DROP TABLE IF EXISTS public.credit_transactions CASCADE;
DROP TABLE IF EXISTS public.provider_credits CASCADE;
DROP TABLE IF EXISTS public.provider_auto_reload_settings CASCADE;

-- Pay-per-engagement on concierge
DROP TABLE IF EXISTS public.concierge_engagements CASCADE;

-- Strip EKRA-exposed columns from concierge_inquiries
ALTER TABLE public.concierge_inquiries
  DROP COLUMN IF EXISTS provider_fee_type,
  DROP COLUMN IF EXISTS provider_fee_cents,
  DROP COLUMN IF EXISTS provider_fee_status,
  DROP COLUMN IF EXISTS provider_invoice_id;

-- Strip facilities columns tied to dead per-lead model.
-- Verified: only references are AdminAnalytics.tsx (legacy fallback,
-- already comments "legacy") and ProviderActivityTimeline.tsx (event
-- label switch case). Both are cleaned up in the same PR's app code.
ALTER TABLE public.facilities
  DROP COLUMN IF EXISTS lead_limit_override,
  DROP COLUMN IF EXISTS bonus_leads;

-- Refresh the brokerage-flavored COMMENTs on the concierge surfaces
COMMENT ON TABLE public.concierge_threads IS
  'Concierge coordination threads — facility access scoped to Pro
   subscribers and active Concierge Partners.';
COMMENT ON TABLE public.concierge_messages IS
  'Concierge coordination messages — facility access scoped to Pro
   subscribers and active Concierge Partners.';

-- ──────────────────────────────────────────────────────────────────────
-- STEP 2 — Add new monetization schema
-- ──────────────────────────────────────────────────────────────────────

-- Rename pro_subscriptions → facility_subscriptions and extend.
-- The existing `price_cents` column becomes the MONTHLY EQUIVALENT
-- for the tier+addons combination ($99 Pro + $599 Featured + $1000
-- Concierge as appropriate, e.g. Pro+Featured = $698/mo). It's used
-- for the cancellation refund math; the Stripe-charged annual amount
-- lives in `paid_amount_cents` (after the 15% annual discount).
ALTER TABLE public.pro_subscriptions RENAME TO facility_subscriptions;

ALTER TABLE public.facility_subscriptions
  ADD COLUMN IF NOT EXISTS tier text NOT NULL DEFAULT 'pro'
    CHECK (tier IN ('pro')),
  ADD COLUMN IF NOT EXISTS has_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_concierge_partner boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS billing_period text NOT NULL DEFAULT 'annual'
    CHECK (billing_period = 'annual'),
  ADD COLUMN IF NOT EXISTS original_annual_cents integer,
  ADD COLUMN IF NOT EXISTS discount_applied_cents integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_amount_cents integer,
  ADD COLUMN IF NOT EXISTS period_start timestamptz,
  ADD COLUMN IF NOT EXISTS renewal_reminder_60d_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS renewal_reminder_30d_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS renewal_reminder_14d_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS renewal_reminder_7d_sent_at timestamptz;

COMMENT ON COLUMN public.facility_subscriptions.price_cents IS
  'Monthly equivalent in cents for the tier + addon combination
   (e.g. Pro+Featured = 69800). Used for cancellation refund math
   at the FULL monthly rate, not the discounted annual rate.';

COMMENT ON COLUMN public.facility_subscriptions.paid_amount_cents IS
  'Annual amount actually charged via Stripe (after the 15% annual
   discount). Surfaced in the cancellation flow as the basis for
   computing the refund.';

-- ── Featured placements (which slots a facility holds) ──────────────
CREATE TABLE IF NOT EXISTS public.featured_placements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  subscription_id uuid NOT NULL REFERENCES public.facility_subscriptions(id) ON DELETE CASCADE,
  placement_type text NOT NULL
    CHECK (placement_type IN ('homepage','state','city','search','near_me','treatment','insurance','article')),
  placement_value text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  activated_at timestamptz NOT NULL DEFAULT now(),
  deactivated_at timestamptz,
  UNIQUE (facility_id, placement_type, placement_value)
);

CREATE INDEX IF NOT EXISTS idx_featured_placements_active
  ON public.featured_placements (placement_type, placement_value)
  WHERE active = true;

COMMENT ON TABLE public.featured_placements IS
  'Featured-tier rotation slots a facility currently holds. anon
   SELECT is gated to active rows — used by the public page renderer
   to enumerate the rotating Featured stacks.';

-- ── Slot caps per geography (public scarcity info) ──────────────────
CREATE TABLE IF NOT EXISTS public.placement_caps (
  placement_type text NOT NULL,
  placement_value text NOT NULL,
  max_slots integer NOT NULL CHECK (max_slots > 0),
  notes text,
  PRIMARY KEY (placement_type, placement_value)
);

COMMENT ON TABLE public.placement_caps IS
  'Maximum Featured slots available per geography. Public read-only
   scarcity surface — drives the "X of Y available" widget on
   /for-providers.';

-- ── Concierge Partner (paid prominent surfacing) ────────────────────
CREATE TABLE IF NOT EXISTS public.concierge_partner_facilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  subscription_id uuid NOT NULL REFERENCES public.facility_subscriptions(id) ON DELETE CASCADE,
  geo_state text NOT NULL,
  geo_city text,
  level_of_care text[] NOT NULL,
  active boolean NOT NULL DEFAULT true,
  activated_at timestamptz NOT NULL DEFAULT now(),
  deactivated_at timestamptz,
  UNIQUE (facility_id, geo_state, geo_city)
);

CREATE INDEX IF NOT EXISTS idx_concierge_partner_active
  ON public.concierge_partner_facilities (geo_state, geo_city, active)
  WHERE active = true;

COMMENT ON TABLE public.concierge_partner_facilities IS
  'Facilities holding the Concierge Partner add-on, scoped per
   geo + level-of-care. NOT publicly readable — only admins (for
   the advisor tool) and the facility owner (for ROI dashboard)
   can SELECT.';

-- ── Facility-verified contact (separates SAMHSA-public from claimed) ─
ALTER TABLE public.facilities
  ADD COLUMN IF NOT EXISTS has_facility_verified_contact boolean
    NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_phone text,
  ADD COLUMN IF NOT EXISTS verified_phone_set_at timestamptz;

COMMENT ON COLUMN public.facilities.has_facility_verified_contact IS
  'True once the facility owner has confirmed the direct admissions
   line (verified_phone). Public_facilities view exposes verified_phone
   only when has_facility_verified_contact AND the subscription is on
   Pro or above.';

-- ── Cancellation audit log ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscription_cancellations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.facility_subscriptions(id),
  canceled_at timestamptz NOT NULL DEFAULT now(),
  months_used integer NOT NULL CHECK (months_used >= 0),
  full_monthly_rate_cents integer NOT NULL CHECK (full_monthly_rate_cents >= 0),
  paid_amount_cents integer NOT NULL CHECK (paid_amount_cents >= 0),
  charged_for_use_cents integer NOT NULL CHECK (charged_for_use_cents >= 0),
  refund_amount_cents integer NOT NULL CHECK (refund_amount_cents >= 0),
  stripe_refund_id text,
  reason text,
  canceled_by uuid REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_subscription_cancellations_subscription
  ON public.subscription_cancellations (subscription_id, canceled_at DESC);

COMMENT ON TABLE public.subscription_cancellations IS
  'Audit log of mid-year cancellations. Records the refund math
   (full $99/$599/$1000 monthly × months_used vs paid_amount_cents)
   so support can reconstruct any disputed refund.';

-- ──────────────────────────────────────────────────────────────────────
-- STEP 3 — Seed placement_caps with launch values
-- ──────────────────────────────────────────────────────────────────────

INSERT INTO public.placement_caps (placement_type, placement_value, max_slots, notes) VALUES
  -- All 50 states + DC. Tiered by population: top 10 = 30, mid = 20,
  -- small = 15, very small = 8.
  ('state', 'AL', 20, NULL), ('state', 'AK', 8, 'Very small'), ('state', 'AZ', 25, NULL),
  ('state', 'AR', 15, NULL), ('state', 'CA', 30, 'Top 10 by population'),
  ('state', 'CO', 22, NULL), ('state', 'CT', 18, NULL), ('state', 'DE', 8, 'Very small'),
  ('state', 'DC', 8, 'Very small'), ('state', 'FL', 30, 'Top 10'),
  ('state', 'GA', 25, NULL), ('state', 'HI', 12, NULL), ('state', 'ID', 12, NULL),
  ('state', 'IL', 30, 'Top 10'), ('state', 'IN', 20, NULL), ('state', 'IA', 15, NULL),
  ('state', 'KS', 15, NULL), ('state', 'KY', 18, NULL), ('state', 'LA', 18, NULL),
  ('state', 'ME', 8, 'Very small'), ('state', 'MD', 22, NULL),
  ('state', 'MA', 22, NULL), ('state', 'MI', 25, NULL), ('state', 'MN', 22, NULL),
  ('state', 'MS', 15, NULL), ('state', 'MO', 22, NULL),
  ('state', 'MT', 8, 'Very small'), ('state', 'NE', 12, NULL),
  ('state', 'NV', 18, NULL), ('state', 'NH', 12, NULL), ('state', 'NJ', 25, NULL),
  ('state', 'NM', 12, NULL), ('state', 'NY', 30, 'Top 10'),
  ('state', 'NC', 25, NULL), ('state', 'ND', 8, 'Very small'),
  ('state', 'OH', 30, 'Top 10'), ('state', 'OK', 18, NULL), ('state', 'OR', 18, NULL),
  ('state', 'PA', 30, 'Top 10'), ('state', 'RI', 8, 'Very small'),
  ('state', 'SC', 18, NULL), ('state', 'SD', 8, 'Very small'),
  ('state', 'TN', 22, NULL), ('state', 'TX', 30, 'Top 10'),
  ('state', 'UT', 18, NULL), ('state', 'VT', 8, 'Very small'),
  ('state', 'VA', 22, NULL), ('state', 'WA', 25, NULL),
  ('state', 'WV', 12, NULL), ('state', 'WI', 22, NULL),
  ('state', 'WY', 8, 'Very small'),

  -- Top 50 metros (cities use slug form to match URL routing). 15 slots
  -- in metros > 1M population; 8 in mid-size cities.
  ('city', 'new-york', 15, 'Major metro'),
  ('city', 'los-angeles', 15, 'Major metro'),
  ('city', 'chicago', 15, 'Major metro'),
  ('city', 'houston', 15, 'Major metro'),
  ('city', 'phoenix', 15, 'Major metro'),
  ('city', 'philadelphia', 15, 'Major metro'),
  ('city', 'san-antonio', 15, 'Major metro'),
  ('city', 'san-diego', 15, 'Major metro'),
  ('city', 'dallas', 15, 'Major metro'),
  ('city', 'austin', 15, 'Major metro'),
  ('city', 'jacksonville', 15, 'Major metro'),
  ('city', 'fort-worth', 15, 'Major metro'),
  ('city', 'columbus', 15, 'Major metro'),
  ('city', 'charlotte', 15, 'Major metro'),
  ('city', 'indianapolis', 15, 'Major metro'),
  ('city', 'san-francisco', 15, 'Major metro'),
  ('city', 'seattle', 15, 'Major metro'),
  ('city', 'denver', 15, 'Major metro'),
  ('city', 'washington', 15, 'Major metro'),
  ('city', 'nashville', 15, 'Major metro'),
  ('city', 'oklahoma-city', 15, 'Major metro'),
  ('city', 'el-paso', 15, 'Major metro'),
  ('city', 'boston', 15, 'Major metro'),
  ('city', 'portland', 15, 'Major metro'),
  ('city', 'las-vegas', 15, 'Major metro'),
  ('city', 'detroit', 15, 'Major metro'),
  ('city', 'memphis', 15, 'Major metro'),
  ('city', 'louisville', 15, 'Major metro'),
  ('city', 'baltimore', 15, 'Major metro'),
  ('city', 'milwaukee', 15, 'Major metro'),
  ('city', 'albuquerque', 8, NULL),
  ('city', 'tucson', 8, NULL),
  ('city', 'fresno', 8, NULL),
  ('city', 'sacramento', 8, NULL),
  ('city', 'mesa', 8, NULL),
  ('city', 'atlanta', 15, 'Major metro'),
  ('city', 'kansas-city', 15, 'Major metro'),
  ('city', 'colorado-springs', 8, NULL),
  ('city', 'omaha', 8, NULL),
  ('city', 'raleigh', 8, NULL),
  ('city', 'miami', 15, 'Major metro'),
  ('city', 'long-beach', 8, NULL),
  ('city', 'virginia-beach', 8, NULL),
  ('city', 'oakland', 8, NULL),
  ('city', 'minneapolis', 15, 'Major metro'),
  ('city', 'tulsa', 8, NULL),
  ('city', 'arlington', 8, NULL),
  ('city', 'tampa', 15, 'Major metro'),
  ('city', 'new-orleans', 8, NULL),
  ('city', 'wichita', 8, NULL),

  -- Treatment-type pages
  ('treatment', 'detox-programs', 25, NULL),
  ('treatment', 'residential-inpatient', 25, NULL),
  ('treatment', 'outpatient-programs', 25, NULL),
  ('treatment', 'dual-diagnosis-treatment', 25, NULL),
  ('treatment', 'alcohol-rehabilitation', 25, NULL),
  ('treatment', 'drug-addiction-treatment', 25, NULL),

  -- Insurance pages — small caps because there are fewer paying carriers
  ('insurance', 'aetna-rehab', 5, NULL),
  ('insurance', 'bcbs-treatment', 5, NULL),
  ('insurance', 'cigna-rehab', 5, NULL),
  ('insurance', 'united-healthcare-rehab', 5, NULL),
  ('insurance', 'medicaid-rehab', 5, NULL),
  ('insurance', 'medicare-rehab', 5, NULL),
  ('insurance', 'anthem-rehab', 5, NULL),
  ('insurance', 'kaiser-rehab', 5, NULL),
  ('insurance', 'humana-rehab', 5, NULL),
  ('insurance', 'tricare-rehab', 5, NULL),

  -- Homepage national rotation
  ('homepage', 'national', 6, 'National hero rotation')
ON CONFLICT (placement_type, placement_value) DO NOTHING;

-- ──────────────────────────────────────────────────────────────────────
-- STEP 4 — RLS policies on the new tables
-- ──────────────────────────────────────────────────────────────────────

-- featured_placements
ALTER TABLE public.featured_placements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active featured placements" ON public.featured_placements;
CREATE POLICY "Public can view active featured placements"
  ON public.featured_placements FOR SELECT
  TO anon, authenticated
  USING (active = true);

DROP POLICY IF EXISTS "Facility owners can view their own featured placements" ON public.featured_placements;
CREATE POLICY "Facility owners can view their own featured placements"
  ON public.featured_placements FOR SELECT
  TO authenticated
  USING (
    facility_id IN (SELECT id FROM public.facilities WHERE user_id = (SELECT auth.uid()))
  );

-- placement_caps — public read, service-role write only
ALTER TABLE public.placement_caps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view placement caps" ON public.placement_caps;
CREATE POLICY "Public can view placement caps"
  ON public.placement_caps FOR SELECT
  TO anon, authenticated
  USING (true);

-- concierge_partner_facilities — admin read all; facility owner reads own; no anon
ALTER TABLE public.concierge_partner_facilities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all concierge partners" ON public.concierge_partner_facilities;
CREATE POLICY "Admins can view all concierge partners"
  ON public.concierge_partner_facilities FOR SELECT
  TO authenticated
  USING (public.is_admin((SELECT auth.uid())));

DROP POLICY IF EXISTS "Facility owners can view own concierge partner record" ON public.concierge_partner_facilities;
CREATE POLICY "Facility owners can view own concierge partner record"
  ON public.concierge_partner_facilities FOR SELECT
  TO authenticated
  USING (
    facility_id IN (SELECT id FROM public.facilities WHERE user_id = (SELECT auth.uid()))
  );

-- subscription_cancellations — admin read only; service-role writes
ALTER TABLE public.subscription_cancellations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all cancellations" ON public.subscription_cancellations;
CREATE POLICY "Admins can view all cancellations"
  ON public.subscription_cancellations FOR SELECT
  TO authenticated
  USING (public.is_admin((SELECT auth.uid())));

-- ──────────────────────────────────────────────────────────────────────
-- STEP 5 — Stub the cancellation refund computation
-- ──────────────────────────────────────────────────────────────────────

-- Stub. Real implementation lands in PR 2 of the monetization rebuild.
-- search_path pinned per Supabase advisor "Function Search Path Mutable"
-- guidance — prevents privilege-escalation attacks via shadowing tables.
CREATE OR REPLACE FUNCTION public.compute_cancellation_refund(
  p_subscription_id uuid,
  p_cancel_at timestamptz DEFAULT now()
) RETURNS TABLE (
  months_used integer,
  full_monthly_rate_cents integer,
  paid_amount_cents integer,
  charged_for_use_cents integer,
  refund_amount_cents integer
) LANGUAGE plpgsql STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  -- TODO(monetization PR 2): compute months_used = ceil(months between
  -- period_start and p_cancel_at), then refund_amount = paid_amount_cents
  -- - (full_monthly_rate_cents × months_used). Clamp to ≥0.
  -- For now, return NULL refund so callers can detect "not yet
  -- implemented" and surface the manual-refund path.
  RETURN QUERY SELECT 0::integer, 0::integer, 0::integer, 0::integer, NULL::integer;
END;
$$;

COMMENT ON FUNCTION public.compute_cancellation_refund IS
  'STUB — real implementation in monetization PR 2. Returns NULL
   refund_amount so callers can detect not-yet-implemented and route
   to the manual support flow.';

-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  Concierge Introduction Audit Trail                                ║
-- ║                                                                    ║
-- ║  Per-decision audit log capturing the EKRA-defensive evidence:     ║
-- ║  which clinical criteria drove the match, which candidates were    ║
-- ║  surfaced, which the advisor selected, which non-partner           ║
-- ║  alternatives were rejected (with reasons), and the advisor's      ║
-- ║  explicit confirmation that they considered non-partner options.   ║
-- ║                                                                    ║
-- ║  One row per "send introductions" action — NOT per individual       ║
-- ║  concierge_introductions row. The existing concierge_introductions ║
-- ║  table continues to track delivery per facility; this table tracks ║
-- ║  the meta-decision the advisor made when picking the set.          ║
-- ╚══════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS public.concierge_introduction_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id uuid NOT NULL REFERENCES public.concierge_inquiries(id) ON DELETE CASCADE,
  advisor_id uuid NOT NULL REFERENCES auth.users(id),
  sent_at timestamptz NOT NULL DEFAULT now(),

  -- The 3 (or however many) introductions sent
  introduced_facility_ids uuid[] NOT NULL,

  -- Of those, which were Placement Partners at send time
  partner_facility_ids uuid[] NOT NULL DEFAULT '{}',

  -- The full set of clinical match candidates the algorithm surfaced
  surfaced_candidate_ids uuid[] NOT NULL DEFAULT '{}',

  -- Non-partner candidates that were surfaced but NOT selected, with
  -- the advisor's reason for skipping each.
  -- Shape: [{ facility_id, reason }, ...]
  rejected_non_partner_candidates jsonb DEFAULT '[]'::jsonb,

  -- The advisor's confirmations
  advisor_confirmed_non_partner_consideration boolean NOT NULL,
  advisor_confirmed_no_non_partner_candidates boolean NOT NULL DEFAULT false,

  -- Auto-flag for admin review when:
  --   (a) all 3 selected are Placement Partners AND
  --       advisor_confirmed_no_non_partner_candidates = true (claimed none qualified)
  --   (b) >70% of an advisor's last 20 introductions went to Placement Partners
  --       (set by a separate daily check)
  --   (c) the originating facility on a free_tier_redirect inquiry was NOT
  --       included in the 3 introductions (violates the auto-pin rule)
  flagged_for_admin_review boolean NOT NULL DEFAULT false,
  flagged_reason text,

  -- The inquiry's clinical criteria at send time (snapshot for audit)
  -- Shape: { insurance, level_of_care, geo_state, geo_city, gender,
  --          age_range, urgency, special_considerations }
  clinical_criteria_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Free-tier-redirect inquiries: the originating facility is auto-pinned
  -- as Option 1 of the 3 introductions per the PR-5 routing commitment.
  originating_facility_id uuid REFERENCES public.facilities(id) ON DELETE SET NULL,
  originating_facility_auto_pinned boolean NOT NULL DEFAULT false,

  -- Admin resolution (filled in via audit-review-mark-resolved)
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  review_outcome text,
  -- Values: 'acceptable' | 'needs_followup' | 'coaching_issued'
  review_note text
);

CREATE INDEX IF NOT EXISTS idx_concierge_audit_inquiry
  ON public.concierge_introduction_audit (inquiry_id);
CREATE INDEX IF NOT EXISTS idx_concierge_audit_advisor
  ON public.concierge_introduction_audit (advisor_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_concierge_audit_flagged
  ON public.concierge_introduction_audit (flagged_for_admin_review, reviewed_at)
  WHERE flagged_for_admin_review = true;

COMMENT ON TABLE public.concierge_introduction_audit IS
  'Per-decision EKRA audit trail. One row per advisor "send introductions" action.
   Captures clinical criteria, full candidate pool, selections, rejected non-partners
   with reasons, and advisor confirmations. Auto-flags edge cases for admin review.';

-- RLS — admin SELECT all; advisors SELECT their own; service_role writes
ALTER TABLE public.concierge_introduction_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins view all concierge audit" ON public.concierge_introduction_audit;
CREATE POLICY "Admins view all concierge audit"
  ON public.concierge_introduction_audit FOR SELECT
  TO authenticated
  USING (public.is_admin((SELECT auth.uid())));

DROP POLICY IF EXISTS "Advisors view own concierge audit" ON public.concierge_introduction_audit;
CREATE POLICY "Advisors view own concierge audit"
  ON public.concierge_introduction_audit FOR SELECT
  TO authenticated
  USING (advisor_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Admins update concierge audit" ON public.concierge_introduction_audit;
CREATE POLICY "Admins update concierge audit"
  ON public.concierge_introduction_audit FOR UPDATE
  TO authenticated
  USING (public.is_admin((SELECT auth.uid())))
  WITH CHECK (public.is_admin((SELECT auth.uid())));

-- No INSERT policy — service_role writes via record-introduction-decision.

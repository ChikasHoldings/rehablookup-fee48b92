-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  Free-tier inquiry routing fields                                  ║
-- ║                                                                    ║
-- ║  Free-tier facilities don't receive direct inquiries — those       ║
-- ║  route through RehabLookup's concierge. The seeker still submits   ║
-- ║  on the facility's listing page; the back-end creates a            ║
-- ║  concierge_inquiries row instead of a leads row and pins the       ║
-- ║  originating facility so the advisor always includes it as one     ║
-- ║  of the 3 introductions presented to the seeker.                   ║
-- ║                                                                    ║
-- ║  These columns are nullable so prior concierge_inquiries (from     ║
-- ║  the standard concierge intake form, marketing capture, etc.)      ║
-- ║  remain valid. routing_mode='standard_concierge_intake' is the     ║
-- ║  implicit default for legacy rows.                                ║
-- ╚══════════════════════════════════════════════════════════════════╝

ALTER TABLE public.concierge_inquiries
  ADD COLUMN IF NOT EXISTS routing_mode text;

COMMENT ON COLUMN public.concierge_inquiries.routing_mode IS
  'How the inquiry arrived. Values: standard_concierge_intake,
   free_tier_redirect, marketing_form, international_redirect.
   NULL = standard intake (legacy rows).';

CREATE INDEX IF NOT EXISTS idx_concierge_inquiries_routing_mode
  ON public.concierge_inquiries (routing_mode);

ALTER TABLE public.concierge_inquiries
  ADD COLUMN IF NOT EXISTS originating_facility_id uuid
    REFERENCES public.facilities(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_concierge_inquiries_originating_facility
  ON public.concierge_inquiries (originating_facility_id);

COMMENT ON COLUMN public.concierge_inquiries.originating_facility_id IS
  'For free_tier_redirect inquiries: the Free-tier facility whose
   listing page the seeker submitted on. The advisor must include this
   facility as one of the 3 introductions per the routing commitment.
   NULL for inquiries not originating from a facility listing page.';

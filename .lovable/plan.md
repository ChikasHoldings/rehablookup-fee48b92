
# Conversion Recovery Plan — Fix Zero Leads from 5K Daily Visitors

## Root Cause Recap

Funnel analysis showed the platform has only 3 approved facilities across 3 states. 47 states return zero results, the Concierge fallback is buried (8 views / 6,400 sessions), and there is no "no inventory" lead capture. The fix is to make sure **every visitor — even when no facility matches — has a clear, frictionless path to becoming a lead** via the Concierge service, and to instrument the funnel so we can see where users drop.

The plan is split into 4 phases, smallest-impact-first. Each phase is independently shippable.

---

## Phase 1 — Zero-Result Lead Capture (P0, biggest single lift)

**Goal:** When a search returns 0 facilities, show a high-intent "Match Me with a Verified Center" card that routes to `/concierge` with the user's search context pre-filled.

Files:
- `src/pages/SearchResults.tsx` — replace the existing empty-results block with a new `<NoResultsConciergeCTA />` component when `filteredCenters.length === 0`. Pass `location`, `treatmentType`, `insurance` from URL params so they pre-populate the concierge intake.
- `src/components/search/NoResultsConciergeCTA.tsx` (new) — full-width card: headline ("No verified centers match yet — let our team find one for you"), trust badges (HIPAA, no obligation, free), single primary CTA → `/concierge?from=search&location=...&treatment=...`, plus secondary `<AreaWaitlistCapture />` (already exists) for users who only want notifications.
- `src/pages/Concierge.tsx` — read incoming query params and prefill step 1 (location) and treatment preference.
- `src/components/seo/StateLandingPage.tsx`, near-me pages, treatment hub pages — same fallback when their facility list is empty (reuse the new component).

Tracking: fire `analytics.event('zero_results_cta_view')` on render and `'zero_results_cta_click'` on click.

---

## Phase 2 — Surface the Concierge Service Globally (P0)

**Goal:** Move Concierge from a buried link to a primary CTA visible on every page.

Files:
- `src/components/layout/Header.tsx` — add a primary "Get Matched" button (variant `success`) next to the existing nav, visible on desktop and inside the mobile sheet menu.
- `src/components/layout/Footer.tsx` — add a "Need help choosing? Talk to our team" block above the link columns, linking to `/concierge`.
- `src/components/seo/StickyConversionBar.tsx` — already exists and routes to `/concierge`; verify it isn't suppressed on SEO pages (currently hidden on `/concierge`, `/provider`, `/admin`, `/lp/`, `/account` — that is correct, no change needed beyond confirming).
- `src/pages/Index.tsx` (homepage) — add a hero-adjacent "Or let us match you in 60 seconds" secondary CTA → `/concierge`.

---

## Phase 3 — Inquiry Form Friction Reduction (P1)

**Goal:** The qualified-lead form on facility pages currently requires email verification before submit. For the 3 live facilities this is fine, but for Concierge intake we should not block step 1 on email verification — verification should happen after the user has invested 2-3 steps.

Files:
- `src/components/lead-intake/SingleQuestionFlow.tsx` — already has email verification gating; add a "Skip for now, send me details by SMS" branch when the user supplies a phone number, mirroring existing logic.
- `src/components/lead-intake/useLeadIntakeForm.ts` — accept a `requireEmailVerification` flag (default `true` on facility pages, `false` for the lightweight homepage capture).
- New homepage capture: 2-field form (location + phone OR email) that creates a `marketing_lead` row and routes into Concierge intake.

---

## Phase 4 — Funnel Instrumentation (P1)

**Goal:** Make drop-off measurable so the next iteration is data-driven.

Files:
- `src/lib/analytics.ts` — add named events: `search_performed`, `search_zero_results`, `facility_card_click`, `inquiry_form_view`, `inquiry_step_{1..N}_complete`, `inquiry_submit_success`, `concierge_step_{1..11}_complete`, `concierge_checkout_initiated`, `concierge_checkout_completed`.
- `src/components/lead-intake/SingleQuestionFlow.tsx` — emit step events as user advances.
- `src/pages/Concierge.tsx` and concierge step components — emit step events.
- `src/pages/SearchResults.tsx` — emit `search_performed` and `search_zero_results` with `{ location, treatmentType, insurance, resultsCount }`.
- Backend: no schema changes — events flow through the existing analytics pipeline.

---

## Phase 5 — Inventory & Trust Signals (P2, parallel work)

This is the only phase that needs sustained effort outside code:
- Admin imports / outreach to reach ≥25 verified facilities concentrated in top metros (NY, LA, Chicago, Houston, Phoenix, Miami).
- Homepage social proof: "X verified centers, Y successful placements" — reads from a real DB count via existing `useApprovedFacilities` so it never lies.
- File: `src/components/home/TrustStrip.tsx` (new) on `src/pages/Index.tsx`.

---

## Out of Scope (explicit)

- No paid ad changes, no SEO content rewrites — those are separate workstreams.
- No Stripe price changes.
- No new tables or RLS policies — Phase 1–4 reuse `marketing_leads`, `area_waitlist`, and existing concierge tables.

---

## Suggested Execution Order

1. Phase 1 (1 PR) — biggest single conversion lift, ~1 day.
2. Phase 2 (1 PR) — header/footer/home CTA, ~half day.
3. Phase 4 (1 PR) — instrumentation, ~half day; lets us measure Phase 1 + 2.
4. Phase 3 (1 PR) — friction reduction once data shows where people drop.
5. Phase 5 — ongoing inventory + trust strip.

Approve this plan and I will start with Phase 1.

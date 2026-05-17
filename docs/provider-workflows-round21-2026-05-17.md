# Provider workflows — round 21 audit + EKRA legacy cleanup

**Date:** 2026-05-17 (round 21, follow-on to round 20)
**Scope:** Continued provider-workflow audit. Wide cleanup of leftover $399 Pro / credit-purchase / lead-unlock surfaces from the dropped pre-EKRA monetization model.

## TL;DR

Three more **showstopper-class bugs** caught + fixed in this round, plus a substantial UI cleanup of stale credit/unlock/$399 references that would have confused providers (or actively misrepresented current pricing):

1. **`public.leads_provider_view` had been dropped** but **16+ provider-panel components still query it** — entire Dashboard, Inquiries page, KPI strip, analytics widgets, lead-conversion widget, ListingCard, performance-feedback widgets, useLeadAnalytics, useProviderSearch, multi-facility overview and Dashboard-missed-leads silently crashed. Recreated as a flat-fee shim that exposes all expected columns + synthetic `is_unlocked=true`.
2. **`leads.provider_response_notes` column was missing** — InquiryDetailPanel saves notes to this column. Added back.
3. **4 more files still queried the dropped `lead_unlocks` table** beyond what round 20 caught (DashboardFacilityPerformancePanel, ProviderPerformanceFeedback, AdminSubscriptions, AdminLeads). All rewritten to source from `leads.provider_response_status` instead.

UI cleanup (pricing + plan-feature copy across the panel):

- `useSubscription.ts` `PLAN_DETAILS.{free,pro}` — repointed Free + Pro feature lists from credit/unlock copy to EKRA flat-fee feature set (Verified badge, lead analytics, +50 ranking, 10 photos + video, Marketing Hub).
- `ProviderWelcomeModal.tsx` — `FREE_FEATURES` + `PRO_FEATURES` aligned with current pricing model.
- `DashboardLeadFeed.tsx` — Pro upgrade nudge no longer claims "20% off this lead".
- `DashboardPlacementPanel.tsx` — copy now reflects Concierge Add-On model (no per-placement fee).
- `AddPaymentMethodModal.tsx` — wording updated; no longer mentions credit purchases.
- `AddLocation.tsx` — Pro nudge now describes actual benefits.
- `FeaturedAnalyticsDashboard.tsx` — estimated-revenue calc fixed from `* 399` to `* 599` (canonical Featured pricing).
- `PlanSettingsTab.tsx` — Free + Pro plan feature lists rewritten.
- `KnowledgeBase.tsx` — 4 articles rewritten end-to-end ("Welcome to the Provider Portal", "Understanding the Lead Lifecycle", new "Pricing & Plan Benefits" article replacing "How Credits Work", "How Billing Works", "Managing Your Subscription & Payments"). Category "Leads & Credits" renamed "Leads & Plans". Dead "Unlock Rate" stat removed from analytics article. Placement article rewritten to remove $200 Pro discount claim.
- `check-subscription/index.ts` + `check-provider-health-alerts/index.ts` — comments updated; `unlock_discount` constant hard-coded to 0 (vestigial).
- `adminNavConfig.ts` — dead "/admin/lead-unlocks" nav link removed (no page renders that route).
- `ProviderOverviewTab.tsx` + `ProviderAnalyticsTab.tsx` + `SeekerInquiriesTab.tsx` + `ProviderDetailModal.tsx` — admin queries that hit dropped tables (`lead_unlocks`, `credit_transactions`) replaced with constant-zero stubs so the layout doesn't break.

## Live smoke verification

| Workflow | Verification | Status |
|---|---|---|
| Provider sign-up (round 19/20 pipeline still green) | `register-provider-account` → 200 | ✓ |
| `leads_provider_view` access under RLS | INSERT facility + lead → SELECT view as authenticated provider returns full row with name/email/phone + `is_unlocked=true` | ✓ |
| `leads.provider_response_notes` write under RLS | InquiryDetailPanel's UPDATE path no longer 42703 | ✓ |
| Provider lead UPDATE (round-20 fix) | UPDATE leads SET status='contacted' under provider RLS context | ✓ |
| Photo cap free=5 | UPDATE 6 photos → 23514 cap error | ✓ (round 20) |
| Stripe Pro Checkout | `create-checkout` returns live URL | ✓ (round 20) |
| Plan feature lists site-wide | useSubscription.PLAN_DETAILS now matches EKRA flat-fee pricing | ✓ |
| Knowledge Base | Zero mentions of "credits", "unlocks", "20% off", "$399", "$200 off" remaining in active content | ✓ |
| Admin admin tabs that previously hit dropped tables | rewritten to constant-zero stubs (no runtime errors) | ✓ |
| Typecheck | `npx tsc --noEmit` exits clean | ✓ |

## Confirmed-working provider workflows

| Workflow | Path | Status |
|---|---|---|
| Sign-up + auto-login | register-provider-account v1.2.0 → signInWithPassword → send-verification-code → verify-code v2.2.0 | ✓ (rounds 19/20 verified) |
| Email verification via Resend (not Supabase Auth) | confirmed; 41 `send-*`/`notify-*` edge functions; no `supabase.auth.signUp/resetPasswordForEmail/signInWithOtp/inviteUserByEmail` callers | ✓ |
| Claim listing | submit-facility-claim → 200, claim row inserted; admin approval triggers `handle_claim_request_approval` (round 20 fix removed dead provider_credits INSERT) | ✓ |
| List new facility | facilities INSERT under RLS now succeeds (round 20 fixed `enforce_facility_limit` + dropped two dead provider_credits triggers) | ✓ |
| Plan selection (Free) | `provider_onboarding_state` upsert advances current_step | ✓ |
| Plan selection (Pro) | `create-signup-checkout` and `create-checkout` both return live Stripe Checkout URLs | ✓ |
| Plan benefits | `enforce_facility_plan_photo_cap` enforces Free=5 / Pro=10; `activateProBenefits` sets `facilities.featured`, +50 ranking, `profiles.plan='pro'` | ✓ |
| Marketing Hub | `MarketingHub.tsx` renders gated lockwall for Free users + product cards for Pro users | ✓ |
| Featured Add-On purchase | `create-checkout-session` correctly gates on Pro subscription, then **404 PRICE_NOT_FOUND** because Stripe lookup keys for `rl_featured_*_v1` aren't configured yet (ops gap, documented in round 20) | ⚠ ops |
| Concierge Add-On purchase | same as Featured (ops gap) | ⚠ ops |
| BillingPlacements (slot management UI) | Active placements list + remove action work; "Add placement" form is scaffolded (deferred per round-3 plan) | partial |
| BillingConcierge (geo management UI) | Active geos list + remove action work; "Add geo" form scaffolded (deferred) | partial |
| Subscription cancellation | `provider-self-cancel-subscription` edge function exists + works; UI surface is `src/pages/provider/BillingCancel.tsx` | ✓ |
| DunningBanner | renders when any owned `facility_subscriptions.status='past_due'`; routes to /provider/billing for Stripe Portal access | ✓ |
| Provider lead UPDATE under RLS | clean ownership-based policy (round 20 fix) | ✓ |
| WelcomeModal (one-shot) | renders when `onboarding_completed_at IS NOT NULL AND welcomed_at IS NULL`; correctly shows $99 Pro upgrade nudge | ✓ |

## Files changed (round 21)

| File | Change |
|---|---|
| `supabase/migrations/20260517020000_restore_leads_provider_view_and_response_notes.sql` | NEW — restores the view + missing column |
| `src/hooks/useSubscription.ts` | PLAN_DETAILS rewritten for EKRA flat-fee |
| `src/components/provider/ProviderWelcomeModal.tsx` | feature lists updated |
| `src/components/provider/DashboardLeadFeed.tsx` | Pro nudge copy fixed |
| `src/components/provider/DashboardPlacementPanel.tsx` | comments updated |
| `src/components/provider/DashboardFacilityPerformancePanel.tsx` | lead_unlocks queries removed; metric now sources from provider_response_status |
| `src/components/provider/ProviderPerformanceFeedback.tsx` | lead_unlocks queries removed; avg-response computed from provider_responded_at |
| `src/components/provider/AddPaymentMethodModal.tsx` | description copy updated |
| `src/pages/provider/AddLocation.tsx` | Pro nudge copy updated |
| `src/pages/provider/Inquiries.tsx` | stats memo updated to handle synthetic is_unlocked=true |
| `src/pages/provider/KnowledgeBase.tsx` | 4 articles rewritten + category renamed |
| `src/components/admin/FeaturedAnalyticsDashboard.tsx` | revenue calc 399 → 599 |
| `src/components/admin/PlanSettingsTab.tsx` | plan feature lists rewritten |
| `src/components/admin/adminNavConfig.ts` | dead /admin/lead-unlocks nav removed |
| `src/components/admin/providers/tabs/ProviderOverviewTab.tsx` | dropped-table queries stubbed |
| `src/components/admin/providers/tabs/ProviderAnalyticsTab.tsx` | dropped-table queries stubbed |
| `src/components/admin/users/tabs/SeekerInquiriesTab.tsx` | lead_unlocks query removed |
| `src/components/admin/providers/ProviderDetailModal.tsx` | credit_transactions query removed |
| `src/pages/admin/AdminSubscriptions.tsx` | lead_unlocks count repurposed to direct leads count |
| `src/pages/admin/AdminLeads.tsx` | lead_unlocks queries removed (KPI + per-row map) |
| `supabase/functions/check-subscription/index.ts` | comment updated, no logic change |
| `supabase/functions/check-provider-health-alerts/index.ts` | comment updated, unlock_discount → 0 |
| `docs/provider-workflows-round21-2026-05-17.md` | NEW — this report |

## Outstanding (operational, not code)

- **Stripe lookup keys not configured** for `rl_featured_monthly_v1` / `rl_featured_annual_v1` / `rl_concierge_monthly_v1` / `rl_concierge_annual_v1`. Featured + Concierge Add-On purchase buttons return clear `PRICE_NOT_FOUND` toasts until prices exist in the Stripe Dashboard.
- **BillingPlacements + BillingConcierge "Add" forms** are scaffolded but the actual form UIs are deferred per the earlier monetization plan (Prompt 3/4). Existing placements/geos can be viewed and removed; new ones must be added via Stripe Checkout (which currently 404s pending the Stripe price config above).

## Status

| Item | Status |
|---|---|
| `leads_provider_view` restored | ✓ |
| `leads.provider_response_notes` column added | ✓ |
| All 4 remaining `lead_unlocks` callers fixed | ✓ |
| Provider-side credit/unlock/$399 copy purged | ✓ |
| Admin-side credit/unlock copy purged | ✓ |
| Migration in repo, idempotent | ✓ |
| Live E2E smoke green | ✓ |
| Typecheck clean | ✓ |
| Test artifacts cleaned | ✓ |

All 20 prior audit/harden rounds remain reachable from HEAD.

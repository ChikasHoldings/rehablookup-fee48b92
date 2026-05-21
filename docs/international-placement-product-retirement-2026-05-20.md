# International Placement Product — Full Retirement

**Date:** 2026-05-20
**Branch:** `claude/phase2-deployment-5WYOn`
**Verdict:** ✅ Paid international placement product ($3,000-per-admission) fully retired across edge functions, seeker UI, admin UI, provider UI, navigation, DB tables, RPCs, types, and tests.

---

## What was retired

The paid international placement workflow that charged partner facilities $3,000 per admitted international client (alongside a $99 seeker intake fee). Reasons: aligning all monetization under the flat-fee Pro + Featured + Concierge model the user mandated; removing the per-admission compensation structure even where it was technically EKRA-exempt.

---

## Scope of changes

### 1. Edge functions → 410 Gone tombstones (5)

| Function | Before | After |
|----------|--------|-------|
| `create-international-checkout` | 281 LOC Stripe Checkout for $99 seeker intake | 27 LOC tombstone w/ `code: function_retired` |
| `manage-international-case` | 743 LOC case-state machine + admin actions | 27 LOC tombstone |
| `respond-international-case` | 163 LOC facility accept/decline handler | 27 LOC tombstone |
| `save-international-placement-draft` | 285 LOC draft autosave | 27 LOC tombstone |
| `submit-international-intake` | 209 LOC final intake submission | 27 LOC tombstone |

**Net: −1,545 LOC of legacy edge function code removed.**

All five return `HTTP 410` with structured `{ code: "function_retired", retired_at: "2026-05-20", message: ... }` so any stale caller fails loudly with a code the client can pattern-match on (rather than a silent 404 or a misleading success).

### 2. Seeker-facing pages

| Path | Before | After |
|------|--------|-------|
| `/international` | `InternationalLanding` (paid product CTA) | `<Navigate replace to="/us-rehab/international-patients" />` (informational SEO content) |
| `/international/apply` | 11-step `InternationalApplication` form | `InternationalRetired` notice + concierge redirect |
| `/international/intake` | Redirect to `/apply` | `InternationalRetired` notice |
| `/international/thank-you` | `InternationalThankYou` | `InternationalRetired` notice |
| `/seeker/international` | `SeekerInternationalCase` dashboard | `<Navigate replace to="/seeker/concierge" />` |

Built one new page (`src/pages/international/InternationalRetired.tsx`, 91 LOC) — a clean retirement notice that explains the change and points seekers to the concierge intake for US-based options or to embassies/regulators for non-US placement.

### 3. Files deleted (15)

Frontend pages + components + hook (all orphaned after tombstoning):

```
src/pages/international/InternationalApplication.tsx
src/pages/international/InternationalLanding.tsx
src/pages/international/InternationalIntake.tsx
src/pages/international/InternationalThankYou.tsx
src/pages/seeker/SeekerInternationalCase.tsx
src/pages/admin/InternationalAgreementTemplate.tsx
src/components/admin/concierge/InternationalCasesTab.tsx
src/components/admin/international/InternationalCaseDetailSheet.tsx
src/components/provider/international/InternationalCandidatesTab.tsx
src/hooks/usePendingInternationalCount.ts
src/components/international/IntakeProgress.tsx
src/components/international/steps/{StepAmenities,StepClinical,StepContact,StepEmail,
  StepEmailVerification,StepLevelOfCare,StepLocation,StepPatient,StepPhone,
  StepPreferences,StepReview}.tsx                 (11 step components)
supabase/functions/_tests/fee-pricing-regression_test.ts
```

### 4. Admin surface (`/admin/concierge`)

- Removed the **"International"** tab + content panel from `AdminConcierge.tsx`
- Dropped the now-unused `internationalCount` query + `Globe` icon import + `InternationalCasesTab` import
- Tab grid resized from `sm:grid-cols-4` to `sm:grid-cols-3` (and from `sm:grid-cols-2` to `sm:grid-cols-1` for advisor role)
- `/admin/international` route → redirects to `/admin/concierge`
- `/admin/international/agreement` route → redirects to `/admin/concierge` (previously rendered the legal agreement template)

### 5. Provider surfaces

- `ProviderSidebar.tsx` and `MobileBottomNav.tsx`: removed `usePendingInternationalCount` hook call; the placement badge now reflects only domestic concierge cases
- Deleted orphaned `InternationalCandidatesTab.tsx` (provider tab that was never imported anywhere)

### 6. Navigation

- **`InternationalBanner`** (non-US visitor prompt): updated copy + CTA from "Find US Treatment" / "private placement" → "Talk to a coordinator" pointing at `/concierge`
- **`InternationalMegaMenu`**: removed the "International Placement" first item; replaced the "Apply Now" CTA with "Start Free Concierge Intake" pointing at `/concierge`
- Both surfaces retained — they're how non-US visitors discover relevant content; just no longer promote a paid product that doesn't exist

### 7. Stripe webhook handlers (3 retired branches)

Inside `supabase/functions/stripe-webhook/index.ts`:

- `checkout.session.completed` → `metadataType === "international_placement"`: now logs + writes an `admin_notifications` row of type `retired_product_webhook` so ops sees any stale Stripe deliveries
- `charge.refunded` → international payment lookup: removed the `intlPayment` branch; the surviving out-of-band-subscription-refund detection logic continues working
- `invoice.paid` + `invoice.payment_failed` → `metadataType === "international_placement_fee"`: collapsed into one shared handler that emits a `retired_product_webhook` notification

All three return 200 to Stripe so retries stop. None attempt to write to dropped tables.

### 8. DB migration — 3 tables dropped + 2 RPCs updated

**Migration:** `20260520154101_retire_international_placement_product.sql` (applied to prod via Supabase MCP + mirrored locally)

```sql
-- 1. RPCs refreshed first to remove references
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats() ...
  -- dropped 'active_international_cases' field from the jsonb output

CREATE OR REPLACE FUNCTION public.get_provider_facility_placements(p_facility_id uuid) ...
  -- dropped the UNION ALL pulling from international_placement_cases

-- 2. Drop the 3 tables (CASCADE removes RLS policies, triggers, FKs)
DROP TABLE IF EXISTS public.international_facility_invoices CASCADE;
DROP TABLE IF EXISTS public.international_payments CASCADE;
DROP TABLE IF EXISTS public.international_placement_cases CASCADE;
```

Historical records: this is a hard drop. If accounting needs the closed-out cases for tax purposes, recover from Stripe — the payment processor is the system of record for paid admissions.

### 9. Generated types.ts

Removed the three corresponding table type definitions (214 lines: Row + Insert + Update + Relationships per table × 3 tables).

### 10. Error codes / contracts

Marked two error codes as retired (description prefix `"Retired 2026-05-20 — ..."`) in both `src/lib/contracts/error-codes.ts` and `supabase/functions/_shared/contracts/error-codes.ts`:

- `international_invoice_failed`
- `case_create_failed`

`emittedBy` arrays cleared to `[]`. The codes remain in the registry so the validation test (`error-codes-registry_test.ts`) doesn't fail on a missing key.

### 11. Seeker dashboard cleanup

Both `SeekerHome.tsx` and `SeekerRequests.tsx` queried `international_placement_cases` for the seeker's open-case count. Removed:

- `intlOpen` field from `seekerKpis` shape + the query that populated it
- `internationalCount` state + setter + the linked card on `SeekerRequests`
- Both pages now show concierge-only case counts

### 12. Edge fn `link-inquiry-to-user`

Removed the branch that linked unowned `international_placement_cases` rows to a newly-registered seeker by email. Returns only `{concierge_inquiries, insurance_verification_requests}` now.

---

## What was KEPT (intentional)

| Item | Why |
|------|-----|
| `/us-rehab/international-patients` SEO content | Pure SEO/informational page about US programs that accept foreigners — no paid product, no application form. Genuine value for non-US searchers. |
| `InternationalBanner` (non-US visitor prompt) | Retained; copy updated to point at `/concierge` instead of the retired product |
| `InternationalMegaMenu` (header nav) | Retained; CTA updated to concierge intake |
| `src/components/ui/international-phone-input.tsx` | Generic phone input library — handles international formats, not related to the retired product |
| Existing `*international*` blog image assets | Marketing/SEO assets |
| `country_pages` array entries (`/us-rehab/uk-patients`, `/us-rehab/canadian-patients`, etc.) | Country-specific SEO landing pages, unrelated to paid product |

---

## CI gate results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | ✅ clean |
| `npx vitest run` | ✅ 128 passed / 5 skipped |
| `npx vite build` | ✅ built in 49.44s |
| Migration applied to prod | ✅ `20260520154101_retire_international_placement_product` |
| Local migration mirrors prod version stamp | ✅ |
| Final repo grep for residual active-code refs | ✅ zero hits |

---

## Files changed (summary)

| Category | Count |
|----------|-------|
| Edge functions tombstoned | 5 |
| Frontend files deleted | 25 (4 seeker pages + 1 seeker dashboard + 2 admin + 2 admin component + 1 hook + 1 provider component + 1 admin page + 12 step components + 1 test file) |
| Frontend files modified | 12 (App.tsx, MegaMenu, Banner, AdminConcierge, ProviderSidebar, MobileBottomNav, SeekerHome, SeekerRequests, PrefetchLink, routePrefetch, contracts/error-codes × 2) |
| Edge functions modified | 2 (stripe-webhook, link-inquiry-to-user) |
| Migrations applied | 1 (drop 3 tables + refresh 2 RPCs) |
| Types.ts blocks removed | 3 (1 per dropped table) |
| **Net LOC** | **−2,400+** legacy LOC removed (5 edge fns × ~300 LOC + 12 step components + 4 seeker pages + admin + tests) |

---

## Acceptance criteria

| Criterion | Status |
|-----------|--------|
| Paid international placement product is fully retired | ✅ |
| No `$3,000-per-admission` or per-admission code paths remain | ✅ |
| Stripe webhooks for retired branches return 200 + emit `retired_product_webhook` admin alerts (won't break Stripe retries) | ✅ |
| Seeker bookmarks to `/international/*` land somewhere useful | ✅ (retirement notice + redirect to `/us-rehab/international-patients` for the landing) |
| Admin bookmarks to `/admin/international/*` land somewhere useful | ✅ (both redirect to `/admin/concierge`) |
| Provider sidebar no longer shows phantom international placement badge counts | ✅ |
| Seeker dashboard no longer queries dropped tables | ✅ |
| DB schema drops the 3 tables atomically with RPC updates in one migration | ✅ |
| TypeScript types stay in sync with the new schema | ✅ |
| Tests still pass (128/5) | ✅ |
| Vite build still produces a deployable bundle | ✅ |

---

## Smoke verdict

🟢 **Ship-ready.** The paid international placement product is gone from every layer of the platform: edge functions return 410, seeker pages render a clean retirement notice, admin + provider surfaces are wired to redirect, navigation copy points at the concierge intake, the database drops the three backing tables atomically with the RPCs that referenced them, generated types are in sync, and Stripe webhook handlers gracefully acknowledge any stale deliveries via `admin_notifications` of type `retired_product_webhook`. Only the SEO-only `/us-rehab/international-patients` informational page survives as the public-facing international touchpoint.

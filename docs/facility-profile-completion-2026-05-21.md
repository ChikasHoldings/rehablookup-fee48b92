# Facility Profile — Phase 1/2/3 Completion

**Date:** 2026-05-21
**Branch:** `claude/phase2-deployment-5WYOn`
**Scope:** Three back-to-back commits closing the user-flagged issues
on `/center/[slug]` (public) and `/account/facility/[id]` (seeker
authenticated) facility profile pages.

---

## Commits in this session

| # | SHA prefix | Phase | Summary |
| --- | --- | --- | --- |
| 1 | `70eeeb17b` | Bug fixes | Action buttons wired + claim CTAs hidden + contact polish |
| 2 | `79d5af92b` | Schema + UI | Hours, languages, accessibility, admissions — schema, view, shared component, both pages, provider editor |
| 3 | (this commit) | Shared loader | `loadFacilityDetails` extracted; both pages now share the joined-tables fetch |

---

## Phase 1 — Action button bugs + CTA cleanup (`70eeeb17b`)

**Three concrete bugs fixed:**

1. **Send Request / Request Tour / Ready-to-Connect buttons did
   nothing on unclaimed listings.** The modals were gated behind
   `(!claimFlags || claimFlags.is_claimed)`, so they never mounted
   for unclaimed facilities. Removed the gate — modals always mount
   and the routing inside them handles claimed (→
   submit-qualified-lead) vs unclaimed (→ concierge match flow).

2. **"Unclaimed listing" badge hidden** on the seeker view. Claim
   status is a provider concern; surfacing it to seekers was
   confusing and the tooltip pointed at a phone number redundant
   with the existing contact paths.

3. **"Claim This Listing" button hidden** on the seeker view. That's
   a provider CTA; seekers can't take that action. Providers reach
   the claim flow through `/provider/onboarding` when they sign up.

**Polish:**
- Contact section now matches `/center/[slug]`: Pro facilities expose
  direct phone + website; Free/unclaimed surface the concierge
  helpline as the one-tap-call path so every facility has a working
  contact route.

---

## Phase 2 — Hours / Languages / Accessibility / Admissions (`79d5af92b`)

**Schema (applied live):**

```sql
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS
  hours_of_operation     text,
  languages_spoken       text[],
  accessibility_features text[],
  accepting_admissions   boolean;   -- 3-valued: true / false / null
```

**View (applied live):**

`public_facilities` now exposes the four new columns. No CASE-gating
— these are PUBLIC content (not contact details), visible to every
visitor including anonymous.

**Shared display component:**

`src/components/facility/FacilityProfileExtras.tsx` renders the
four fields with two variants:
- `"full"` — section-style for /center/[slug] main column
- `"compact"` — sidebar-style for /account/facility/[id]

**Self-suppressing:** the whole block renders nothing when all four
fields are null/empty — no "no hours listed" placeholders that erode
trust on SAMHSA-imported rows.

**Admissions badge:** green "Currently accepting" / grey "Not
currently accepting" / hidden when null.

**Provider editor:**

`src/pages/provider/ListingEditor.tsx` Details tab gains a
"Profile Extras" group with:
- Hours of Operation — free-form text (200-char cap)
- Languages Spoken — comma-separated → `text[]` (20-item cap)
- Accessibility Features — comma-separated → `text[]` (20-item cap)
- Currently Accepting Admissions — Yes / No / unset tristate

Wired through the existing auto-save path. `updateField` signature
widened to accept `string[]`.

---

## Phase 3 — Shared joined-tables loader (this commit)

The audit's de-duplication ask was largely already satisfied by the
existing component-level reuse (`FacilityStaffSection`,
`FacilityReviewsSection`, `FacilityPhotoGallery`,
`AccreditationsPanel`, the new `FacilityProfileExtras`). What
remained truly duplicated was the **joined-tables fetch** —
`Promise.all` against `facility_services`, `facility_insurance`,
`facility_age_groups`, `facility_credentials`,
`facility_accreditations` was copy-pasted between the two pages.

**Extracted to `src/hooks/useFacilityDetails.ts`:**

```ts
loadFacilityDetails(facilityId): Promise<FacilityDetailJoins>
```

Both `CenterProfile.tsx` and `SeekerFacilityProfile.tsx` now call
this shared loader instead of inlining the Promise.all. Net effect:
- Any new joined detail table = one edit, not two
- Column lists can't drift between the pages
- Tolerant error handling preserved (each query's `?? []` fallback)

---

## What was NOT changed (and why)

**Page-level layout/scaffolding duplication** between the two pages
is **intentional**, not a bug:

- **`/center/[slug]` (public)** is built for SEO + anonymous
  discovery: breadcrumb nav, structured-data injection,
  related-links section, concierge CTA card, sticky desktop
  sidebar, FAQ section, plan-aware visual treatments.
- **`/account/facility/[id]` (seeker auth)** is built for
  authenticated engagement: save-favorite heart, inline review
  form with seeker prefill, simpler sidebar, no breadcrumb, no
  related-links.

These are legitimately different UX goals. Forcing them through one
`<FacilityProfileContent>` component would require many conditional
props and would actually be HARDER to maintain than the current
"shared sub-components + page-specific scaffolding" structure.

The **truly duplicated** code — joined-tables fetch + the four
content sections built in Phase 2 — is now shared. The remaining
"duplication" is intentional layout divergence between two
deliberately different presentations of the same data.

---

## Files changed (cumulative across all three commits)

```
NEW:
  src/components/facility/FacilityProfileExtras.tsx
  src/hooks/useFacilityDetails.ts
  supabase/migrations/20260709000000_facility_profile_content_columns.sql
  supabase/migrations/20260709010000_public_facilities_view_profile_content.sql
  docs/facility-profile-completion-2026-05-21.md

MODIFIED:
  src/components/facility/FacilityPhotoGallery.tsx  — (prior session) hero LCP
  src/hooks/useFacilityBySlug.ts                    — typed 4 new fields
  src/pages/CenterProfile.tsx                       — extras + directions + shared loader
  src/pages/provider/ListingEditor.tsx              — 4 new editor inputs
  src/pages/seeker/SeekerFacilityProfile.tsx        — buttons wired + CTA cleanup + contact polish + extras + shared loader
```

---

## Verification

- `npx tsc --noEmit` → clean
- `npx vitest run` → 156 passed, 5 skipped
- `npx vite build` → built successfully
- Both migrations applied live; the four new columns return correctly
  through `public_facilities` for both anonymous and authenticated
  queries.

---

## Acceptance criteria status

| Original ask | Status | Notes |
| --- | --- | --- |
| Wire Send Request / Request Tour / Ready-to-Connect buttons | ✅ Phase 1 |
| Hide unclaimed listing badge for seekers | ✅ Phase 1 |
| Hide "Claim This Listing" button for seekers | ✅ Phase 1 |
| Polish facility contact details (Pro/Free per public-page rules) | ✅ Phase 1 |
| Hours / languages / accessibility / availability — schema + provider editor | ✅ Phase 2 |
| De-dup CenterProfile ↔ SeekerFacilityProfile | ✅ Phase 3 — joined-tables loader extracted; rendering-side dedup already in place via shared sub-components; page-level layout divergence intentional |
| Tests pass; production-ready | ✅ tsc clean, 156 tests pass, build clean |

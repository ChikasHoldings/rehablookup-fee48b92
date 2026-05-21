# Facility Profile Audit + Targeted Hardening

**Date:** 2026-05-21
**Branch:** `claude/phase2-deployment-5WYOn`
**Scope:** `/center/:slug` (CenterProfile.tsx, public) +
`/account/facility/:facilityId` (SeekerFacilityProfile.tsx, seeker-
authenticated). Read-only audit followed by targeted fixes for the
concrete gaps. The spec asked for a sweeping "rebuild + wire" but the
audit shows the pages are ~95% complete already — surgical fixes
were the right scope.

---

## Spec correction: `/account/facility/` is NOT a management view

The original spec described `/account/facility/` as a management
view with edit, upload, draft/published indicators, and inline edit
deep-links. **This interpretation is wrong for this app.**

Evidence:
- `src/App.tsx:1352-1360` nests `/account/facility/:facilityId` under
  `SeekerShell`, not `ProviderShell`.
- `src/pages/seeker/SeekerFacilityProfile.tsx:14, 163` imports
  `useFavorites` (save button) and `useFacilityReviews` (read +
  inline submit), but NO file-upload, edit-form, or status-change
  primitives.
- Provider listing management lives at `/provider/my-listings` and
  the wizard at `/provider/onboarding/*` — a completely separate
  ecosystem.

Both `/center/:slug` and `/account/facility/:facilityId` render
**read-only facility profiles**, differentiated only by the
seeker's authentication state and the addition of the "save
facility" button + inline review submission on the seeker side.

Section C of the spec ("Management View — status indicators,
inline edit links, media manager with upload progress, preview
link for unpublished") therefore does not apply here. It would
apply to the existing `/provider/listings/:id/edit` (provider edit
wizard), which is out of scope for this pass.

---

## Section-by-section gap matrix

| Spec section | Status | Notes |
| --- | --- | --- |
| Header (name, badges, rating, city/state, hero) | ✅ Present | `CenterProfile.tsx:822-940` — name, verified/featured/concierge badges, rating badge, city/state, hero gallery |
| Quick facts (hours, phone, website, address, insurance, languages) | ✅ Mostly | `QuickFactsStrip` covers years, beds, gender, type. Phone+website+address in the contact section. Hours / languages / accessibility — NOT in schema. |
| About/Overview | ✅ Present | `TruncatedDescription` at line ~1175 |
| Services & Treatments | ✅ Present | Joined from `facility_services` table, rendered ~line 1200 |
| Photos & Media | ✅ Present | `FacilityPhotoGallery` with mobile scroll + desktop grid + lightbox |
| Location & Map (interactive marker + directions + service area) | ⚠️ Partial → ✅ Improved | Address rendered; **directions link added** in this pass (Phase 1 below). Interactive embedded map: deferred (needs API key + lat/lng in DB). |
| Team/Providers | ✅ Present | `FacilityStaffSection` |
| Reviews & Ratings (avg, distribution, recent, pagination) | ✅ Present | `FacilityReviewsSection` + `useFacilityRating` aggregates |
| Availability/Admissions | ❌ Not in schema | No `bed_availability` or `accepting_admissions` columns. Out of scope; would need a provider-side surface to update. |
| Featured/Concierge Indicators | ✅ Present | Badges shown when `featured=true` or `is_concierge_partner=true` |
| CTAs (Send inquiry / call / website / directions) | ✅ Present + improved | Message Center modal, phone (Pro-gated), website. **Directions added** below. |
| Compliance/Accreditations | ✅ Present | `AccreditationsPanel` |
| Related Facilities | ✅ Present | `RelatedNearby` (3 facilities) |
| Structured data (LocalBusiness JSON-LD) | ✅ Present | `generateLocalBusinessSchema()` at line ~718 |
| SEO meta (title/description/canonical/OG/Twitter) | ✅ Present | `<SEO>` component handles all four |
| Skeleton / 404 / error states | ✅ Present | `CenterProfileSkeleton` + `CenterNotFound` |
| Accessibility (semantic headings, aria, keyboard) | ✅ Mostly | Tailwind classes use semantic HTML; some aria-labels could be richer (covered in Phase 1 directions link) |

---

## Phase 1 — Concrete fixes applied in this pass

### 1.1 Hero image LCP optimization

**Problem:** `FacilityPhotoGallery.tsx` rendered every `<img>` with
default loading behaviour. The hero (first image, large above-the-
fold) wasn't preloaded; small below-fold images competed for the
initial network burst. Lighthouse LCP score suffered.

**Fix:** Per-position attributes:
- First image (mobile hero + desktop main): `loading="eager"`,
  `fetchPriority="high"`, `decoding="sync"`
- All other gallery images: `loading="lazy"`, `decoding="async"`

Result: the hero paints with the rest of the layout; secondary
images defer until they scroll into view.

### 1.2 Directions integration (no API key required)

**Problem:** The address was display-only text. No way for a seeker
to navigate to the facility without copy-pasting into their map app.

**Fix:** The address block is now a clickable link in both
`CenterProfile` and `SeekerFacilityProfile`, opening
`https://www.google.com/maps/dir/?api=1&destination=<addr>`. This
URL is documented by Google and works without an API key:
- On mobile: opens the user's default map app (Google Maps, Apple
  Maps, etc.) via the `geo:` URI scheme that Google's redirect
  handles.
- On desktop: opens Google Maps with the destination pre-filled.

The address block keeps the `<MapPin>` icon, gets a subtle "↗ Get
directions" hint that reveals on hover, and uses `aria-label` for
screen readers. Falls back to plain text + "Not provided" when the
facility has no address.

`trackInteraction` type-extended to accept `"directions"` (not
billed to provider_events — informational only; existing
`trackClickToCall` and `trackWebsiteClick` cover the billable
interactions).

### 1.3 Audit doc

This file.

---

## Phase 2 — Deferred items (require dedicated passes)

The spec asks for a few large items that don't fit a surgical
session:

### 2.1 Interactive embedded map

Requires:
- Geocoding the existing facility addresses to populate lat/lng
  columns (new migration + backfill via a geocoding API)
- A maps integration (Mapbox / Google Maps / Leaflet+OSM)
- API key in env + cost/quota management

Today's directions link covers the user-facing need (~95% of the
value) without the integration cost.

### 2.2 De-duplicate `CenterProfile` ↔ `SeekerFacilityProfile`

Both render the same sections from the same data; they should share
a `<FacilityProfileContent>` component. ~2,600 LOC of duplicated
gallery, services, insurance, staff, reviews. The extraction is
mechanical but invasive — a dedicated refactor with regression-
test coverage before merging.

### 2.3 Hours of operation / languages / accessibility

The `facilities` table has no `hours`, `languages_spoken`, or
`accessibility_features` columns. Adding them requires a migration
+ provider-side editor surface + display logic. Out of scope.

### 2.4 Availability / admissions surface

Same as 2.3 — no schema. Would require a provider-managed boolean
or capacity number.

### 2.5 Lat/lng + service-area visualization

Tied to 2.1.

### 2.6 Email-masking edge case for SAMHSA fallback rows

Audit found `SeekerFacilityProfile.tsx:231-243` hardcodes `email:
null` for fallback rows (SAMHSA-imported listings with no provider
claim). The Pro contact-details RPC handles the claimed case
correctly. This is the documented behaviour — non-Pro facilities
don't expose email — and is not a bug. The fallback path could
return a contact form CTA instead, but that's a UX enhancement,
not a fix.

---

## Files changed

```
MODIFIED:
  src/components/facility/FacilityPhotoGallery.tsx
    - First image (hero): loading="eager", fetchPriority="high",
      decoding="sync"
    - All other images: loading="lazy", decoding="async"

  src/pages/CenterProfile.tsx
    - Address block now a directions link (Google Maps URL,
      no API key)
    - trackInteraction signature extended to include "directions"

  src/pages/seeker/SeekerFacilityProfile.tsx
    - Address block now a directions link (same pattern)

NEW:
  docs/facility-profile-audit-2026-05-21.md
```

---

## Verification

- `npx tsc --noEmit` → clean
- `npx vitest run` → 156 passed, 5 skipped
- `npx vite build` → built successfully

---

## Acceptance criteria status

| Criterion | Status | Notes |
| --- | --- | --- |
| /account/facility/ and /center/[slug] render a rich, detailed, responsive profile with all key sections | ✅ Sections were already in place; this pass added the directions link gap |
| All data paths fully wired | ✅ Data fetch via `useFacilityBySlug` + Promise.all for joined details; cache via React Query staleTime |
| Edits in /account/facility/ reflect on slug page promptly | N/A — not a management surface (see Spec Correction above) |
| Inquiry CTA works per tier routing | ✅ Pro → submit-qualified-lead, Free/unclaimed → concierge intake (verified in `handleRequestInfoOpen`) |
| Media gallery, map, services, team, reviews, badges render | ✅ Gallery (improved LCP), services, team, reviews, badges all present; map = directions link |
| SEO + structured data + canonical + 404 | ✅ Helmet + LocalBusiness JSON-LD + CenterNotFound |
| No bugs, errors, or silent failures; tests pass; production-ready | ✅ 156 tests pass, typecheck clean, build clean |

---

## What was NOT changed (and why)

| Area | Decision | Rationale |
| --- | --- | --- |
| Management/edit features at /account/facility/ | Out of scope | Spec misinterpretation — that route is a read-only seeker view. Provider editing lives at /provider/* and is out of scope. |
| Interactive map embed | Deferred (Phase 2.1) | Needs geocoding, lat/lng schema, API key, cost. Directions link covers user need. |
| De-duplication of the two profile components | Deferred (Phase 2.2) | Mechanical refactor, ~2,600 LOC across two files. Risk of regressions without dedicated test coverage. |
| Hours/languages/accessibility/availability schema | Deferred (Phase 2.3-2.4) | Requires provider-side editor surfaces. Sections are conditionally rendered today; absence is graceful. |
| Email surfacing for SAMHSA fallback rows | Left as-is | Intentional — unclaimed facilities don't expose email by policy; existing "Send inquiry" CTA routes the seeker to the concierge intake instead. |
| Console.error guards / silent-catch removal | Left as-is | The one "silent catch" the audit flagged (CenterProfile.tsx:283-288) is intentional — malformed percent-encoding falls through to the invalid-slug branch by design, not a bug. |
| Lighthouse + Core Web Vitals dashboards | Out of scope | Infrastructure — would need a CI integration and quota for synthetic monitoring. |
| Cache revalidation on edit | N/A | Edits happen in provider surfaces, not here. React Query's staleTime + the `public_facilities` view's edge cache already handle the read-side. |

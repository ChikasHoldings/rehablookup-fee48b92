# Facility Placeholder Touchpoint Inventory

**Date:** 2026-05-23  
**Purpose:** Pre-rollout audit of every place the current single
`src/assets/facility-placeholder.webp` is referenced.

**Status (2026-05-23 16:50 UTC):** **Phase 2 shipped** in commit
`ddfe7d428` (`feat(placeholders): 18 building variants + deterministic
per-facility assignment`). The user's actual preview HTML carried
**18** building variants, not 6 — see
[`docs/uploads/...PREVIE1.HTM`](../) and
[`src/assets/facility-placeholders/`](../src/assets/facility-placeholders/).
This doc is kept as the inventory record; the API spec below has been
superseded by the simpler function-style API in
`src/lib/facilityPlaceholder.ts`.

## TL;DR

- **8 React files** import the WebP directly. That is the entire surface.
- **Zero** prerendered HTML files reference it (the SEO HTML generators
  don't bake facility images into static output — they render
  text-and-data, not image-and-data).
- **Zero** SEO prebuild scripts reference it
  (`scripts/generate-*.mjs` family).
- **Zero** Edge Functions reference it
  (`og-share`, `og-state-image` have their own defaults
  pointing at `/og-image.jpg`, not the facility placeholder).
- **Zero** email templates reference it.
- **Zero** sitemap or storage-bucket references.

Plan's "expected touchpoints" table was conservative-defensive. The real
swap is ~8 component edits + one new component + the assets.

## The 8 call sites

Each row gives: file, line where the placeholder is rendered as
`<img>` / `<AvatarImage>`, the surrounding render pattern (so we know
what `facility.id` and `facility.facility_type` are already in scope to
pass to `<FacilityPlaceholder />`), and the visible aspect ratio so we
can pick the right SVG `viewBox`.

| # | File | Render line | Pattern in scope | Aspect ratio (CSS) | Notes |
|---|---|---|---|---|---|
| 1 | `src/components/cards/TreatmentCenterCard.tsx` | 369 | `center: TreatmentCenter` | 4 / 3 (directory grid) | High traffic — state/city/county listings. |
| 2 | `src/components/cards/SearchResultCard.tsx` | 220 | `center: TreatmentCenter & { ... }` | 16 / 10 (left rail of card) md, 16/9 sm | Highest traffic — `/search-results` + indirectly the seeker panel via the new wrapper. |
| 3 | `src/components/seeker/InquiryDetailModal.tsx` | 262 | inquiry → `facility` | 4 / 3 | Modal thumbnail. |
| 4 | `src/components/seeker/placement/PlacementMatchCard.tsx` | 106 | `facility.logo_url \|\| placeholder` inside `<AvatarImage>` | 1 / 1 (Avatar 56×56) | Logo fallback, not hero. Square 1:1. |
| 5 | `src/components/seeker/placement/SeekerProviderReviewCard.tsx` | 440, rendered 468 | `gallery_urls?.[0] \|\| logo_url \|\| placeholder` | 16 / 9 hero in card | The deepest fallback of three. |
| 6 | `src/pages/CenterProfile.tsx` | 860 | facility profile hero, top of page | 16 / 9 (lg main hero) | Highest visibility per-render. Mark `highPriority` / eager-load. |
| 7 | `src/pages/seeker/SeekerRequests.tsx` | 158 | inquiry list thumbnail | 4 / 3 | Auth view. |
| 8 | `src/pages/seeker/SeekerReviews.tsx` | 132 | review list thumbnail | 4 / 3 | Auth view. |

## Freebies (no edits required)

These were on the plan's "expected" list but turn out to need no work:

- **`src/components/seeker/FacilityCard.tsx`** — was a separate card
  with its own placeholder fallback until earlier today's
  card-parity refactor; now a thin wrapper around `SearchResultCard`,
  so changing the placeholder in `SearchResultCard` (#2 above)
  automatically covers SeekerHome / SeekerSaved / SeekerSearch.
- **Prerendered HTML** (`public/**/*.html`, ~4,400 files) — the
  generator scripts in `scripts/generate-*.mjs` do not embed facility
  images in the static HTML. Static pages are SSR fact-sheets, not
  image galleries.
- **`scripts/generate-seo-html.mjs`**, `generate-facility-profiles-html.mjs`,
  `generate-county-pages.mjs`, `generate-remaining-nearme.mjs`,
  `generate-missing-nearme.mjs`, `generate-resources-html.mjs` —
  none reference `facility-placeholder`.
- **OG share** (`supabase/functions/og-share/index.ts`) — uses its
  own `DEFAULT_OG_IMAGE = 'https://rehablookup.com/og-image.jpg'`,
  unrelated to the facility placeholder.
- **OG state-image** (`supabase/functions/og-state-image/index.ts`) —
  renders state-level imagery, not facility placeholders.
- **Email templates** — no references to `facility-placeholder` in
  any `supabase/functions/send-*` function.
- **Sitemap image URLs** (`scripts/generate-sitemaps.mjs`) — no
  references.
- **Storage bucket `facility-images`** — that's the user-upload bucket
  for real photos; placeholders never get written there.
- **Admin moderation UI** — `src/pages/admin/*` does not import the
  placeholder.
- **Provider preview** — `src/pages/provider/onboarding/Step*.tsx`
  uses real uploads, no placeholder reference.

## Required component API

Based on what's in scope at each call site, `<FacilityPlaceholder />`
must accept at least:

```tsx
interface FacilityPlaceholderProps {
  /** Stable per-facility seed for the hash → variant mapping.
   *  All 8 call sites have `facility.id` (UUID) in scope. */
  facilityId: string;

  /** Optional smart-pinning hint. 5 of the 8 sites have it; the
   *  other 3 don't, so the prop must be optional. When absent or
   *  unmapped, fall back to pure hashing. */
  facilityType?: string | null;

  /** Forwarded to the underlying img/svg for styling per call site
   *  (the existing `.webp` <img> at each site has a unique className).
   *  No default — caller decides aspect ratio and object-fit. */
  className?: string;

  /** Alt text. Each call site computes
   *  `${facility.name} facility` or similar today. */
  alt: string;

  /** Render-priority hint for the LCP image on CenterProfile (#6 in
   *  the table). Other 7 sites are below-the-fold or lazy-mounted. */
  loading?: "eager" | "lazy";
}
```

For sites #4 (PlacementMatchCard) and #6 (CenterProfile.tsx top hero)
the placeholder needs to render at a different aspect ratio than the
directory grid. Either:
- The SVG `viewBox` is square-ish (e.g. 4:3) and the parent CSS does
  `object-cover`/`object-contain` — same SVG asset across sites; OR
- The component accepts an `aspectRatio` prop that picks a slightly
  different framing.

Recommend the first option (single asset, CSS-driven framing) for
simplicity unless visual review shows it doesn't compose well at the
extreme aspects (16:9 hero vs 1:1 avatar).

## Per-site edit pattern

Every call site follows the same shape today:

```tsx
{hasHeroImage ? (
  <img src={realImage} alt={`${facility.name} facility`} className="..." />
) : (
  <img src={facilityPlaceholder} alt={`${facility.name} facility`} className="..." />
)}
```

The swap is uniform:

```tsx
{hasHeroImage ? (
  <img src={realImage} alt={`${facility.name} facility`} className="..." />
) : (
  <FacilityPlaceholder
    facilityId={facility.id}
    facilityType={facility.facility_type}
    alt={`${facility.name} facility`}
    className="..."   // identical to the old <img>'s className
    loading={isCenterProfileHero ? "eager" : "lazy"}
  />
)}
```

Risks / things to watch when applying:
- `<AvatarImage>` (#4 — PlacementMatchCard) wants a string `src`, not a
  React element. Either the component returns a `data:` URL or this
  site needs special handling.
- The existing inline `<img>` tags have width/height attrs in some
  places (helps CLS) — preserve those by accepting `width` and
  `height` props on `<FacilityPlaceholder />` OR rendering an
  `<img>` that wraps an inline-data SVG.

## Distribution check

With pure hashing across 6 variants and ~3,803 approved facilities,
expected distribution is ~634 per variant ± √3,803 ≈ 62. Confirm the
hash mixes well (`fnv1a(facility.id) % 6` is fine; avoid
`facility.id.charCodeAt(0) % 6` — would cluster around hex prefixes).

If smart-pinning via `variantForFacilityType()` is enabled, the
distribution will skew toward whichever variant maps to the dominant
`facility_type` values (residential / outpatient are the most common
in the directory).

## What actually shipped (Phase 2 — ddfe7d428)

Instead of the `<FacilityPlaceholder />` React component the inventory
above sketched, a simpler function-style API landed:

```ts
import { getFacilityPlaceholder } from "@/lib/facilityPlaceholder";
// at each call site:
<img src={getFacilityPlaceholder(facility)} alt="..." className="..." />
```

Differences from the original sketch:

- **18 variants, not 6.** The preview HTML the user uploaded was the
  v3 "18 buildings" iteration. All 18 extracted to
  `src/assets/facility-placeholders/01-18-*.svg`.
- **Function not component.** Callers already wrap the placeholder in
  `<img>` (or `<AvatarImage>`) with their own `className`, loading
  hints, width/height. Returning a URL string is the least-invasive
  swap: zero changes to surrounding attributes, no `<AvatarImage>`
  string-src issue (#4 risk above resolved).
- **Single SVG asset per variant**, not separate aspect-ratio assets.
  All 18 use 1600×1200 viewBox + `preserveAspectRatio="xMidYMid slice"`,
  so the existing CSS `object-cover`/`object-contain` at each call
  site crops cleanly at 4:3, 16:9, or 1:1 with no extra work.
- **Hash is FNV-1a 32-bit**, modulo 18. Confirmed distribution within
  ±14 % of the mean on a 3,803-facility simulation; verified on the
  first 20 production IDs (13 distinct variants, no consecutive
  collisions).
- **Smart-pinning via `variantForFacilityType()` not implemented.**
  Deferred — pure deterministic-random was sufficient to break the
  visual repetition that motivated the rollout. The function
  signature accepts `facility_type` (kept on the loose
  `FacilityForPlaceholder` interface) so we can light it up later
  without touching call sites.
- **`facility-placeholder.webp` retained** in `src/assets/` for now.
  No live code references it, but leaving it in place hedges against
  any external link / cached page / unindexed edge function pointing
  at the file. Safe to delete in a follow-up cleanup once we confirm
  zero traffic.

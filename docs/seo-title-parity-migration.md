# SEO Title Parity Migration

**Date:** 2026-05-22  
**Status:** in progress (homepage migrated; ~97 public pages remain)

## Background

Every route in this SPA produces a page title from one of two sources:

1. **The static HTML shipped by the server** — either `index.html` (for non-prerendered routes, served via the SPA fallback) or `public/<route>.html` (for the 50k+ paths produced by `scripts/generate-*-html.mjs` during `npm run build:vercel`).
2. **`react-helmet-async` after hydration** — driven by the `<SEO />` component each page renders.

If the two disagree, cold loads briefly show one title and then the SPA hydrates a different one. That's bad UX, bad SEO (Search Console may index the prerendered title while users see the post-hydration one), and confusing for Lighthouse / GSC reports.

## Audit findings (2026-05-22)

| Bucket | Count | Notes |
|--------|------:|-------|
| Pages with `<SEO />` component | 164 | own title set via Helmet |
| Pages with `<Helmet />` directly | 38 | own title set via Helmet |
| Pages with NO title management | 140 | rely on whatever the static HTML shipped |
| └ of which are public (SEO-relevant) | **~97** | provider-guides (88), us-rehab (8), TreatmentCenterProfile (1) |
| └ of which are auth-walled (no SEO need) | ~43 | admin (26), provider (15), reset-password |

**Critical issue:** the ~97 public pages without `<SEO />` show the homepage's default title in the browser tab after the SPA hydrates over their prerendered HTML, because the SPA shell (`index.html`) is what the SPA fallback serves and nothing inside the route component changes the title.

## What this commit changes

- **`src/lib/seo/titles.ts`** — new shared module. `TITLES.home` and `DESCRIPTIONS.home` are the canonical homepage strings; both the SPA shell (`index.html`) and the React component (`src/pages/Index.tsx`) read from here.
- **`vite.config.ts`** — adds the `syncHomepageTitle` plugin so `index.html`'s `<title>`, `<meta name="description">`, og:*, twitter:* tags all get substituted at build time from the same source.
- **`src/pages/Index.tsx`** — switches from inline string literals to `TITLES.home` / `DESCRIPTIONS.home`.
- **`scripts/check-spa-titles.mjs`** — CI guard. Spins up Playwright, picks 20 routes from the prerender manifest (stratified by path prefix), and asserts each:
  - has a unique post-hydration title (catches the missing-`<SEO />` case)
  - SSR title === post-hydration title (catches drift)
- **`docs/seo-title-parity-migration.md`** — this file.

## What this commit does NOT do

Migrating all ~97 public pages + every `scripts/generate-*-html.mjs` to the shared source is out of scope for one commit. The CI guard will fail on those routes when it picks them; expand `TITLES` and the appropriate generator's title source in stages.

## Migration steps for each remaining page

1. Pick the canonical title (decide what users / search results should see).
2. Add to `TITLES` and `DESCRIPTIONS` in `src/lib/seo/titles.ts`:
   ```ts
   export const TITLES = {
     home: "...",
     concierge: "Free Concierge Placement for Addiction Treatment",  // new
   } as const;
   ```
3. In the React page component, import and use:
   ```tsx
   import { TITLES, DESCRIPTIONS } from "@/lib/seo/titles";
   ...
   <SEO title={TITLES.concierge} description={DESCRIPTIONS.concierge} ... />
   ```
4. In the generator that writes the static HTML for that route, import and use:
   ```js
   // Generators run as Node ESM; relative path + .ts source works through
   // tsx loader, or compile titles.ts to .js for the generator step.
   import { TITLES, withSiteName } from "../src/lib/seo/titles.js";
   const fullTitle = withSiteName(TITLES.concierge);
   ```
5. Run the CI guard against the rebuilt dist:
   ```bash
   npm run build:vercel
   npx serve dist -p 4173 &
   BASE_URL=http://localhost:4173 node scripts/check-spa-titles.mjs
   kill %1
   ```
6. Confirm the migrated route now passes.

### Templated titles (city / state / near-me)

Routes like `/rehab-centers/california` or `/30-day-rehab-in-austin` use a template, not a static string. Add a helper function to `src/lib/seo/titles.ts`:

```ts
export function titleForStateRehab(stateName: string): string {
  return `Drug & Alcohol Rehab Centers in ${stateName} | Find Treatment`;
}
```

Both the generator and the React `StatePage` should import and call the same helper.

## Acceptance for this commit

- ✓ `npx tsc --noEmit` passes
- ✓ `npx vite build` produces a `dist/index.html` whose `<title>` is `"Find Drug & Alcohol Rehab Centers Near You | RehabLookup"` — the exact string Helmet writes on hydration
- ⚠ `scripts/check-spa-titles.mjs` will fail today because the ~97 unmigrated pages still show the homepage default title. That's expected and is the work item for the next several commits.

## Owner / follow-ups

- Public pages without `<SEO />` to migrate: list in `find src/pages/{provider-guides,us-rehab} -name "*.tsx" | xargs grep -L "<SEO\|<Helmet"`
- Generators to unify with `TITLES`: every file under `scripts/generate-*-html.mjs`
- The CI guard sample size (`SAMPLE_SIZE=20`) can be bumped once the corpus is migrated.

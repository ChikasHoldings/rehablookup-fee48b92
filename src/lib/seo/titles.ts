/**
 * Shared source of truth for page titles.
 *
 * Why this exists
 * ───────────────
 * Page titles used to live in two places per route:
 *   • The static HTML shell (`index.html` for the SPA fallback, and the
 *     `scripts/generate-*-html.mjs` generators for prerendered pages).
 *   • The React component's `<SEO title="…" />` prop.
 *
 * When the two drift, cold loads flash one title, then `react-helmet-async`
 * swaps to a different one on hydration. That's bad UX, bad SEO (Google
 * may index the prerendered title while users see the post-hydration one),
 * and it makes Lighthouse / Search Console reports confusing.
 *
 * This module exports the canonical title for each well-known route. Both
 * the build-time HTML generators and the React route components should
 * import their title from here so the prerendered and post-hydration values
 * always match.
 *
 * Usage:
 *   import { TITLES, withSiteName } from "@/lib/seo/titles";
 *
 *   // In a React page component:
 *   <SEO title={TITLES.home} ... />
 *
 *   // In a build-time generator (Node ESM):
 *   import { TITLES, withSiteName } from "../src/lib/seo/titles.js";
 *   const fullTitle = withSiteName(TITLES.home);
 *
 * Adding a new route
 * ──────────────────
 * 1. Add an entry to TITLES below with the bare title (no " | RehabLookup").
 * 2. Reference it from the page component AND from the generator that
 *    writes that route's static HTML.
 * 3. The CI guard at scripts/check-spa-titles.mjs will fail the build if
 *    a route's prerendered title doesn't match its post-hydration title.
 *
 * Templated titles (city, state, near-me, etc.)
 * ─────────────────────────────────────────────
 * Routes with thousands of permutations use the helper functions below
 * (titleForState, titleForCity, etc.) so the same template lives in one
 * place. If a generator and a React component build a templated title
 * by string concatenation in two places, that's the bug this file fixes.
 *
 * NOT YET MIGRATED
 * ────────────────
 * The first commit using this file migrates only the homepage. The
 * remaining ~200 SEO routes (~97 public pages without any title +
 * everything in scripts/generate-*-html.mjs) are tracked as follow-up
 * work — see docs/seo-title-parity-migration.md.
 */

export const SITE_NAME = "RehabLookup";

/**
 * Append " | RehabLookup" to a bare title in a way that's safe even if
 * the title already contains the site name (defensive — some generators
 * embed it inline because they predate this helper).
 */
export function withSiteName(title: string): string {
  const trimmed = title.trim();
  if (trimmed.endsWith(`| ${SITE_NAME}`) || trimmed.endsWith(SITE_NAME)) {
    return trimmed;
  }
  return `${trimmed} | ${SITE_NAME}`;
}

/**
 * Canonical bare titles for well-known fixed routes (no site-name suffix).
 * The site name is appended by the SEO component (React) and by
 * withSiteName() (generators).
 */
export const TITLES = {
  // Homepage — must match index.html <title> exactly (sans site name).
  // Vite's preloadMainEntry plugin substitutes the full title into the
  // shell at build time using withSiteName(TITLES.home).
  home: "Find Drug & Alcohol Rehab Centers Near You",

  // — Add other fixed routes here as they migrate to the shared source.
  //   Pattern: route slug → bare title (no " | RehabLookup").
} as const;

/**
 * Canonical bare descriptions for well-known fixed routes.
 * Mirrors TITLES so SSR↔SPA parity covers description too.
 */
export const DESCRIPTIONS = {
  // Directory-compatible homepage description. The previous copy ended
  // "Free insurance verification. 24/7 confidential help." — two claims
  // RehabLookup does not fulfil: it does not run carrier verification
  // (facility admissions teams do) and it does not staff a 24/7 treatment
  // help line. Search intent is preserved by keeping the same high-value
  // terms (search, compare, drug rehab, alcohol treatment, detox, insurance,
  // levels of care, nationwide coverage) as directory ACTIONS the visitor
  // performs, rather than services RehabLookup performs for them.
  //
  // POST-ROLLOUT HOTFIX #1 — "3,800+ VERIFIED" became "3,800+ … LISTINGS".
  // This constant is the real source of the served homepage description: the
  // `syncHomepageTitle` plugin in vite.config.ts substitutes it into
  // index.html at build time, and <SEO /> uses it on hydration. Editing
  // index.html alone left the built page still claiming a verified inventory.
  // The count is honest (3,794 rows in `public_facilities`); the adjective was
  // not — only 5 raw `facilities` rows carry verified=true, and
  // `public_facilities.verified` is Pro-gated with active Pro at 0. Same
  // reasoning as src/components/home/TrustStrip.tsx. Facility-specific
  // verified state is untouched. Guarded by
  // scripts/check-public-directory-truth.mjs.
  //
  // Budget: <=160 chars, so Google renders it without truncation.
  home:
    "Search 3,800+ addiction treatment center listings. Compare drug rehab, alcohol treatment and detox programs by location, level of care and insurance.",
} as const;

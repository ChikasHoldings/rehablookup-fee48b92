// Single source of truth for the GA4 measurement ID used by the SEO
// generator scripts. Reads VITE_GA_MEASUREMENT_ID from the environment
// (set on Vercel as a project env var so the next rotation is one line)
// with a fallback to the current production tag.
//
// NOTE: The frontend (index.html + analytics modules) also uses the
// VITE_GA_MEASUREMENT_ID env var. Keeping the variable name identical
// across both contexts means one Vercel env var update covers everything.

export const GA_MEASUREMENT_ID =
  process.env.VITE_GA_MEASUREMENT_ID?.trim() || "G-MM5K8398LY";

// Prerendered SEO pages are served to crawlers only (middleware.ts); every
// visitor gets the SPA shell, whose GA4 tag + RouteChangeTracker measure real
// traffic. Crawler-only HTML therefore carries no analytics: both helpers
// return an empty string so every generator that still calls them emits none,
// and scripts/strip-crawler-analytics.mjs removes any left in older files.
// (Kept as functions so the ~15 generator call sites need no change.)
export const gtagSnippet = () => "";
export const gtagSnippetForSpaShell = () => "";

/**
 * Extract every <Route path="..."> declared in src/App.tsx AND every prefix
 * handled by SmartCatchAll (the wildcard "*" route handler), and split into:
 *   - staticRoutes: literal paths with no params (e.g. "/about", "/rehab-near-me")
 *   - dynamicPrefixes: parent prefixes that have parameterized children
 *     (e.g. "/rehab-near-me/" because there's "/rehab-near-me/:stateSlug",
 *      and "/best-rehab-centers-in-" because SmartCatchAll dispatches it)
 *
 * The sitemap generator uses both lists to keep SPA-only URLs in the sitemap
 * even when no pre-rendered HTML exists on disk — they still render valid
 * SEO content via SPA fallback + Helmet.
 *
 * Returns: { staticRoutes: Set<string>, dynamicPrefixes: string[] }
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_TSX = path.resolve(__dirname, "../../src/App.tsx");
const SMART_CATCHALL = path.resolve(__dirname, "../../src/components/SmartCatchAll.tsx");

// Routes intentionally excluded from any public sitemap (auth/admin/internal).
// IMPORTANT: be specific — `/provider-guides/*` and `/provider-resources` are
// PUBLIC marketing pages and must be indexed; only the panel at `/provider/*`
// (and the other auth surfaces below) are excluded.
const EXCLUDE_PATTERNS = [
  /^\/admin(\/|$)/,
  /^\/account(\/|$)/,
  /^\/provider(\/|$)/,           // /provider, /provider/foo — but NOT /provider-guides
  /^\/provider-login$/,
  /^\/provider-signup$/,
  /^\/provider-faq$/,
  /^\/provider-support$/,
  /^\/provider-reset-password$/,
  /^\/seeker(\/|$)/,
  /^\/client(\/|$)/,
  /^\/auth(\/|$)/,
  /^\/login$/,
  /^\/signup$/,
  /^\/reset-password$/,
  /^\/forgot-password$/,
  /^\/404$/,
  /^\/dev\//,
  /^\/ads\//,                    // tracking destinations, not SEO
  /^\/lp\//,                     // landing-page redirects
  /^\/center\//,                 // handled by dedicated /center/ prefix
  /^\/centers\//,                // duplicate of /center/
  /^\/facility\//,               // duplicate of /center/
  /^\/get-more-/,                // provider-facing SmartCatchAll variants
];

function isExcluded(p) {
  return EXCLUDE_PATTERNS.some((re) => re.test(p));
}

/**
 * Pull every "/...-in-" / "/best-rehab-centers-in-" / etc. prefix string
 * literal out of SmartCatchAll.tsx. We're matching string-literal prefixes
 * declared in arrays and `pathname.startsWith("...")` calls — both forms
 * appear in the file.
 */
async function extractCatchAllPrefixes() {
  let src;
  try {
    src = await readFile(SMART_CATCHALL, "utf8");
  } catch {
    return [];
  }

  const prefixes = new Set();

  // 1. Array-literal prefixes: lines like   "/alcohol-rehab-in-",
  for (const m of src.matchAll(/["'`](\/[a-z0-9-]+-(?:in|patients-in)-)["'`]/g)) {
    prefixes.add(m[1]);
  }

  // 2. pathname.startsWith("/best-rehab-centers-in-") and similar
  for (const m of src.matchAll(/startsWith\(\s*["'`](\/[a-z0-9-]+-)["'`]\s*\)/g)) {
    prefixes.add(m[1]);
  }

  return [...prefixes];
}

export async function extractSpaRoutes() {
  const src = await readFile(APP_TSX, "utf8");
  const matches = [...src.matchAll(/path=["']([^"']+)["']/g)].map((m) => m[1]);

  const staticRoutes = new Set();
  const dynamicPrefixes = new Set();

  for (const raw of matches) {
    if (!raw.startsWith("/")) continue;
    if (isExcluded(raw)) continue;

    if (raw.includes(":")) {
      // Parameterized route — record its parent prefix.
      const parent = raw.slice(0, raw.indexOf("/:"));
      if (parent && parent.length > 1) dynamicPrefixes.add(parent + "/");
    } else {
      staticRoutes.add(raw.toLowerCase());
    }
  }

  // Merge SmartCatchAll prefixes — these handle URLs that don't appear as
  // explicit <Route> entries but ARE valid SEO pages dispatched by the
  // wildcard handler.
  for (const pref of await extractCatchAllPrefixes()) {
    if (!isExcluded(pref)) dynamicPrefixes.add(pref);
  }

  return {
    staticRoutes,
    dynamicPrefixes: [...dynamicPrefixes].sort(),
  };
}

/**
 * Extract every <Route path="..."> declared in src/App.tsx and split into:
 *   - staticRoutes: literal paths with no params (e.g. "/about", "/rehab-near-me")
 *   - dynamicPrefixes: parent prefixes that have parameterized children
 *     (e.g. "/rehab-near-me/" because there's "/rehab-near-me/:stateSlug")
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

// Routes intentionally excluded from any public sitemap (auth/admin/internal).
const EXCLUDE_PATTERNS = [
  /^\/admin/,
  /^\/account/,
  /^\/provider/,
  /^\/seeker/,
  /^\/client/,
  /^\/auth/,
  /^\/login/,
  /^\/signup/,
  /^\/reset-password/,
  /^\/forgot-password/,
  /^\/404$/,
  /^\/dev\//,
  /^\/ads\//,           // tracking destinations, not SEO
  /^\/lp\//,            // landing-page redirects
  /^\/center\//,        // handled by dedicated DYNAMIC_PREFIX_ALLOWLIST entry
  /^\/centers\//,       // duplicate of /center/
  /^\/facility\//,      // duplicate of /center/
];

function isExcluded(p) {
  return EXCLUDE_PATTERNS.some((re) => re.test(p));
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
      // "/rehab-near-me/:stateSlug"        → "/rehab-near-me/"
      // "/insurance/:slug"                 → "/insurance/"
      // "/30-day-rehab-programs/:s/:c"     → "/30-day-rehab-programs/"
      const parent = raw.slice(0, raw.indexOf("/:"));
      if (parent && parent.length > 1) dynamicPrefixes.add(parent + "/");
    } else {
      staticRoutes.add(raw.toLowerCase());
    }
  }

  return {
    staticRoutes,
    dynamicPrefixes: [...dynamicPrefixes].sort(),
  };
}

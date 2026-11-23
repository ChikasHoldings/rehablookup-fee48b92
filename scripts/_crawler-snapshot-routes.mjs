/**
 * Which routes get a crawler snapshot of the real SPA render.
 *
 * Crawlers are served prerendered HTML (middleware.ts). Historically that HTML
 * came from Node generators that do not run the React app, so crawlers saw a
 * thinner, different page than visitors (docs/seo-recovery/ADR-001). For the
 * routes selected here, scripts/render-crawler-snapshots.mjs replaces the
 * generator HTML with the SPA's own rendered document.
 *
 * Selection = advertised in the build's sitemaps AND in a retained template
 * family (SEO_REMOVAL_PLAN.md "keep and improve" families, plus hubs, guides,
 * articles and static content pages). Families proposed for removal are not
 * rendered: they keep their generator HTML until the owner decides on them.
 */

/** Ordered: the first matching family wins. */
export const SNAPSHOT_FAMILIES = [
  ["home", /^\/$/],
  ["state_hub", /^\/rehab-centers\/[a-z-]+$/],
  ["county_hub", /^\/rehab-centers\/[a-z-]+\/county\/[a-z0-9-]+$/],
  ["state_article", /^\/rehab-centers\/[a-z-]+\/articles\/[a-z0-9-]+$/],
  ["city_hub", /^\/rehab-centers\/[a-z-]+\/(?!county$|articles$)[a-z0-9-]+$/],
  ["treatment_type", /^\/treatment-types(\/[a-z0-9-]+){0,3}$/],
  ["insurance_gov_state", /^\/insurance\/(medicaid|medicare|tricare)-rehab\/[a-z-]+$/],
  ["insurance_hub", /^\/insurance(\/[a-z0-9-]+)?$/],
  ["provider_guide", /^\/provider-guides(\/[a-z0-9-]+)?$/],
  ["resource", /^\/resources(\/[a-z0-9-]+)?$/],
  ["facility_profile", /^\/center\/[a-z0-9-]+$/],
  // Single-segment content and static pages. Programmatic families are
  // excluded below (near-me, city combos, provider-city landings).
  ["content_static", /^\/[a-z0-9-]+$/],
];

/** Families proposed for removal or consolidation: never snapshotted. */
export const EXCLUDE = [
  /-near-me(\/|$)/,
  /^\/[a-z0-9-]+-in-[a-z0-9-]+$/, // /{prefix}-in-{city} city combos
  /^\/rehab-marketing(\/|$)/,
  /^\/(detox-centers|medicaid-rehab|medicare-rehab)\//,
  /^\/insurance\/[^/]+\/[^/]+\/(county|city)\//,
  /^\/rehab-centers\/[^/]+\/county\/[^/]+\/[^/]+/,
];

export function familyOf(pathname) {
  if (EXCLUDE.some((re) => re.test(pathname))) return null;
  for (const [name, re] of SNAPSHOT_FAMILIES) if (re.test(pathname)) return name;
  return null;
}

/** Paths listed in sitemap XML text (any <loc> on rehablookup.com). */
export function sitemapPaths(xml) {
  const out = [];
  for (const m of xml.matchAll(/<loc>\s*https:\/\/(?:www\.)?rehablookup\.com([^<\s]*)\s*<\/loc>/g)) {
    const p = m[1].replace(/\/+$/, "") || "/";
    out.push(p);
  }
  return out;
}

/**
 * @param {string[]} advertised  paths from the build's sitemaps
 * @param {{ facilities?: boolean, families?: string[] }} opts
 */
export function selectSnapshotRoutes(advertised, opts = {}) {
  const wanted = opts.families ? new Set(opts.families) : null;
  const seen = new Set();
  const routes = [];
  for (const p of ["/", ...advertised]) {
    if (seen.has(p)) continue;
    seen.add(p);
    const family = familyOf(p);
    if (!family) continue;
    if (family === "facility_profile" && !opts.facilities) continue;
    if (wanted && !wanted.has(family)) continue;
    routes.push({ path: p, family });
  }
  return routes;
}

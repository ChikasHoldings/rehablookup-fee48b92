#!/usr/bin/env node
/**
 * check-public-navigation.mjs
 *
 * Build-time guard: every internal destination reachable from the GLOBAL
 * PUBLIC navigation shell must resolve to a real, canonical page.
 *
 * Why this exists alongside `check:internal-links`
 * ────────────────────────────────────────────────
 * `validate-internal-links.mjs` answers "does this URL match a registered
 * route?". That is necessary but not sufficient for global navigation:
 *
 *   • A dynamic route match is not a page. `/rehab-centers/:stateSlug/:citySlug`
 *     matches ANY two segments, so `/rehab-centers/texas/nowhereville` "passes"
 *     while CityPage renders <NotFound /> — a soft 404 in the site-wide footer,
 *     on every page, forever.
 *   • A 301 is not a failure to a link checker. `/rehab-centers` resolves fine
 *     — by redirecting to `/search-results`. A global menu should point at the
 *     final canonical route, not lean on a compatibility redirect meant for
 *     old backlinks.
 *   • An SPA-level `<Route element={<Navigate to=… />}>` is invisible to a
 *     route-existence check for the same reason.
 *
 * So this script resolves each global-nav destination all the way down to a
 * concrete artifact or a hand-verified dynamic-content lookup, and fails on
 * anything that would produce a hard 404, an SPA NotFound, a soft 404, or a
 * redirect hop.
 *
 * Scope — GLOBAL navigation only, deliberately
 * ────────────────────────────────────────────
 * Header, Footer, the two consumer mega-menus, the provider mega-menu, the
 * crawler/static shell, and the root index.html. Page-body links are out of
 * scope (that is `check:internal-links`' job over the whole app), and
 * provider/admin application navigation is a later stage.
 *
 * Usage
 *   node scripts/check-public-navigation.mjs
 *
 * Exit codes
 *   0  every global-nav destination resolves to a canonical page
 *   1  at least one destination is unresolvable, soft-404, or a redirect source
 */

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
// Imported, not regex-scraped: these are the authority on which
// /rehab-centers/<state>[/<city>] URLs are real pages versus a dynamic-route
// match that renders <NotFound />. Requires --experimental-strip-types (see
// the `check:public-navigation` script in package.json); the module is pure
// data with no runtime imports of its own.
import { getStateBySlug, getCityBySlug } from "../src/data/locationSeoData.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(ROOT, rel), "utf8");

// blogCategories.ts imports lucide-react, so it cannot be imported here.
// `slug:` is unambiguous in that file — it is the documented "never change
// once shipped" URL key.
const categorySlugs = new Set(
  [...readFileSync(join(ROOT, "src/data/blogCategories.ts"), "utf8").matchAll(/slug:\s*"([a-z0-9-]+)"/g)].map((m) => m[1]),
);

// ── Sources ─────────────────────────────────────────────────────────────────

const GLOBAL_NAV_SOURCES = [
  "src/components/layout/Header.tsx",
  "src/components/layout/Footer.tsx",
  "src/components/mega-menus/FindTreatmentMegaMenu.tsx",
  "src/components/mega-menus/ResourcesMegaMenu.tsx",
  "src/components/provider-guides/ProviderMegaMenu.tsx",
  "scripts/_seo-page-shell.mjs",
  "index.html",
];

/**
 * index.html's <noscript> block is a full SEO site map (~140 links), not
 * navigation chrome. Its own link hygiene is covered by check:internal-links
 * and check:no-internal-404; what this guard cares about in index.html is the
 * shell itself — prefetch hints and the noscript FOOTER nav. Scanning the
 * whole file here would drag 50 state pages and 25 near-me pages into a
 * global-nav budget and hide real regressions in noise.
 */
function scopeSource(rel, src) {
  if (rel !== "index.html") return src;
  const navStart = src.indexOf('<footer class="ns-footer">');
  const head = src.slice(0, src.indexOf("<noscript>"));
  const foot = navStart === -1 ? "" : src.slice(navStart);
  return `${head}\n${foot}`;
}

function stripComments(src, rel) {
  if (rel.endsWith(".html")) return src.replace(/<!--[\s\S]*?-->/g, "");
  return src
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

/**
 * Values in DESTINATION position only. Header.tsx's active-state predicates
 * (`p.startsWith("/rehab-centers")`) are matchers, not links, and must not be
 * treated as navigation destinations.
 */
function navDestinations(code) {
  const out = new Set();
  const re = /(?:\bto=|\bhref=|:\s*)["'`](\/[^"'`\s{}]*)["'`]/g;
  let m;
  while ((m = re.exec(code)) !== null) out.add(m[1]);
  // Template-literal destinations built from a data list. Enumerated rather
  // than skipped: the category hubs ARE global-nav destinations (they render
  // as the Resources mega-menu's topic-hub pills), so leaving them out would
  // let a retired category ship a footer full of soft 404s.
  for (const t of code.matchAll(/`\/resources\/category\/\$\{[^`]*\}`/g)) {
    void t;
    for (const slug of categorySlugs) out.add(`/resources/category/${slug}`);
  }
  return out;
}

/** destination path → the global-nav sources that link it */
const destinations = new Map();
for (const rel of GLOBAL_NAV_SOURCES) {
  const code = stripComments(scopeSource(rel, read(rel)), rel);
  for (const d of navDestinations(code)) {
    if (!destinations.has(d)) destinations.set(d, new Set());
    destinations.get(d).add(rel);
  }
}

// ── Resolution inputs ───────────────────────────────────────────────────────

const vercel = JSON.parse(read("vercel.json"));
const redirectSources = new Map((vercel.redirects ?? []).map((r) => [r.source, r.destination]));
const rewriteSources = new Set((vercel.rewrites ?? []).map((r) => r.source));

const app = read("src/App.tsx");
const routeRe = /<Route\s+path="([^"]+)"([^>]*)>?/g;
const staticRoutes = new Set();
const dynamicRoutes = [];
/** Routes whose element is a bare <Navigate> — an SPA-level redirect. */
const spaRedirects = new Set();
for (const m of app.matchAll(/<Route\s+path="([^"]+)"\s+element=\{<(Navigate|[A-Za-z]+)/g)) {
  if (m[2] === "Navigate") spaRedirects.add(m[1]);
}
for (const m of app.matchAll(routeRe)) {
  const p = m[1];
  if (!p.startsWith("/")) continue; // nested relative routes
  if (p.includes(":") || p === "*") dynamicRoutes.push(p);
  else staticRoutes.add(p);
}

const prerendered = (p) => {
  const rel = p.replace(/^\//, "");
  return existsSync(join(ROOT, "public", `${rel}.html`)) || existsSync(join(ROOT, "dist", `${rel}.html`));
};

/**
 * Intentional auth / onboarding actions. These are not content pages and are
 * expected to gate or redirect based on session state — that is the point of
 * them, and it is not an error.
 *
 * `/account` was removed from this allow-list with the consumer-account
 * retirement. It is now a 301 source, so the redirectSources check above
 * catches it and any reintroduced global-nav link to the retired seeker
 * portal fails this guard instead of being waved through as an "auth action".
 */
const AUTH_ACTIONS = new Set(["/login", "/provider/onboarding"]);

/**
 * Routes that resolve to a real page but are NOT the canonical surface for
 * that job, so a redirect check cannot catch them. `/providers/resources`
 * renders ProviderResourceHub; the canonical public provider resource page is
 * `/provider-resources` (ProviderResources). Global nav must link the latter.
 */
const NON_CANONICAL = new Map([["/providers/resources", "/provider-resources"]]);

// ── Resolve ─────────────────────────────────────────────────────────────────

const results = [];
for (const [path, srcs] of [...destinations].sort()) {
  const from = [...srcs].join(", ");
  const fail = (reason) => results.push({ path, from, ok: false, reason });
  const pass = (how) => results.push({ path, from, ok: true, reason: how });

  if (path.startsWith("//") || path.includes("..")) { fail("malformed path"); continue; }

  // sitemap.xml and other real static assets served straight from public/
  if (/\.[a-z0-9]+$/i.test(path)) {
    if (existsSync(join(ROOT, "public", path.replace(/^\//, "")))) pass("static asset");
    else fail("static asset not found in public/");
    continue;
  }

  if (redirectSources.has(path)) {
    fail(`301 redirect source → ${redirectSources.get(path)} (link the canonical route)`);
    continue;
  }
  if (spaRedirects.has(path)) {
    fail("SPA <Navigate> redirect route (link the canonical route)");
    continue;
  }
  if (NON_CANONICAL.has(path)) {
    fail(`renders, but is not the canonical surface — link ${NON_CANONICAL.get(path)} instead`);
    continue;
  }
  if (AUTH_ACTIONS.has(path)) { pass("intentional auth/onboarding action"); continue; }
  if (rewriteSources.has(path)) { pass("vercel rewrite → static page"); continue; }
  if (staticRoutes.has(path)) { pass("static React route"); continue; }

  // Dynamic routes need content-level proof, not just a pattern match.
  const seg = path.split("/").filter(Boolean);
  if (seg[0] === "rehab-centers" && seg.length === 2) {
    getStateBySlug(seg[1])
      ? pass("state page (locationSeoData)")
      : fail("no such state in locationSeoData — StatePage renders NotFound");
    continue;
  }
  if (seg[0] === "rehab-centers" && seg.length === 3) {
    // Exactly the lookup CityPage itself performs, so a pass here means the
    // page renders content rather than <NotFound />.
    getCityBySlug(seg[1], seg[2])
      ? pass("city page (locationSeoData)")
      : fail("no such city in locationSeoData — CityPage renders NotFound");
    continue;
  }
  if (seg[0] === "resources" && seg[1] === "category" && seg.length === 3) {
    categorySlugs.has(seg[2]) ? pass("category hub (blogCategories)") : fail("no such blog category");
    continue;
  }
  if (seg[0] === "resources" && seg.length === 2) {
    prerendered(path) ? pass("published article (prerendered mirror)") : fail("no published article mirror — ArticleDetail renders not-found");
    continue;
  }
  if (prerendered(path)) { pass("prerendered SEO page"); continue; }

  const dyn = dynamicRoutes.find((r) => {
    if (r === "*") return false;
    return new RegExp(`^${r.replace(/:[^/]+/g, "[^/]+")}$`).test(path);
  });
  fail(dyn ? `only matches dynamic route ${dyn} with no verified content` : "no route, redirect, or prerendered page");
}

// ── Report ──────────────────────────────────────────────────────────────────

const failures = results.filter((r) => !r.ok);
console.log(`[check-public-navigation] ${results.length} global navigation destination(s) across ${GLOBAL_NAV_SOURCES.length} source(s)`);

if (failures.length === 0) {
  const byReason = new Map();
  for (const r of results) byReason.set(r.reason, (byReason.get(r.reason) ?? 0) + 1);
  for (const [reason, n] of [...byReason].sort((a, b) => b[1] - a[1])) {
    console.log(`  ok  ${String(n).padStart(4)}  ${reason}`);
  }
  console.log("✓ every global navigation destination resolves to a canonical page");
  process.exit(0);
}

console.error(`\n✗ ${failures.length} global navigation destination(s) do not resolve canonically:\n`);
for (const f of failures) {
  console.error(`  ${f.path}`);
  console.error(`      ${f.reason}`);
  console.error(`      linked from: ${f.from}\n`);
}
process.exit(1);

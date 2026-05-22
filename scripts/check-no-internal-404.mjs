#!/usr/bin/env node
/**
 * CI guard — no internal link should 404.
 *
 * Crawls the three sources from which production internal links originate:
 *
 *   1. public/prerender-manifest.json     — every path the build pipeline
 *      promises to ship as a prerendered HTML file
 *   2. public/sitemap-*.xml                — every URL submitted to Google
 *   3. src/components/layout/{Footer,Header}.tsx — hardcoded nav targets
 *
 * For each internal URL, asserts it resolves to one of:
 *
 *   • a literal <Route path="..."> in src/App.tsx
 *   • a SmartCatchAll-handled prefix (extracted from the file directly)
 *   • a vercel.json redirect / rewrite source
 *   • an actual prerendered file under public/<path>.html
 *
 * Complements scripts/check-broken-links.mjs which scans rendered HTML
 * (i.e. catches broken links that escaped into the prerendered output).
 * This script is the source-side guard: it ensures the URLs we *promise*
 * (sitemap, manifest, nav) don't drift away from the routes we ship.
 *
 * Phase 1D shipped an early version of this idea but only against the
 * footer; this is the more robust version covering all four sources.
 *
 * Exit codes:
 *   0  every internal URL resolves
 *   1  one or more URLs do not resolve
 *   2  config error (missing manifest, broken vercel.json, etc.)
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SRC = join(ROOT, "src");
const PUBLIC_DIR = join(ROOT, "public");

function die(code, msg) {
  console.error(`[check-no-internal-404] ${msg}`);
  process.exit(code);
}

// ─── 1. Build the resolver (same logic as check-broken-links) ────────────────

const appTsx = (() => {
  try {
    return readFileSync(join(SRC, "App.tsx"), "utf8");
  } catch (err) {
    die(2, `Cannot read src/App.tsx: ${err.message}`);
  }
})();

const literalRoutes = new Set();
const dynamicRoutes = [];
for (const m of appTsx.matchAll(/<Route\s+[^>]*path=["']([^"']+)["']/g)) {
  const p = m[1];
  if (p === "*" || p === "") continue;
  if (p.includes(":") || p.includes("*")) {
    const re = new RegExp(
      "^" +
        p
          .replace(/[.+^${}()|[\]\\]/g, "\\$&")
          .replace(/:[A-Za-z_][A-Za-z0-9_]*/g, "[^/]+")
          .replace(/\*/g, ".*") +
        "$",
    );
    dynamicRoutes.push(re);
  } else {
    literalRoutes.add(p);
  }
}

let vercelRedirects = [];
let vercelRewrites = [];
try {
  const vc = JSON.parse(readFileSync(join(ROOT, "vercel.json"), "utf8"));
  vercelRedirects = (vc.redirects || []).map((r) => r.source);
  vercelRewrites = (vc.rewrites || []).map((r) => r.source);
} catch (err) {
  die(2, `Cannot read vercel.json: ${err.message}`);
}

const { extractSpaRoutes } = await import("./lib/extract-spa-routes.mjs");
const spaManifest = await extractSpaRoutes();
const SMART_CATCHALL_PREFIXES = [
  "/treatment-types/",
  "/rehab-centers/",
  "/center/",
  "/blog/",
  "/state-rehab-faqs/",
  // Authenticated shell prefixes — App.tsx nests their <Route> entries
  // under a parent like `<Route path="/account">` so the regex extractor
  // only sees the children ("settings", "saved-searches", etc.) without
  // their parent path. List them explicitly so URLs like /account/saved-
  // searches resolve.
  "/account/",
  "/provider/",
  "/admin/",
  "/seeker/",
  ...spaManifest.dynamicPrefixes,
];

function staticFileExists(p) {
  const clean = p.replace(/^\//, "").split(/[?#]/)[0];
  return (
    existsSync(join(PUBLIC_DIR, clean + ".html")) ||
    existsSync(join(PUBLIC_DIR, clean, "index.html")) ||
    existsSync(join(PUBLIC_DIR, clean))
  );
}

function vercelMatches(path, sources) {
  return sources.some((src) => {
    const re = new RegExp(
      "^" +
        src
          .replace(/[.+^${}()|[\]\\]/g, "\\$&")
          .replace(/:[A-Za-z_][A-Za-z0-9_]*\*?/g, "[^?#]*") +
        "$",
    );
    return re.test(path);
  });
}

function resolvesInternally(path) {
  const bare = path.split(/[?#]/)[0];
  if (literalRoutes.has(bare)) return true;
  if (dynamicRoutes.some((re) => re.test(bare))) return true;
  if (SMART_CATCHALL_PREFIXES.some((p) => bare.startsWith(p))) return true;
  if (vercelMatches(bare, vercelRedirects)) return true;
  if (vercelMatches(bare, vercelRewrites)) return true;
  if (staticFileExists(bare)) return true;
  return false;
}

// ─── 2. Collect URLs from the four sources ───────────────────────────────────

const linksBySource = new Map();
function record(source, path) {
  if (!path || typeof path !== "string") return;
  if (!path.startsWith("/")) return; // external
  // Strip fragments — they don't affect routing.
  const clean = path.split("#")[0];
  if (!linksBySource.has(clean)) linksBySource.set(clean, new Set());
  linksBySource.get(clean).add(source);
}

// 2a. prerender-manifest.json
try {
  const manifest = JSON.parse(
    readFileSync(join(PUBLIC_DIR, "prerender-manifest.json"), "utf8"),
  );
  if (!Array.isArray(manifest)) {
    die(2, "prerender-manifest.json is not an array");
  }
  for (const p of manifest) record("manifest", p);
} catch (err) {
  die(2, `Cannot read prerender-manifest.json: ${err.message}`);
}

// 2b. sitemap-*.xml files
const sitemapFiles = readdirSync(PUBLIC_DIR).filter(
  (f) => /^sitemap.*\.xml$/.test(f) && f !== "sitemap-facilities.xml",
);
// sitemap-facilities.xml is generated server-side by the edge function;
// skip it (its entries are facility profile URLs validated separately).
for (const file of sitemapFiles) {
  let xml;
  try {
    xml = readFileSync(join(PUBLIC_DIR, file), "utf8");
  } catch {
    continue;
  }
  for (const m of xml.matchAll(/<loc>https?:\/\/[^/]+(\/[^<]*)<\/loc>/g)) {
    record(`sitemap:${file}`, m[1]);
  }
}

// 2c. Footer.tsx + Header.tsx — extract every "/...": string-literal path.
//     Matches both `path: "/foo"` (footer link data) and `to="/foo"` (Link).
const navFiles = ["Footer.tsx", "Header.tsx"];
for (const file of navFiles) {
  const fp = join(SRC, "components", "layout", file);
  if (!existsSync(fp)) continue;
  const text = readFileSync(fp, "utf8");
  // path: "/something" or to="/something"  or href="/something"
  const re = /(?:path|to|href)\s*[:=]\s*["'](\/[^"']*)["']/g;
  for (const m of text.matchAll(re)) record(`nav:${file}`, m[1]);
}

// ─── 3. Validate ─────────────────────────────────────────────────────────────

const checked = [...linksBySource.entries()];
const broken = [];
for (const [path, sources] of checked) {
  if (!resolvesInternally(path)) {
    broken.push({ path, sources: [...sources] });
  }
}

console.log(
  `[check-no-internal-404] Checked ${checked.length} unique internal paths from ` +
    `${linksBySource.size === 0 ? 0 : new Set([...linksBySource.values()].flatMap((s) => [...s])).size} sources.`,
);

if (broken.length > 0) {
  console.error(`\n${broken.length} URL(s) do not resolve to any route:\n`);
  for (const { path, sources } of broken.slice(0, 50)) {
    console.error(`  ✗ ${path}   (from: ${sources.join(", ")})`);
  }
  if (broken.length > 50) {
    console.error(`  … and ${broken.length - 50} more.`);
  }
  console.error(
    "\nEvery URL must resolve to a literal <Route>, a SmartCatchAll prefix,\n" +
      "a vercel.json redirect/rewrite, or a prerendered file under public/.\n" +
      "Either add the missing route or remove the URL from the source list.",
  );
  process.exit(1);
}

console.log(`✓ All ${checked.length} internal paths resolve.`);

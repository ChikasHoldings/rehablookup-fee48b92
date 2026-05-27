import { access, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { discoverPrerenderedPaths } from "./lib/prerender-discovery.mjs";
import { extractSpaRoutes } from "./lib/extract-spa-routes.mjs";

// Vercel-redirect sources must NEVER ship in the sitemap. Listing a URL
// that 301-redirects produces a "Page with redirect" GSC error: Google
// follows the loc, hits the 301, drops the source URL from the index,
// and reports it as broken because the sitemap promised it. Sitemaps
// must contain only canonical 200 targets.
const REDIRECT_SOURCES = (() => {
  try {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const vc = JSON.parse(readFileSync(path.resolve(here, "../vercel.json"), "utf8"));
    const set = new Set();
    for (const r of vc.redirects || []) {
      if (r.source && !r.source.includes(":") && !r.source.includes("*")) {
        set.add(r.source);
      }
    }
    return set;
  } catch {
    return new Set();
  }
})();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, "../public");
const CANONICAL_HOST = "https://rehablookup.com";

const projectUrl = (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "https://mldbxpntzcjalgjmwnqa.supabase.co").replace(/\/$/, "");
const sitemapFunctionUrl = `${projectUrl}/functions/v1/sitemap-facilities`;

const targets = [
  { type: "main", fileName: "sitemap.xml" },
  { type: "facilities", fileName: "sitemap-facilities.xml" },
  { type: "index", fileName: "sitemap-index.xml" },
];

// Routes that are router-resolved at runtime (not prerendered files) but are
// guaranteed to render valid SEO content via the SPA + Helmet. We derive the
// allowlist directly from `src/App.tsx` so the sitemap stays in sync with the
// router. See scripts/lib/extract-spa-routes.mjs for inclusion/exclusion rules.
//
// In addition, every URL whose path lives under one of the dynamic prefixes
// (e.g. `/rehab-near-me/`, `/insurance/`, `/center/`) is kept because the
// SPA route handles every value of the trailing param (state/city/slug).
//
// `/center/` is always included — it's the facility profile namespace.
const STATIC_DYNAMIC_PREFIXES = ["/center/"];

// Paths to drop from every regenerated sitemap. These were cleaned out of
// the committed sitemap files in an earlier hotfix (PR #4 / commit
// 0e945a590) but the upstream Supabase sitemap edge functions still emit
// them on every regen, so we re-strip them here. Two cases:
//   • /authors and /authors/*    — disallowed by robots.txt for Googlebot
//                                  AND for User-agent: *, so listing them
//                                  in any sitemap is a hard validator
//                                  failure ("sitemap URL blocked by
//                                  robots.txt").
//   • (cross-sitemap duplicates) — handled separately, see writePruned
//                                  below; a path appearing in both
//                                  sitemap.xml and sitemap-extras.xml is
//                                  also a hard validator failure.
const ROBOTS_BLOCKED_PATH_PATTERNS = [
  /^\/authors$/i,
  /^\/authors\//i,
];

function pathIsRobotsBlocked(p) {
  return ROBOTS_BLOCKED_PATH_PATTERNS.some((re) => re.test(p));
}

async function fileExists(filePath) {
  try { await access(filePath); return true; } catch { return false; }
}

async function fetchSitemap(type) {
  const response = await fetch(`${sitemapFunctionUrl}?type=${encodeURIComponent(type)}`, {
    headers: {
      Accept: "application/xml,text/xml;q=0.9,*/*;q=0.1",
      "User-Agent": "RehabLookup Sitemap Builder/1.0",
    },
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`Failed to fetch ${type} sitemap (${response.status}): ${body.slice(0, 200)}`);
  if (!body.trim().startsWith("<?xml")) throw new Error(`Expected XML for ${type} sitemap but received: ${body.slice(0, 120)}`);
  return body;
}

function urlPath(url) {
  try { return new URL(url).pathname; } catch { return null; }
}

/**
 * Canonicalize a URL path the same way `src/components/SEO.tsx` and the
 * runtime `/center/:slug` guard do:
 *   - lowercase
 *   - collapse repeated slashes
 *   - strip trailing slash (except root "/")
 *   - for `/center/<slug>`: also trim whitespace, collapse hyphens, strip
 *     leading/trailing hyphens (mirrors `normalizeSlug` in slugUtils.ts)
 *
 * Returns null if the path can't be canonicalized into a valid form.
 */
function canonicalizePath(p) {
  if (!p) return null;
  let out = p.toLowerCase().replace(/\/{2,}/g, "/");
  if (out.length > 1 && out.endsWith("/")) out = out.slice(0, -1);
  if (out.startsWith("/center/")) {
    const raw = out.slice("/center/".length);
    let decoded = raw;
    try { decoded = decodeURIComponent(raw); } catch { /* keep raw */ }
    const slug = decoded
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");
    if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return null;
    out = `/center/${slug}`;
  }
  return out;
}

/**
 * Filter sitemap XML to keep only URLs that have:
 *   - a prerendered HTML file (flat or nested), OR
 *   - are in the runtime allowlist (SPA-rendered hubs), OR
 *   - match a dynamic prefix allowlist (e.g. /center/).
 *
 * Also strips any URLs ending in .html (canonical is extensionless) and
 * rewrites every `<loc>` to its canonical lowercase / no-trailing-slash
 * form so we never publish inconsistent URLs to Search Console.
 */
function filterSitemapXml(xml, prerenderedPaths, stats, spaRoutes) {
  const { staticRoutes, dynamicPrefixes } = spaRoutes;
  const allDynamicPrefixes = [...new Set([...dynamicPrefixes, ...STATIC_DYNAMIC_PREFIXES])];

  const before = (xml.match(/<url>/g) || []).length;
  let kept = 0;
  const droppedSamples = [];
  // Per-sitemap dedupe — if the upstream edge fn emits the same URL twice
  // in one sitemap, the validator counts each repeat as a hard error.
  // First occurrence wins; subsequent ones are dropped silently.
  const seenInThisFile = new Set();

  const filtered = xml.replace(/<url>([\s\S]*?)<\/url>\s*/g, (block, inner) => {
    const locMatch = inner.match(/<loc>\s*([^<\s]+)\s*<\/loc>/);
    if (!locMatch) return "";
    const loc = locMatch[1];
    const p = urlPath(loc);
    if (!p) return "";
    // Strip .html — canonical is always extensionless
    if (p.endsWith(".html")) {
      if (droppedSamples.length < 5) droppedSamples.push(`${loc} (.html)`);
      return "";
    }
    const canonical = canonicalizePath(p);
    if (!canonical) {
      if (droppedSamples.length < 5) droppedSamples.push(`${loc} (non-canonical slug)`);
      return "";
    }
    const norm = canonical.toLowerCase().replace(/\/$/, "") || "/";
    // Drop paths blocked by robots.txt before any other check. Listing a
    // disallowed path in a sitemap is a hard validator failure even if
    // the URL is otherwise routable in the SPA.
    if (pathIsRobotsBlocked(norm)) {
      if (droppedSamples.length < 5) droppedSamples.push(`${loc} (robots-blocked)`);
      return "";
    }
    // Drop redirect-source URLs — they produce GSC "Page with redirect"
    // exclusions because Google follows the 301 and de-indexes the loc.
    // The redirect target is the canonical URL; if it's a real page it'll
    // ship via its own sitemap entry independently.
    if (REDIRECT_SOURCES.has(norm)) {
      if (droppedSamples.length < 5) droppedSamples.push(`${loc} (redirect-source)`);
      return "";
    }
    const hasPrerender = prerenderedPaths.has(norm);
    const inStatic = staticRoutes.has(norm) || norm === "/";
    const inDynamic = allDynamicPrefixes.some((pref) => norm.startsWith(pref) && norm.length > pref.length);
    if (hasPrerender || inStatic || inDynamic) {
      // Rewrite <loc> to canonical form. Build absolute URL using the
      // original origin so we don't accidentally swap hosts.
      let canonicalLoc = loc;
      try {
        const u = new URL(loc);
        canonicalLoc = `${u.origin}${canonical}`;
      } catch {
        canonicalLoc = canonical;
      }
      // Per-sitemap dedupe AFTER canonicalization (so two upstream URLs
      // that differ only by case / trailing slash collapse to one).
      if (seenInThisFile.has(canonicalLoc)) {
        if (droppedSamples.length < 5) droppedSamples.push(`${loc} (dup)`);
        return "";
      }
      seenInThisFile.add(canonicalLoc);
      kept++;
      const rewritten = block.replace(/<loc>\s*[^<\s]+\s*<\/loc>/, `<loc>${canonicalLoc}</loc>`);
      return rewritten;
    }
    if (droppedSamples.length < 5) droppedSamples.push(`${loc} (no prerender, no SPA route)`);
    return "";
  });

  stats.before += before;
  stats.kept += kept;
  stats.dropped += before - kept;
  if (droppedSamples.length) stats.samples.push(...droppedSamples);

  return filtered;
}

async function generateSitemapFile({ type, fileName }, prerenderedPaths, stats, spaRoutes) {
  const filePath = path.join(publicDir, fileName);
  try {
    let xml = await fetchSitemap(type);
    // Sitemap-index files are meta — don't filter URLs, they list other sitemaps.
    if (type !== "index") xml = filterSitemapXml(xml, prerenderedPaths, stats, spaRoutes);
    await writeFile(filePath, xml, "utf8");
    console.log(`[sitemap] generated ${fileName}`);
  } catch (error) {
    if (await fileExists(filePath)) {
      console.warn(`[sitemap] failed to refresh ${fileName}; keeping existing file.`, error);
      return;
    }
    throw error;
  }
}

/**
 * Patch the FALSE count claim in robots.txt header without touching the
 * curated User-agent / Allow / Disallow rules below it. We only edit the
 * comment block at the top.
 */
async function updateRobotsHeader(stats) {
  // stats.kept === 0 means every fetchSitemap() threw and generateSitemapFile()
  // preserved the existing committed sitemaps. Stamping "0 URLs" here would be a
  // false claim contradicting the real sitemap.xml on disk (and bloats the header
  // on every offline/no-DB build). Leave the last truthful line in place.
  if (!stats || stats.kept === 0) return;
  const robotsPath = path.join(publicDir, "robots.txt");
  if (!(await fileExists(robotsPath))) return;
  const src = await readFile(robotsPath, "utf8");
  const today = new Date().toISOString().slice(0, 10);
  const truthLine = `# Last updated: ${today} — sitemap regenerated; ${stats.kept} URLs included (filtered from ${stats.before}). Prerender coverage: hybrid <path>.html + <path>/index.html.`;
  // Replace the v7.13.0 false-claim line if it exists, else inject a new line at the top of the comment block.
  let next;
  if (src.includes("v7.13.0 GSC reindex push: 31,995 sitemap URLs now have static self-canonical HTML")) {
    next = src.replace(
      /# Last updated: [^\n]*v7\.13\.0[^\n]*\n/,
      truthLine + "\n",
    );
  } else if (src.includes(truthLine)) {
    next = src; // no-op
  } else {
    // Insert after the first "# Last updated:" line we find.
    next = src.replace(/(# Last updated:[^\n]*\n)/, `${truthLine}\n$1`);
  }
  if (next !== src) {
    await writeFile(robotsPath, next, "utf8");
    console.log("[robots] header updated with truthful sitemap count");
  }
}

/**
 * Post-regen dedupe pass: remove sitemap-extras.xml URLs that now appear
 * in the freshly-regenerated sitemap.xml. Also drops any /authors/*
 * URLs from extras that might have been re-introduced. Without this,
 * validate:sitemap-robots fails on every CI run with "duplicate URL in
 * sitemap" because the upstream sitemap edge function emits URLs that
 * extras was carrying historically. Mirrors the one-shot cleanup we did
 * to the committed extras in commit 0e945a590 (PR #4 era), but applied
 * every regen so the drift never reappears.
 */
async function dedupeExtrasAgainstMain() {
  const extrasPath = path.join(publicDir, "sitemap-extras.xml");
  const mainPath = path.join(publicDir, "sitemap.xml");
  if (!(await fileExists(extrasPath)) || !(await fileExists(mainPath))) return;

  const mainXml = await readFile(mainPath, "utf8");
  const mainUrls = new Set();
  const locRe = /<loc>\s*([^<\s]+)\s*<\/loc>/g;
  let m;
  while ((m = locRe.exec(mainXml)) !== null) mainUrls.add(m[1]);

  let extrasXml = await readFile(extrasPath, "utf8");
  const before = (extrasXml.match(/<url>/g) || []).length;
  let dupes = 0;
  let blocked = 0;

  extrasXml = extrasXml.replace(/  <url>[\s\S]*?<\/url>\n?/g, (block) => {
    const lm = block.match(/<loc>\s*([^<\s]+)\s*<\/loc>/);
    if (!lm) return block;
    const loc = lm[1];
    let p;
    try { p = new URL(loc).pathname; } catch { return block; }
    if (pathIsRobotsBlocked(p)) {
      blocked++;
      return "";
    }
    if (mainUrls.has(loc)) {
      dupes++;
      return "";
    }
    return block;
  });

  if (dupes > 0 || blocked > 0) {
    await writeFile(extrasPath, extrasXml, "utf8");
    const after = (extrasXml.match(/<url>/g) || []).length;
    console.log(
      `[sitemap] sitemap-extras.xml dedupe: ${before} → ${after} URLs (dropped ${dupes} duplicates, ${blocked} robots-blocked)`,
    );
  }
}

async function ensureExtrasInIndex() {
  // sitemap-extras.xml is built/maintained by scripts/cleanup-orphan-sitemaps.mjs
  // and lists prerendered HTML pages that aren't in the upstream main sitemap
  // (e.g. inventory-gated near-me / treatment-geo combos that nonetheless ship
  // a static .html). The main `generate-sitemaps.mjs` flow rebuilds
  // sitemap-index.xml from the edge function each run, which would otherwise
  // drop the extras reference. Re-merge it here so robots → index → extras
  // discovery stays intact.
  const extrasPath = path.join(publicDir, "sitemap-extras.xml");
  const indexPath = path.join(publicDir, "sitemap-index.xml");
  if (!(await fileExists(extrasPath)) || !(await fileExists(indexPath))) return;

  let xml = await readFile(indexPath, "utf8");
  if (xml.includes("sitemap-extras.xml")) return;

  const today = new Date().toISOString().slice(0, 10);
  const entry = `  <sitemap>\n    <loc>${CANONICAL_HOST}/sitemap-extras.xml</loc>\n    <lastmod>${today}</lastmod>\n  </sitemap>\n`;
  xml = xml.replace(/<\/sitemapindex>/, `${entry}</sitemapindex>`);
  await writeFile(indexPath, xml, "utf8");
  console.log("[sitemap] merged sitemap-extras.xml into sitemap-index.xml");
}

/**
 * Reconcile sitemap-facilities.xml with the static /center/*.html mirrors.
 *
 * The facilities sitemap is fetched from the `sitemap-facilities` edge function
 * (rich entries: lastmod, changefreq, priority, image:image). The static HTML
 * mirrors are produced separately by generate-facility-profiles-html.mjs from
 * the `public_facilities` view. These two server-side sources can disagree on
 * exactly which facilities they include, which trips check-facility-sitemap-sync
 * — whose FATAL direction is "a /center/*.html file with no sitemap <loc>".
 *
 * Rather than couple the two queries, we make the sitemap a guaranteed superset
 * of the generated HTML: append a minimal <url> entry for any /center slug that
 * has an HTML mirror but isn't already in the sitemap. This preserves the rich
 * edge-fn entries (so we keep image sitemaps / accurate lastmod for the
 * facilities it knows about) while ensuring every static page is discoverable.
 * Runs in every environment off local files, so CI (no rich fetch) and Vercel
 * (full rich fetch) both end up consistent.
 */
async function ensureFacilityHtmlInSitemap() {
  const centerDir = path.join(publicDir, "center");
  const sitemapPath = path.join(publicDir, "sitemap-facilities.xml");
  if (!(await fileExists(centerDir)) || !(await fileExists(sitemapPath))) return;

  const htmlSlugs = (await readdir(centerDir))
    .filter((f) => f.endsWith(".html"))
    .map((f) => f.slice(0, -".html".length))
    // Use the filename slug verbatim — generate-facility-profiles-html writes
    // `${slug}.html` and the sync check reads the filename as-is (no slug
    // validation), so we must match it exactly. Facility slugs are URL-safe by
    // construction and may contain consecutive hyphens (e.g. "c-a-s-a--warren").
    // Only skip stems with characters that would break the URL or XML so we
    // never emit a malformed <loc>.
    .filter((s) => s.length > 0 && !/[<>&"'\s/?#]/.test(s));

  if (htmlSlugs.length === 0) return;

  let xml = await readFile(sitemapPath, "utf8");
  const existing = new Set();
  const locRe = /<loc>\s*([^<\s]+)\s*<\/loc>/g;
  let m;
  while ((m = locRe.exec(xml)) !== null) {
    const mm = m[1].match(/\/center\/([^/?#]+)\/?$/);
    if (mm) existing.add(mm[1]);
  }

  const missing = htmlSlugs.filter((s) => !existing.has(s));
  if (missing.length === 0) return;

  const today = new Date().toISOString().slice(0, 10);
  const blocks = missing
    .map(
      (slug) =>
        `  <url>\n    <loc>${CANONICAL_HOST}/center/${slug}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.80</priority>\n  </url>\n`,
    )
    .join("");

  if (/<\/urlset>\s*$/.test(xml)) {
    xml = xml.replace(/<\/urlset>\s*$/, `${blocks}</urlset>\n`);
  } else {
    xml = `${xml}\n${blocks}`;
  }
  await writeFile(sitemapPath, xml, "utf8");
  console.log(
    `[sitemap] reconciled sitemap-facilities.xml: appended ${missing.length} /center URL(s) present as static HTML but missing from the edge-fn sitemap`,
  );
}

async function main() {
  await mkdir(publicDir, { recursive: true });

  const prerenderedPaths = discoverPrerenderedPaths(publicDir);
  console.log(`[sitemap] discovered ${prerenderedPaths.size} prerendered routes (hybrid layout)`);

  const spaRoutes = await extractSpaRoutes();
  console.log(`[sitemap] discovered ${spaRoutes.staticRoutes.size} static SPA routes and ${spaRoutes.dynamicPrefixes.length} dynamic prefixes from src/App.tsx`);

  const stats = { before: 0, kept: 0, dropped: 0, samples: [] };
  for (const target of targets) {
    await generateSitemapFile(target, prerenderedPaths, stats, spaRoutes);
  }

  // Guarantee every static /center/*.html mirror has a sitemap entry — see
  // the function note. Must run after the facilities sitemap is written.
  await ensureFacilityHtmlInSitemap();

  // Drop sitemap-extras URLs that the regen has just re-introduced into
  // sitemap.xml; also strip any robots-blocked paths. Runs AFTER the
  // regen loop so the freshly-written sitemap.xml is the source of
  // truth for "which URLs are duplicates".
  await dedupeExtrasAgainstMain();

  await ensureExtrasInIndex();

  console.log("──────────────────────────────────────────────");
  console.log(" Sitemap filter summary");
  console.log("──────────────────────────────────────────────");
  console.log(` URLs before filtering : ${stats.before}`);
  console.log(` URLs kept             : ${stats.kept}`);
  console.log(` URLs dropped          : ${stats.dropped}`);
  if (stats.samples.length) {
    console.log(` Sample drops          :`);
    for (const s of stats.samples.slice(0, 10)) console.log(`   - ${s}`);
  }
  console.log("──────────────────────────────────────────────");

  await updateRobotsHeader(stats);
}

await main();

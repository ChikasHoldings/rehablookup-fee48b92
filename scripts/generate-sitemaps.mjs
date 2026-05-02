import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { discoverPrerenderedPaths } from "./lib/prerender-discovery.mjs";
import { extractSpaRoutes } from "./lib/extract-spa-routes.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, "../public");
const CANONICAL_HOST = "https://rehablookup.com";

const projectUrl = (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "https://plckxokpyiubuekvodtc.supabase.co").replace(/\/$/, "");
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
    const hasPrerender = prerenderedPaths.has(norm);
    const inStatic = staticRoutes.has(norm) || norm === "/";
    const inDynamic = allDynamicPrefixes.some((pref) => norm.startsWith(pref) && norm.length > pref.length);
    if (hasPrerender || inStatic || inDynamic) {
      kept++;
      // Rewrite <loc> to canonical form. Build absolute URL using the
      // original origin so we don't accidentally swap hosts.
      let canonicalLoc = loc;
      try {
        const u = new URL(loc);
        canonicalLoc = `${u.origin}${canonical}`;
      } catch {
        canonicalLoc = canonical;
      }
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

async function main() {
  await mkdir(publicDir, { recursive: true });

  const prerenderedPaths = discoverPrerenderedPaths(publicDir);
  console.log(`[sitemap] discovered ${prerenderedPaths.size} prerendered routes (hybrid layout)`);

  const stats = { before: 0, kept: 0, dropped: 0, samples: [] };
  for (const target of targets) {
    await generateSitemapFile(target, prerenderedPaths, stats);
  }

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

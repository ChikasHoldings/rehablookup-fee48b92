#!/usr/bin/env node
/**
 * Orphan Prerender Cleanup — sitemap-aware
 *
 * Goal: stop wasting Google's crawl budget on prerendered HTML files that
 * aren't referenced from any sitemap. After the recent 404 fix, ~297 such
 * pages exist in /public.
 *
 * For each prerendered file NOT listed in any sitemap-*.xml, this script
 * classifies it:
 *
 *   DELETE     → file is noindex, has no live SPA route, or matches a
 *                deprecated path pattern. The HTML is removed from /public.
 *   RE-SITEMAP → file is indexable AND maps to a live React route (literal
 *                in App.tsx or covered by a dynamic prefix in SmartCatchAll).
 *                Path is queued for inclusion in sitemap-extras.xml.
 *
 * Modes:
 *   node scripts/cleanup-orphan-sitemaps.mjs           # dry run, report only
 *   node scripts/cleanup-orphan-sitemaps.mjs --apply   # delete + write sitemap-extras.xml
 *
 * Safety rails:
 *   - Never touches index.html, 404.html, 200.html, or assets/static/fonts/images/.
 *   - Always preserves an explicit ALLOWLIST (legal pages, etc).
 *   - Re-sitemap output goes to public/sitemap-extras.xml and is added as a
 *     <sitemap> entry inside public/sitemap-index.xml (idempotent).
 */

import {
  readdirSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
  rmdirSync,
  existsSync,
} from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  discoverPrerenderedRoutes,
  readPrerenderedHead,
} from "./lib/prerender-discovery.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const publicDir = join(ROOT, "public");
const srcDir = join(ROOT, "src");

const APPLY = process.argv.includes("--apply");
const SITE = "https://rehablookup.com";

const ALLOWLIST = new Set([
  "/",
  "/about",
  "/contact",
  "/privacy",
  "/privacy-policy",
  "/terms",
  "/terms-of-service",
  "/editorial-policy",
  "/medical-disclaimer",
  "/cookies",
  "/sitemap",
]);

// Deprecated path prefixes — always delete, never re-sitemap.
const DEPRECATED_PREFIXES = [
  "/seeker/", // replaced by /client/
];

// ---- Sitemap routes ---------------------------------------------------------
function readSitemapRoutes() {
  const routes = new Set();
  const files = readdirSync(publicDir).filter((f) => /^sitemap.*\.xml$/i.test(f));
  for (const f of files) {
    const xml = readFileSync(join(publicDir, f), "utf8");
    for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
      try {
        const u = new URL(m[1]);
        let p = u.pathname.replace(/\/+$/, "").toLowerCase();
        if (!p) p = "/";
        routes.add(p);
      } catch {}
    }
  }
  return routes;
}

// ---- App.tsx routes (literal + dynamic prefixes) ---------------------------
function readAppRoutes() {
  const literal = new Set();
  const dynamicPrefixes = [];
  const appFile = join(srcDir, "App.tsx");
  if (!existsSync(appFile)) return { literal, dynamicPrefixes };
  const src = readFileSync(appFile, "utf8");
  for (const m of src.matchAll(/<Route\s+path=["']([^"']+)["']/g)) {
    let p = m[1];
    if (!p.startsWith("/")) p = "/" + p;
    if (/[:*]/.test(p)) {
      const parts = [];
      for (const seg of p.split("/")) {
        if (/[:*]/.test(seg)) break;
        parts.push(seg);
      }
      const prefix = parts.join("/") || "/";
      dynamicPrefixes.push(prefix);
    } else {
      literal.add(p.toLowerCase().replace(/\/+$/, "") || "/");
    }
  }
  return { literal, dynamicPrefixes };
}

function isCoveredByApp(route, { literal, dynamicPrefixes }) {
  if (literal.has(route)) return true;
  for (const pfx of dynamicPrefixes) {
    if (pfx === "/" || pfx === "") return true; // catch-all
    if (route === pfx || route.startsWith(pfx + "/")) return true;
  }
  return false;
}

function isDeprecated(route) {
  return DEPRECATED_PREFIXES.some((p) => route.startsWith(p));
}

// ---- File ops ---------------------------------------------------------------
function deleteFileAndPruneEmptyDir(file) {
  unlinkSync(file);
  let dir = dirname(file);
  while (dir.startsWith(publicDir) && dir !== publicDir) {
    try {
      const remaining = readdirSync(dir);
      if (remaining.length === 0) {
        rmdirSync(dir);
        dir = dirname(dir);
      } else break;
    } catch {
      break;
    }
  }
}

// ---- Sitemap writing --------------------------------------------------------
function writeExtrasSitemap(routes) {
  const today = new Date().toISOString().slice(0, 10);
  const urls = routes
    .slice()
    .sort()
    .map(
      (r) =>
        `  <url>\n    <loc>${SITE}${r}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.5</priority>\n  </url>`
    )
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  writeFileSync(join(publicDir, "sitemap-extras.xml"), xml, "utf8");
}

function ensureExtrasInIndex() {
  const idxPath = join(publicDir, "sitemap-index.xml");
  if (!existsSync(idxPath)) return;
  let xml = readFileSync(idxPath, "utf8");
  if (xml.includes("sitemap-extras.xml")) return;
  const today = new Date().toISOString().slice(0, 10);
  const entry = `  <sitemap>\n    <loc>${SITE}/sitemap-extras.xml</loc>\n    <lastmod>${today}</lastmod>\n  </sitemap>\n`;
  xml = xml.replace(/<\/sitemapindex>/, `${entry}</sitemapindex>`);
  writeFileSync(idxPath, xml, "utf8");
}

// ---- Main -------------------------------------------------------------------
function main() {
  const sitemapRoutes = readSitemapRoutes();
  const appRoutes = readAppRoutes();
  const prerendered = discoverPrerenderedRoutes(publicDir);

  const toDelete = []; // [{ route, paths, reason }]
  const toResitemap = []; // [{ route, paths }]

  for (const [route, paths] of prerendered) {
    if (sitemapRoutes.has(route)) continue; // already indexed
    if (ALLOWLIST.has(route)) continue;

    if (isDeprecated(route)) {
      toDelete.push({ route, paths, reason: "deprecated path" });
      continue;
    }

    // Inspect head for noindex
    const file = paths.indexPath ?? paths.flatPath;
    let head = { robots: null, canonical: null, title: null };
    try {
      head = readPrerenderedHead(file);
    } catch {}

    const noindex = head.robots && /noindex/i.test(head.robots);
    if (noindex) {
      toDelete.push({ route, paths, reason: "noindex meta" });
      continue;
    }

    const liveInApp = isCoveredByApp(route, appRoutes);
    if (!liveInApp) {
      toDelete.push({ route, paths, reason: "no matching SPA route" });
      continue;
    }

    // Indexable + has a live route → re-sitemap.
    toResitemap.push({ route, paths });
  }

  console.log(`\n📦 Orphan Prerender Cleanup (sitemap-aware)`);
  console.log(`   Prerendered files:  ${prerendered.size}`);
  console.log(`   Sitemap routes:     ${sitemapRoutes.size}`);
  console.log(`   App literal routes: ${appRoutes.literal.size}`);
  console.log(`   App dyn. prefixes:  ${appRoutes.dynamicPrefixes.length}`);
  console.log(`   Orphans (no sitemap): ${toDelete.length + toResitemap.length}`);
  console.log(`     → DELETE:     ${toDelete.length}`);
  console.log(`     → RE-SITEMAP: ${toResitemap.length}`);

  const sample = (label, arr, fmt) => {
    if (!arr.length) return;
    console.log(`\n--- ${label} (showing ${Math.min(15, arr.length)} of ${arr.length}) ---`);
    for (const x of arr.slice(0, 15)) console.log("  " + fmt(x));
  };
  sample("DELETE", toDelete, (x) => `${x.route}   [${x.reason}]`);
  sample("RE-SITEMAP", toResitemap, (x) => x.route);

  if (!APPLY) {
    console.log(`\n💡 Dry run only. Re-run with --apply to delete + write sitemap-extras.xml.`);
    return;
  }

  // Apply: delete files
  let deletedFiles = 0;
  for (const { paths } of toDelete) {
    if (paths.flatPath && existsSync(paths.flatPath)) {
      deleteFileAndPruneEmptyDir(paths.flatPath);
      deletedFiles++;
    }
    if (paths.indexPath && existsSync(paths.indexPath)) {
      deleteFileAndPruneEmptyDir(paths.indexPath);
      deletedFiles++;
    }
  }

  // Apply: write extras sitemap
  if (toResitemap.length) {
    writeExtrasSitemap(toResitemap.map((x) => x.route));
    ensureExtrasInIndex();
  }

  console.log(`\n🗑️  Deleted ${deletedFiles} HTML files across ${toDelete.length} routes.`);
  console.log(`🗺️  Re-sitemapped ${toResitemap.length} routes → public/sitemap-extras.xml`);
}

main();

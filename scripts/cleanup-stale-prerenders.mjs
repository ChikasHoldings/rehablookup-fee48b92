#!/usr/bin/env node
/**
 * cleanup-stale-prerenders.mjs
 *
 * Surgical cleanup for prerendered HTML files in /public that are:
 *   1. NOT listed in any sitemap (sitemap.xml, sitemap-facilities.xml, sitemap-extras.xml)
 *   2. NOT blocked by robots.txt for Googlebot
 *   3. NOT in the project allowlist (legal pages, /404, /200, etc.)
 *
 * These are the exact files flagged by `npm run validate:sitemap-robots` as
 * "pre-rendered SEO page(s) NOT listed in sitemap.xml and NOT blocked by robots".
 *
 * Why this matters: stale prerenders ship `<meta robots="index, follow">` for
 * routes the sitemap intentionally gated out (zero current facility inventory).
 * Googlebot can land on them via cached links, see a thin-content page declaring
 * itself indexable, and demote crawl budget for the whole cluster.
 *
 * This script complements `cleanup-orphan-prerenders.mjs` (which checks
 * route-vs-React-tree liveness). Here we check sitemap-vs-prerender drift.
 *
 * Default: dry-run. Pass --apply to actually delete.
 *
 *   node scripts/cleanup-stale-prerenders.mjs           # report only
 *   node scripts/cleanup-stale-prerenders.mjs --apply   # delete stale files
 */

import { readFileSync, existsSync, unlinkSync, rmdirSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { discoverPrerenderedRoutes } from "./lib/prerender-discovery.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, "..", "public");
const APPLY = process.argv.includes("--apply");

// Routes that should always keep their prerender even if not in a sitemap.
// (These are conversion / legal / system pages where a static HTML mirror is
//  intentional for direct visitors but excluded from organic indexing.)
const KEEP_ALLOWLIST = new Set([
  "/",
  "/404",
  "/about",
  "/contact",
  "/privacy",
  "/privacy-policy",
  "/terms",
  "/terms-of-service",
  "/editorial-policy",
  "/medical-disclaimer",
  "/accessibility",
]);

// ---------------------------------------------------------------------------
// robots.txt parsing (mirrors validate-sitemap-robots.mjs semantics for
// Googlebot Allow/Disallow precedence — most-specific rule wins)
// ---------------------------------------------------------------------------

function parseRobots(text) {
  const groups = new Map();
  let active = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, "").trim();
    if (!line) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const val = line.slice(idx + 1).trim();
    if (key === "user-agent") {
      const ua = val;
      if (!groups.has(ua)) groups.set(ua, { allow: [], disallow: [] });
      active = [groups.get(ua)];
    } else if ((key === "allow" || key === "disallow") && active.length) {
      for (const g of active) g[key].push(val);
    } else if (key === "user-agent") {
      // handled above
    } else {
      active = [];
    }
  }
  return groups;
}

function ruleMatches(path, pattern) {
  if (!pattern) return false;
  // Convert robots glob ($, *) to RegExp
  const re = new RegExp(
    "^" +
      pattern
        .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
        .replace(/\*/g, ".*")
        .replace(/\\$/, "$")
  );
  return re.test(path);
}

function isAllowed(path, group) {
  if (!group) return true;
  let best = { len: -1, allow: true };
  for (const p of group.allow) {
    if (ruleMatches(path, p) && p.length > best.len) best = { len: p.length, allow: true };
  }
  for (const p of group.disallow) {
    if (p === "") continue;
    if (ruleMatches(path, p) && p.length > best.len) best = { len: p.length, allow: false };
  }
  return best.allow;
}

// ---------------------------------------------------------------------------
// Sitemap parsing
// ---------------------------------------------------------------------------

function loadSitemapPaths(file) {
  if (!existsSync(file)) return new Set();
  const xml = readFileSync(file, "utf8");
  const out = new Set();
  const re = /<loc>\s*([^<\s]+)\s*<\/loc>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    try {
      const u = new URL(m[1]);
      out.add(u.pathname);
    } catch {
      // ignore
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const sitemapPaths = new Set([
    ...loadSitemapPaths(join(PUBLIC_DIR, "sitemap.xml")),
    ...loadSitemapPaths(join(PUBLIC_DIR, "sitemap-facilities.xml")),
    ...loadSitemapPaths(join(PUBLIC_DIR, "sitemap-extras.xml")),
  ]);

  const robotsPath = join(PUBLIC_DIR, "robots.txt");
  if (!existsSync(robotsPath)) {
    console.error("❌ public/robots.txt missing");
    process.exit(1);
  }
  const robots = parseRobots(readFileSync(robotsPath, "utf8"));
  const googlebot = robots.get("Googlebot") ?? robots.get("*");

  const routes = discoverPrerenderedRoutes(PUBLIC_DIR); // Map<route, {flatPath, indexPath}>

  const stale = [];
  for (const [route, paths] of routes) {
    if (sitemapPaths.has(route) || sitemapPaths.has(route + "/")) continue;
    if (KEEP_ALLOWLIST.has(route)) continue;
    // Robots-blocked? Then a static mirror is fine (served to direct visitors,
    // excluded from index). Skip.
    if (!isAllowed(route, googlebot)) continue;
    stale.push({ route, ...paths });
  }

  // Group by top-level prefix for the report.
  const byPrefix = new Map();
  for (const s of stale) {
    const prefix = "/" + (s.route.split("/")[1] || "");
    byPrefix.set(prefix, (byPrefix.get(prefix) ?? 0) + 1);
  }

  console.log("\n🧹 Stale prerender cleanup");
  console.log("─".repeat(60));
  console.log(`  Public dir          : ${PUBLIC_DIR}`);
  console.log(`  Prerendered routes  : ${routes.size}`);
  console.log(`  Sitemap URLs        : ${sitemapPaths.size}`);
  console.log(`  Stale (drift)       : ${stale.length}`);
  console.log(`  Mode                : ${APPLY ? "APPLY (will delete)" : "DRY RUN (no changes)"}`);
  console.log("─".repeat(60));
  console.log("  Stale by top-level prefix:");
  for (const [k, v] of [...byPrefix.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${String(v).padStart(4)}  ${k}`);
  }

  if (stale.length === 0) {
    console.log("\n✅ No stale prerenders. Sitemap and /public are in sync.");
    return 0;
  }

  console.log("\n  Sample (first 15):");
  for (const s of stale.slice(0, 15)) {
    const which = [s.flatPath && "flat", s.indexPath && "index"].filter(Boolean).join("+");
    console.log(`    • ${s.route}  [${which}]`);
  }
  if (stale.length > 15) console.log(`    … and ${stale.length - 15} more`);

  if (!APPLY) {
    console.log(
      `\n${"─".repeat(60)}\nDry run only. Re-run with --apply to delete ${stale.length} stale prerender(s).\n`,
    );
    return 0;
  }

  // ---- Delete ----
  let deleted = 0;
  const deletedDirs = new Set();
  for (const s of stale) {
    if (s.flatPath && existsSync(s.flatPath)) {
      unlinkSync(s.flatPath);
      deleted++;
    }
    if (s.indexPath && existsSync(s.indexPath)) {
      unlinkSync(s.indexPath);
      deleted++;
      deletedDirs.add(dirname(s.indexPath));
    }
  }

  // Try to remove now-empty directories left behind by index.html removal.
  let prunedDirs = 0;
  for (const d of [...deletedDirs].sort((a, b) => b.length - a.length)) {
    try {
      const remaining = readdirSync(d);
      if (remaining.length === 0) {
        rmdirSync(d);
        prunedDirs++;
      }
    } catch {
      // ignore
    }
  }

  console.log(`\n✅ Deleted ${deleted} stale HTML file(s) across ${stale.length} routes.`);
  if (prunedDirs > 0) console.log(`   Pruned ${prunedDirs} empty director${prunedDirs === 1 ? "y" : "ies"}.`);
  console.log("   The SPA fallback will now handle these routes with their runtime noindex policy.\n");
  return 0;
}

process.exit(main());

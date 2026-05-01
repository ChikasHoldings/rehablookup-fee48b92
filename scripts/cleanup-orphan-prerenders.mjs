#!/usr/bin/env node
/**
 * Orphan Prerender Cleanup
 *
 * Identifies prerendered HTML files in /public that no longer correspond to a
 * live route in the React app or in the canonical sitemap allowlist. By
 * default this script runs in DRY-RUN mode and only reports.
 *
 * Usage:
 *   node scripts/cleanup-orphan-prerenders.mjs            # dry run, prints report
 *   node scripts/cleanup-orphan-prerenders.mjs --apply    # actually delete
 *
 * A route is considered "live" if any of these match:
 *   - It is in the App.tsx route table (parsed heuristically by static path).
 *   - It appears in any sitemap-*.xml file currently in /public.
 *   - It is in the explicit ALLOWLIST below (e.g. legal pages).
 *
 * This script never touches index.html, 404.html, 200.html, or anything under
 * SKIP_DIRS (assets/, static/, lovable-uploads/, fonts/, images/).
 */

import { readdirSync, readFileSync, statSync, unlinkSync, rmdirSync, existsSync } from "node:fs";
import { join, relative, sep, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { discoverPrerenderedRoutes } from "./lib/prerender-discovery.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public");
const srcDir = join(__dirname, "..", "src");

const APPLY = process.argv.includes("--apply");

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

// ---- Collect routes from sitemap files ----
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
      } catch {
        // ignore bad entries
      }
    }
  }
  return routes;
}

// ---- Heuristic route extraction from App.tsx ----
function readAppRoutes() {
  const routes = new Set();
  const appFile = join(srcDir, "App.tsx");
  if (!existsSync(appFile)) return routes;
  const src = readFileSync(appFile, "utf8");
  // Capture <Route path="..." />
  for (const m of src.matchAll(/<Route\s+path=["']([^"']+)["']/g)) {
    let p = m[1];
    if (!p.startsWith("/")) p = "/" + p;
    // Strip trailing wildcards or param segments — we only use static prefixes
    // for matching against prerendered files, since a /:slug route can match
    // any leaf. We register both the literal and a "*" sentinel for the
    // dynamic prefix.
    const hasParam = /[:*]/.test(p);
    if (hasParam) {
      const prefix = p.split("/").reduce((acc, seg) => {
        if (acc.dynamic) return acc;
        if (/[:*]/.test(seg)) {
          acc.dynamic = true;
          return acc;
        }
        acc.parts.push(seg);
        return acc;
      }, { parts: [], dynamic: false });
      const pfx = prefix.parts.join("/") || "/";
      routes.add(pfx + "/*");
    } else {
      routes.add(p.toLowerCase().replace(/\/+$/, "") || "/");
    }
  }
  return routes;
}

function isCoveredByDynamicRoute(route, appRoutes) {
  for (const r of appRoutes) {
    if (!r.endsWith("/*")) continue;
    const prefix = r.slice(0, -2); // remove /*
    if (prefix === "" || prefix === "/") return true;
    if (route === prefix || route.startsWith(prefix + "/")) return true;
  }
  return false;
}

function deleteFileAndPruneEmptyDir(file) {
  unlinkSync(file);
  let dir = dirname(file);
  while (dir.startsWith(publicDir) && dir !== publicDir) {
    try {
      const remaining = readdirSync(dir);
      if (remaining.length === 0) {
        rmdirSync(dir);
        dir = dirname(dir);
      } else {
        break;
      }
    } catch {
      break;
    }
  }
}

function main() {
  const sitemapRoutes = readSitemapRoutes();
  const appRoutes = readAppRoutes();
  const prerendered = discoverPrerenderedRoutes(publicDir);

  const orphans = [];
  for (const [route, paths] of prerendered) {
    const inSitemap = sitemapRoutes.has(route);
    const inAllowlist = ALLOWLIST.has(route);
    const inApp = appRoutes.has(route);
    const inDynamic = isCoveredByDynamicRoute(route, appRoutes);
    const live = inSitemap || inAllowlist || inApp || inDynamic;
    if (!live) {
      orphans.push({ route, paths });
    }
  }

  console.log(`\n📦 Prerender Orphan Report`);
  console.log(`   Public dir:       ${publicDir}`);
  console.log(`   Prerendered:      ${prerendered.size}`);
  console.log(`   Sitemap routes:   ${sitemapRoutes.size}`);
  console.log(`   App.tsx routes:   ${appRoutes.size}`);
  console.log(`   Allowlist:        ${ALLOWLIST.size}`);
  console.log(`   Orphans found:    ${orphans.length}`);

  if (orphans.length === 0) {
    console.log(`\n✅ No orphan prerenders.`);
    return;
  }

  console.log(`\n--- First 50 orphans ---`);
  for (const { route, paths } of orphans.slice(0, 50)) {
    console.log(`  ${route}`);
    if (paths.flatPath) console.log(`     flat:   ${relative(publicDir, paths.flatPath)}`);
    if (paths.indexPath) console.log(`     nested: ${relative(publicDir, paths.indexPath)}`);
  }
  if (orphans.length > 50) console.log(`  …and ${orphans.length - 50} more`);

  if (!APPLY) {
    console.log(`\n💡 Dry run only. Re-run with --apply to delete these files.`);
    return;
  }

  let deletedFiles = 0;
  for (const { paths } of orphans) {
    if (paths.flatPath && existsSync(paths.flatPath)) {
      deleteFileAndPruneEmptyDir(paths.flatPath);
      deletedFiles++;
    }
    if (paths.indexPath && existsSync(paths.indexPath)) {
      deleteFileAndPruneEmptyDir(paths.indexPath);
      deletedFiles++;
    }
  }
  console.log(`\n🗑️  Deleted ${deletedFiles} orphan prerender files.`);
}

main();

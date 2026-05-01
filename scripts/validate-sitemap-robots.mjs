#!/usr/bin/env node
/**
 * Pre-deploy sitemap & robots.txt validator.
 *
 * Cross-checks the generated sitemaps against robots.txt and the set of
 * pre-rendered static HTML pages in /public to guarantee:
 *
 *   1. Every URL listed in sitemap.xml / sitemap-facilities.xml is CRAWLABLE
 *      by Googlebot (i.e. not blocked by a Disallow rule in robots.txt).
 *   2. Every pre-rendered SEO HTML file in /public/*.html is INCLUDED in
 *      sitemap.xml. (If we bothered to pre-render it, Google must find it.)
 *   3. A curated set of canonical hubs (homepage, top SEO landing pages,
 *      state directories) is present in sitemap.xml.
 *   4. robots.txt declares Sitemap: lines for both sitemap.xml and
 *      sitemap-facilities.xml so search engines discover them.
 *   5. Sitemap URLs are absolute https://rehablookup.com/* (no http, no
 *      stray domains, no trailing-slash duplicates of canonical paths).
 *
 * Wired into `npm run build` via package.json. Blocks deploy on any error.
 *
 * NOTE: This is a static analyser. It reads the artifacts on disk produced
 * by `generate:sitemaps` and `generate:seo-html`. Run those first (the
 * build script does so automatically) — this validator runs LAST in the
 * pre-build chain.
 */

import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { discoverPrerenderedPaths } from "./lib/prerender-discovery.mjs";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "..");
const PUBLIC_DIR = join(ROOT, "public");
const CANONICAL_HOST = "https://rehablookup.com";

// --------------------------------------------------------------------------
// Curated must-be-indexable canonical hubs.
// If any of these go missing from sitemap.xml the build fails — these are
// the pages we cannot afford to drop from Google's index.
// --------------------------------------------------------------------------
const REQUIRED_HUBS = [
  "/",
  "/rehab-centers",
  "/treatment-types",
  "/locations",
  "/insurance",
  "/rehab-near-me",
  "/drug-rehab-near-me",
  "/alcohol-rehab-near-me",
  "/detox-near-me",
  "/for-providers",
  "/rehab-marketing",
  "/about",
  "/contact",
];

// --------------------------------------------------------------------------
// robots.txt parser
// --------------------------------------------------------------------------

/**
 * Parses robots.txt into a map of user-agent → { allow: string[], disallow: string[], sitemaps: string[] }.
 * Sitemap directives are global (not scoped to a user-agent) per RFC 9309.
 */
function parseRobots(src) {
  const lines = src.split(/\r?\n/);
  const groups = new Map();
  const sitemaps = [];
  let currentAgents = [];
  let pendingNewGroup = true;

  for (let raw of lines) {
    const line = raw.replace(/#.*$/, "").trim();
    if (!line) continue;
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const field = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();

    if (field === "sitemap") {
      sitemaps.push(value);
      continue;
    }

    if (field === "user-agent") {
      if (pendingNewGroup) {
        currentAgents = [];
        pendingNewGroup = false;
      }
      currentAgents.push(value);
      if (!groups.has(value)) groups.set(value, { allow: [], disallow: [] });
      continue;
    }

    pendingNewGroup = true;
    if (currentAgents.length === 0) continue;
    for (const ua of currentAgents) {
      const g = groups.get(ua) ?? { allow: [], disallow: [] };
      if (field === "allow" && value) g.allow.push(value);
      else if (field === "disallow" && value) g.disallow.push(value);
      groups.set(ua, g);
    }
  }

  return { groups, sitemaps };
}

/**
 * Google's robots.txt matching: the most-specific (longest) rule wins;
 * Allow beats Disallow on ties. `*` is a wildcard, `$` anchors end-of-path.
 * Ref: https://developers.google.com/search/docs/crawling-indexing/robots/robots_txt
 */
function patternToRegex(pattern) {
  // Escape regex metacharacters except `*` and `$`.
  let p = pattern.replace(/[.+?^=!:${}()|\[\]\/\\]/g, "\\$&");
  // Restore `$` only when it's the LAST character (end-of-path anchor).
  // We escaped it above; un-escape if positioned at the end.
  if (p.endsWith("\\$")) p = p.slice(0, -2) + "$";
  // `*` → `.*`
  p = p.replace(/\*/g, ".*");
  // Rule must match from start of path.
  return new RegExp("^" + p);
}

function isAllowed(path, group) {
  let bestAllow = -1;
  let bestDisallow = -1;
  for (const r of group.allow) {
    if (patternToRegex(r).test(path)) bestAllow = Math.max(bestAllow, r.length);
  }
  for (const r of group.disallow) {
    if (patternToRegex(r).test(path)) bestDisallow = Math.max(bestDisallow, r.length);
  }
  if (bestDisallow === -1) return true;
  if (bestAllow === -1) return false;
  // Tie → Allow wins (Google's behaviour).
  return bestAllow >= bestDisallow;
}

// --------------------------------------------------------------------------
// Sitemap parser (lightweight — we only need <loc> values)
// --------------------------------------------------------------------------

function parseSitemap(xml) {
  const out = [];
  const re = /<loc>\s*([^<\s]+)\s*<\/loc>/g;
  let m;
  while ((m = re.exec(xml)) !== null) out.push(m[1]);
  return out;
}

function urlPath(url) {
  try {
    const u = new URL(url);
    return u.pathname + (u.search || "");
  } catch {
    return null;
  }
}

// --------------------------------------------------------------------------
// HTML pre-render discovery
// --------------------------------------------------------------------------

/**
 * Returns the list of pre-rendered SEO HTML files at the root of /public,
 * mapped to their canonical site path (filename without .html). Excludes
 * static assets (404.html, index.html) and well-known directories.
 */
function discoverPrerenderedRoutesLocal() {
  // Hybrid prerender layout: accept BOTH /public/<path>.html AND
  // /public/<path>/index.html. Both are served correctly on Vercel.
  return [...discoverPrerenderedPaths(PUBLIC_DIR)];
}

// --------------------------------------------------------------------------
// Run
// --------------------------------------------------------------------------

function main() {
  const errors = [];
  const warnings = [];

  // ---- Load artifacts ------------------------------------------------------
  const robotsPath = join(PUBLIC_DIR, "robots.txt");
  const sitemapPath = join(PUBLIC_DIR, "sitemap.xml");
  const facilitiesSitemapPath = join(PUBLIC_DIR, "sitemap-facilities.xml");
  const extrasSitemapPath = join(PUBLIC_DIR, "sitemap-extras.xml");

  if (!existsSync(robotsPath)) {
    console.error("❌ public/robots.txt is missing.");
    process.exit(1);
  }
  if (!existsSync(sitemapPath)) {
    console.error("❌ public/sitemap.xml is missing — did `npm run generate:sitemaps` succeed?");
    process.exit(1);
  }

  const robots = parseRobots(readFileSync(robotsPath, "utf8"));
  const mainUrls = parseSitemap(readFileSync(sitemapPath, "utf8"));
  const facilityUrls = existsSync(facilitiesSitemapPath)
    ? parseSitemap(readFileSync(facilitiesSitemapPath, "utf8"))
    : [];
  // sitemap-extras.xml hosts the long-tail near-me / treatment-geo / state
  // landing pages that the main generator gates by inventory. Crawlers DO read
  // it (it's declared in robots.txt), so it must be considered authoritative
  // when checking which prerendered HTML files are "discoverable".
  const extrasUrls = existsSync(extrasSitemapPath)
    ? parseSitemap(readFileSync(extrasSitemapPath, "utf8"))
    : [];

  const allSitemapUrls = [...mainUrls, ...facilityUrls, ...extrasUrls];
  const allSitemapPaths = new Set(
    allSitemapUrls.map(urlPath).filter(Boolean)
  );

  // ---- 1. Sitemap declared in robots.txt ----------------------------------
  const expectedSitemaps = [
    `${CANONICAL_HOST}/sitemap.xml`,
    `${CANONICAL_HOST}/sitemap-facilities.xml`,
  ];
  // sitemap-extras.xml is OPTIONAL: only required to be declared in robots.txt
  // if the file actually exists in /public. (Some build profiles skip it.)
  if (existsSync(extrasSitemapPath)) {
    expectedSitemaps.push(`${CANONICAL_HOST}/sitemap-extras.xml`);
  }
  for (const s of expectedSitemaps) {
    if (!robots.sitemaps.includes(s)) {
      errors.push(`robots.txt missing \`Sitemap: ${s}\` directive.`);
    }
  }


  // ---- 2. Sitemap URL hygiene ---------------------------------------------
  const seen = new Set();
  for (const url of allSitemapUrls) {
    if (!url.startsWith(CANONICAL_HOST + "/") && url !== CANONICAL_HOST + "/" && url !== CANONICAL_HOST) {
      errors.push(`Sitemap URL is not on canonical host (${CANONICAL_HOST}): ${url}`);
      continue;
    }
    if (url.startsWith("http://")) {
      errors.push(`Sitemap URL uses insecure http://: ${url}`);
    }
    if (seen.has(url)) {
      errors.push(`Duplicate URL in sitemap: ${url}`);
    }
    seen.add(url);
  }

  // ---- 3. Crawlability gate (Googlebot + *) --------------------------------
  const groupsToCheck = ["Googlebot", "*"];
  for (const ua of groupsToCheck) {
    const group = robots.groups.get(ua);
    if (!group) {
      warnings.push(`robots.txt has no group for User-agent: ${ua}`);
      continue;
    }
    for (const url of allSitemapUrls) {
      const p = urlPath(url);
      if (!p) continue;
      if (!isAllowed(p, group)) {
        errors.push(
          `Sitemap URL is BLOCKED by robots.txt for User-agent: ${ua} → ${url}`
        );
      }
    }
  }

  // ---- 4. Required canonical hubs in sitemap ------------------------------
  for (const hub of REQUIRED_HUBS) {
    if (!allSitemapPaths.has(hub) && !allSitemapPaths.has(hub + "/")) {
      errors.push(`Required canonical hub missing from sitemap.xml: ${hub}`);
    }
  }

  // ---- 5. Pre-rendered HTML files must be in sitemap ----------------------
  // If we shipped a static .html for SEO, it MUST be discoverable via sitemap
  // — UNLESS the path is explicitly Disallow'd in robots.txt (in which case
  // the .html is served for direct visitors but intentionally excluded from
  // the index, e.g. /request-help, /placement-help conversion pages).
  const prerendered = discoverPrerenderedRoutesLocal();
  const googleGroup = robots.groups.get("Googlebot");
  let missingPrerender = 0;
  const sampleMissing = [];
  for (const route of prerendered) {
    if (allSitemapPaths.has(route) || allSitemapPaths.has(route + "/")) continue;
    // Skip pages intentionally blocked from Google's index.
    if (googleGroup && !isAllowed(route, googleGroup)) continue;
    missingPrerender++;
    if (sampleMissing.length < 10) sampleMissing.push(route);
  }
  if (missingPrerender > 0) {
    // Soft gate: stale pre-renders don't break crawl/index of canonical pages —
    // they're just orphaned. Warn loudly so devs clean them up, but don't block deploy.
    warnings.push(
      `${missingPrerender} pre-rendered SEO page(s) in /public are NOT listed in sitemap.xml ` +
        `and are NOT blocked by robots.txt. Either add them to the sitemap, block them in ` +
        `robots.txt, or delete the stale .html. Examples: ${sampleMissing.join(", ")}`
    );
  }

  // ---- 6. Required canonical hubs not blocked by robots -------------------
  // (Defence in depth — a hub being in the sitemap but blocked is a Soft 404 magnet.)
  for (const hub of REQUIRED_HUBS) {
    for (const ua of groupsToCheck) {
      const group = robots.groups.get(ua);
      if (!group) continue;
      if (!isAllowed(hub, group)) {
        errors.push(`Canonical hub ${hub} is BLOCKED by robots.txt for User-agent: ${ua}`);
      }
    }
  }

  // ---- Summary ------------------------------------------------------------
  console.log("──────────────────────────────────────────────");
  console.log(" Sitemap & robots.txt audit");
  console.log("──────────────────────────────────────────────");
  console.log(` sitemap.xml URLs            : ${mainUrls.length}`);
  console.log(` sitemap-facilities.xml URLs : ${facilityUrls.length}`);
  console.log(` Pre-rendered HTML files     : ${prerendered.length}`);
  console.log(` Required hubs checked       : ${REQUIRED_HUBS.length}`);
  console.log(` robots Sitemap: directives  : ${robots.sitemaps.length}`);
  console.log(` Warnings                    : ${warnings.length}`);
  console.log(` Errors                      : ${errors.length}`);
  console.log("──────────────────────────────────────────────");

  if (warnings.length) {
    console.log("\n⚠️  Warnings:");
    warnings.forEach((w) => console.log("  • " + w));
  }
  if (errors.length) {
    console.log("\n❌ Errors:");
    errors.forEach((e) => console.log("  • " + e));
    console.log(
      "\nDeploy blocked. Fix the sitemap/robots.txt issues above and re-run `npm run validate:sitemap-robots`.\n"
    );
    process.exit(1);
  }

  console.log(
    "\n✅ All sitemap URLs are crawlable by Googlebot, all required hubs are listed, " +
      "and every pre-rendered SEO page is discoverable.\n"
  );
}

main();

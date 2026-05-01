#!/usr/bin/env node
/**
 * Google Search Console indexing checklist (pre-deploy).
 *
 * Acts as a single, human-readable audit of the four signals GSC uses to
 * decide whether a URL ends up in the index:
 *
 *   1. Sitemap submission       — the URL is listed in sitemap.xml or
 *                                 sitemap-facilities.xml, and robots.txt
 *                                 declares both sitemap files.
 *   2. Robots.txt crawlability  — Googlebot is not blocked from the URL,
 *                                 and admin/auth/system paths ARE blocked.
 *   3. Canonical tags           — every pre-rendered HTML page in /public
 *                                 has a <link rel="canonical"> pointing to
 *                                 itself on https://rehablookup.com.
 *   4. Lastmod freshness        — sitemap <lastmod> timestamps are not
 *                                 stale (older than the freshness budget).
 *
 * Output is structured like a GSC inspection report with per-section
 * pass/warn/fail lines. Hard failures (canonical mismatch, must-block
 * paths reachable, sitemap not declared) block deploy.
 *
 * Wired into `npm run build` AFTER generate:sitemaps and before vite build.
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { discoverPrerenderedFiles } from "./lib/prerender-discovery.mjs";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "..");
const PUBLIC_DIR = join(ROOT, "public");
const CANONICAL_HOST = "https://rehablookup.com";

// Sitemap lastmod older than this triggers a warning. Keep generous so a
// quiet weekend doesn't spam the build log, but tight enough to catch a
// genuinely stale sitemap (e.g. generator silently failed and we kept the
// previous file from public/).
const FRESHNESS_BUDGET_DAYS = 14;

// Paths that MUST be Disallow'd in robots.txt (ship-blocking if reachable).
const MUST_BLOCK = [
  "/admin",
  "/admin/dashboard",
  "/login",
  "/signup",
  "/auth",
  "/api/anything",
  "/concierge/intake",
  "/concierge/dashboard",
];

// Curated canonical hubs that must be in the sitemap.
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
// robots.txt parser (longest-match, Allow-wins-on-tie — Google's rules).
// --------------------------------------------------------------------------

function parseRobots(src) {
  const groups = new Map();
  const sitemaps = [];
  let currentAgents = [];
  let pendingNewGroup = true;
  for (const raw of src.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, "").trim();
    if (!line) continue;
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const field = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();
    if (field === "sitemap") { sitemaps.push(value); continue; }
    if (field === "user-agent") {
      if (pendingNewGroup) { currentAgents = []; pendingNewGroup = false; }
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

function patternToRegex(pattern) {
  let p = pattern.replace(/[.+?^=!:${}()|[\]/\\]/g, "\\$&");
  if (p.endsWith("\\$")) p = p.slice(0, -2) + "$";
  p = p.replace(/\*/g, ".*");
  return new RegExp("^" + p);
}

function isAllowed(path, group) {
  let bestAllow = -1;
  let bestDisallow = -1;
  for (const r of group.allow) if (patternToRegex(r).test(path)) bestAllow = Math.max(bestAllow, r.length);
  for (const r of group.disallow) if (patternToRegex(r).test(path)) bestDisallow = Math.max(bestDisallow, r.length);
  if (bestDisallow === -1) return true;
  if (bestAllow === -1) return false;
  return bestAllow >= bestDisallow;
}

// --------------------------------------------------------------------------
// Sitemap parser
// --------------------------------------------------------------------------

function parseSitemapEntries(xml) {
  // Returns [{ loc, lastmod }]
  const out = [];
  const re = /<url>([\s\S]*?)<\/url>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const block = m[1];
    const loc = (block.match(/<loc>\s*([^<\s]+)\s*<\/loc>/) || [])[1];
    const lastmod = (block.match(/<lastmod>\s*([^<\s]+)\s*<\/lastmod>/) || [])[1];
    if (loc) out.push({ loc, lastmod: lastmod || null });
  }
  return out;
}

function urlPath(url) {
  try { const u = new URL(url); return u.pathname; } catch { return null; }
}

function daysAgo(iso) {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / 86_400_000);
}

// --------------------------------------------------------------------------
// HTML head canonical/robots audit
// --------------------------------------------------------------------------

function auditHtmlHead(filePath, expectedPath) {
  const src = readFileSync(filePath, "utf8");
  const head = src.slice(0, Math.min(src.length, 8000)); // <head> always near top
  const canonicalMatch = head.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);
  const robotsMatch = head.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)["']/i);
  return {
    canonical: canonicalMatch ? canonicalMatch[1] : null,
    robots: robotsMatch ? robotsMatch[1].toLowerCase() : null,
    expected: `${CANONICAL_HOST}${expectedPath}`,
  };
}

function discoverPrerendered() {
  // Hybrid layout: accept both flat .html and nested /index.html.
  // Use the shared discovery so canonical/robots audits cover BOTH.
  return discoverPrerenderedFiles(PUBLIC_DIR);
}

// --------------------------------------------------------------------------
// Run
// --------------------------------------------------------------------------

function section(title) {
  console.log("\n──────────────────────────────────────────────");
  console.log(" " + title);
  console.log("──────────────────────────────────────────────");
}

function pass(msg) { console.log("  ✅ " + msg); }
function warn(msg, bucket) { console.log("  ⚠️  " + msg); bucket.push(msg); }
function fail(msg, bucket) { console.log("  ❌ " + msg); bucket.push(msg); }

function main() {
  const errors = [];
  const warnings = [];

  // Load artifacts
  const robotsPath = join(PUBLIC_DIR, "robots.txt");
  const sitemapPath = join(PUBLIC_DIR, "sitemap.xml");
  const facilitiesSitemapPath = join(PUBLIC_DIR, "sitemap-facilities.xml");

  if (!existsSync(robotsPath) || !existsSync(sitemapPath)) {
    console.error("❌ Missing public/robots.txt or public/sitemap.xml. Run `npm run generate:sitemaps` first.");
    process.exit(1);
  }

  const robots = parseRobots(readFileSync(robotsPath, "utf8"));
  const mainEntries = parseSitemapEntries(readFileSync(sitemapPath, "utf8"));
  const facilityEntries = existsSync(facilitiesSitemapPath)
    ? parseSitemapEntries(readFileSync(facilitiesSitemapPath, "utf8"))
    : [];
  const allEntries = [...mainEntries, ...facilityEntries];
  const allPaths = new Set(allEntries.map((e) => urlPath(e.loc)).filter(Boolean));

  console.log("\n╔════════════════════════════════════════════╗");
  console.log("║  GSC Indexing Checklist                    ║");
  console.log("╚════════════════════════════════════════════╝");

  // ---- 1. Sitemap submission ---------------------------------------------
  section("1/4 — Sitemap submission");
  console.log(`  sitemap.xml URLs            : ${mainEntries.length}`);
  console.log(`  sitemap-facilities.xml URLs : ${facilityEntries.length}`);
  const expectedSitemaps = [
    `${CANONICAL_HOST}/sitemap.xml`,
    `${CANONICAL_HOST}/sitemap-facilities.xml`,
  ];
  for (const s of expectedSitemaps) {
    if (robots.sitemaps.includes(s)) pass(`robots.txt declares Sitemap: ${s}`);
    else fail(`robots.txt missing Sitemap: directive for ${s}`, errors);
  }
  for (const hub of REQUIRED_HUBS) {
    if (allPaths.has(hub) || allPaths.has(hub + "/")) pass(`Required hub in sitemap: ${hub}`);
    else fail(`Required hub missing from sitemap: ${hub}`, errors);
  }

  // ---- 2. Robots.txt crawlability ----------------------------------------
  section("2/4 — Robots.txt crawlability");
  const googlebot = robots.groups.get("Googlebot");
  const star = robots.groups.get("*");
  if (!googlebot) fail("robots.txt has no User-agent: Googlebot group", errors);
  if (!star) fail("robots.txt has no User-agent: * group", errors);

  // Canonical hubs must be reachable.
  for (const hub of REQUIRED_HUBS) {
    for (const [ua, group] of [["Googlebot", googlebot], ["*", star]]) {
      if (!group) continue;
      if (isAllowed(hub, group)) pass(`Crawlable [${ua}]: ${hub}`);
      else fail(`Hub blocked from crawl [${ua}]: ${hub}`, errors);
    }
  }
  // Sensitive paths must be blocked.
  for (const p of MUST_BLOCK) {
    for (const [ua, group] of [["Googlebot", googlebot], ["*", star]]) {
      if (!group) continue;
      if (!isAllowed(p, group)) pass(`Blocked [${ua}]: ${p}`);
      else fail(`Sensitive path REACHABLE [${ua}]: ${p} — add Disallow to robots.txt`, errors);
    }
  }

  // ---- 3. Canonical tags --------------------------------------------------
  section("3/4 — Canonical tags on pre-rendered pages");
  const prerendered = discoverPrerendered();
  console.log(`  Pre-rendered HTML files     : ${prerendered.length}`);
  let canonicalOk = 0;
  let canonicalMissing = 0;
  let canonicalMismatch = 0;
  let robotsNoindexOk = 0;
  const sampleMissing = [];
  const sampleMismatch = [];
  for (const { file, route } of prerendered) {
    const audit = auditHtmlHead(file, route);
    const blockedFromIndex = googlebot ? !isAllowed(route, googlebot) : false;
    if (!audit.canonical) {
      canonicalMissing++;
      if (sampleMissing.length < 5) sampleMissing.push(route);
      continue;
    }
    // Allow trailing-slash equivalence.
    const expected = audit.expected;
    const actual = audit.canonical.replace(/\/$/, "");
    const want = expected.replace(/\/$/, "");
    if (actual === want || actual === want + "/" || actual + "/" === want) canonicalOk++;
    else {
      canonicalMismatch++;
      if (sampleMismatch.length < 5) sampleMismatch.push(`${route} → ${audit.canonical}`);
    }
    // Pages disallowed from crawl should also be noindex (defence in depth).
    if (blockedFromIndex && audit.robots && audit.robots.includes("noindex")) robotsNoindexOk++;
  }
  pass(`Canonical OK: ${canonicalOk}/${prerendered.length}`);
  if (canonicalMissing > 0) {
    fail(
      `${canonicalMissing} pre-rendered page(s) missing <link rel="canonical">. Examples: ${sampleMissing.join(", ")}`,
      errors
    );
  }
  if (canonicalMismatch > 0) {
    fail(
      `${canonicalMismatch} pre-rendered page(s) have canonical pointing to a non-self URL. Examples: ${sampleMismatch.join("; ")}`,
      errors
    );
  }

  // ---- 4. Lastmod freshness -----------------------------------------------
  section("4/4 — Lastmod freshness");
  let withLastmod = 0;
  let missingLastmod = 0;
  let oldestDays = 0;
  let oldestUrl = "";
  let staleCount = 0;
  for (const e of allEntries) {
    if (!e.lastmod) { missingLastmod++; continue; }
    withLastmod++;
    const d = daysAgo(e.lastmod);
    if (d == null) continue;
    if (d > oldestDays) { oldestDays = d; oldestUrl = e.loc; }
    if (d > FRESHNESS_BUDGET_DAYS) staleCount++;
  }
  console.log(`  Entries with <lastmod>      : ${withLastmod}/${allEntries.length}`);
  console.log(`  Oldest <lastmod>            : ${oldestDays} days (${oldestUrl || "n/a"})`);
  if (missingLastmod > 0) {
    warn(`${missingLastmod} sitemap entries are missing <lastmod>`, warnings);
  } else {
    pass("All sitemap entries declare <lastmod>");
  }
  if (oldestDays > FRESHNESS_BUDGET_DAYS) {
    warn(
      `Oldest <lastmod> is ${oldestDays} days old (budget ${FRESHNESS_BUDGET_DAYS}). ` +
        `${staleCount} entries exceed the budget — re-run \`npm run generate:sitemaps\` to refresh.`,
      warnings
    );
  } else {
    pass(`Oldest <lastmod> within ${FRESHNESS_BUDGET_DAYS}-day freshness budget`);
  }

  // ---- Final summary ------------------------------------------------------
  console.log("\n══════════════════════════════════════════════");
  console.log(` Summary: ${errors.length} error(s), ${warnings.length} warning(s)`);
  console.log("══════════════════════════════════════════════");

  if (errors.length) {
    console.log("\nDeploy blocked. Fix the items above and re-run `npm run check:gsc-indexing`.\n");
    process.exit(1);
  }
  console.log("\n✅ GSC indexing checklist passed — sitemaps submitted, robots.txt clean, canonicals self-referencing, sitemap fresh.\n");
}

main();

#!/usr/bin/env node
/**
 * add-orphaned-to-sitemaps.mjs
 *
 * Adds all legitimate orphaned pre-rendered pages to the appropriate sitemaps.
 * 
 * Strategy:
 *  - /rehab-centers/STATE/county/COUNTY  → sitemap.xml  (matches existing county pattern, priority 0.75)
 *  - /detox-centers/STATE                → sitemap.xml  (state-level, priority 0.65)
 *  - /opioid-rehab-near-me/STATE         → sitemap.xml  (state-level, priority 0.65)
 *  - /rehab-marketing/STATE              → sitemap.xml  (state-level, priority 0.65)
 *  - /treatment-types/*                  → sitemap.xml  (treatment type pages, priority 0.70)
 *  - /near-me, /womens-rehab-centers,    → sitemap-extras.xml (misc pages, priority 0.5)
 *    /placement-help, /request-help,
 *    /news, /rehab-score,
 *    /cocaine-rehab-near-me/*, etc.
 *
 * Pages intentionally excluded:
 *  - Auth/user pages (/login, /signup, /account, /provider-login, /provider-signup,
 *    /search-results, /seeker/*, /request-help, /placement-help) — have noindex
 *  - Cross-canonical aliases (/alcohol-rehab, /drug-rehab) — 301 redirects
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "..");
const PUBLIC_DIR = join(ROOT, "public");
const CANONICAL_HOST = "https://rehablookup.com";
const TODAY = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

// Pages to skip — auth/user pages (noindex) and cross-canonical aliases
const SKIP_PREFIXES = new Set([
  "/seeker", "/login", "/signup", "/account",
  "/provider-login", "/provider-signup", "/search-results",
]);
const SKIP_EXACT = new Set(["/alcohol-rehab", "/drug-rehab"]);

// Also skip placement-help and request-help — they are private intake forms
// that should not be indexed (no noindex tag yet, but they are not public SEO pages)
const SKIP_EXACT_ALSO = new Set(["/placement-help", "/request-help"]);

// ── helpers ──────────────────────────────────────────────────────────────────

function loadSitemapUrls(xmlPath) {
  const content = readFileSync(xmlPath, "utf8");
  const urls = new Set();
  for (const m of content.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)) {
    const path = m[1].replace(CANONICAL_HOST, "").replace(/\/$/, "") || "/";
    urls.add(path);
  }
  return urls;
}

function makeEntry(path, priority, changefreq = "weekly") {
  return `  <url>\n    <loc>${CANONICAL_HOST}${path}</loc>\n    <lastmod>${TODAY}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
}

function insertBeforeClosingTag(xml, entries, tag = "</urlset>") {
  const idx = xml.lastIndexOf(tag);
  if (idx === -1) throw new Error(`Closing tag ${tag} not found in sitemap`);
  return xml.slice(0, idx) + entries.join("\n") + "\n" + xml.slice(idx);
}

// ── discover all pre-rendered pages ──────────────────────────────────────────

import { readdirSync, statSync } from "node:fs";

function walkHtml(dir, base = dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    if (["assets", ".well-known"].includes(entry)) continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      results.push(...walkHtml(full, base));
    } else if (entry.endsWith(".html")) {
      const rel = full.slice(base.length).replace(/\\/g, "/");
      let route;
      if (entry === "index.html") {
        route = rel.slice(0, -"/index.html".length) || "/";
      } else {
        route = rel.slice(0, -".html".length);
      }
      results.push(route);
    }
  }
  return results;
}

const allRoutes = walkHtml(PUBLIC_DIR);

// ── load existing sitemap URLs ────────────────────────────────────────────────

const mainSitemapPath = join(PUBLIC_DIR, "sitemap.xml");
const extrasSitemapPath = join(PUBLIC_DIR, "sitemap-extras.xml");

const mainUrls = loadSitemapUrls(mainSitemapPath);
const extrasUrls = loadSitemapUrls(extrasSitemapPath);
const facilitiesUrls = loadSitemapUrls(join(PUBLIC_DIR, "sitemap-facilities.xml"));

const allSitemapUrls = new Set([...mainUrls, ...extrasUrls, ...facilitiesUrls]);

// ── classify and collect new entries ─────────────────────────────────────────

const newMainEntries = [];
const newExtrasEntries = [];
let skipped = 0;
let alreadyPresent = 0;

// Deduplicate routes
const uniqueRoutes = [...new Set(allRoutes)];

for (const route of uniqueRoutes) {
  const norm = route.replace(/\/$/, "") || "/";

  // Skip if already in a sitemap
  if (allSitemapUrls.has(norm) || allSitemapUrls.has(norm + "/")) {
    alreadyPresent++;
    continue;
  }

  // Skip auth/user pages
  const prefix = "/" + norm.slice(1).split("/")[0];
  if (SKIP_PREFIXES.has(prefix)) { skipped++; continue; }
  if (SKIP_EXACT.has(norm) || SKIP_EXACT_ALSO.has(norm)) { skipped++; continue; }

  // Skip 404 page
  if (norm === "/404") { skipped++; continue; }

  // Classify by prefix/pattern
  if (norm.match(/^\/rehab-centers\/[^/]+\/county\//)) {
    // County-level rehab center pages — match existing county priority
    newMainEntries.push(makeEntry(norm, "0.75", "weekly"));
  } else if (
    norm.match(/^\/detox-centers\//) ||
    norm.match(/^\/opioid-rehab-near-me\//) ||
    norm.match(/^\/rehab-marketing\//)
  ) {
    // State-level pages for these treatment clusters
    newMainEntries.push(makeEntry(norm, "0.65", "weekly"));
  } else if (norm.match(/^\/treatment-types\//)) {
    // Treatment type hub pages
    newMainEntries.push(makeEntry(norm, "0.70", "weekly"));
  } else {
    // Everything else goes to sitemap-extras with monthly changefreq
    newExtrasEntries.push(makeEntry(norm, "0.5", "monthly"));
  }
}

// ── write updated sitemaps ────────────────────────────────────────────────────

let mainXml = readFileSync(mainSitemapPath, "utf8");
let extrasXml = readFileSync(extrasSitemapPath, "utf8");

if (newMainEntries.length > 0) {
  mainXml = insertBeforeClosingTag(mainXml, newMainEntries);
  writeFileSync(mainSitemapPath, mainXml, "utf8");
  console.log(`✅ Added ${newMainEntries.length} entries to sitemap.xml`);
} else {
  console.log("ℹ️  No new entries for sitemap.xml");
}

if (newExtrasEntries.length > 0) {
  extrasXml = insertBeforeClosingTag(extrasXml, newExtrasEntries);
  writeFileSync(extrasSitemapPath, extrasXml, "utf8");
  console.log(`✅ Added ${newExtrasEntries.length} entries to sitemap-extras.xml`);
} else {
  console.log("ℹ️  No new entries for sitemap-extras.xml");
}

console.log(`\nSummary:`);
console.log(`  Already in sitemap: ${alreadyPresent}`);
console.log(`  Skipped (auth/alias/404): ${skipped}`);
console.log(`  Added to sitemap.xml: ${newMainEntries.length}`);
console.log(`  Added to sitemap-extras.xml: ${newExtrasEntries.length}`);
console.log(`  Total new entries: ${newMainEntries.length + newExtrasEntries.length}`);

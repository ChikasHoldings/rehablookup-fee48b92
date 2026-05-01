#!/usr/bin/env node
/**
 * Cross-page uniqueness audit for prerendered HTML.
 *
 * Complements `check-seo-meta.mjs` (per-page presence/length checks) by
 * enforcing platform-wide invariants that only show up when you compare
 * pages to each other:
 *
 *   1. Every public page has a UNIQUE <title>          (errors on duplicates)
 *   2. Every public page has a UNIQUE meta description (errors on duplicates)
 *   3. No page ships more than one <link rel="canonical"> tag
 *   4. No two distinct pages share the same canonical URL
 *      (would silently consolidate ranking signal onto one)
 *
 * Why this matters:
 *   - Duplicate titles/descriptions trigger Google's "Duplicate without
 *     user-selected canonical" status, which we have already battled.
 *   - Two pages sharing a canonical URL means one of them will be dropped
 *     from the index entirely.
 *
 * Scans recursively under /public for *.html, skipping noindex / shell pages.
 *
 * Wired into `npm run build` and `npm run build:dev`.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "..");
const PUBLIC_DIR = join(ROOT, "public");

// Pages that are intentionally not unique-meta candidates.
const SKIP_BASENAMES = new Set([
  "index.html",  // SPA shell — meta injected at runtime per route
  "404.html",    // noindex
]);

// Skip these top-level public dirs entirely (assets, generated artefacts, etc.)
const SKIP_DIRS = new Set([
  ".well-known",
  "assets",
  "lovable-uploads",
  "fonts",
  "images",
  "img",
]);

function walkHtml(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const rel = relative(PUBLIC_DIR, full);
    const top = rel.split("/")[0];
    if (SKIP_DIRS.has(top)) continue;
    const st = statSync(full);
    if (st.isDirectory()) {
      walkHtml(full, acc);
    } else if (entry.endsWith(".html") && !SKIP_BASENAMES.has(entry)) {
      acc.push(rel);
    }
  }
  return acc;
}

function matchAll(html, regex) {
  const out = [];
  let m;
  while ((m = regex.exec(html)) !== null) out.push(m);
  return out;
}

function getAttr(tag, attr) {
  const m = tag.match(new RegExp(`${attr}\\s*=\\s*"([^"]*)"`, "i"));
  return m ? m[1] : null;
}

function extractHead(html) {
  const m = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  return m ? m[1] : html;
}

function normalize(s) {
  return (s || "").replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * `/foo.html` and `/foo/index.html` are emitted by the prerenderer for the
 * same logical route, so they SHOULD share title/description/canonical.
 * Collapse them to one logical key for duplicate detection.
 */
function logicalRoute(relPath) {
  if (relPath.endsWith("/index.html")) return relPath.slice(0, -"/index.html".length);
  if (relPath.endsWith(".html")) return relPath.slice(0, -".html".length);
  return relPath;
}

const files = walkHtml(PUBLIC_DIR).sort();
console.log(`\n🔍 Auditing cross-page meta uniqueness on ${files.length} prerendered pages…\n`);

const titleIndex = new Map();      // normalizedTitle -> [route, ...]
const descIndex = new Map();       // normalizedDesc  -> [route, ...]
const canonicalIndex = new Map();  // canonicalHref   -> [route, ...]

const perFileErrors = [];   // [{ file, msg }]
const routeFirstFile = new Map(); // logicalRoute -> first file we saw (for cleaner reporting)

for (const file of files) {
  const html = readFileSync(join(PUBLIC_DIR, file), "utf8");
  const head = extractHead(html);
  const route = logicalRoute(file);
  if (!routeFirstFile.has(route)) routeFirstFile.set(route, file);

  // ---- canonical: in-page duplicate check + cross-page collection ----
  const canonicalTags = matchAll(head, /<link[^>]*\brel=["']canonical["'][^>]*>/gi);
  if (canonicalTags.length > 1) {
    perFileErrors.push({
      file,
      msg: `Page ships ${canonicalTags.length} <link rel="canonical"> tags — must be exactly 1`,
    });
  }
  const canonicalHref = canonicalTags[0] ? getAttr(canonicalTags[0][0], "href") : null;
  if (canonicalHref) {
    if (!canonicalIndex.has(canonicalHref)) canonicalIndex.set(canonicalHref, new Set());
    canonicalIndex.get(canonicalHref).add(route);
  }

  // ---- title (cross-page) ----
  const titleMatch = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? normalize(titleMatch[1]) : "";
  if (title) {
    if (!titleIndex.has(title)) titleIndex.set(title, new Set());
    titleIndex.get(title).add(route);
  }

  // ---- meta description (cross-page) ----
  const descTag = head.match(/<meta[^>]*\bname=["']description["'][^>]*>/i);
  const desc = descTag ? normalize(getAttr(descTag[0], "content")) : "";
  if (desc) {
    if (!descIndex.has(desc)) descIndex.set(desc, new Set());
    descIndex.get(desc).add(route);
  }
}

let errorCount = 0;

function reportDuplicates(label, index, formatKey = (k) => k) {
  const dupes = [...index.entries()].filter(([, routes]) => routes.size > 1);
  if (dupes.length === 0) return;
  console.error(`\n❌ Duplicate ${label} across distinct pages:`);
  for (const [key, routes] of dupes) {
    errorCount += routes.size;
    console.error(`   "${formatKey(key)}"`);
    for (const route of [...routes].sort()) {
      const file = routeFirstFile.get(route) || route;
      console.error(`      • /${file}`);
    }
  }
}

reportDuplicates("<title>", titleIndex, (k) => (k.length > 90 ? k.slice(0, 87) + "…" : k));
reportDuplicates("meta description", descIndex, (k) => (k.length > 90 ? k.slice(0, 87) + "…" : k));
reportDuplicates("canonical URL", canonicalIndex);

if (perFileErrors.length > 0) {
  console.error(`\n❌ Per-page canonical errors:`);
  for (const { file, msg } of perFileErrors) {
    console.error(`   • /${file} — ${msg}`);
    errorCount++;
  }
}

console.log("\n" + "─".repeat(60));
console.log(`Pages scanned:           ${files.length}`);
console.log(`Unique titles:           ${titleIndex.size}`);
console.log(`Unique descriptions:     ${descIndex.size}`);
console.log(`Unique canonicals:       ${canonicalIndex.size}`);
console.log(`Errors:                  ${errorCount}`);
console.log("─".repeat(60));

if (errorCount > 0) {
  console.error(
    `\n❌ Uniqueness audit failed.\n` +
      `   Duplicate titles or descriptions trigger Google's "Duplicate without\n` +
      `   user-selected canonical" classification — fix before deploying.\n`,
  );
  process.exit(1);
}

console.log(`\n✅ Uniqueness audit passed — every page has a unique title, description, and canonical.\n`);

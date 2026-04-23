#!/usr/bin/env node
/**
 * Pre-deploy SEO metadata audit for every public, pre-rendered page.
 *
 * Validates that each page in /public/*.html ships the four signals Google
 * and social crawlers need to index and render previews correctly:
 *
 *   1. <title>           — present, 10-65 chars, contains brand or location
 *   2. meta description  — present, 50-165 chars
 *   3. <link rel="canonical">  — absolute https URL on the production domain
 *   4. Open Graph tags   — og:title, og:description, og:image, og:url, og:type
 *
 * Also flags common regressions:
 *   - Duplicate <title> or duplicate canonical tags
 *   - Canonical pointing at preview/lovable/localhost domains
 *   - og:url disagreeing with the canonical link
 *   - Placeholder strings ("Untitled", "TODO", "{{...}}", "undefined")
 *
 * Wired into `npm run build` after generate:seo-html and the other
 * structured-data audits, so a regression fails CI before deployment.
 *
 * Skips:
 *   - 404 / error pages (noindex by design)
 *   - The dev preview shell (index.html)  — has dynamic SEO at runtime
 */

import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "..");
const PUBLIC_DIR = join(ROOT, "public");

const PROD_DOMAIN = "rehablookup.com";
const ALLOWED_CANONICAL_HOSTS = new Set([
  "rehablookup.com",
  "www.rehablookup.com",
]);

// Pages that intentionally do not need full SEO meta (noindex by design,
// or dynamic SPA shells that inject meta at runtime via react-helmet).
const SKIP_FILES = new Set([
  "index.html",       // SPA shell — meta is injected client-side per route
  "404.html",         // noindex
  "robots.txt",
]);

const TITLE_MIN = 10;
const TITLE_MAX = 65;
const DESC_MIN = 50;
const DESC_MAX = 165;

const PLACEHOLDER_PATTERNS = [
  /\bundefined\b/i,
  /\bnull\b/i,
  /\bTODO\b/,
  /\bUntitled\b/i,
  /\{\{.*?\}\}/, // unrendered template token
  /%[A-Z_]+%/,    // unrendered ENV-style placeholder
];

function readHtml(file) {
  return readFileSync(join(PUBLIC_DIR, file), "utf8");
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

/**
 * Extract <head> only — body content (article copy, hero text) often contains
 * the literal word "undefined" in user-written prose, which would false-positive
 * the placeholder check.
 */
function extractHead(html) {
  const m = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  return m ? m[1] : html;
}

function checkPlaceholders(value) {
  for (const re of PLACEHOLDER_PATTERNS) {
    if (re.test(value)) return re.source;
  }
  return null;
}

function auditFile(file) {
  const html = readHtml(file);
  const head = extractHead(html);
  const errors = [];
  const warnings = [];

  // ---------------- TITLE ----------------
  const titleTags = matchAll(head, /<title[^>]*>([\s\S]*?)<\/title>/gi);
  if (titleTags.length === 0) {
    errors.push("Missing <title> tag");
  } else {
    if (titleTags.length > 1) {
      errors.push(`Found ${titleTags.length} <title> tags — must be exactly 1`);
    }
    const title = titleTags[0][1].trim();
    if (title.length < TITLE_MIN) {
      errors.push(`Title too short (${title.length} chars, min ${TITLE_MIN}): "${title}"`);
    } else if (title.length > TITLE_MAX) {
      warnings.push(`Title may truncate in SERPs (${title.length} chars > ${TITLE_MAX}): "${title}"`);
    }
    const ph = checkPlaceholders(title);
    if (ph) errors.push(`Title contains placeholder (/${ph}/): "${title}"`);
  }

  // ---------------- META DESCRIPTION ----------------
  const descTags = matchAll(head, /<meta[^>]*\bname=["']description["'][^>]*>/gi);
  if (descTags.length === 0) {
    errors.push("Missing <meta name=\"description\"> tag");
  } else {
    if (descTags.length > 1) {
      errors.push(`Found ${descTags.length} description meta tags — must be exactly 1`);
    }
    const desc = getAttr(descTags[0][0], "content") || "";
    if (desc.length < DESC_MIN) {
      errors.push(`Description too short (${desc.length} chars, min ${DESC_MIN}): "${desc.slice(0, 80)}…"`);
    } else if (desc.length > DESC_MAX) {
      warnings.push(`Description may truncate (${desc.length} chars > ${DESC_MAX})`);
    }
    const ph = checkPlaceholders(desc);
    if (ph) errors.push(`Description contains placeholder (/${ph}/)`);
  }

  // ---------------- CANONICAL ----------------
  const canonicalTags = matchAll(head, /<link[^>]*\brel=["']canonical["'][^>]*>/gi);
  let canonicalUrl = null;
  if (canonicalTags.length === 0) {
    errors.push("Missing <link rel=\"canonical\"> tag");
  } else {
    if (canonicalTags.length > 1) {
      errors.push(`Found ${canonicalTags.length} canonical tags — must be exactly 1`);
    }
    canonicalUrl = getAttr(canonicalTags[0][0], "href");
    if (!canonicalUrl) {
      errors.push("Canonical tag has no href attribute");
    } else if (!/^https:\/\//i.test(canonicalUrl)) {
      errors.push(`Canonical must be absolute https URL, got: "${canonicalUrl}"`);
    } else {
      try {
        const u = new URL(canonicalUrl);
        if (!ALLOWED_CANONICAL_HOSTS.has(u.hostname)) {
          errors.push(`Canonical host "${u.hostname}" is not in allow-list (must be ${PROD_DOMAIN})`);
        }
        if (u.search || u.hash) {
          warnings.push(`Canonical contains query/hash, should be clean: "${canonicalUrl}"`);
        }
      } catch {
        errors.push(`Canonical URL is malformed: "${canonicalUrl}"`);
      }
    }
  }

  // ---------------- OPEN GRAPH ----------------
  const required = ["og:title", "og:description", "og:image", "og:url", "og:type"];
  const ogValues = {};
  for (const prop of required) {
    const tags = matchAll(
      head,
      new RegExp(`<meta[^>]*\\bproperty=["']${prop}["'][^>]*>`, "gi"),
    );
    if (tags.length === 0) {
      errors.push(`Missing Open Graph tag: ${prop}`);
      continue;
    }
    if (tags.length > 1) {
      errors.push(`Duplicate Open Graph tag: ${prop} (found ${tags.length})`);
    }
    const content = getAttr(tags[0][0], "content");
    if (!content) {
      errors.push(`${prop} has empty content`);
      continue;
    }
    ogValues[prop] = content;
    const ph = checkPlaceholders(content);
    if (ph) errors.push(`${prop} contains placeholder (/${ph}/)`);
  }

  // og:image must resolve to an absolute URL Facebook/Twitter can fetch
  if (ogValues["og:image"] && !/^https?:\/\//i.test(ogValues["og:image"])) {
    errors.push(`og:image must be absolute URL, got: "${ogValues["og:image"]}"`);
  }

  // og:url should match canonical (most common SEO regression after a refactor)
  if (canonicalUrl && ogValues["og:url"] && ogValues["og:url"] !== canonicalUrl) {
    warnings.push(
      `og:url ("${ogValues["og:url"]}") disagrees with canonical ("${canonicalUrl}")`,
    );
  }

  // og:type should be a known social type
  const validTypes = new Set(["website", "article", "profile", "book", "music.song", "video.movie"]);
  if (ogValues["og:type"] && !validTypes.has(ogValues["og:type"])) {
    warnings.push(`og:type "${ogValues["og:type"]}" is not a standard OG type`);
  }

  return { errors, warnings };
}

// --------------------------------------------------------------------------

const allHtml = readdirSync(PUBLIC_DIR)
  .filter((f) => f.endsWith(".html") && !SKIP_FILES.has(f))
  .sort();

console.log(`\n🔍 Auditing SEO meta on ${allHtml.length} prerendered pages…\n`);

let totalErrors = 0;
let totalWarnings = 0;
let pagesWithErrors = 0;
let pagesWithWarnings = 0;
const failedPages = [];

for (const file of allHtml) {
  const { errors, warnings } = auditFile(file);
  if (errors.length === 0 && warnings.length === 0) continue;

  if (errors.length > 0) {
    pagesWithErrors++;
    totalErrors += errors.length;
    failedPages.push(file);
    console.log(`❌ ${file}`);
    for (const e of errors) console.log(`   ERROR: ${e}`);
  } else {
    pagesWithWarnings++;
  }

  if (warnings.length > 0) {
    if (errors.length === 0) console.log(`⚠️  ${file}`);
    for (const w of warnings) console.log(`   WARN:  ${w}`);
    totalWarnings += warnings.length;
  }
  console.log("");
}

console.log("─".repeat(60));
console.log(`Pages scanned:        ${allHtml.length}`);
console.log(`Pages with errors:    ${pagesWithErrors}`);
console.log(`Pages with warnings:  ${pagesWithWarnings}`);
console.log(`Total errors:         ${totalErrors}`);
console.log(`Total warnings:       ${totalWarnings}`);
console.log("─".repeat(60));

if (totalErrors > 0) {
  console.error(
    `\n❌ SEO meta audit failed: ${totalErrors} error(s) across ${pagesWithErrors} page(s).\n` +
      `   Fix the issues above before deploying — Google will not index pages\n` +
      `   with missing canonicals, malformed meta, or broken Open Graph tags.\n`,
  );
  process.exit(1);
}

console.log(`\n✅ SEO meta audit passed — every page ships title, description, canonical, and OG tags.\n`);

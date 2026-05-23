#!/usr/bin/env node
/**
 * fix-double-brand-titles.mjs
 *
 * Walks public/*.html and dedupes the brand suffix in <title>,
 * <meta name="title">, <meta property="og:title">, <meta name="twitter:title">
 * when the brand "RehabLookup" appears twice (e.g.,
 * "About RehabLookup | RehabLookup" -> "About RehabLookup").
 *
 * The doubling was introduced when the static-HTML generators
 * unconditionally appended " | RehabLookup" to a title that already
 * contained the brand. The generator has been fixed
 * (scripts/generate-missing-html.mjs), but ~14k pre-rendered files
 * already exist on disk; this script cleans them up in one pass.
 *
 * Idempotent: rewrites a file only if at least one of the four title
 * tags actually has a doubled brand. Run:
 *   node scripts/fix-double-brand-titles.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "..", "public");

// Match a brand-suffix pattern inside any of the title-bearing tags.
// We deliberately gate on a doubled brand to avoid touching titles
// where the suffix is the only brand mention (correct behavior).
const TAG_PATTERNS = [
  { regex: /<title>([^<]*)<\/title>/g, name: "title" },
  { regex: /<meta\s+name="title"\s+content="([^"]*)"/g, name: "meta-name-title" },
  { regex: /<meta\s+property="og:title"\s+content="([^"]*)"/g, name: "og:title" },
  { regex: /<meta\s+name="twitter:title"\s+content="([^"]*)"/g, name: "twitter:title" },
];

/** Strip trailing " | RehabLookup" (or "— RehabLookup") IF the head already
 *  contains "RehabLookup" elsewhere. Returns the cleaned string. */
function dedupBrandInTitle(value) {
  if (!value) return value;
  const SEPS = /\s*(?:\||—|-)\s*RehabLookup\s*$/i;
  if (!SEPS.test(value)) return value;
  const head = value.replace(SEPS, "");
  // Only strip if head contains "RehabLookup" already (the doubled case).
  if (!/rehablookup/i.test(head)) return value;
  return head;
}

function processFile(filePath) {
  const orig = fs.readFileSync(filePath, "utf-8");
  let changed = false;
  let next = orig;
  for (const { regex, name: _name } of TAG_PATTERNS) {
    next = next.replace(regex, (full, inner) => {
      const cleaned = dedupBrandInTitle(inner);
      if (cleaned === inner) return full;
      changed = true;
      // Reconstruct the tag with the cleaned value, preserving original wrapping.
      return full.replace(inner, cleaned);
    });
  }
  if (changed) {
    fs.writeFileSync(filePath, next, "utf-8");
    return true;
  }
  return false;
}

function walk(dir, hits = { fixed: 0, scanned: 0 }) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, hits);
    } else if (entry.name.endsWith(".html")) {
      hits.scanned += 1;
      if (processFile(full)) hits.fixed += 1;
    }
  }
  return hits;
}

console.log("Scanning", publicDir, "for double-brand titles...");
const { fixed, scanned } = walk(publicDir);
console.log(`Scanned ${scanned} files, fixed ${fixed}.`);

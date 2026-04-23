#!/usr/bin/env node
/**
 * Build-time audit: pages that render star ratings or review summaries MUST
 * emit a valid AggregateRating JSON-LD block with numeric ratingValue and
 * reviewCount (or ratingCount).
 *
 * Strategy:
 *  1. Scan every pre-rendered HTML file in /public.
 *  2. Detect "rating/review rendering" via four signals:
 *       a) Visible "X.Y out of 5" / "X.Y / 5" / "Rated X.Y" text
 *       b) "(N reviews)" / "N reviews" / "based on N reviews" text
 *       c) Multiple lucide star icons (lucide-star) clustered together
 *       d) data-testid="rating" or class containing "star-rating"
 *  3. For every page that renders ratings, require ≥1 JSON-LD AggregateRating
 *     node (either standalone or nested inside any product/business schema)
 *     with:
 *       - numeric ratingValue (1–5)
 *       - numeric reviewCount OR ratingCount (≥1)
 *       - bestRating defaulting to 5 when present
 *  4. Validate every AggregateRating node we find anywhere in the page,
 *     even if the page doesn't visibly render a rating widget.
 *
 * Hard-fails build on:
 *  - Rating UI rendered, no AggregateRating JSON-LD
 *  - AggregateRating JSON-LD that is invalid JSON
 *  - Missing/non-numeric ratingValue
 *  - Missing/non-numeric reviewCount AND ratingCount
 *  - ratingValue out of 1–bestRating range
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "public");

const errors = [];
const warnings = [];

function listHtmlFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["assets", "images", "img", "fonts", "static"].includes(entry.name)) continue;
      out.push(...listHtmlFiles(full));
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      out.push(full);
    }
  }
  return out;
}

// ---------- Detection of rating/review UI ----------

const RATING_OUT_OF_5 = /\b([0-5](?:\.\d)?)\s*(?:\/|out\s+of)\s*5\b/i;
const RATED_PHRASE = /\bRated\s+([0-5](?:\.\d)?)\s*(?:stars?)?\b/i;
const REVIEW_COUNT_PHRASE =
  /\b(?:based\s+on\s+)?(\d{1,6})\s+(?:verified\s+)?reviews?\b/i;
const REVIEW_COUNT_PARENS = /\(\s*(\d{1,6})\s+reviews?\s*\)/i;
const STAR_RATING_HOOK =
  /(?:data-testid=["']rating["']|class=["'][^"']*\bstar-rating\b[^"']*["'])/i;

function rendersRating(html) {
  const signals = [];
  if (RATING_OUT_OF_5.test(html)) signals.push("X/5 phrase");
  if (RATED_PHRASE.test(html)) signals.push("Rated X phrase");
  if (REVIEW_COUNT_PHRASE.test(html) || REVIEW_COUNT_PARENS.test(html))
    signals.push("review count");
  if (STAR_RATING_HOOK.test(html)) signals.push("star-rating hook");
  // Cluster of ≥4 lucide-star icons in close proximity → visible 5-star widget
  const starCluster = html.match(/lucide-star[^"']*["']/gi);
  if (starCluster && starCluster.length >= 4) signals.push("lucide-star cluster");
  return signals;
}

// ---------- JSON-LD extraction & traversal ----------

function extractJsonLdBlocks(html) {
  const blocks = [];
  const regex =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = regex.exec(html)) !== null) {
    blocks.push(m[1].trim());
  }
  return blocks;
}

function findAggregateRatingNodes(parsed) {
  const out = [];
  const visit = (node) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    const t = node["@type"];
    const isAR = Array.isArray(t)
      ? t.includes("AggregateRating")
      : t === "AggregateRating";
    if (isAR) out.push(node);
    // Check nested aggregateRating property (common on LocalBusiness, Product, etc.)
    if (node.aggregateRating) visit(node.aggregateRating);
    if (Array.isArray(node["@graph"])) node["@graph"].forEach(visit);
    // Walk other object-valued properties to catch deeply nested cases
    for (const key of Object.keys(node)) {
      if (key === "aggregateRating" || key === "@graph") continue;
      const v = node[key];
      if (v && typeof v === "object") visit(v);
    }
  };
  visit(parsed);
  return out;
}

function toNumber(v) {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) {
    return Number(v);
  }
  return null;
}

function validateAggregateRatingNode(node) {
  const local = [];
  const ratingValue = toNumber(node.ratingValue);
  const reviewCount = toNumber(node.reviewCount);
  const ratingCount = toNumber(node.ratingCount);
  const bestRating = toNumber(node.bestRating) ?? 5;
  const worstRating = toNumber(node.worstRating) ?? 1;

  if (ratingValue === null) {
    local.push("missing/non-numeric ratingValue");
  } else if (ratingValue < worstRating || ratingValue > bestRating) {
    local.push(
      `ratingValue ${ratingValue} outside [${worstRating}, ${bestRating}]`
    );
  }

  if (reviewCount === null && ratingCount === null) {
    local.push("missing reviewCount AND ratingCount (need at least one)");
  } else {
    const cnt = reviewCount ?? ratingCount;
    if (cnt < 1) local.push(`review/rating count must be ≥1 (got ${cnt})`);
  }

  if (toNumber(node.bestRating) !== null && bestRating < 1) {
    local.push(`bestRating must be ≥1 (got ${bestRating})`);
  }

  return local;
}

// ---------- Main scan ----------

console.log("⭐ AggregateRating JSON-LD audit");
console.log("─".repeat(60));

if (!fs.existsSync(PUBLIC_DIR)) {
  console.error(`❌ public/ directory not found at ${PUBLIC_DIR}`);
  process.exit(1);
}

const htmlFiles = listHtmlFiles(PUBLIC_DIR);
let pagesWithRatingUI = 0;
let pagesWithRatingSchema = 0;
let totalRatingNodes = 0;

for (const file of htmlFiles) {
  const rel = path.relative(ROOT, file);
  let html;
  try {
    html = fs.readFileSync(file, "utf8");
  } catch (e) {
    warnings.push(`${rel}: unreadable (${e.message})`);
    continue;
  }

  const signals = rendersRating(html);
  const hasRatingUI = signals.length > 0;
  const blocks = extractJsonLdBlocks(html);

  const ratingNodes = [];
  for (let i = 0; i < blocks.length; i++) {
    const raw = blocks[i];
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      // Only flag JSON parse failures here when this block looks like it
      // contains rating data — generic JSON-LD validity is covered by
      // check-structured-data.mjs.
      if (/AggregateRating/i.test(raw)) {
        errors.push(
          `${rel}: JSON-LD block #${i + 1} contains AggregateRating but failed to parse (${e.message})`
        );
      }
      continue;
    }
    ratingNodes.push(...findAggregateRatingNodes(parsed));
  }

  if (ratingNodes.length > 0) {
    pagesWithRatingSchema += 1;
    totalRatingNodes += ratingNodes.length;
    ratingNodes.forEach((node, idx) => {
      const issues = validateAggregateRatingNode(node);
      if (issues.length > 0) {
        errors.push(
          `${rel}: AggregateRating #${idx + 1} → ${issues.join("; ")}`
        );
      }
    });
  }

  if (hasRatingUI) {
    pagesWithRatingUI += 1;
    if (ratingNodes.length === 0) {
      errors.push(
        `${rel}: page renders rating/review UI (${signals.join(", ")}) but emits no AggregateRating JSON-LD`
      );
    }
  }
}

console.log(`Scanned HTML files:              ${htmlFiles.length}`);
console.log(`Pages rendering rating UI:       ${pagesWithRatingUI}`);
console.log(`Pages with AggregateRating:      ${pagesWithRatingSchema}`);
console.log(`AggregateRating nodes found:     ${totalRatingNodes}`);

if (warnings.length) {
  console.log(`\n⚠️  ${warnings.length} warning(s):`);
  warnings.slice(0, 20).forEach((w) => console.log(`  - ${w}`));
}

if (errors.length) {
  console.error(`\n❌ ${errors.length} AggregateRating error(s):`);
  errors.slice(0, 50).forEach((e) => console.error(`  - ${e}`));
  if (errors.length > 50) {
    console.error(`  …and ${errors.length - 50} more`);
  }
  process.exit(1);
}

console.log("\n✅ AggregateRating JSON-LD audit passed");

#!/usr/bin/env node
/**
 * Body-level duplicate / templated / thin content audit.
 *
 * `check-unique-meta.mjs` already proves every page has a UNIQUE title,
 * description and canonical — and it passes. That check cannot see the
 * problem this one exists for. A title is unique the moment it carries a
 * different city name; the 400 words underneath it can still be the same
 * 400 words on every page in the family. Google grades the page, not the
 * <title>, and "Crawled – currently not indexed" is what a corpus of
 * interchangeable bodies earns.
 *
 * WHAT "TEMPLATED" MEANS HERE
 *
 * Each page's visible body is reduced to a normalized token stream with
 * its OWN geography removed — every word that appears in its URL path,
 * plus the state vocabulary, plus digits. Two pages that hash identically
 * after that reduction say the SAME THING about different places. That is
 * the operative definition of a templated doorway page, and it is
 * measurable without a similarity threshold to argue about: it is an
 * exact collision on the de-geographied text.
 *
 * The reduction is deliberately conservative. It removes geography (which
 * SHOULD differ per page and would otherwise mask duplication) and keeps
 * everything else, so any genuinely page-specific sentence — a real
 * facility name, a local statistic, a distinct FAQ answer — breaks the
 * collision and the page is correctly counted as unique.
 *
 * WHAT "THIN" MEANS HERE
 *
 * Visible body word count, scripts/styles/SVG stripped. The default floor
 * is 300 words, which is not a Google-published number (there is none) but
 * is the point below which a programmatic page rarely carries enough
 * substance to answer the query it targets.
 *
 * REPORT-ONLY BY DEFAULT — ON PURPOSE
 *
 * This script exits 0 and prints a report unless `--strict` is passed.
 * Wiring a hard gate into the build before the corpus is remediated would
 * simply break every build, and the remediation (consolidate vs noindex
 * vs enrich) is a content-strategy decision, not a lint fix. Run it with
 * `--strict --max-dupe-pct=N --max-thin-pct=N` once the targets are
 * agreed, and it becomes the regression guard that stops the corpus
 * drifting back.
 *
 * Usage:
 *   node scripts/check-content-uniqueness.mjs
 *   node scripts/check-content-uniqueness.mjs --json=report.json
 *   node scripts/check-content-uniqueness.mjs --strict --max-dupe-pct=10 --max-thin-pct=20
 *   node scripts/check-content-uniqueness.mjs --min-words=300 --top=40
 */

import { readFile, writeFile } from "node:fs/promises";
import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const ROOT = "public";

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=").slice(1).join("=") : fallback;
};
const has = (name) => args.includes(`--${name}`);

const MIN_WORDS = Number(flag("min-words", 300));
const TOP = Number(flag("top", 30));
const STRICT = has("strict");
const MAX_DUPE_PCT = Number(flag("max-dupe-pct", 0));
const MAX_THIN_PCT = Number(flag("max-thin-pct", 0));
const JSON_OUT = flag("json", "");

// State vocabulary — every token that can legitimately differ between two
// pages purely because they describe different places. Removed before
// hashing so geography cannot disguise an otherwise identical body.
const STATE_WORDS = new Set(
  `alabama alaska arizona arkansas california colorado connecticut delaware florida georgia
   hawaii idaho illinois indiana iowa kansas kentucky louisiana maine maryland massachusetts
   michigan minnesota mississippi missouri montana nebraska nevada new hampshire jersey mexico
   york north carolina dakota ohio oklahoma oregon pennsylvania rhode island south tennessee
   texas utah vermont virginia washington west wisconsin wyoming district columbia dc county
   city town`.split(/\s+/),
);

const TAG = /<[^>]+>/g;
const DROPPABLE = /<(script|style|noscript|svg|template)\b[^>]*>[\s\S]*?<\/\1>/gi;
const ENTITY = /&[a-z#0-9]+;/gi;
const WORD = /[a-z][a-z'-]+/g;

/** Visible body text, with non-content elements removed. */
function bodyText(html) {
  const body = /<body\b[^>]*>([\s\S]*)<\/body>/i.exec(html);
  let s = body ? body[1] : html;
  s = s.replace(DROPPABLE, " ").replace(TAG, " ").replace(ENTITY, " ");
  return s.replace(/\s+/g, " ").trim();
}

/**
 * Page family from the file path — the unit a content strategy is decided
 * for. `/insurance/aetna-rehab/ohio/columbus` and its 7,000 siblings are
 * one family; they live or die together.
 */
function familyOf(file) {
  let p = file.slice(ROOT.length).replace(/\\/g, "/").replace(/^\//, "");
  p = p.replace(/\/index\.html$/, "").replace(/\.html$/, "");
  const seg = p.split("/").filter(Boolean);
  const head = seg[0] ?? "";
  const inPlace = /^(.*?)-in-[a-z0-9-]+$/.exec(head);
  if (inPlace) return `${inPlace[1]}-in-*`;
  if (seg.length >= 3) return `/${seg[0]}/*/*`;
  if (seg.length === 2) return `/${seg[0]}/*`;
  return `/${head}`;
}

/** Tokens with this page's own geography and all digits removed. */
function deGeographied(text, file) {
  const own = new Set(
    file
      .toLowerCase()
      .replace(/[^a-z]+/g, " ")
      .split(/\s+/)
      .filter(Boolean),
  );
  const out = [];
  for (const t of text.toLowerCase().match(WORD) ?? []) {
    if (own.has(t) || STATE_WORDS.has(t)) continue;
    out.push(t);
  }
  return out;
}

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, acc);
    else if (entry.endsWith(".html")) acc.push(full);
  }
  return acc;
}

const files = walk(ROOT);
if (files.length === 0) {
  console.error(`✗ check-content-uniqueness: no HTML found under ${ROOT}/`);
  process.exit(1);
}

/** family -> { pages, words[], sigCounts, thin, examples } */
const families = new Map();

for (const file of files) {
  let html;
  try {
    html = await readFile(file, "utf8");
  } catch {
    continue;
  }
  const text = bodyText(html);
  const words = (text.toLowerCase().match(WORD) ?? []).length;
  const sig = createHash("md5").update(deGeographied(text, file).join(" ")).digest("hex").slice(0, 16);

  const fam = familyOf(file);
  let rec = families.get(fam);
  if (!rec) {
    rec = { pages: 0, words: [], sigs: new Map(), thin: 0, sample: new Map() };
    families.set(fam, rec);
  }
  rec.pages += 1;
  rec.words.push(words);
  rec.sigs.set(sig, (rec.sigs.get(sig) ?? 0) + 1);
  if (!rec.sample.has(sig)) rec.sample.set(sig, file);
  if (words < MIN_WORDS) rec.thin += 1;
}

const rows = [];
for (const [family, r] of families) {
  const sorted = [...r.words].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
  // Pages sitting in a cluster of size > 1 — i.e. pages whose body is
  // reproduced somewhere else in the same family.
  let clustered = 0;
  let largest = 0;
  let largestSig = null;
  for (const [sig, n] of r.sigs) {
    if (n > 1) clustered += n;
    if (n > largest) {
      largest = n;
      largestSig = sig;
    }
  }
  rows.push({
    family,
    pages: r.pages,
    distinctBodies: r.sigs.size,
    largestCluster: largest,
    largestClusterExample: r.sample.get(largestSig) ?? null,
    duplicatePages: clustered,
    duplicatePct: +((100 * clustered) / r.pages).toFixed(1),
    medianWords: median,
    minWords: sorted[0] ?? 0,
    thinPages: r.thin,
    thinPct: +((100 * r.thin) / r.pages).toFixed(1),
  });
}

rows.sort((a, b) => b.duplicatePages - a.duplicatePages || b.pages - a.pages);

const totalPages = rows.reduce((n, r) => n + r.pages, 0);
const totalDupe = rows.reduce((n, r) => n + r.duplicatePages, 0);
const totalThin = rows.reduce((n, r) => n + r.thinPages, 0);
const dupePct = +((100 * totalDupe) / totalPages).toFixed(1);
const thinPct = +((100 * totalThin) / totalPages).toFixed(1);

console.log("");
console.log("══════ Body-level duplicate / templated / thin audit ══════");
console.log(` Pages scanned          : ${totalPages.toLocaleString()}`);
console.log(` Page families          : ${rows.length.toLocaleString()}`);
console.log(` Duplicate-body pages   : ${totalDupe.toLocaleString()} (${dupePct}%)`);
console.log(` Thin (<${MIN_WORDS} words)      : ${totalThin.toLocaleString()} (${thinPct}%)`);
console.log("──────────────────────────────────────────────────────────");
console.log(
  `${"family".padEnd(40)}${"pages".padStart(7)}${"bodies".padStart(8)}${"maxDup".padStart(8)}${"dup%".padStart(7)}${"medW".padStart(6)}${"thin%".padStart(7)}`,
);
for (const r of rows.slice(0, TOP)) {
  console.log(
    `${r.family.padEnd(40)}${String(r.pages).padStart(7)}${String(r.distinctBodies).padStart(8)}${String(r.largestCluster).padStart(8)}${String(r.duplicatePct).padStart(7)}${String(r.medianWords).padStart(6)}${String(r.thinPct).padStart(7)}`,
  );
}
if (rows.length > TOP) console.log(`  …and ${rows.length - TOP} more families (use --top=N)`);
console.log("──────────────────────────────────────────────────────────");

if (JSON_OUT) {
  await writeFile(
    JSON_OUT,
    JSON.stringify({ totalPages, totalDupe, dupePct, totalThin, thinPct, minWords: MIN_WORDS, families: rows }, null, 2),
  );
  console.log(` report written → ${JSON_OUT}`);
}

if (!STRICT) {
  console.log("");
  console.log("ℹ️  Report-only. Pass --strict --max-dupe-pct=N --max-thin-pct=N to gate a build.");
  process.exit(0);
}

const failures = [];
if (dupePct > MAX_DUPE_PCT) failures.push(`duplicate-body pages ${dupePct}% exceeds --max-dupe-pct=${MAX_DUPE_PCT}`);
if (thinPct > MAX_THIN_PCT) failures.push(`thin pages ${thinPct}% exceeds --max-thin-pct=${MAX_THIN_PCT}`);

if (failures.length) {
  console.error("");
  for (const f of failures) console.error(`✗ ${f}`);
  console.error("");
  console.error("  The worst families are listed above. A page whose body is");
  console.error("  reproduced on a sibling page adds no crawlable value: either");
  console.error("  give it substance the sibling does not have, consolidate it,");
  console.error("  or take it out of the index.");
  process.exit(1);
}

console.log("");
console.log("✅ check-content-uniqueness: duplicate and thin ratios within agreed limits.");

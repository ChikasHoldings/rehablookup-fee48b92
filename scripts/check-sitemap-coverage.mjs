#!/usr/bin/env node
/**
 * Sitemap × SmartCatchAll coverage validator.
 *
 * Goal: detect silent coverage regressions where a deploy ships a sitemap
 * that no longer enumerates all of the dynamic SEO route patterns served
 * by `<SmartCatchAll />`. Past regressions ("near-me cluster dropped 18k
 * URLs", "city+treatment combos missing from sitemap-extras") would have
 * been caught by this check.
 *
 * What it does:
 *   1. Statically extracts every dynamic prefix array from
 *      src/components/SmartCatchAll.tsx (city+treatment, city+insurance
 *      provider, near-me, legacy redirects, etc.) plus a curated set of
 *      first-class single-prefix branches (/best-rehab-centers-in-,
 *      /list-your-facility-in-, /for-providers-in-, /get-more-patients-in-).
 *   2. Reads the *preview* sitemap. By default this is the on-disk
 *      public/sitemap.xml produced earlier in the build pipeline. Pass
 *      --host <url> to instead fetch <url>/sitemap.xml live from a Vercel
 *      preview / production deployment.
 *   3. Buckets every <loc> path in the sitemap by SmartCatchAll prefix.
 *   4. Compares per-bucket URL counts against scripts/baselines/sitemap-
 *      coverage-baseline.json. Fails on:
 *        - any prefix that drops below baseline × (1 - tolerance), or
 *        - any prefix with a positive baseline that ships zero URLs, or
 *        - the global URL count dropping below baseline × (1 - tolerance).
 *      Prefixes not yet in the baseline simply log a "new" notice.
 *   5. Updates the baseline when run with --update-baseline (safe escape
 *      hatch for intentional removals).
 *
 * Wired into `npm run build` via package.json so the build fails on any
 * coverage drop. Exit 0 = green, 1 = regression detected.
 *
 * Usage:
 *   node scripts/check-sitemap-coverage.mjs                      # read public/sitemap.xml
 *   node scripts/check-sitemap-coverage.mjs --host https://...  # fetch from preview
 *   node scripts/check-sitemap-coverage.mjs --update-baseline   # write current counts as new floor
 *   node scripts/check-sitemap-coverage.mjs --tolerance 0.10    # allow 10% drop (default 5%)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "..");
const SMART_CATCH_ALL_PATH = join(ROOT, "src/components/SmartCatchAll.tsx");
const SITEMAP_PATH = join(ROOT, "public/sitemap.xml");
const BASELINE_DIR = join(ROOT, "scripts/baselines");
const BASELINE_PATH = join(BASELINE_DIR, "sitemap-coverage-baseline.json");

// ──────────────────────────────────────────────────────────────────────────
// CLI args
// ──────────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i === -1 ? d : argv[i + 1];
};
const HOST = (arg("host", "") || "").replace(/\/$/, "");
const TOLERANCE = Number(arg("tolerance", "0.05")) || 0.05;
const UPDATE_BASELINE = argv.includes("--update-baseline");

// ──────────────────────────────────────────────────────────────────────────
// 1. Statically extract dynamic prefixes from SmartCatchAll.tsx
//
// We parse the source rather than importing it because:
//   - SmartCatchAll.tsx is a TSX module that requires a bundler to load,
//   - the array literals are stable, single-line string entries, and
//   - parsing keeps the validator dependency-free for CI.
// ──────────────────────────────────────────────────────────────────────────
function extractPrefixArray(source, varName) {
  // Match `const VAR_NAME = [ ... ];` for plain string arrays AND
  // `const VAR_NAME: ... = [ ... ];` for typed object arrays.
  const re = new RegExp(`const\\s+${varName}\\s*(?::[^=]+)?=\\s*\\[([\\s\\S]*?)\\];`, "m");
  const m = source.match(re);
  if (!m) {
    throw new Error(`Could not find array \`${varName}\` in SmartCatchAll.tsx — has it been renamed?`);
  }
  const body = m[1];
  // Pull every quoted string starting with "/" — works for both
  // `"/foo-"` plain entries and { prefix: "/foo-", ... } object entries.
  const prefixes = [...body.matchAll(/"(\/[^"]+)"/g)].map((mm) => mm[1]);
  // For object arrays (LEGACY_STATE_SUFFIX_REDIRECTS) we only want the
  // `prefix:` field, not `canonical:`. Keep entries that look like a
  // dynamic prefix (end with "-" or are a known canonical hub root).
  return prefixes.filter((p) => p.endsWith("-") || p.endsWith("/"));
}

function loadSmartCatchAllPrefixes() {
  const src = readFileSync(SMART_CATCH_ALL_PATH, "utf8");
  return {
    cityTreatment: extractPrefixArray(src, "CITY_TREATMENT_PREFIXES"),
    cityTreatmentProvider: extractPrefixArray(src, "CITY_TREATMENT_PROVIDER_PREFIXES"),
    cityInsuranceProvider: extractPrefixArray(src, "CITY_INSURANCE_PROVIDER_PREFIXES"),
    legacyStateRedirects: extractPrefixArray(src, "LEGACY_STATE_SUFFIX_REDIRECTS"),
  };
}

// First-class single-prefix branches inside SmartCatchAll's switch ladder.
// These are NOT in array literals, so we hardcode them — but assert their
// presence in the source file so a rename trips the build.
const SINGLE_PREFIX_BRANCHES = [
  "/best-rehab-centers-in-",
  "/list-your-facility-in-",
  "/for-providers-in-",
  "/get-more-patients-in-",
];

function assertSinglePrefixesPresent(src) {
  for (const p of SINGLE_PREFIX_BRANCHES) {
    if (!src.includes(`"${p}"`)) {
      throw new Error(
        `Expected SmartCatchAll.tsx to handle prefix \`${p}\` — not found. ` +
          `Either restore the branch or remove it from SINGLE_PREFIX_BRANCHES in this script.`,
      );
    }
  }
}

// ──────────────────────────────────────────────────────────────────────────
// 2. Load sitemap (local file or remote host)
// ──────────────────────────────────────────────────────────────────────────
async function loadSitemap() {
  if (HOST) {
    const url = `${HOST}/sitemap.xml`;
    const res = await fetch(url, {
      headers: { "User-Agent": "RehabLookupSitemapCoverage/1.0" },
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
    }
    return await res.text();
  }
  if (!existsSync(SITEMAP_PATH)) {
    throw new Error(
      `public/sitemap.xml not found. Run \`npm run generate:sitemaps\` first, ` +
        `or pass --host <url> to fetch from a deployed environment.`,
    );
  }
  return readFileSync(SITEMAP_PATH, "utf8");
}

function extractSitemapPaths(xml) {
  const paths = [];
  const re = /<loc>\s*([^<\s]+)\s*<\/loc>/g;
  let m;
  while ((m = re.exec(xml))) {
    try {
      paths.push(new URL(m[1]).pathname);
    } catch {
      // skip malformed
    }
  }
  return paths;
}

// ──────────────────────────────────────────────────────────────────────────
// 3. Bucket URLs by SmartCatchAll prefix
// ──────────────────────────────────────────────────────────────────────────
function bucketByPrefix(paths, allPrefixes) {
  // Sort prefixes longest-first so /get-more-medicaid-patients-in- wins
  // over /get-more-patients-in- when classifying ambiguous URLs.
  const sorted = [...allPrefixes].sort((a, b) => b.length - a.length);
  const buckets = Object.fromEntries(sorted.map((p) => [p, 0]));
  let unbucketed = 0;
  for (const p of paths) {
    let matched = false;
    for (const prefix of sorted) {
      if (p.startsWith(prefix) && p.length > prefix.length) {
        buckets[prefix]++;
        matched = true;
        break;
      }
    }
    if (!matched) unbucketed++;
  }
  return { buckets, unbucketed };
}

// ──────────────────────────────────────────────────────────────────────────
// 4. Compare against baseline
// ──────────────────────────────────────────────────────────────────────────
function loadBaseline() {
  if (!existsSync(BASELINE_PATH)) return null;
  try {
    return JSON.parse(readFileSync(BASELINE_PATH, "utf8"));
  } catch (err) {
    throw new Error(`Baseline at ${BASELINE_PATH} is not valid JSON: ${err.message}`);
  }
}

function saveBaseline(baseline) {
  if (!existsSync(BASELINE_DIR)) mkdirSync(BASELINE_DIR, { recursive: true });
  writeFileSync(BASELINE_PATH, JSON.stringify(baseline, null, 2) + "\n", "utf8");
}

function compareCounts({ buckets, totalUrls }, baseline) {
  const failures = [];
  const warnings = [];
  const newPrefixes = [];

  // Per-prefix coverage check
  const baselineBuckets = baseline?.buckets ?? {};
  for (const [prefix, count] of Object.entries(buckets)) {
    const prevCount = baselineBuckets[prefix];
    if (prevCount === undefined) {
      newPrefixes.push({ prefix, count });
      continue;
    }
    if (prevCount > 0 && count === 0) {
      failures.push(
        `❌ Prefix \`${prefix}\` had ${prevCount} URLs in baseline but ships **0** now. ` +
          `Likely sitemap regression — verify the SmartCatchAll branch still emits URLs.`,
      );
      continue;
    }
    const minAllowed = Math.floor(prevCount * (1 - TOLERANCE));
    if (count < minAllowed) {
      failures.push(
        `❌ Prefix \`${prefix}\` dropped ${prevCount} → ${count} URLs ` +
          `(below tolerance floor of ${minAllowed}, ${(TOLERANCE * 100).toFixed(0)}% drop allowed).`,
      );
    } else if (count < prevCount) {
      warnings.push(
        `⚠️  Prefix \`${prefix}\` dropped ${prevCount} → ${count} URLs (within ${(TOLERANCE * 100).toFixed(0)}% tolerance).`,
      );
    }
  }

  // Global URL count check
  if (baseline?.totalUrls != null) {
    const minAllowed = Math.floor(baseline.totalUrls * (1 - TOLERANCE));
    if (totalUrls < minAllowed) {
      failures.push(
        `❌ Total sitemap URLs dropped ${baseline.totalUrls} → ${totalUrls} ` +
          `(below tolerance floor of ${minAllowed}).`,
      );
    }
  }

  return { failures, warnings, newPrefixes };
}

// ──────────────────────────────────────────────────────────────────────────
// 5. Run
// ──────────────────────────────────────────────────────────────────────────
async function main() {
  const src = readFileSync(SMART_CATCH_ALL_PATH, "utf8");
  assertSinglePrefixesPresent(src);

  const groups = loadSmartCatchAllPrefixes();
  const allPrefixes = [
    ...groups.cityTreatment,
    ...groups.cityTreatmentProvider,
    ...groups.cityInsuranceProvider,
    ...groups.legacyStateRedirects,
    ...SINGLE_PREFIX_BRANCHES,
  ];

  const sitemapXml = await loadSitemap();
  const paths = extractSitemapPaths(sitemapXml);
  const totalUrls = paths.length;
  const { buckets, unbucketed } = bucketByPrefix(paths, allPrefixes);

  // Always print a summary so CI logs show the shape of the deploy.
  console.log("══════ Sitemap × SmartCatchAll Coverage Audit ══════");
  console.log(` Source              : ${HOST ? `${HOST}/sitemap.xml` : "public/sitemap.xml"}`);
  console.log(` Total <loc> entries : ${totalUrls.toLocaleString()}`);
  console.log(` Tracked prefixes    : ${allPrefixes.length}`);
  console.log(` Unbucketed paths    : ${unbucketed.toLocaleString()} (hubs/static — not validated here)`);
  console.log("───────────────────────────────────────────────────");

  // Group output for readability.
  const printGroup = (label, prefixes) => {
    if (!prefixes.length) return;
    console.log(`\n  ${label} (${prefixes.length} prefixes)`);
    for (const p of prefixes) {
      const count = buckets[p] ?? 0;
      const flag = count === 0 ? " ⚠ zero" : "";
      console.log(`    ${count.toString().padStart(6)}  ${p}${flag}`);
    }
  };
  printGroup("city+treatment", groups.cityTreatment);
  printGroup("city+treatment provider", groups.cityTreatmentProvider);
  printGroup("city+insurance provider", groups.cityInsuranceProvider);
  printGroup("legacy state redirects", groups.legacyStateRedirects);
  printGroup("single-prefix branches", SINGLE_PREFIX_BRANCHES);

  if (UPDATE_BASELINE) {
    saveBaseline({
      generatedAt: new Date().toISOString(),
      tolerance: TOLERANCE,
      totalUrls,
      buckets,
    });
    console.log(`\n✅ Baseline written to ${BASELINE_PATH} with ${Object.keys(buckets).length} prefixes.`);
    return;
  }

  const baseline = loadBaseline();
  if (!baseline) {
    console.log(
      "\n⚠️  No baseline found at scripts/baselines/sitemap-coverage-baseline.json. " +
        "Run with --update-baseline to capture the current counts as the floor.",
    );
    // No baseline = no regression possible. Don't fail the build on first run.
    return;
  }

  const { failures, warnings, newPrefixes } = compareCounts({ buckets, totalUrls }, baseline);

  if (newPrefixes.length) {
    console.log(`\nℹ️  ${newPrefixes.length} new prefix${newPrefixes.length === 1 ? "" : "es"} not yet in baseline:`);
    for (const { prefix, count } of newPrefixes) {
      console.log(`    ${count.toString().padStart(6)}  ${prefix}`);
    }
    console.log("    Run with --update-baseline to track them going forward.");
  }
  if (warnings.length) {
    console.log("\nWarnings (within tolerance):");
    for (const w of warnings) console.log(`  ${w}`);
  }
  if (failures.length) {
    console.error("\n══════ COVERAGE REGRESSIONS ══════");
    for (const f of failures) console.error(`  ${f}`);
    console.error(
      `\nIf this drop is intentional, re-run with --update-baseline ` +
        `to capture the new floor (and document why in your PR).`,
    );
    process.exit(1);
  }
  console.log("\n✅ Sitemap coverage matches or exceeds baseline.");
}

main().catch((err) => {
  console.error(`\n❌ ${err.message}`);
  process.exit(1);
});

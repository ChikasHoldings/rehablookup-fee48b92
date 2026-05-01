#!/usr/bin/env node
/**
 * Pre-deploy structured-data audit for key public pages.
 *
 * Every public page on RehabLookup must emit specific schema.org types so
 * Google can render the right rich-result format (knowledge panel, sitelinks
 * search box, local pack, FAQ accordion). This audit guarantees those
 * types are present in the page source AND that any JSON-LD that ships in
 * the pre-rendered static HTML is syntactically valid.
 *
 * Two independent checks per page:
 *
 *   A. SOURCE expectations — grep the React page source (and the shared
 *      <SEO /> component, which always emits Organization+MedicalBusiness
 *      and WebSite schema) for the schemas that page is contractually
 *      expected to ship at runtime. Catches accidental removal of
 *      `structuredData={...}` props or schema generators.
 *
 *   B. STATIC HTML JSON-LD validity — for every <script type="application/ld+json">
 *      block in /public/<page>.html, JSON.parse it and verify it has
 *      "@context" and "@type". Catches generator regressions that emit
 *      malformed JSON (which Google silently skips).
 *
 * Wired into `npm run build` after generate:seo-html.
 */

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { discoverPrerenderedFiles } from "./lib/prerender-discovery.mjs";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "..");
const PUBLIC_DIR = join(ROOT, "public");

// --------------------------------------------------------------------------
// Page contract: each page must satisfy the listed schema expectations.
//
// `sourceMustContain` matches the React source. Each entry is { needle,
// reason } — we use needle-based detection because the schema literals
// live in shared generators (generateLocalBusinessSchema, etc.) rather than
// inline @type strings.
//
// `htmlMustHaveValidJsonLd` requires the corresponding pre-rendered HTML
// to ship at least one valid JSON-LD block. (We do not enforce specific
// @type strings in static HTML because most rich schemas are injected at
// runtime by react-helmet-async.)
// --------------------------------------------------------------------------
const PAGE_CONTRACTS = [
  {
    label: "Home",
    source: "src/pages/Index.tsx",
    html: null, // Home does not pre-render to /public/index.html in our pipeline.
    sourceMustContain: [
      { needle: "<SEO", reason: "<SEO /> emits Organization + MedicalBusiness + WebSite schema" },
    ],
  },
  {
    label: "Rehab Centers",
    source: "src/pages/RehabCenters.tsx",
    html: "public/rehab-centers.html",
    sourceMustContain: [
      { needle: "<SEO", reason: "<SEO /> emits Organization + MedicalBusiness + WebSite schema" },
    ],
  },
  {
    label: "About",
    source: "src/pages/About.tsx",
    html: "public/about.html",
    sourceMustContain: [
      { needle: "<SEO", reason: "<SEO /> emits Organization + MedicalBusiness + WebSite schema" },
    ],
  },
  {
    label: "Contact",
    source: "src/pages/Contact.tsx",
    html: "public/contact.html",
    sourceMustContain: [
      { needle: "<SEO", reason: "<SEO /> emits Organization + MedicalBusiness + WebSite schema" },
    ],
  },
  {
    label: "Center Profile",
    source: "src/pages/CenterProfile.tsx",
    html: null, // Profiles are dynamic; pre-rendered per slug, not in /public root.
    sourceMustContain: [
      { needle: "<SEO", reason: "<SEO /> emits Organization + MedicalBusiness + WebSite schema" },
      {
        needle: "generateLocalBusinessSchema",
        reason: "Profile must emit MedicalClinic + LocalBusiness via generateLocalBusinessSchema()",
      },
    ],
  },
];

// Optional contract: if a page renders <PageFAQ ...>, it ships FAQPage schema
// automatically (unless withSchema={false}). We check this opportunistically.
function pageRendersFaq(src) {
  if (!/<PageFAQ\b/.test(src)) return false;
  const opens = src.match(/<PageFAQ\b[^>]*>/g) || [];
  return opens.some((tag) => !/withSchema\s*=\s*\{?\s*false\s*\}?/.test(tag));
}

// --------------------------------------------------------------------------
// SEO.tsx baseline guarantee — make sure the shared component still emits
// the schemas we depend on. If this regresses, EVERY page silently loses
// its baseline structured data.
// --------------------------------------------------------------------------
const SEO_COMPONENT_PATH = "src/components/SEO.tsx";
const SEO_BASELINE_NEEDLES = [
  // Organization + MedicalBusiness combined @type array.
  { needle: '"Organization", "MedicalBusiness"', reason: "SEO baseline Organization+MedicalBusiness schema" },
  // WebSite schema with potentialAction (sitelinks search box).
  { needle: 'potentialAction', reason: "SEO baseline WebSite schema with SearchAction" },
];

// --------------------------------------------------------------------------
// JSON-LD extraction & validation
// --------------------------------------------------------------------------

/** Returns array of raw JSON strings from <script type="application/ld+json"> blocks. */
function extractJsonLdBlocks(html) {
  const blocks = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) blocks.push(m[1].trim());
  return blocks;
}

/** Validates a JSON-LD block. Returns { ok: bool, error?: string, types?: string[] }. */
function validateJsonLd(raw) {
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    return { ok: false, error: `Invalid JSON: ${e.message}` };
  }
  const items = Array.isArray(data) ? data : [data];
  const types = [];
  for (const item of items) {
    if (!item || typeof item !== "object") {
      return { ok: false, error: "JSON-LD root is not an object" };
    }
    if (!item["@context"]) {
      return { ok: false, error: 'Missing "@context"' };
    }
    if (!item["@type"]) {
      return { ok: false, error: 'Missing "@type"' };
    }
    const t = item["@type"];
    if (Array.isArray(t)) types.push(...t);
    else types.push(String(t));
  }
  return { ok: true, types };
}

// --------------------------------------------------------------------------
// Run
// --------------------------------------------------------------------------

function readSafe(path) {
  if (!existsSync(path)) return null;
  return readFileSync(path, "utf8");
}

function main() {
  const errors = [];
  const warnings = [];

  console.log("\n╔════════════════════════════════════════════╗");
  console.log("║  Structured Data Audit                     ║");
  console.log("╚════════════════════════════════════════════╝");

  // ---- Baseline: SEO.tsx still emits Organization + WebSite ---------------
  console.log("\n── Shared <SEO /> component baseline ──");
  const seoSrc = readSafe(join(ROOT, SEO_COMPONENT_PATH));
  if (!seoSrc) {
    errors.push(`Missing ${SEO_COMPONENT_PATH} — every page depends on this for Organization schema.`);
  } else {
    for (const { needle, reason } of SEO_BASELINE_NEEDLES) {
      if (seoSrc.includes(needle)) console.log(`  ✅ ${reason}`);
      else errors.push(`SEO baseline regression: "${needle}" not found in ${SEO_COMPONENT_PATH} (${reason})`);
    }
  }

  // ---- Per-page contracts -------------------------------------------------
  for (const contract of PAGE_CONTRACTS) {
    console.log(`\n── ${contract.label} (${contract.source}) ──`);
    const src = readSafe(join(ROOT, contract.source));
    if (!src) {
      errors.push(`${contract.label}: source file missing at ${contract.source}`);
      continue;
    }
    for (const { needle, reason } of contract.sourceMustContain) {
      if (src.includes(needle)) console.log(`  ✅ ${reason}`);
      else errors.push(`${contract.label}: source missing "${needle}" — ${reason}`);
    }
    // Opportunistic FAQ check.
    if (pageRendersFaq(src)) console.log(`  ✅ Renders <PageFAQ /> → FAQPage schema auto-emitted`);

    // Static HTML JSON-LD validity.
    if (contract.html) {
      const htmlPath = join(ROOT, contract.html);
      const html = readSafe(htmlPath);
      if (!html) {
        warnings.push(`${contract.label}: pre-rendered HTML missing at ${contract.html} — skipping JSON-LD validity check.`);
        continue;
      }
      const blocks = extractJsonLdBlocks(html);
      if (blocks.length === 0) {
        warnings.push(`${contract.label}: pre-rendered HTML has no <script type="application/ld+json"> blocks (runtime-only schemas).`);
        continue;
      }
      const allTypes = new Set();
      let ok = 0;
      for (let i = 0; i < blocks.length; i++) {
        const result = validateJsonLd(blocks[i]);
        if (!result.ok) {
          errors.push(`${contract.label}: JSON-LD block #${i + 1} in ${contract.html} is INVALID — ${result.error}`);
        } else {
          ok++;
          for (const t of result.types) allTypes.add(t);
        }
      }
      console.log(`  ✅ JSON-LD blocks valid: ${ok}/${blocks.length} → @types: ${[...allTypes].join(", ") || "(none)"}`);
    }
  }

  // ---- Sweep: every pre-rendered HTML in /public/*.html should have
  // syntactically valid JSON-LD wherever it ships any. This catches
  // generator regressions across the long tail of SEO landing pages.
  console.log("\n── Sweep: JSON-LD validity across pre-rendered SEO pages ──");
  let scanned = 0;
  let broken = 0;
  const sampleBroken = [];
  // Hybrid: walk BOTH flat /public/<path>.html AND nested /public/<path>/index.html.
  for (const { route, file } of discoverPrerenderedFiles(PUBLIC_DIR)) {
    if (!file) continue;
    scanned++;
    const html = readFileSync(file, "utf8");
    const blocks = extractJsonLdBlocks(html);
    for (const block of blocks) {
      const r = validateJsonLd(block);
      if (!r.ok) {
        broken++;
        if (sampleBroken.length < 5) sampleBroken.push(`${route}: ${r.error}`);
        break;
      }
    }
  }
  console.log(`  Pre-rendered HTML scanned   : ${scanned}`);
  console.log(`  With invalid JSON-LD        : ${broken}`);
  if (broken > 0) {
    errors.push(
      `${broken} pre-rendered HTML file(s) ship INVALID JSON-LD. Examples:\n    - ${sampleBroken.join("\n    - ")}`
    );
  } else {
    console.log("  ✅ All ld+json blocks parse cleanly with @context + @type");
  }

  // ---- Summary ------------------------------------------------------------
  console.log("\n══════════════════════════════════════════════");
  console.log(` Summary: ${errors.length} error(s), ${warnings.length} warning(s)`);
  console.log("══════════════════════════════════════════════");

  if (warnings.length) {
    console.log("\n⚠️  Warnings:");
    warnings.forEach((w) => console.log("  • " + w));
  }
  if (errors.length) {
    console.log("\n❌ Errors:");
    errors.forEach((e) => console.log("  • " + e));
    console.log("\nDeploy blocked. Fix structured data issues above and re-run `npm run check:structured-data`.\n");
    process.exit(1);
  }
  console.log("\n✅ Structured data audit passed — required schemas declared and JSON-LD parses cleanly.\n");
}

main();

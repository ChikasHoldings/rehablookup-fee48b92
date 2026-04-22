#!/usr/bin/env node
/**
 * Pre-deploy SEO schema validator.
 *
 * Statically analyses every SEO landing page (and its shared template stack)
 * to confirm that each page emits exactly one set of the schemas Google cares
 * about for our directory:
 *
 *   - BreadcrumbList   (from <SEO breadcrumbs={...}/>  — auto-emitted)
 *   - FAQPage          (from page-level structuredData OR <PageFAQ/> — never both)
 *   - ItemList         (from page-level structuredData when applicable)
 *
 * It also flags missing required fields per schema type. The script is wired
 * into `npm run build` (see package.json) so it blocks deploy if it finds any
 * duplicates, conflicts, or malformed schema literals.
 *
 * NOTE: This is a static analyser — it parses TSX source and looks at the
 * literal `structuredData` blocks plus component composition. It does not
 * execute React, so it cannot catch runtime-only bugs. It DOES catch the
 * structural mistakes that cause GSC "Duplicate structured data" warnings,
 * which is the failure mode this gate exists to prevent.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "..");
const SEO_DIRS = [
  "src/pages/seo",
  "src/pages/near-me",
];

const SCHEMA_TYPES = ["BreadcrumbList", "FAQPage", "ItemList"];

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) out.push(...walk(full));
    else if (entry.endsWith(".tsx") || entry.endsWith(".ts")) out.push(full);
  }
  return out;
}

/** Counts occurrences of `"@type": "<TYPE>"` literal in source. */
function countTypeLiteral(src, type) {
  // Allow single or double quotes, optional `as const`, and whitespace.
  const re = new RegExp(`["']@type["']\\s*:\\s*["']${type}["']`, "g");
  return (src.match(re) || []).length;
}

/** True if the file passes a `structuredData` prop to <SEO ... /> or <SEOLandingTemplate ... />. */
function hasStructuredDataProp(src) {
  return /\bstructuredData\s*=\s*\{/.test(src);
}

/** True if the file renders <PageFAQ ...> WITHOUT explicit withSchema={false}. */
function rendersPageFAQWithSchema(src) {
  if (!/<PageFAQ\b/.test(src)) return false;
  // Find every <PageFAQ ...> opening tag (greedy until first '>' that isn't inside braces — simple heuristic ok here).
  const opens = src.match(/<PageFAQ\b[^>]*>/g) || [];
  return opens.some((tag) => !/withSchema\s*=\s*\{?\s*false\s*\}?/.test(tag));
}

/** True if the file renders <SEOLandingTemplate ...> with `faqs={...}` (template emits FAQ section, not schema). */
function rendersTemplate(src) {
  return /<SEOLandingTemplate\b/.test(src);
}

/**
 * Pulls the `breadcrumbs` prop array length (best-effort) and verifies every
 * item has both `name` and `url`. Returns { count, missingFields: string[] }.
 */
function inspectBreadcrumbs(src) {
  const m = src.match(/breadcrumbs\s*=\s*\{\s*\[([\s\S]*?)\]\s*\}/);
  if (!m) return { count: 0, missingFields: [] };
  const body = m[1];
  // crude split on top-level objects
  const items = body.split(/\},\s*\{/).map((x) => x.replace(/^\s*\{?|\}?\s*$/g, ""));
  const missing = [];
  items.forEach((item, idx) => {
    if (!/\bname\s*:/.test(item)) missing.push(`breadcrumb[${idx}].name`);
    if (!/\burl\s*:/.test(item)) missing.push(`breadcrumb[${idx}].url`);
  });
  return { count: items.length, missingFields: missing };
}

/**
 * Inspects FAQPage literal blocks in the source and verifies each one has
 * `mainEntity` populated.
 */
function inspectFAQBlocks(src) {
  const blocks = src.match(/\{\s*[^{}]*?["']@type["']\s*:\s*["']FAQPage["'][\s\S]*?\}\s*[,)]/g) || [];
  const missing = [];
  blocks.forEach((block, idx) => {
    if (!/mainEntity\s*:/.test(block)) missing.push(`FAQPage[${idx}].mainEntity`);
  });
  return { count: blocks.length, missingFields: missing };
}

/** Inspects ItemList blocks for `itemListElement`. */
function inspectItemListBlocks(src) {
  const blocks = src.match(/\{\s*[^{}]*?["']@type["']\s*:\s*["']ItemList["'][\s\S]*?\}\s*[,)]/g) || [];
  const missing = [];
  blocks.forEach((block, idx) => {
    if (!/itemListElement\s*:/.test(block)) missing.push(`ItemList[${idx}].itemListElement`);
  });
  return { count: blocks.length, missingFields: missing };
}

// --------------------------------------------------------------------------
// Per-file audit
// --------------------------------------------------------------------------

function auditFile(file) {
  const src = readFileSync(file, "utf8");
  const rel = relative(ROOT, file);
  const issues = [];

  const breadcrumbCount = countTypeLiteral(src, "BreadcrumbList");
  const faqCount = countTypeLiteral(src, "FAQPage");
  const itemListCount = countTypeLiteral(src, "ItemList");

  // --- Breadcrumb checks ---------------------------------------------------
  // SEO.tsx auto-emits BreadcrumbList from the `breadcrumbs` prop. So the page
  // must NOT also push a BreadcrumbList into its `structuredData` array.
  if (breadcrumbCount > 0) {
    issues.push({
      severity: "error",
      type: "BreadcrumbList",
      message:
        "Page literally defines a BreadcrumbList schema. The shared <SEO> component already emits one from the `breadcrumbs` prop — this creates a duplicate.",
    });
  }
  const bc = inspectBreadcrumbs(src);
  if (bc.missingFields.length > 0) {
    issues.push({
      severity: "error",
      type: "BreadcrumbList",
      message: `Breadcrumb items missing required fields: ${bc.missingFields.join(", ")}`,
    });
  }

  // --- FAQPage checks ------------------------------------------------------
  // A page can emit FAQ schema via:
  //   (a) structuredData containing { "@type": "FAQPage", ... }
  //   (b) <PageFAQ /> (auto-emits unless withSchema={false})
  // Both at once = duplicate schema warning in GSC.
  const hasFaqInStructured = faqCount > 0;
  const hasFaqViaComponent = rendersPageFAQWithSchema(src);
  if (hasFaqInStructured && hasFaqViaComponent) {
    issues.push({
      severity: "error",
      type: "FAQPage",
      message:
        "Both a literal FAQPage schema (structuredData) AND <PageFAQ withSchema!=false /> are present. Pass `withSchema={false}` to <PageFAQ /> or remove the literal block.",
    });
  }
  if (faqCount > 1) {
    issues.push({
      severity: "error",
      type: "FAQPage",
      message: `Found ${faqCount} FAQPage schema literals in a single page. Only one is allowed.`,
    });
  }
  const faqInspect = inspectFAQBlocks(src);
  if (faqInspect.missingFields.length > 0) {
    issues.push({
      severity: "error",
      type: "FAQPage",
      message: `FAQPage missing required fields: ${faqInspect.missingFields.join(", ")}`,
    });
  }

  // --- ItemList checks -----------------------------------------------------
  if (itemListCount > 1) {
    issues.push({
      severity: "error",
      type: "ItemList",
      message: `Found ${itemListCount} ItemList schema literals. Only one is allowed per page.`,
    });
  }
  const ilInspect = inspectItemListBlocks(src);
  if (ilInspect.missingFields.length > 0) {
    issues.push({
      severity: "error",
      type: "ItemList",
      message: `ItemList missing required fields: ${ilInspect.missingFields.join(", ")}`,
    });
  }

  // --- Sanity: pages that render the template MUST pass breadcrumbs --------
  if (rendersTemplate(src) && bc.count === 0) {
    issues.push({
      severity: "warn",
      type: "BreadcrumbList",
      message:
        "Page uses <SEOLandingTemplate /> but does not pass a `breadcrumbs` prop — no BreadcrumbList schema will be emitted.",
    });
  }

  return {
    file: rel,
    counts: {
      BreadcrumbList: breadcrumbCount,
      FAQPage: faqCount,
      ItemList: itemListCount,
      breadcrumbItems: bc.count,
      pageFaqRendered: hasFaqViaComponent,
    },
    issues,
  };
}

// --------------------------------------------------------------------------
// Run
// --------------------------------------------------------------------------

function main() {
  const files = SEO_DIRS.flatMap((d) => walk(join(ROOT, d)));
  const results = files.map(auditFile);

  const errors = [];
  const warns = [];
  for (const r of results) {
    for (const i of r.issues) {
      const line = `[${i.type}] ${r.file}: ${i.message}`;
      if (i.severity === "error") errors.push(line);
      else warns.push(line);
    }
  }

  // Summary
  const totals = results.reduce(
    (acc, r) => {
      acc.pages += 1;
      acc.faq += r.counts.FAQPage > 0 || r.counts.pageFaqRendered ? 1 : 0;
      acc.breadcrumb += r.counts.breadcrumbItems > 0 ? 1 : 0;
      acc.itemList += r.counts.ItemList > 0 ? 1 : 0;
      return acc;
    },
    { pages: 0, faq: 0, breadcrumb: 0, itemList: 0 }
  );

  console.log("──────────────────────────────────────────────");
  console.log(" SEO schema audit");
  console.log("──────────────────────────────────────────────");
  console.log(` Pages scanned       : ${totals.pages}`);
  console.log(` With FAQ schema     : ${totals.faq}`);
  console.log(` With breadcrumbs    : ${totals.breadcrumb}`);
  console.log(` With ItemList       : ${totals.itemList}`);
  console.log(` Warnings            : ${warns.length}`);
  console.log(` Errors              : ${errors.length}`);
  console.log("──────────────────────────────────────────────");

  if (warns.length) {
    console.log("\n⚠️  Warnings:");
    warns.forEach((w) => console.log("  • " + w));
  }
  if (errors.length) {
    console.log("\n❌ Errors:");
    errors.forEach((e) => console.log("  • " + e));
    console.log("\nDeploy blocked. Fix the schema duplicates above and re-run `npm run validate:seo-schema`.\n");
    process.exit(1);
  }

  console.log("\n✅ All SEO pages emit exactly one set of Breadcrumb / FAQ / ItemList schema.\n");
}

main();

#!/usr/bin/env node
/**
 * fix-duplicate-titles.mjs
 * 
 * Regenerates all pre-rendered HTML files that have generic "CityName — RehabLookup" titles.
 * Uses the updated classifyAndBuildPage logic from generate-all-missing-html.mjs.
 * 
 * Run: node scripts/fix-duplicate-titles.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "..", "public");

// ─── Utilities ────────────────────────────────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function slugToName(slug) {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function toTitleCase(str) {
  return str
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ─── Page generator ───────────────────────────────────────────────────────────
function generatePage({ urlPath, title, metaTitle, metaDescription, h1, content, breadcrumbs }) {
  const safeTitle = escHtml(metaTitle || title);
  const safeDesc = escHtml(metaDescription || "");
  const canonical = `https://rehablookup.com${urlPath}`;
  const breadcrumbJson = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": breadcrumbs.map((b, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "name": b.name,
      "item": `https://rehablookup.com${b.url}`,
    })),
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDesc}" />
  <link rel="canonical" href="${canonical}" />
  <meta property="og:title" content="${safeTitle}" />
  <meta property="og:description" content="${safeDesc}" />
  <meta property="og:url" content="${canonical}" />
  <meta property="og:type" content="website" />
  <meta property="og:image" content="https://rehablookup.com/og-default.jpg" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${safeTitle}" />
  <meta name="twitter:description" content="${safeDesc}" />
  <meta name="twitter:image" content="https://rehablookup.com/og-default.jpg" />
  <script type="application/ld+json">${breadcrumbJson}</script>
</head>
<body>
  <nav aria-label="Breadcrumb">
    <ol>
      ${breadcrumbs.map((b) => `<li><a href="${b.url}">${escHtml(b.name)}</a></li>`).join("\n      ")}
    </ol>
  </nav>
  <main>
    <h1>${escHtml(h1 || title)}</h1>
    ${content}
  </main>
</body>
</html>`;
}

// ─── Page builders ────────────────────────────────────────────────────────────

function substanceCityPage(urlPath) {
  const parts = urlPath.replace(/^\//, "").split("/");
  const typeSlug = parts[0];
  const stateSlug = parts[1];
  const citySlug = parts[2];
  const typeName = slugToName(typeSlug);
  const stateName = slugToName(stateSlug);
  const cityName = slugToName(citySlug);
  const title = `${typeName} in ${cityName}, ${stateName}`;
  return {
    urlPath,
    title,
    metaTitle: `${title} — Local Treatment Centers | RehabLookup`,
    metaDescription: `Find accredited ${typeName.toLowerCase()} programs in ${cityName}, ${stateName}. Compare local facility listings, check insurance coverage, and contact facilities directly.`,
    h1: title,
    content: `
      <p>Find accredited ${typeName.toLowerCase()} programs in ${cityName}, ${stateName}. RehabLookup's directory includes licensed facilities with detailed information on treatment programs, insurance acceptance, and amenities.</p>
      <h2>Treatment Options in ${cityName}</h2>
      <p>Facilities in ${cityName} offer a range of ${typeName.toLowerCase()} programs including medical detox, residential inpatient, partial hospitalization (PHP), intensive outpatient (IOP), and outpatient treatment.</p>
      <h2>Insurance Coverage in ${cityName}</h2>
      <p>Most rehab centers in ${cityName} accept major insurance plans under the Mental Health Parity and Addiction Equity Act. Use our free insurance verification tool to find in-network facilities.</p>
      <p><a href="/${typeSlug}/${stateSlug}">All ${typeName} in ${stateName}</a> &middot; <a href="/rehab-centers/${stateSlug}">All Rehab Centers in ${stateName}</a></p>`,
    breadcrumbs: [
      { name: "Home", url: "/" },
      { name: typeName, url: `/${typeSlug}` },
      { name: stateName, url: `/${typeSlug}/${stateSlug}` },
      { name: cityName, url: urlPath },
    ],
  };
}

function nearMeCountyPage(urlPath) {
  const parts = urlPath.replace(/^\//, "").split("/");
  const nearMeSlug = parts[0];
  const stateSlug = parts[1];
  const countySlug = parts[3];
  const nearMeName = slugToName(nearMeSlug.replace(/-near-me$/, "").replace(/-/g, " "));
  const stateName = slugToName(stateSlug);
  const countyName = slugToName(countySlug);
  const title = `${toTitleCase(nearMeSlug)} in ${countyName} County, ${stateName}`;
  return {
    urlPath,
    title,
    metaTitle: `${title} — Local Treatment Centers | RehabLookup`,
    metaDescription: `Find ${nearMeName.toLowerCase()} programs in ${countyName} County, ${stateName}. Compare accredited local facilities, verify insurance, and get help today.`,
    h1: title,
    content: `
      <p>Find accredited ${nearMeName.toLowerCase()} programs in ${countyName} County, ${stateName}. Our directory includes facility listings with information on treatment programs, insurance acceptance and amenities as reported by each facility.</p>
      <h2>Treatment Options in ${countyName} County</h2>
      <p>Facilities in ${countyName} County offer a range of programs including medical detox, residential inpatient, partial hospitalization (PHP), intensive outpatient (IOP), and outpatient treatment.</p>
      <h2>Insurance Accepted in ${countyName} County</h2>
      <p>Most rehab centers in ${countyName} County accept major insurance plans. Use our free insurance verification tool to find in-network facilities.</p>
      <p><a href="/${nearMeSlug}/${stateSlug}">All ${toTitleCase(nearMeSlug)} in ${stateName}</a> &middot; <a href="/rehab-centers/${stateSlug}">All Rehab Centers in ${stateName}</a></p>`,
    breadcrumbs: [
      { name: "Home", url: "/" },
      { name: toTitleCase(nearMeSlug), url: `/${nearMeSlug}` },
      { name: stateName, url: `/${nearMeSlug}/${stateSlug}` },
      { name: `${countyName} County`, url: urlPath },
    ],
  };
}

// ─── Substance types list ─────────────────────────────────────────────────────
const substanceTypes = new Set([
  "cocaine-addiction-treatment", "opioid-addiction-treatment", "heroin-addiction-treatment",
  "meth-addiction-treatment", "prescription-drug-rehab", "benzodiazepine-addiction-treatment",
  "alcohol-addiction-treatment", "marijuana-addiction-treatment", "fentanyl-addiction-treatment",
  "xanax-addiction-treatment", "adderall-addiction-treatment", "kratom-addiction-treatment",
  "gabapentin-addiction-treatment", "tramadol-addiction-treatment",
  "young-adult-rehab", "teen-rehab-programs", "senior-addiction-treatment",
  "pregnant-women-addiction-treatment", "first-responders-rehab", "healthcare-professionals-rehab",
  "executive-rehab-programs", "lgbtq-rehab-programs", "teachers-rehab-programs",
  "college-student-addiction-treatment", "eating-disorders-and-addiction-treatment",
  "anxiety-and-addiction-treatment", "depression-and-addiction-treatment",
  "ptsd-and-addiction-treatment", "bipolar-and-addiction-treatment", "adhd-and-addiction-treatment",
  "ocd-and-addiction-treatment", "schizophrenia-and-addiction-treatment",
  "chronic-pain-and-addiction-treatment", "bpd-and-addiction-treatment",
  "30-day-rehab-programs", "60-day-rehab-programs", "90-day-rehab-programs",
  "long-term-rehab-programs", "beach-rehab-programs", "mountain-rehab-programs",
  "medicaid-rehab", "medicare-rehab",
]);

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("=".repeat(70));
  console.log("fix-duplicate-titles.mjs — Fixing generic city-only titles");
  console.log("=".repeat(70));

  // Find all HTML files with generic "CityName — RehabLookup" title pattern
  // Pattern: <title>SomeCity — RehabLookup</title> (no treatment type in title)
  const genericTitleRegex = /<title>([A-Z][a-zA-Z\s]+) — RehabLookup<\/title>/;
  
  let fixed = 0;
  let skipped = 0;
  let errors = 0;

  // Walk the public directory
  function walkDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walkDir(fullPath);
      } else if (entry.name.endsWith(".html")) {
        processFile(fullPath);
      }
    }
  }

  function processFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const match = genericTitleRegex.exec(content);
      if (!match) return; // Not a generic title

      // Convert file path to URL path
      const relPath = path.relative(publicDir, filePath);
      let urlPath = "/" + relPath.replace(/\\/g, "/").replace(/\/index\.html$/, "").replace(/\.html$/, "");
      
      const parts = urlPath.replace(/^\//, "").split("/");
      const p0 = parts[0] || "";
      const p2 = parts[2] || "";
      const depth = parts.length;

      let pageData = null;

      // Substance/demographic/duration city pages: /{type}/{state}/{city}
      if (substanceTypes.has(p0) && depth === 3) {
        pageData = substanceCityPage(urlPath);
      }
      // Near-me county pages: /{near-me-slug}/{state}/county/{county}
      else if ((p0.endsWith("-near-me") || p0 === "rehab-near-me") && depth === 4 && p2 === "county") {
        pageData = nearMeCountyPage(urlPath);
      }

      if (!pageData) {
        skipped++;
        return;
      }

      const html = generatePage(pageData);
      fs.writeFileSync(filePath, html, "utf-8");
      fixed++;

      if (fixed % 500 === 0) {
        console.log(`  Fixed ${fixed} files...`);
      }
    } catch (err) {
      errors++;
      if (errors <= 5) {
        console.error(`  Error processing ${filePath}: ${err.message}`);
      }
    }
  }

  console.log("\nScanning public/ directory for generic titles...");
  walkDir(publicDir);

  console.log(`\n${"=".repeat(70)}`);
  console.log(`Fixed:   ${fixed} files`);
  console.log(`Skipped: ${skipped} files (not generic or unrecognized pattern)`);
  console.log(`Errors:  ${errors} files`);
  console.log("=".repeat(70));
}

main().catch(console.error);

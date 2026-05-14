#!/usr/bin/env node
/**
 * County Prerender Generator (data-source: src/data/countySeoData.ts)
 *
 * Emits one static HTML file per county listed in `stateCountyData` at:
 *   /rehab-centers/{stateSlug}/county/{countySlug}
 *
 * Output uses the hybrid layout (flat .html + nested /index.html) so it
 * matches `discoverPrerenderedPaths` and is automatically picked up by
 * `scripts/generate-sitemaps.mjs`.
 *
 * Run via: node --experimental-strip-types scripts/generate-county-pages.mjs
 */

import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GA_MEASUREMENT_ID } from "./_ga.mjs";
import { fetchAllFacilities, renderFacilityList, citySlug } from "./_facility-data.mjs";
import { seoStyles, seoHeader, seoCtaStrip, seoFooter } from "./_seo-page-shell.mjs";

// Direct TS import — Node 22 strip-types makes this safe at build time.
const { stateCountyData } = await import("../src/data/countySeoData.ts");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, "../public");
const BASE_URL = "https://rehablookup.com";

let pagesGenerated = 0;

function escHtml(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function writePage(filePath, html) {
  const dir = path.dirname(filePath);
  await mkdir(dir, { recursive: true });
  await writeFile(filePath, html, "utf8");
  // Single flat .html — Vercel cleanUrls serves it at /path. Previously
  // also emitted /path/index.html which Google was treating as a duplicate.
  pagesGenerated++;
}

function buildHtml({ state, county, urlPath, facilities = [] }) {
  const title = `Rehab Centers in ${county.name} County, ${state.stateAbbr}`;
  const desc = county.metaDescription;
  const canonical = `${BASE_URL}${urlPath}`;
  const cityList = county.majorCities
    .map(
      (c) =>
        `<li><a href="/rehab-centers/${state.stateSlug}/${c
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, "")}">${escHtml(c)}</a></li>`,
    )
    .join("");

  // Inject up to N real facilities into the static HTML so Googlebot's
  // first-pass crawl sees substantive content. Falls back to empty when
  // the build couldn't fetch facility data (logged once in
  // _facility-data.mjs).
  const facilityList = renderFacilityList(facilities, `${county.name} County, ${state.stateName}`);

  const breadcrumbs = [
    { name: "Home", url: "/" },
    { name: "Locations", url: "/locations" },
    { name: state.stateName, url: `/rehab-centers/${state.stateSlug}` },
    { name: `${county.name} County`, url: urlPath },
  ];
  const breadcrumbHtml = breadcrumbs
    .map(
      (b, i) =>
        `<li${i === breadcrumbs.length - 1 ? ' aria-current="page"' : ""}>${
          i < breadcrumbs.length - 1
            ? `<a href="${b.url}">${escHtml(b.name)}</a>`
            : escHtml(b.name)
        }</li>`,
    )
    .join("");

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbs.map((b, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: b.name,
      item: `${BASE_URL}${b.url}`,
    })),
  };

  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: title,
    description: desc,
    url: canonical,
    about: {
      "@type": "Place",
      name: `${county.name} County, ${state.stateName}`,
      containedInPlace: { "@type": "AdministrativeArea", name: state.stateName },
    },
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: county.faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };

  const faqHtml = county.faqs
    .map(
      (f) =>
        `<section><h3>${escHtml(f.question)}</h3><p>${escHtml(f.answer)}</p></section>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escHtml(`${title} — RehabLookup`)}</title>
  <meta name="description" content="${escHtml(desc)}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${canonical}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escHtml(title)}">
  <meta property="og:description" content="${escHtml(desc)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:site_name" content="RehabLookup">
  <meta property="og:image" content="${BASE_URL}/og-image.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${escHtml(title)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escHtml(title)}">
  <meta name="twitter:description" content="${escHtml(desc)}">
  <meta name="twitter:image" content="${BASE_URL}/og-image.jpg">
  <link rel="icon" type="image/png" href="/favicon.png">
  <script type="application/ld+json">${JSON.stringify(breadcrumbSchema)}</script>
  <script type="application/ld+json">${JSON.stringify(collectionSchema)}</script>
  <script type="application/ld+json">${JSON.stringify(faqSchema)}</script>
  ${seoStyles()}
  <script async src="https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_MEASUREMENT_ID}');</script>
</head>
<body>
  ${seoHeader()}
  <main class="rl-main">
    <div class="rl-container">
      <nav class="breadcrumbs" aria-label="Breadcrumb"><ul>${breadcrumbHtml}</ul></nav>
      <h1>${escHtml(title)}</h1>
      <p>${escHtml(county.description)}</p>
      <h2>Treatment Overview</h2>
      <p>${escHtml(county.treatmentOverview)}</p>
      <h2>Demographics &amp; Needs</h2>
      <p>${escHtml(county.demographics)}</p>
      <h2>Access &amp; Coverage</h2>
      <p>${escHtml(county.accessNotes)}</p>
      ${cityList ? `<h2>Cities in ${escHtml(county.name)} County</h2><ul style="columns:2;list-style:disc;padding-left:20px">${cityList}</ul>` : ""}
      ${facilityList}
      <h2>Frequently Asked Questions</h2>
      ${faqHtml}
      ${seoCtaStrip({ blurb: `We'll help you find verified treatment in ${escHtml(state.stateName)}.` })}
      <p style="margin-top:24px"><a href="/rehab-centers/${state.stateSlug}">All ${escHtml(state.stateName)} Rehab Centers</a> &middot; <a href="/">Home</a></p>
    </div>
  </main>
  ${seoFooter()}
</body>
</html>`;
}

async function main() {
  console.log("[county-html] starting...");
  // One DB pull per build, grouped by state+city for fast county lookups
  // (we map a county's `majorCities` list to the facilities in those cities).
  const allFacilities = await fetchAllFacilities();
  const byStateCity = new Map();
  for (const f of allFacilities) {
    const k = `${String(f.state).toLowerCase().replace(/\s+/g, "-")}|${citySlug(f.city)}`;
    if (!byStateCity.has(k)) byStateCity.set(k, []);
    byStateCity.get(k).push(f);
  }
  console.log(`[county-html] facility pool: ${allFacilities.length} approved facilities`);

  for (const state of stateCountyData) {
    for (const county of state.counties) {
      const urlPath = `/rehab-centers/${state.stateSlug}/county/${county.slug}`;
      // Aggregate facilities across the county's major cities. Empty when
      // the DB has no facilities for those cities yet — page falls back to
      // the existing text-only template.
      const facilities = [];
      for (const cityName of county.majorCities) {
        const k = `${state.stateSlug}|${citySlug(cityName)}`;
        const inCity = byStateCity.get(k);
        if (inCity) facilities.push(...inCity);
      }
      const html = buildHtml({ state, county, urlPath, facilities });
      const filePath = path.join(
        publicDir,
        "rehab-centers",
        state.stateSlug,
        "county",
        `${county.slug}.html`,
      );
      await writePage(filePath, html);
    }
  }
  console.log(`[county-html] generated ${pagesGenerated} county pages`);
}

await main().catch((err) => {
  console.error("[county-html] fatal:", err);
  process.exit(1);
});

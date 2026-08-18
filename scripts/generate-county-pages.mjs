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
import {
  fetchAllFacilities,
  renderFacilityList,
  stateCityKey,
  stateCityKeyFromSlugs,
} from "./_facility-data.mjs";
// The `seoCtaStrip()` blurb below is state-scoped but describes DIRECTORY
// activity only. It previously promised, in the first person, that
// RehabLookup would locate verified treatment in the state on the reader's
// behalf — intermediary framing the directory cutover retired. This file is
// scanned by scripts/check-directory-public-shell.mjs; any replacement blurb
// has to survive it.
import { seoStyles, seoHeader, seoCtaStrip, seoFooter } from "./_seo-page-shell.mjs";

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
  //
  // QUALIFIED, NOT EXACT. This set was assembled by walking the county's
  // hand-curated `majorCities` list and collecting the facilities in
  // THOSE CITIES. It is a city crosswalk, not a facility→county mapping:
  // the `facilities` table has no county column, so no listing here has
  // ever been checked against Cook County's boundary. Two consequences
  // are load-bearing and both are handled below rather than in a source
  // comment no reader will see:
  //
  //   1. The heading names the approximation ("Selected Cities in X
  //      County") instead of claiming the county's inventory.
  //   2. The "View all N facilities in X County" footer is suppressed —
  //      N is the count for a handful of curated cities, and printing it
  //      beside the county's name states a county inventory figure we do
  //      not have.
  //
  // The disclosure sentence is rendered as visible HTML so a reader and
  // a crawler get the same caveat.
  const countyPlace = `${county.name} County, ${state.stateName}`;
  const curatedCities = county.majorCities.slice(0, 6).join(", ");
  const countyInventoryNote =
    `Facility links below are drawn from this county page's curated city list` +
    `${curatedCities ? ` (${curatedCities}${county.majorCities.length > 6 ? " and other listed cities" : ""})` : ""}. ` +
    `RehabLookup does not currently have facility-level county assignments, ` +
    `so this is not a complete or exact ${county.name} County inventory. ` +
    `Search by city or ZIP code for exact matches.`;
  const facilityList = renderFacilityList(facilities, countyPlace, {
    headingLabel: `Selected Cities in ${countyPlace}`,
    note: countyInventoryNote,
    // No "View all N facilities in <county>" — see above.
    moreHtml: `<p style="margin-top:8px;color:#666;font-size:.9rem;"><a href="/rehab-centers/${state.stateSlug}">Browse all ${escHtml(state.stateName)} rehab centers &rarr;</a></p>`,
  });
  // When the curated cities yielded nothing, `renderFacilityList` returns
  // "" and the caveat would vanish with it. The county page still shows
  // county-level editorial copy, so the limitation still needs saying.
  const countyInventoryBlock = facilityList
    ? facilityList
    : `<p style="margin:16px 0;color:#475569;font-size:.9rem;line-height:1.5;">${escHtml(
        countyInventoryNote,
      )}</p>`;

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
      ${countyInventoryBlock}
      <h2>Frequently Asked Questions</h2>
      ${faqHtml}
      ${seoCtaStrip({ blurb: `Filter treatment center listings in ${escHtml(state.stateName)} by location, level of care, and insurance accepted.` })}
      <p style="margin-top:24px"><a href="/rehab-centers/${state.stateSlug}">All ${escHtml(state.stateName)} Rehab Centers</a> &middot; <a href="/">Home</a></p>
    </div>
  </main>
  ${seoFooter()}
</body>
</html>`;
}

async function main() {
  console.log("[county-html] starting...");
  // Direct TS import — Node 22 strip-types makes this safe at build time.
  // Loaded here rather than at module scope so `buildHtml` can be imported
  // by the regression suite without pulling in ~470KB of county editorial
  // data (and without running the generator).
  const { stateCountyData } = await import("../src/data/countySeoData.ts");
  // One DB pull per build, grouped by state+city for fast county lookups
  // (we map a county's `majorCities` list to the facilities in those cities).
  let countyPagesWithInventory = 0;
  let countyFacilityLinks = 0;
  const allFacilities = await fetchAllFacilities();
  // Canonical city keys so "Saint Charles" / "St Charles" land in one
  // bucket, matching the browser and the city-page injector.
  //
  // COUNTY DATA LIMITATION (unchanged by this phase, stated explicitly):
  // the `facilities` table has no county column, so there is no
  // facility→county mapping to match on. These pages aggregate the
  // county's hand-curated `majorCities` list, which is a curated
  // approximation of the county rather than verified county inventory.
  // We do not infer county from city names and we do not relabel this
  // as exact county inventory. Enriching it needs real county data and
  // is deliberately deferred.
  const byStateCity = new Map();
  for (const f of allFacilities) {
    const k = stateCityKey(f.state, f.city);
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
        const k = stateCityKeyFromSlugs(state.stateSlug, cityName.replace(/\s+/g, "-"));
        const inCity = byStateCity.get(k);
        if (inCity) facilities.push(...inCity);
      }
      // Part 12 reporting: how many county pages actually carry inventory.
      if (facilities.length) {
        countyPagesWithInventory++;
        countyFacilityLinks += Math.min(facilities.length, 12);
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
  console.log(
    `[county-html] county pages with facility inventory: ${countyPagesWithInventory} ` +
      `(${countyFacilityLinks} facility links rendered)`,
  );
}

// `buildHtml` is the crawler-facing output of this generator, and the
// county-inventory qualification it emits is asserted in
// src/__tests__/countyInventoryTruth.test.ts. Exported so that suite can
// render a planted county without a database or a build.
export { buildHtml };

// Only generate when run as a script. An `import` (the test suite) gets the
// pure renderer and no side effects.
const invokedDirectly =
  process.argv[1] !== undefined && path.resolve(process.argv[1]) === __filename;

if (invokedDirectly) {
  await main().catch((err) => {
    console.error("[county-html] fatal:", err);
    process.exit(1);
  });
}

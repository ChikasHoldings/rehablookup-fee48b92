#!/usr/bin/env node
/**
 * Generate prerendered HTML for every city in src/data/locationSeoData.ts.
 *
 * Each output is a city-level directory page with:
 *   - state-specific fact box (population, facility count, overdose rate,
 *     opioid share, Medicaid status, primary metro) drawn from
 *     stateAddictionStats.ts — distinct numbers per state, so adjacent
 *     city pages within the same state share the box, but pages across
 *     states never look alike.
 *   - state signature line (180-char human-written sentence per state).
 *   - directory-style lists for treatment levels, insurance, and
 *     neighboring cities — not flowing prose. Reads as a directory,
 *     not a blog post.
 *   - state licensing/regulator info.
 *   - cross-links to other cities in the same state, plus
 *     city-treatment combos for the city.
 *
 * Overwrites existing files — intentional. Re-run to refresh.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GA_MEASUREMENT_ID } from "./_ga.mjs";
import {
  escHtml,
  renderStateFactBox,
  renderStateSignature,
  renderTreatmentLevels,
  renderInsuranceDirectory,
  renderLicensingBox,
  renderCta,
  SHARED_DIRECTORY_CSS,
  SHARED_HEADER_HTML,
  SHARED_FOOTER_HTML,
} from "./_unique-content.mjs";
import {
  fetchAllFacilities,
  groupByStateCity,
  renderFacilityList,
  citySlug,
  stateCityKeyFromSlugs,
} from "./_facility-data.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const publicDir = path.join(repoRoot, "public");
const BASE_URL = "https://rehablookup.com";

function parseLocationSeoData() {
  const txt = fs.readFileSync(path.join(repoRoot, "src/data/locationSeoData.ts"), "utf8");
  const stateBlockRe = /\{\s*name:\s*"([^"]+)",\s*slug:\s*"([a-z-]+)",\s*abbreviation:\s*"([A-Z]{2})"[\s\S]*?cities:\s*\[([\s\S]*?)\]\s*,?\s*\}/g;
  const out = [];
  let m;
  while ((m = stateBlockRe.exec(txt))) {
    const stateName = m[1];
    const stateSlug = m[2];
    const stateAbbr = m[3];
    const cityRe = /\{\s*name:\s*"([^"]+)",\s*slug:\s*"([a-z0-9-]+)",\s*population:\s*(\d+)(?:[\s\S]*?description:\s*"([^"]+)")?(?:[\s\S]*?metaDescription:\s*"([^"]+)")?/g;
    const cities = [];
    let c;
    while ((c = cityRe.exec(m[4]))) {
      cities.push({
        cityName: c[1],
        citySlug: c[2],
        population: Number(c[3]),
        description: c[4] || "",
        metaDescription: c[5] || "",
        stateName,
        stateSlug,
        stateAbbr,
      });
    }
    out.push({ stateName, stateSlug, stateAbbr, cities });
  }
  return out;
}

const TREATMENT_PREFIXES_FOR_CITY = [
  { prefix: "alcohol-rehab-in-", label: "Alcohol Rehab" },
  { prefix: "drug-rehab-in-", label: "Drug Rehab" },
  { prefix: "detox-centers-in-", label: "Detox Centers" },
  { prefix: "inpatient-rehab-in-", label: "Inpatient Rehab" },
  { prefix: "outpatient-rehab-in-", label: "Outpatient Rehab" },
  { prefix: "dual-diagnosis-treatment-in-", label: "Dual Diagnosis Treatment" },
  { prefix: "luxury-rehab-in-", label: "Luxury Rehab" },
  { prefix: "iop-in-", label: "IOP" },
  { prefix: "php-in-", label: "PHP" },
  { prefix: "mat-clinic-in-", label: "MAT Clinic" },
];

function renderCityTreatmentLinks(city) {
  const items = TREATMENT_PREFIXES_FOR_CITY.map(
    ({ prefix, label }) => `<li><a href="/${prefix}${city.citySlug}">${escHtml(label)} in ${escHtml(city.cityName)}</a></li>`,
  ).join("");
  return `<section aria-label="Treatment options in ${escHtml(city.cityName)}">
      <h2>Treatment Options in ${escHtml(city.cityName)}</h2>
      <ul class="pill-list">${items}</ul>
    </section>`;
}

function renderNearbyCities(city, allCitiesInState) {
  const siblings = allCitiesInState
    .filter((c) => c.citySlug !== city.citySlug)
    .sort((a, b) => b.population - a.population)
    .slice(0, 8);
  if (!siblings.length) return "";
  const items = siblings
    .map(
      (c) => `<li><a href="/rehab-centers/${c.stateSlug}/${c.citySlug}">${escHtml(c.cityName)}</a></li>`,
    )
    .join("");
  return `<section aria-label="Other cities in ${escHtml(city.stateName)}">
      <h2>Other Cities in ${escHtml(city.stateName)}</h2>
      <ul class="pill-list">${items}</ul>
    </section>`;
}

function renderPage(city, allCitiesInState, facilities = []) {
  const urlPath = `/rehab-centers/${city.stateSlug}/${city.citySlug}`;
  const canonical = `${BASE_URL}${urlPath}`;
  const title = `Rehab Centers in ${city.cityName}, ${city.stateAbbr}`;
  const metaTitle = `${title} — Treatment Directory | RehabLookup`;
  const popText = city.population
    ? `${city.cityName} (${Number(city.population).toLocaleString()} residents)`
    : city.cityName;
  const cityDescription = city.description ||
    `${city.cityName} offers a range of addiction treatment programs including detox, inpatient, outpatient, and medication-assisted treatment.`;
  const desc = city.metaDescription ||
    `Rehab center listings serving ${city.cityName}, ${city.stateAbbr}. Compare detox, inpatient, outpatient, and MAT programs by clinical level, insurance, and location.`;
  const safeTitle = escHtml(metaTitle);
  const safeDesc = escHtml(desc);

  const breadcrumbs = [
    { name: "Home", url: "/" },
    { name: "Locations", url: "/locations" },
    { name: city.stateName, url: `/rehab-centers/${city.stateSlug}` },
    { name: city.cityName, url: urlPath },
  ];
  const breadcrumbHtml = breadcrumbs
    .map((b, i) => `<li><a href="${b.url}">${escHtml(b.name)}</a>${i < breadcrumbs.length - 1 ? " &rsaquo; " : ""}</li>`)
    .join("");
  const breadcrumbSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbs.map((b, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: b.name,
      item: `${BASE_URL}${b.url}`,
    })),
  });
  const pageSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "MedicalWebPage",
    name: title,
    description: `Addiction treatment directory for ${city.cityName}, ${city.stateAbbr}.`,
    url: canonical,
    about: { "@type": "MedicalCondition", name: "Substance Use Disorder" },
    audience: {
      "@type": "PeopleAudience",
      geographicArea: {
        "@type": "City",
        name: city.cityName,
        containedInPlace: { "@type": "State", name: city.stateName },
      },
    },
    specialty: "Addiction Medicine",
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDesc}">
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
  <link rel="canonical" href="${canonical}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeDesc}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:site_name" content="RehabLookup">
  <meta property="og:image" content="${BASE_URL}/og-image.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${safeTitle}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${safeTitle}">
  <meta name="twitter:description" content="${safeDesc}">
  <meta name="twitter:image" content="${BASE_URL}/og-image.jpg">
  <link rel="icon" type="image/png" href="/favicon.png">
  <script type="application/ld+json">${breadcrumbSchema}</script>
  <script type="application/ld+json">${pageSchema}</script>
  <style>${SHARED_DIRECTORY_CSS}</style>
  <script async src="https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_MEASUREMENT_ID}');</script>
</head>
<body>
  ${SHARED_HEADER_HTML}
  <main class="rl-main">
    <nav class="breadcrumbs" aria-label="Breadcrumb"><ul>${breadcrumbHtml}</ul></nav>
    <h1>${escHtml(title)}</h1>
    <p>Browse the ${escHtml(city.stateName)} addiction-treatment directory for ${escHtml(popText)}. ${escHtml(cityDescription)} This page lists the treatment levels, insurance coverage, and state oversight relevant to ${escHtml(city.cityName)} residents.</p>

    ${renderFacilityList(facilities, `${city.cityName}, ${city.stateAbbr}`)}

    ${renderStateFactBox(city.stateName, city.stateSlug)}
    ${renderStateSignature(city.stateName, city.stateSlug)}

    ${renderTreatmentLevels(city.stateName)}

    ${renderCityTreatmentLinks(city)}

    ${renderInsuranceDirectory(city.stateName, city.stateSlug)}

    ${renderLicensingBox(city.stateName, city.stateSlug)}

    ${renderNearbyCities(city, allCitiesInState)}

    ${renderCta(
      `Get confidential help in ${city.cityName}`,
      `Verified ${city.cityName}, ${city.stateAbbr} treatment options — compare programs, insurance accepted, and levels of care.`,
    )}

    <p class="small"><a href="/rehab-centers/${city.stateSlug}">All Rehab Centers in ${escHtml(city.stateName)}</a> &middot; <a href="/rehab-centers">Browse All States</a> &middot; <a href="/resources">Recovery Resources</a></p>
  </main>
  ${SHARED_FOOTER_HTML}
</body>
</html>`;
}

async function main() {
  const states = parseLocationSeoData();
  // Inject real local facilities (with /center/ links) so each city page is
  // substantive + unique, not templated boilerplate. Fetched once, matched
  // per city. Fail-soft: empty match leaves the existing copy untouched.
  const allFacilities = await fetchAllFacilities();
  const byCity = groupByStateCity(allFacilities);
  let written = 0;
  let withFacilities = 0;
  for (const state of states) {
    for (const city of state.cities) {
      // Canonical association key (page side). Output path still uses
      // the seed `city.citySlug`, so no published URL changes here.
      const key = stateCityKeyFromSlugs(city.stateSlug, city.cityName.replace(/\s+/g, "-"));
      const cityFacilities = byCity.get(key) || [];
      if (cityFacilities.length > 0) withFacilities++;
      const outPath = path.join(publicDir, "rehab-centers", city.stateSlug, `${city.citySlug}.html`);
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, renderPage(city, state.cities, cityFacilities));
      written++;
    }
  }
  console.log(`City page generator: wrote ${written} pages (${withFacilities} with live facility listings).`);
}

main().catch((err) => {
  console.error("city-page generator failed:", err);
  process.exit(1);
});

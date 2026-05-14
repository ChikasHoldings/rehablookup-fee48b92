#!/usr/bin/env node
/**
 * Generate prerendered HTML for every city in src/data/locationSeoData.ts.
 *
 * Background: scripts/generate-seo-html.mjs has a hardcoded ~50-city list
 * that it emits city-page HTML for. Meanwhile the SPA's data layer in
 * src/data/locationSeoData.ts ships 1033 cities across all 50 states, all
 * wired to the React route /rehab-centers/:stateSlug/:citySlug. Without
 * prerendered HTML, crawlers hitting those 980+ city URLs got middleware-
 * rewritten to /index.html and Google indexed them as duplicate-of-/
 * (homepage canonical).
 *
 * This script reads locationSeoData.ts via regex (kept lightweight to
 * avoid pulling in TS tooling for one build step) and emits a per-city
 * .html under public/rehab-centers/<state>/<city>.html using the same
 * template style as the rest of the site's prerendered pages.
 *
 * Idempotent: overwrites existing files.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GA_MEASUREMENT_ID } from "./_ga.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const publicDir = path.join(repoRoot, "public");
const BASE_URL = "https://rehablookup.com";

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseLocationSeoData() {
  const txt = fs.readFileSync(path.join(repoRoot, "src/data/locationSeoData.ts"), "utf8");
  const out = [];

  // Each state block: { name: "X", slug: "y", abbreviation: "ZZ", ..., cities: [ ... ] }
  const stateBlockRe = /\{\s*name:\s*"([^"]+)",\s*slug:\s*"([a-z-]+)",\s*abbreviation:\s*"([A-Z]{2})"[\s\S]*?cities:\s*\[([\s\S]*?)\]\s*,?\s*\}/g;
  let m;
  while ((m = stateBlockRe.exec(txt))) {
    const stateName = m[1];
    const stateSlug = m[2];
    const stateAbbr = m[3];
    const citiesText = m[4];

    const cityRe = /\{\s*name:\s*"([^"]+)",\s*slug:\s*"([a-z0-9-]+)",\s*population:\s*(\d+)(?:[\s\S]*?description:\s*"([^"]+)")?(?:[\s\S]*?metaDescription:\s*"([^"]+)")?/g;
    let c;
    while ((c = cityRe.exec(citiesText))) {
      out.push({
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
  }
  return out;
}

function generateCityHtml({ cityName, citySlug, population, description, metaDescription, stateName, stateSlug, stateAbbr }) {
  const urlPath = `/rehab-centers/${stateSlug}/${citySlug}`;
  const canonical = `${BASE_URL}${urlPath}`;
  const title = `Rehab Centers in ${cityName}, ${stateAbbr}`;
  const metaTitle = `${title} — Find Verified Treatment | RehabLookup`;
  const safeMetaDesc = escHtml(
    metaDescription ||
      `Find accredited rehab centers in ${cityName}, ${stateAbbr}. Compare inpatient, outpatient, detox & MAT programs. Verify insurance and get help today.`,
  );
  const safeTitle = escHtml(metaTitle);
  const popText = population
    ? `With a population of approximately ${Number(population).toLocaleString()}, ${cityName} `
    : `${cityName} `;
  const cityDescription = description
    ? escHtml(description)
    : `${escHtml(cityName)} offers a range of addiction treatment programs including detox, inpatient, outpatient, and medication-assisted treatment.`;

  const breadcrumbs = [
    { name: "Home", url: "/" },
    { name: "Locations", url: "/locations" },
    { name: stateName, url: `/rehab-centers/${stateSlug}` },
    { name: cityName, url: urlPath },
  ];
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
    description: `Addiction treatment centers in ${cityName}, ${stateAbbr}.`,
    url: canonical,
    about: { "@type": "MedicalCondition", name: "Substance Use Disorder" },
    audience: {
      "@type": "PeopleAudience",
      geographicArea: {
        "@type": "City",
        name: cityName,
        containedInPlace: { "@type": "State", name: stateName },
      },
    },
    specialty: "Addiction Medicine",
  });

  const breadcrumbHtml = breadcrumbs
    .map((b, i) => `<li><a href="${b.url}">${escHtml(b.name)}</a>${i < breadcrumbs.length - 1 ? " &rsaquo; " : ""}</li>`)
    .join("");

  // Internal links covering the page's role in the topical cluster
  const treatmentInCity = [
    { slug: "alcohol-rehab", label: "Alcohol Rehab" },
    { slug: "drug-rehab", label: "Drug Rehab" },
    { slug: "detox-centers", label: "Detox Centers" },
    { slug: "inpatient-rehab", label: "Inpatient Rehab" },
    { slug: "outpatient-rehab", label: "Outpatient Rehab" },
    { slug: "dual-diagnosis-treatment", label: "Dual Diagnosis Treatment" },
  ];
  const treatmentLinksHtml = treatmentInCity
    .map((t) => `<li><a href="/${t.slug}-in-${citySlug}">${t.label} in ${escHtml(cityName)}</a></li>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
  <meta name="description" content="${safeMetaDesc}">
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
  <link rel="canonical" href="${canonical}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeMetaDesc}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:site_name" content="RehabLookup">
  <meta property="og:image" content="${BASE_URL}/og-image.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${safeTitle}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${safeTitle}">
  <meta name="twitter:description" content="${safeMetaDesc}">
  <meta name="twitter:image" content="${BASE_URL}/og-image.jpg">
  <link rel="icon" type="image/png" href="/favicon.png">
  <script type="application/ld+json">${breadcrumbSchema}</script>
  <script type="application/ld+json">${pageSchema}</script>
  <style>
    body{font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:900px;margin:0 auto;padding:32px 20px;color:#1a2b4a;line-height:1.7}
    h1{font-size:2rem;color:#1B365D;margin-bottom:12px}
    h2{font-size:1.4rem;color:#1B365D;margin-top:28px}
    p{color:#333;margin-bottom:16px}
    a{color:#2563eb;text-decoration:none}
    a:hover{text-decoration:underline}
    nav ul{list-style:none;padding:0;display:flex;flex-wrap:wrap;gap:8px}
    nav li a{display:inline-block;padding:6px 12px;background:#f1f5f9;border-radius:6px;font-size:.875rem}
    .breadcrumbs{font-size:.85rem;color:#666;margin-bottom:20px}
    .breadcrumbs ul{list-style:none;padding:0;display:flex;flex-wrap:wrap;gap:4px}
    .cta{background:#1B365D;color:#fff;padding:20px;border-radius:12px;margin:24px 0;text-align:center}
    .cta h2{color:#fff;margin-top:0}
    .cta a{display:inline-block;background:#2563eb;color:#fff;padding:10px 20px;border-radius:8px;margin:6px;font-weight:600}
    footer{margin-top:40px;padding-top:20px;border-top:1px solid #e5e7eb;font-size:.8rem;color:#888}
  </style>
  <script async src="https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_MEASUREMENT_ID}');</script>
</head>
<body>
  <header><a href="/" aria-label="RehabLookup Home">RehabLookup</a></header>
  <nav class="breadcrumbs" aria-label="Breadcrumb"><ul>${breadcrumbHtml}</ul></nav>
  <main>
    <h1>${escHtml(title)}</h1>
    <p>${popText}offers a range of accredited addiction treatment options for residents and surrounding communities. ${cityDescription}</p>

    <h2>Treatment Programs in ${escHtml(cityName)}</h2>
    <p>Verified rehab centers in ${escHtml(cityName)}, ${stateAbbr} provide medically supervised detox, residential inpatient care, intensive outpatient programs (IOP), partial hospitalization (PHP), dual diagnosis treatment, and medication-assisted treatment (MAT). Many facilities offer specialty tracks for veterans, women, professionals, and adolescents.</p>

    <h2>Insurance &amp; Payment Options</h2>
    <p>Most rehab centers in ${escHtml(cityName)} accept private insurance (Aetna, Cigna, BCBS, UnitedHealthcare, Humana), Medicaid, and Medicare. Use our free insurance verification tool to find in-network ${escHtml(cityName)} facilities that match your plan.</p>

    <h2>How to Find Help in ${escHtml(cityName)}</h2>
    <p>If you or someone you love needs help with addiction in ${escHtml(cityName)}, RehabLookup's concierge team can match you with accredited programs based on insurance, clinical needs, and personal preferences — at no cost.</p>

    <nav aria-label="Treatment types in this city">
      <h2>Treatment Types in ${escHtml(cityName)}</h2>
      <ul>${treatmentLinksHtml}</ul>
    </nav>

    <div class="cta">
      <h2>Get Confidential Help Today</h2>
      <p>Compare verified treatment options in ${escHtml(cityName)}, ${stateAbbr} — free, private guidance from our placement team.</p>
      <a href="/concierge">Get Free Help</a>
      <a href="/search-results" style="background:#fff;color:#1B365D">Browse Centers</a>
    </div>

    <p style="margin-top:24px">
      <a href="/rehab-centers/${stateSlug}">All Rehab Centers in ${escHtml(stateName)}</a> &middot;
      <a href="/rehab-centers">Browse All States</a> &middot;
      <a href="/resources">Recovery Resources</a>
    </p>
  </main>
  <footer><p>&copy; 2026 RehabLookup. All rights reserved. <a href="/privacy-policy">Privacy Policy</a> &middot; <a href="/terms-of-service">Terms of Service</a></p></footer>
</body>
</html>`;
}

function main() {
  const cities = parseLocationSeoData();
  let written = 0;
  let skipped = 0;

  for (const city of cities) {
    const outPath = path.join(
      publicDir,
      "rehab-centers",
      city.stateSlug,
      `${city.citySlug}.html`,
    );
    // Idempotent: write unconditionally so re-runs refresh content.
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    const html = generateCityHtml(city);
    fs.writeFileSync(outPath, html);
    written++;
  }

  console.log(`City page generator: parsed ${cities.length} cities, wrote ${written} pages, skipped ${skipped}.`);
}

main();

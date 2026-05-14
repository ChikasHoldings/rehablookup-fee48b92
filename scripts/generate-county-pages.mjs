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
  <style>
    /* Branded layout — mirrors generate-seo-html.mjs so prerendered SEO
       pages don't look stripped-down compared to the live SPA. */
    :root { --rl-primary:#1B365D; --rl-primary-soft:#eef2f7; --rl-cta:#16a34a; --rl-cta-hover:#15803d; --rl-text:#1a2b4a; --rl-muted:#525866; --rl-border:#e5e7eb; }
    *{box-sizing:border-box} html,body{margin:0;padding:0}
    body{font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:var(--rl-text);line-height:1.65;background:#fff}
    a{color:#2563eb;text-decoration:none} a:hover{text-decoration:underline}
    .rl-container{max-width:1120px;margin:0 auto;padding:0 20px}
    .rl-header{background:var(--rl-primary);color:#fff;padding:14px 0;box-shadow:0 2px 8px rgba(0,0,0,.08)}
    .rl-header-row{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
    .rl-logo{color:#fff;font-weight:700;font-size:1.25rem;letter-spacing:-.01em}
    .rl-logo:hover{text-decoration:none;opacity:.9}
    .rl-nav{display:flex;align-items:center;gap:18px;flex-wrap:wrap}
    .rl-nav a{color:#dbe2ec;font-size:.95rem;font-weight:500}
    .rl-nav a:hover{color:#fff;text-decoration:none}
    .rl-helpline{display:inline-flex;align-items:center;gap:6px;background:var(--rl-cta);color:#fff;padding:8px 16px;border-radius:6px;font-weight:600;font-size:.9rem}
    .rl-helpline:hover{background:var(--rl-cta-hover);color:#fff;text-decoration:none}
    @media (max-width:560px){ .rl-nav{display:none} .rl-helpline{padding:7px 12px;font-size:.85rem} }
    .rl-main{padding:32px 0 56px}
    h1{font-size:clamp(1.65rem,2.8vw,2.25rem);color:var(--rl-primary);margin:0 0 14px;line-height:1.2}
    h2{font-size:clamp(1.2rem,2vw,1.5rem);color:var(--rl-primary);margin:32px 0 12px}
    h3{font-size:1.1rem;color:var(--rl-primary);margin:24px 0 10px}
    p{color:#333;margin:0 0 14px}
    .breadcrumbs{font-size:.85rem;color:var(--rl-muted);margin-bottom:18px}
    .breadcrumbs ul{list-style:none;padding:0;margin:0;display:flex;flex-wrap:wrap;gap:4px}
    .breadcrumbs li a{color:var(--rl-muted)}
    .rl-cta-strip{background:var(--rl-primary-soft);border:1px solid #d6deeb;border-radius:12px;padding:20px 24px;margin:32px 0 24px;display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap}
    .rl-cta-strip h2{margin:0 0 4px;font-size:1.1rem}
    .rl-cta-strip p{margin:0;color:var(--rl-muted);font-size:.95rem}
    .rl-cta-btn{display:inline-block;background:var(--rl-cta);color:#fff;padding:10px 22px;border-radius:6px;font-weight:600;font-size:.95rem;white-space:nowrap}
    .rl-cta-btn:hover{background:var(--rl-cta-hover);color:#fff;text-decoration:none}
    .rl-footer{background:var(--rl-primary);color:#cbd5e1;padding:40px 0 24px;margin-top:48px;font-size:.9rem}
    .rl-footer h3{color:#fff;font-size:.95rem;margin:0 0 12px;letter-spacing:.02em;text-transform:uppercase}
    .rl-footer a{color:#cbd5e1} .rl-footer a:hover{color:#fff}
    .rl-footer-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:32px;margin-bottom:32px}
    .rl-footer-col ul{list-style:none;padding:0;margin:0;line-height:1.9}
    .rl-footer-bottom{border-top:1px solid #2b4970;padding-top:20px;display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;font-size:.8rem;color:#8aa0bd}
    .rl-disclaimer{max-width:720px;color:#7e93b0;font-size:.78rem;line-height:1.6;margin-top:14px}
  </style>
  <script async src="https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_MEASUREMENT_ID}');</script>
</head>
<body>
  <header class="rl-header">
    <div class="rl-container rl-header-row">
      <a href="/" class="rl-logo" aria-label="RehabLookup Home">RehabLookup</a>
      <nav class="rl-nav" aria-label="Primary">
        <a href="/rehab-centers">Find Treatment</a>
        <a href="/treatment-types/drug-addiction-treatment">Treatment Types</a>
        <a href="/insurance/aetna-rehab">Insurance</a>
        <a href="/resources">Resources</a>
        <a href="/for-providers">For Providers</a>
      </nav>
      <a href="tel:+12146396420" class="rl-helpline" aria-label="Call our 24/7 helpline">Call 24/7 · (214) 639-6420</a>
    </div>
  </header>
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
      <div class="rl-cta-strip">
        <div>
          <h2>Talk to a recovery advocate today</h2>
          <p>Free, confidential, 24/7. We'll help you find verified treatment in ${escHtml(state.stateName)}.</p>
        </div>
        <a href="/concierge" class="rl-cta-btn">Get Personalized Help &rarr;</a>
      </div>
      <p style="margin-top:24px"><a href="/rehab-centers/${state.stateSlug}">All ${escHtml(state.stateName)} Rehab Centers</a> &middot; <a href="/">Home</a></p>
    </div>
  </main>
  <footer class="rl-footer">
    <div class="rl-container">
      <div class="rl-footer-grid">
        <div class="rl-footer-col"><h3>Find Treatment</h3><ul>
          <li><a href="/rehab-centers">Browse Centers</a></li>
          <li><a href="/drug-rehab-near-me">Drug Rehab Near Me</a></li>
          <li><a href="/alcohol-rehab-near-me">Alcohol Rehab Near Me</a></li>
          <li><a href="/detox-near-me">Detox Centers</a></li>
          <li><a href="/luxury-rehab-near-me">Luxury Rehab</a></li>
        </ul></div>
        <div class="rl-footer-col"><h3>Insurance</h3><ul>
          <li><a href="/insurance/aetna-rehab">Aetna</a></li>
          <li><a href="/insurance/bcbs-treatment">Blue Cross Blue Shield</a></li>
          <li><a href="/insurance/cigna-rehab">Cigna</a></li>
          <li><a href="/insurance/united-healthcare-rehab">United Healthcare</a></li>
          <li><a href="/insurance/medicaid-rehab">Medicaid</a></li>
        </ul></div>
        <div class="rl-footer-col"><h3>Resources</h3><ul>
          <li><a href="/resources">All Articles</a></li>
          <li><a href="/resources/signs-of-addiction">Signs of Addiction</a></li>
          <li><a href="/resources/insurance-coverage-guide">Insurance Guide</a></li>
          <li><a href="/resources/intervention-guide-how-to-plan">Intervention Guide</a></li>
          <li><a href="/concierge">Free Concierge</a></li>
        </ul></div>
        <div class="rl-footer-col"><h3>Company</h3><ul>
          <li><a href="/about">About Us</a></li>
          <li><a href="/contact">Contact</a></li>
          <li><a href="/for-providers">For Providers</a></li>
          <li><a href="/editorial-policy">Editorial Policy</a></li>
          <li><a href="/medical-disclaimer">Medical Disclaimer</a></li>
        </ul></div>
      </div>
      <p class="rl-disclaimer">RehabLookup is a directory service connecting individuals with addiction treatment facilities. We are not a treatment provider and do not provide medical advice. If you are experiencing a medical emergency, call 911. If you are in crisis, call or text 988 or call SAMHSA's National Helpline at 1-800-662-4357.</p>
      <div class="rl-footer-bottom">
        <span>&copy; 2026 RehabLookup. All rights reserved.</span>
        <nav aria-label="Legal"><a href="/privacy-policy">Privacy</a> &middot; <a href="/terms-of-service">Terms</a> &middot; <a href="/notice-of-privacy-practices.html">HIPAA Notice</a></nav>
      </div>
    </div>
  </footer>
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

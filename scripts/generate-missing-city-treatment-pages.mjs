#!/usr/bin/env node
/**
 * Backfill prerendered HTML for every (city-treatment prefix × topCity)
 * combination that has a React route but no static HTML.
 *
 * SmartCatchAll.tsx routes ~48 city-treatment URL prefixes
 * (alcohol-rehab-in-, drug-rehab-in-, detox-in-, holistic-rehab-in-, ...)
 * for the 288 topCities in seoPageConfig.ts — 13,824 combinations total.
 * Only 714 had static HTML, so the other 13,110 served the SPA shell
 * (homepage canonical) to Googlebot and indexed as duplicate-of-/.
 *
 * Template style follows the existing prerendered city-treatment pages
 * 1:1 (header, breadcrumbs, treatment overview, insurance section,
 * related links, footer) + the GA snippet.
 *
 * Idempotent: skip-if-exists. Re-running won't overwrite generator-
 * owned files.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GA_MEASUREMENT_ID } from "./_ga.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const publicDir = path.join(repoRoot, "public");
const BASE_URL = "https://rehablookup.com";

function escHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function parseTopCities() {
  const txt = fs.readFileSync(path.join(repoRoot, "src/data/seoPageConfig.ts"), "utf8");
  const re = /\{\s*slug:\s*"([a-z0-9-]+)",\s*city:\s*"([^"]+)"(?:,\s*population:\s*"([^"]+)")?[^}]*?stateAbbr:\s*"([A-Z]{2})"[^}]*?stateSlug:\s*"([a-z-]+)"/g;
  const out = [];
  let m;
  while ((m = re.exec(txt))) {
    out.push({
      slug: m[1],
      city: m[2],
      population: m[3] || "",
      stateAbbr: m[4],
      stateSlug: m[5],
    });
  }
  return out;
}

function parsePrefixes() {
  const txt = fs.readFileSync(path.join(repoRoot, "src/components/SmartCatchAll.tsx"), "utf8");
  const block = txt.match(/const CITY_TREATMENT_PREFIXES = \[([\s\S]*?)\];/);
  if (!block) throw new Error("CITY_TREATMENT_PREFIXES not found");
  const prefixes = [...block[1].matchAll(/"\/([a-z0-9-]+-in-)"/g)].map((m) => m[1]);
  return prefixes;
}

// Treatment label / hub URL derived from prefix. The hub URL is where we link
// the breadcrumb "<Treatment Rehab>" back to.
function labelForPrefix(prefix) {
  // prefix is e.g. "alcohol-rehab-in-" — strip "-in-"
  const base = prefix.replace(/-in-$/, "");
  // Build a human-friendly label
  const words = base.split("-").map((w) => {
    if (w === "iop") return "IOP";
    if (w === "php") return "PHP";
    if (w === "mat") return "MAT";
    if (w === "lgbtq") return "LGBTQ+";
    if (w === "rehab") return "Rehab";
    if (w === "in") return "in";
    return w.charAt(0).toUpperCase() + w.slice(1);
  });
  const label = words.join(" ");
  const fullLabel = /rehab|clinic|center/i.test(label) ? label : `${label} Rehab`;

  // Hub mapping — the canonical "treatment hub" page for the breadcrumb.
  const hubMap = {
    "alcohol-rehab-in-": "/alcohol-rehab-centers",
    "drug-rehab-in-": "/drug-rehab-centers",
    "detox-centers-in-": "/detox-centers",
    "detox-in-": "/detox-centers",
    "inpatient-rehab-in-": "/inpatient-rehab-near-me",
    "outpatient-rehab-in-": "/outpatient-rehab-near-me",
    "dual-diagnosis-treatment-in-": "/dual-diagnosis-near-me",
    "luxury-rehab-in-": "/luxury-rehab-near-me",
    "sober-living-in-": "/sober-living-near-me",
    "free-rehab-in-": "/free-rehab-near-me",
    "faith-based-rehab-in-": "/faith-based-rehab-near-me",
    "fentanyl-rehab-in-": "/fentanyl-rehab-near-me",
    "veterans-rehab-in-": "/veterans-rehab-near-me",
    "womens-rehab-in-": "/womens-rehab-near-me",
    "mens-rehab-in-": "/mens-rehab-near-me",
    "holistic-rehab-in-": "/treatment-types/holistic-therapy",
    "mat-clinic-in-": "/mat-clinic-near-me",
    "iop-in-": "/iop-near-me",
    "php-in-": "/php-near-me",
    "affordable-rehab-in-": "/affordable-rehab-near-me",
    "low-cost-rehab-in-": "/affordable-rehab-near-me",
    "teen-rehab-in-": "/teen-rehab-near-me",
    "christian-rehab-in-": "/faith-based-rehab-near-me",
    "couples-rehab-in-": "/couples-rehab-near-me",
    "executive-rehab-in-": "/executive-rehab-near-me",
    "court-ordered-rehab-in-": "/court-ordered-rehab-near-me",
    "lgbtq-rehab-in-": "/lgbtq-rehab-near-me",
    "young-adult-rehab-in-": "/young-adult-rehab-near-me",
    "seniors-rehab-in-": "/seniors-rehab-near-me",
    "first-responder-rehab-in-": "/first-responder-rehab-near-me",
    "opioid-rehab-in-": "/opioid-rehab-near-me",
    "heroin-rehab-in-": "/heroin-rehab-near-me",
    "cocaine-rehab-in-": "/cocaine-rehab-near-me",
    "meth-rehab-in-": "/meth-rehab-near-me",
    "benzo-rehab-in-": "/benzo-rehab-near-me",
    "xanax-rehab-in-": "/xanax-rehab-near-me",
    "marijuana-rehab-in-": "/marijuana-rehab-near-me",
    "medicaid-rehab-in-": "/medicaid-rehab-near-me",
    "medicare-rehab-in-": "/medicare-rehab-near-me",
    "long-term-rehab-in-": "/long-term-rehab-near-me",
    "short-term-rehab-in-": "/short-term-rehab-near-me",
    "30-day-rehab-in-": "/30-day-rehab-near-me",
    "60-day-rehab-in-": "/60-day-rehab-near-me",
    "90-day-rehab-in-": "/90-day-rehab-near-me",
    "emergency-rehab-in-": "/emergency-rehab-near-me",
    "same-day-rehab-in-": "/same-day-rehab-near-me",
    "suboxone-clinic-in-": "/suboxone-clinic-near-me",
    "methadone-clinic-in-": "/methadone-clinic-near-me",
  };
  return { label: fullLabel, hub: hubMap[prefix] || "/rehab-centers" };
}

function renderPage({ prefix, label, hub, city }) {
  const urlPath = "/" + prefix + city.slug;
  const canonical = BASE_URL + urlPath;
  const title = `${label} in ${city.city}, ${city.stateAbbr}`;
  const metaTitle = `${title} — Find Treatment | RehabLookup`;
  const desc = `Find ${label.toLowerCase()} in ${city.city}, ${city.stateAbbr}. Compare accredited facilities, verify insurance, and get help today.`;
  const safeTitle = escHtml(metaTitle);
  const safeDesc = escHtml(desc);
  const popText = city.population
    ? `With a population of approximately ${city.population}, ${city.city} `
    : `${city.city} `;

  const breadcrumbSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL + "/" },
      { "@type": "ListItem", position: 2, name: label, item: BASE_URL + hub },
      { "@type": "ListItem", position: 3, name: city.city, item: canonical },
    ],
  });
  const pageSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "MedicalWebPage",
    name: title,
    description: desc,
    url: canonical,
    about: { "@type": "MedicalCondition", name: "Substance Use Disorder" },
    audience: {
      "@type": "PeopleAudience",
      geographicArea: {
        "@type": "City",
        name: city.city,
        containedInPlace: { "@type": "State", name: city.stateAbbr },
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
  <nav class="breadcrumbs" aria-label="Breadcrumb"><ul><li><a href="/">Home</a> &rsaquo; </li><li><a href="${hub}">${escHtml(label)}</a> &rsaquo; </li><li><a href="${urlPath}">${escHtml(city.city)}</a></li></ul></nav>
  <main>
    <h1>${escHtml(title)}</h1>
    <p>${popText}offers a range of ${escHtml(label.toLowerCase())} programs for residents and surrounding communities. Search verified, accredited treatment facilities in ${escHtml(city.city)}, ${city.stateAbbr} and compare programs by clinical approach, insurance accepted, and amenities.</p>

    <h2>${escHtml(label)} Programs in ${escHtml(city.city)}</h2>
    <p>${escHtml(city.city)} treatment centers provide evidence-based ${escHtml(label.toLowerCase())} including medical detox, residential inpatient, intensive outpatient (IOP), partial hospitalization (PHP), and medication-assisted treatment (MAT) where appropriate. Accredited facilities employ licensed clinicians and offer aftercare and relapse-prevention planning.</p>

    <h2>Insurance &amp; Cost</h2>
    <p>Most ${escHtml(label.toLowerCase())} facilities in ${escHtml(city.city)} accept private insurance (Aetna, Cigna, Blue Cross Blue Shield, UnitedHealthcare, Humana), Medicaid, and Medicare. RehabLookup's free insurance verification confirms in-network coverage in minutes.</p>

    <h2>Get Confidential Help in ${escHtml(city.city)}</h2>
    <p>If you or a loved one needs ${escHtml(label.toLowerCase())} in ${escHtml(city.city)}, ${city.stateAbbr}, our concierge team matches you with accredited programs based on clinical needs, insurance, and personal preferences — free and confidential.</p>

    <nav aria-label="Related pages">
      <h2>Related ${escHtml(city.city)} Pages</h2>
      <ul>
        <li><a href="/rehab-centers/${city.stateSlug}/${city.slug}">All Rehab Centers in ${escHtml(city.city)}</a></li>
        <li><a href="${hub}">${escHtml(label)} Near You</a></li>
        <li><a href="/rehab-centers/${city.stateSlug}">Treatment Centers in ${escHtml(city.stateAbbr)}</a></li>
      </ul>
    </nav>

    <div class="cta">
      <h2>Find Treatment Now</h2>
      <p>Verified ${escHtml(label.toLowerCase())} options in ${escHtml(city.city)}, ${city.stateAbbr} — confidential, free guidance from our placement team.</p>
      <a href="/concierge">Get Free Help</a>
      <a href="/search-results" style="background:#fff;color:#1B365D">Browse Centers</a>
    </div>

    <p style="margin-top:24px"><a href="/rehab-centers">Browse All Treatment Centers</a> &middot; <a href="/resources">Recovery Resources</a> &middot; <a href="/">Home</a></p>
  </main>
  <footer><p>&copy; 2026 RehabLookup. All rights reserved. <a href="/privacy-policy">Privacy Policy</a> &middot; <a href="/terms-of-service">Terms of Service</a></p></footer>
</body>
</html>`;
}

function main() {
  const prefixes = parsePrefixes();
  const cities = parseTopCities();
  let written = 0;
  let skipped = 0;
  for (const prefix of prefixes) {
    const { label, hub } = labelForPrefix(prefix);
    for (const city of cities) {
      const outPath = path.join(publicDir, `${prefix}${city.slug}.html`);
      if (fs.existsSync(outPath)) {
        skipped++;
        continue;
      }
      fs.writeFileSync(outPath, renderPage({ prefix, label, hub, city }));
      written++;
    }
  }
  console.log(
    `city-treatment backfill: prefixes=${prefixes.length}, cities=${cities.length}, written=${written}, skipped=${skipped}`,
  );
}

main();

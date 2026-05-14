#!/usr/bin/env node
/**
 * Backfill prerendered HTML for every (near-me-type × state) combination
 * that has a React route but no static HTML file.
 *
 * scripts/generate-missing-nearme-html.mjs ships ~45 hardcoded near-me
 * types, but src/data/nearMeTypes.ts defines 58. The 13-type delta —
 * seniors-rehab-near-me, first-responder-rehab-near-me,
 * prescription-drug-rehab-near-me, xanax-rehab-near-me,
 * kratom-rehab-near-me, tricare-rehab-near-me, humana-rehab-near-me,
 * 60-day-rehab-near-me, short-term-rehab-near-me, cocaine-rehab-near-me,
 * heroin-rehab-near-me, meth-rehab-near-me, benzo-rehab-near-me — had no
 * state-level prerender. SmartCatchAll renders the React page, but
 * Googlebot saw the unmounted SPA shell with the homepage canonical,
 * so all 646 missing pages indexed as duplicate-of-/.
 *
 * Template style matches the existing prerendered near-me/state pages
 * 1:1 (header, breadcrumb nav, blue CTA card, footer). GA snippet
 * added because the older generator omitted it.
 *
 * Idempotent: skips files that already exist (won't overwrite existing
 * generator output).
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

function parseNearMeTypes() {
  const txt = fs.readFileSync(path.join(repoRoot, "src/data/nearMeTypes.ts"), "utf8");
  // { slug: "X", label: "Y", treatmentType: "Z" }
  const re = /\{\s*slug:\s*"([a-z0-9-]+-near-me)",\s*label:\s*"([^"]+)",\s*treatmentType:\s*"([^"]+)"\s*\}/g;
  const out = [];
  let m;
  while ((m = re.exec(txt))) out.push({ slug: m[1], label: m[2], treatmentType: m[3] });
  return out;
}

function parseStates() {
  // usStates.ts has `{ name, slug }`; abbreviations live in locationSeoData.ts.
  // Cross-reference both so the rendered copy can use the state abbreviation
  // where appropriate.
  const txt = fs.readFileSync(path.join(repoRoot, "src/data/usStates.ts"), "utf8");
  const baseRe = /\{\s*name:\s*"([^"]+)",\s*slug:\s*"([a-z-]+)"\s*\}/g;
  const out = [];
  let m;
  while ((m = baseRe.exec(txt))) out.push({ name: m[1], slug: m[2], abbr: "" });

  const loc = fs.readFileSync(path.join(repoRoot, "src/data/locationSeoData.ts"), "utf8");
  const abbrRe = /\{\s*name:\s*"([^"]+)",\s*slug:\s*"([a-z-]+)",\s*abbreviation:\s*"([A-Z]{2})"/g;
  const slugToAbbr = new Map();
  let a;
  while ((a = abbrRe.exec(loc))) slugToAbbr.set(a[2], a[3]);
  for (const s of out) s.abbr = slugToAbbr.get(s.slug) || "";
  return out;
}

function renderPage({ nm, state }) {
  const urlPath = `/${nm.slug}/${state.slug}`;
  const canonical = `${BASE_URL}${urlPath}`;
  const labelLc = nm.label.toLowerCase();
  const treatmentTypeLc = nm.treatmentType.toLowerCase();
  const title = `${nm.label} Near Me in ${state.name}`;
  const metaTitle = `${title} — Find Local Treatment | RehabLookup`;
  const desc = `Find ${labelLc} near you in ${state.name}. Compare verified, accredited addiction treatment facilities. Verify insurance and get help today.`;
  const safeTitle = escHtml(metaTitle);
  const safeDesc = escHtml(desc);

  const breadcrumbSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL + "/" },
      { "@type": "ListItem", position: 2, name: nm.label + " Near Me", item: BASE_URL + "/" + nm.slug },
      { "@type": "ListItem", position: 3, name: state.name, item: canonical },
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
      geographicArea: { "@type": "State", name: state.name },
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
  <meta property="og:locale" content="en_US">
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
    .bc{font-size:.85rem;color:#666;margin-bottom:20px}
    .cta{background:#eff6ff;border:1px solid #bfdbfe;border-radius:.75rem;padding:1.5rem;margin:2rem 0;text-align:center}
    .cta h2{font-size:1.25rem;color:#1e40af;margin:0 0 .5rem}
    .btn{display:inline-block;padding:.6rem 1.4rem;border-radius:.5rem;font-weight:600;text-decoration:none;font-size:.9rem;background:#2563eb;color:#fff;margin:.25rem}
    footer{margin-top:40px;padding-top:20px;border-top:1px solid #e5e7eb;font-size:.8rem;color:#888}
  </style>
  <script async src="https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_MEASUREMENT_ID}');</script>
</head>
<body>
  <header style="padding:12px 0 20px;border-bottom:1px solid #e5e7eb;margin-bottom:20px">
    <a href="/" style="font-weight:700;font-size:1.25rem;color:#1B365D;text-decoration:none">RehabLookup</a>
  </header>
  <nav class="bc" aria-label="Breadcrumb"><a href="/">Home</a> &rsaquo; <a href="/${nm.slug}">${escHtml(nm.label)} Near Me</a> &rsaquo; ${escHtml(state.name)}</nav>
  <main>
    <h1>${escHtml(title)}</h1>
    <p>Find accredited ${escHtml(labelLc)} programs in ${escHtml(state.name)}. RehabLookup's verified directory covers facilities across every county in ${escHtml(state.name)}, with detailed information on treatment approaches, insurance acceptance, and amenities.</p>
    <h2>How to Find Treatment in ${escHtml(state.name)}</h2>
    <p>Use our search tool to filter by city, zip code, insurance provider, and treatment type. All listed facilities are verified for state licensure and accreditation. ${escHtml(state.name)} has a network of providers offering ${escHtml(treatmentTypeLc)} for adults, adolescents, and families.</p>
    <h2>Insurance Coverage in ${escHtml(state.name)}</h2>
    <p>Most major insurance plans — including Aetna, Blue Cross Blue Shield, Cigna, UnitedHealthcare, Humana, and Medicaid — cover addiction treatment in ${escHtml(state.name)} under the Mental Health Parity and Addiction Equity Act.</p>
    <p><a href="/rehab-centers/${state.slug}">Browse all rehab centers in ${escHtml(state.name)}</a> &middot; <a href="/${nm.slug}">Back to ${escHtml(nm.label)} Near Me</a></p>
    <div class="cta">
      <h2>Find Treatment Centers Now</h2>
      <p>Search our verified directory of accredited rehab facilities across all 50 states.</p>
      <a href="/search-results" class="btn">Search Centers</a>
      <a href="/concierge" class="btn" style="background:#fff;color:#2563eb;border:1px solid #2563eb">Get Free Help</a>
    </div>
    <p><a href="/rehab-centers">Browse All States</a> &middot; <a href="/resources">Recovery Resources</a> &middot; <a href="/">Home</a></p>
  </main>
  <footer><p>&copy; 2026 RehabLookup. All rights reserved. <a href="/privacy-policy">Privacy Policy</a> &middot; <a href="/terms-of-service">Terms of Service</a></p></footer>
</body>
</html>`;
}

function main() {
  const nearMeTypes = parseNearMeTypes();
  const states = parseStates();
  let written = 0;
  let skipped = 0;
  for (const nm of nearMeTypes) {
    const dir = path.join(publicDir, nm.slug);
    fs.mkdirSync(dir, { recursive: true });
    for (const state of states) {
      const outPath = path.join(dir, `${state.slug}.html`);
      if (fs.existsSync(outPath)) {
        skipped++;
        continue;
      }
      fs.writeFileSync(outPath, renderPage({ nm, state }));
      written++;
    }
  }
  console.log(
    `near-me/state backfill: types=${nearMeTypes.length}, states=${states.length}, written=${written}, skipped=${skipped}`,
  );
}

main();

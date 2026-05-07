#!/usr/bin/env node
/**
 * generate-all-missing-html.mjs
 *
 * Generates static pre-rendered HTML for ALL sitemap URLs that do not yet
 * have a corresponding file in public/. This covers:
 *
 *   - /[near-me-slug]/[state]              (2,151 pages)
 *   - /[near-me-slug]/[state]/[city]       (41 pages)
 *   - /[near-me-slug]  root pages          (29 pages)
 *   - /insurance/[provider]/[state]        (683 pages)
 *   - /insurance/[provider]/[state]/[city] (16 pages)
 *   - /insurance/[provider]/[state]/county/[county] (6,674 pages)
 *   - /rehab-marketing/[state]/[treatment] (253 pages)
 *   - /rehab-marketing/[state]/county/[county] (532 pages)
 *   - /rehab-marketing/[state]/county/[county]/[treatment] (3,337 pages)
 *   - /rehab-marketing/[state]/county/[county]/insurance/[ins] (2,509 pages)
 *   - /rehab-centers/[state]/[city]        (4 pages)
 *   - /rehab-centers/[state]/county/[county] (173 pages)
 *   - /rehab-centers/[state]/county/[county]/[treatment] (2,508 pages)
 *   - /[substance]-addiction-treatment/[state] (50 pages each)
 *   - /[demographic]-rehab/[state]         (50 pages each)
 *   - /[duration]-rehab-programs/[state]   (50 pages each)
 *   - /best-rehab-centers-in-[state]       (remaining states)
 *   - /list-your-facility-in-[city]        (48 pages)
 *   - Various single static pages
 *
 * Strategy: Read all URLs from sitemaps, check which ones already have
 * public/*.html files, and generate HTML for the missing ones.
 *
 * Each generated page has:
 *   - Correct canonical URL (the page's own URL, not the homepage)
 *   - Page-specific title, meta description, and h1
 *   - Relevant body content with internal links
 *   - BreadcrumbList JSON-LD structured data
 *   - GA4 tracking snippet
 *
 * Idempotent: safe to re-run; skips existing files unless --force is passed.
 */

import { writeFile, mkdir, access } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseStringPromise } from "xml2js";
import { readFile } from "node:fs/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "../public");
const BASE_URL = "https://rehablookup.com";
const FORCE = process.argv.includes("--force");

let generated = 0;
let skipped = 0;
let errors = 0;

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────
function escHtml(s) {
  if (!s) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function toTitleCase(slug) {
  return slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function slugToName(slug) {
  return toTitleCase(slug);
}

// ─────────────────────────────────────────────────────────────────────────────
// HTML template (matches existing site style)
// ─────────────────────────────────────────────────────────────────────────────
function buildHtml({ urlPath, title, metaTitle, metaDesc, h1, content, breadcrumbs }) {
  const canonical = `${BASE_URL}${urlPath}`;
  const safeTitle = escHtml(metaTitle || title);
  const safeDesc = escHtml(metaDesc);

  const bcSchema = breadcrumbs?.length
    ? JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: breadcrumbs.map((b, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: b.name,
          item: `${BASE_URL}${b.url}`,
        })),
      })
    : null;

  const bcHtml = breadcrumbs?.length
    ? breadcrumbs
        .map((b, i) =>
          i < breadcrumbs.length - 1
            ? `<a href="${b.url}">${escHtml(b.name)}</a> &rsaquo; `
            : escHtml(b.name)
        )
        .join("")
    : "";

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
  ${bcSchema ? `<script type="application/ld+json">${bcSchema}</script>` : ""}
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
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-2VB6C1X2MQ"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-2VB6C1X2MQ',{send_page_view:true});</script>
</head>
<body>
  <header style="padding:12px 0 20px;border-bottom:1px solid #e5e7eb;margin-bottom:20px">
    <a href="/" style="font-weight:700;font-size:1.25rem;color:#1B365D;text-decoration:none">RehabLookup</a>
  </header>
  ${bcHtml ? `<nav class="bc" aria-label="Breadcrumb">${bcHtml}</nav>` : ""}
  <main>
    <h1>${escHtml(h1 || title)}</h1>
    ${content}
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

// ─────────────────────────────────────────────────────────────────────────────
// Write page (flat .html + nested /index.html for Vercel cleanUrls compat)
// ─────────────────────────────────────────────────────────────────────────────
async function writePage(urlPath, pageData) {
  const htmlContent = buildHtml({ urlPath, ...pageData });
  const flatPath = path.join(publicDir, urlPath.replace(/^\//, "") + ".html");
  const nestedPath = path.join(publicDir, urlPath.replace(/^\//, ""), "index.html");

  // Skip if already exists and not forcing
  if (!FORCE && existsSync(flatPath)) {
    skipped++;
    return;
  }

  try {
    await mkdir(path.dirname(flatPath), { recursive: true });
    await writeFile(flatPath, htmlContent, "utf8");

    await mkdir(path.dirname(nestedPath), { recursive: true });
    await writeFile(nestedPath, htmlContent, "utf8");

    generated++;
  } catch (err) {
    errors++;
    console.error(`  ERROR writing ${urlPath}: ${err.message}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Load all sitemap URLs
// ─────────────────────────────────────────────────────────────────────────────
async function loadSitemapUrls() {
  const sitemapFiles = [
    "sitemap.xml",
    "sitemap-extras.xml",
    "sitemap-facilities.xml",
  ];

  const urls = new Set();

  for (const sf of sitemapFiles) {
    const filePath = path.join(publicDir, sf);
    if (!existsSync(filePath)) continue;
    try {
      const xml = await readFile(filePath, "utf8");
      const parsed = await parseStringPromise(xml);
      const urlset = parsed?.urlset?.url || [];
      for (const u of urlset) {
        const loc = u?.loc?.[0];
        if (loc) {
          const p = loc.replace("https://rehablookup.com", "").trim();
          if (p && p !== "/") urls.add(p);
        }
      }
    } catch (err) {
      console.warn(`  Warning: could not parse ${sf}: ${err.message}`);
    }
  }

  return urls;
}

// ─────────────────────────────────────────────────────────────────────────────
// Check which URLs already have HTML files
// ─────────────────────────────────────────────────────────────────────────────
function hasHtmlFile(urlPath) {
  const flatPath = path.join(publicDir, urlPath.replace(/^\//, "") + ".html");
  const nestedPath = path.join(publicDir, urlPath.replace(/^\//, ""), "index.html");
  return existsSync(flatPath) || existsSync(nestedPath);
}

// ─────────────────────────────────────────────────────────────────────────────
// Page content generators by route pattern
// ─────────────────────────────────────────────────────────────────────────────

// Near-me state page: /{near-me-slug}/{state}
function nearMeStatePage(urlPath) {
  const parts = urlPath.replace(/^\//, "").split("/");
  const nearMeSlug = parts[0];
  const stateSlug = parts[1];
  const nearMeName = slugToName(nearMeSlug.replace(/-near-me$/, "").replace(/-/g, " "));
  const stateName = slugToName(stateSlug);
  const title = `${toTitleCase(nearMeSlug)} in ${stateName}`;
  return {
    title,
    metaTitle: `${title} — Find Local Treatment | RehabLookup`,
    metaDesc: `Find ${nearMeName} near you in ${stateName}. Compare verified, accredited addiction treatment facilities. Verify insurance and get help today.`,
    h1: title,
    content: `
      <p>Find accredited ${nearMeName.toLowerCase()} programs in ${stateName}. RehabLookup's verified directory covers facilities across every county in ${stateName}, with detailed information on treatment approaches, insurance acceptance, and amenities.</p>
      <h2>How to Find Treatment in ${stateName}</h2>
      <p>Use our search tool to filter by city, zip code, insurance provider, and treatment type. All listed facilities are verified for state licensure and accreditation.</p>
      <h2>Insurance Coverage in ${stateName}</h2>
      <p>Most major insurance plans — including Aetna, Blue Cross Blue Shield, Cigna, UnitedHealthcare, Humana, and Medicaid — cover addiction treatment in ${stateName} under the Mental Health Parity and Addiction Equity Act.</p>
      <p><a href="/rehab-centers/${stateSlug}">Browse all rehab centers in ${stateName}</a> &middot; <a href="/${nearMeSlug}">Back to ${toTitleCase(nearMeSlug)}</a></p>`,
    breadcrumbs: [
      { name: "Home", url: "/" },
      { name: toTitleCase(nearMeSlug), url: `/${nearMeSlug}` },
      { name: stateName, url: urlPath },
    ],
  };
}

// Near-me city page: /{near-me-slug}/{state}/{city}
function nearMeCityPage(urlPath) {
  const parts = urlPath.replace(/^\//, "").split("/");
  const nearMeSlug = parts[0];
  const stateSlug = parts[1];
  const citySlug = parts[2];
  const nearMeName = slugToName(nearMeSlug.replace(/-near-me$/, "").replace(/-/g, " "));
  const stateName = slugToName(stateSlug);
  const cityName = slugToName(citySlug);
  const title = `${toTitleCase(nearMeSlug)} in ${cityName}, ${stateName}`;
  return {
    title,
    metaTitle: `${title} — Local Treatment Centers | RehabLookup`,
    metaDesc: `Find ${nearMeName.toLowerCase()} programs in ${cityName}, ${stateName}. Compare accredited local facilities, verify insurance, and get help today.`,
    h1: title,
    content: `
      <p>Find accredited ${nearMeName.toLowerCase()} programs in ${cityName}, ${stateName}. Our directory includes verified facilities with detailed information on treatment programs, insurance acceptance, and amenities.</p>
      <h2>Treatment Options in ${cityName}</h2>
      <p>Facilities in ${cityName} offer a range of programs including medical detox, residential inpatient, partial hospitalization (PHP), intensive outpatient (IOP), and outpatient treatment.</p>
      <h2>Insurance Accepted in ${cityName}</h2>
      <p>Most rehab centers in ${cityName} accept major insurance plans. Use our free insurance verification tool to find in-network facilities.</p>
      <p><a href="/${nearMeSlug}/${stateSlug}">All ${toTitleCase(nearMeSlug)} in ${stateName}</a> &middot; <a href="/rehab-centers/${stateSlug}">All Rehab Centers in ${stateName}</a></p>`,
    breadcrumbs: [
      { name: "Home", url: "/" },
      { name: toTitleCase(nearMeSlug), url: `/${nearMeSlug}` },
      { name: stateName, url: `/${nearMeSlug}/${stateSlug}` },
      { name: cityName, url: urlPath },
    ],
  };
}

// Insurance state page: /insurance/{provider}/{state}
function insuranceStatePage(urlPath) {
  const parts = urlPath.replace(/^\//, "").split("/");
  const providerSlug = parts[1];
  const stateSlug = parts[2];
  const providerName = slugToName(providerSlug.replace(/-rehab$/, ""));
  const stateName = slugToName(stateSlug);
  const title = `${providerName} Rehab Coverage in ${stateName}`;
  return {
    title,
    metaTitle: `${title} — Find In-Network Treatment | RehabLookup`,
    metaDesc: `Find rehab centers in ${stateName} that accept ${providerName} insurance. Verify your behavioral health benefits and find in-network addiction treatment facilities.`,
    h1: title,
    content: `
      <p>Find addiction treatment centers in ${stateName} that accept ${providerName} insurance. RehabLookup helps you verify your behavioral health benefits and locate in-network facilities for detox, inpatient, and outpatient treatment.</p>
      <h2>${providerName} Coverage for Addiction Treatment in ${stateName}</h2>
      <p>Under the Mental Health Parity and Addiction Equity Act (MHPAEA), ${providerName} is required to cover substance use disorder treatment at the same level as medical and surgical benefits. This includes medical detox, residential treatment, PHP, IOP, and outpatient services.</p>
      <h2>How to Verify Your ${providerName} Benefits</h2>
      <p>Call the member services number on the back of your insurance card, or use our free insurance verification tool to check your coverage before starting treatment.</p>
      <p><a href="/insurance/${providerSlug}">All ${providerName} Rehab Coverage</a> &middot; <a href="/rehab-centers/${stateSlug}">All Rehab Centers in ${stateName}</a></p>`,
    breadcrumbs: [
      { name: "Home", url: "/" },
      { name: "Insurance", url: "/insurance" },
      { name: providerName, url: `/insurance/${providerSlug}` },
      { name: stateName, url: urlPath },
    ],
  };
}

// Insurance state/city page: /insurance/{provider}/{state}/{city}
function insuranceCityPage(urlPath) {
  const parts = urlPath.replace(/^\//, "").split("/");
  const providerSlug = parts[1];
  const stateSlug = parts[2];
  const citySlug = parts[3];
  const providerName = slugToName(providerSlug.replace(/-rehab$/, ""));
  const stateName = slugToName(stateSlug);
  const cityName = slugToName(citySlug);
  const title = `${providerName} Rehab Coverage in ${cityName}, ${stateName}`;
  return {
    title,
    metaTitle: `${title} — In-Network Treatment | RehabLookup`,
    metaDesc: `Find ${providerName}-covered rehab centers in ${cityName}, ${stateName}. Verify your benefits and find in-network addiction treatment facilities near you.`,
    h1: title,
    content: `
      <p>Find addiction treatment centers in ${cityName}, ${stateName} that accept ${providerName} insurance. Our directory includes verified in-network facilities for detox, inpatient, and outpatient treatment.</p>
      <h2>In-Network Facilities in ${cityName}</h2>
      <p>Use our search tool to filter by ${providerName} network status in ${cityName}. All listed facilities have been verified for insurance acceptance.</p>
      <p><a href="/insurance/${providerSlug}/${stateSlug}">All ${providerName} Centers in ${stateName}</a> &middot; <a href="/rehab-centers/${stateSlug}">All Rehab Centers in ${stateName}</a></p>`,
    breadcrumbs: [
      { name: "Home", url: "/" },
      { name: "Insurance", url: "/insurance" },
      { name: providerName, url: `/insurance/${providerSlug}` },
      { name: stateName, url: `/insurance/${providerSlug}/${stateSlug}` },
      { name: cityName, url: urlPath },
    ],
  };
}

// Insurance county page: /insurance/{provider}/{state}/county/{county}
function insuranceCountyPage(urlPath) {
  const parts = urlPath.replace(/^\//, "").split("/");
  const providerSlug = parts[1];
  const stateSlug = parts[2];
  const countySlug = parts[4];
  const providerName = slugToName(providerSlug.replace(/-rehab$/, ""));
  const stateName = slugToName(stateSlug);
  const countyName = slugToName(countySlug) + " County";
  const title = `${providerName} Rehab Coverage in ${countyName}, ${stateName}`;
  return {
    title,
    metaTitle: `${title} — In-Network Treatment | RehabLookup`,
    metaDesc: `Find ${providerName}-covered rehab centers in ${countyName}, ${stateName}. Verify your benefits and find in-network addiction treatment near you.`,
    h1: title,
    content: `
      <p>Find addiction treatment centers in ${countyName}, ${stateName} that accept ${providerName} insurance. Our verified directory helps you locate in-network facilities for detox, inpatient, and outpatient treatment.</p>
      <h2>Coverage in ${countyName}</h2>
      <p>${providerName} covers substance use disorder treatment in ${countyName} under the Mental Health Parity Act. Verify your specific benefits before starting treatment.</p>
      <p><a href="/insurance/${providerSlug}/${stateSlug}">All ${providerName} Centers in ${stateName}</a> &middot; <a href="/rehab-centers/${stateSlug}">All Rehab Centers in ${stateName}</a></p>`,
    breadcrumbs: [
      { name: "Home", url: "/" },
      { name: "Insurance", url: "/insurance" },
      { name: providerName, url: `/insurance/${providerSlug}` },
      { name: stateName, url: `/insurance/${providerSlug}/${stateSlug}` },
      { name: countyName, url: urlPath },
    ],
  };
}

// Rehab-marketing state/treatment: /rehab-marketing/{state}/{treatment}
function rehabMarketingStateTreatmentPage(urlPath) {
  const parts = urlPath.replace(/^\//, "").split("/");
  const stateSlug = parts[1];
  const treatmentSlug = parts[2];
  const stateName = slugToName(stateSlug);
  const treatmentName = slugToName(treatmentSlug);
  const title = `${treatmentName} Programs in ${stateName}`;
  return {
    title,
    metaTitle: `${title} — Find Accredited Centers | RehabLookup`,
    metaDesc: `Find accredited ${treatmentName.toLowerCase()} programs in ${stateName}. Compare verified facilities, verify insurance, and start recovery today.`,
    h1: title,
    content: `
      <p>Find accredited ${treatmentName.toLowerCase()} programs in ${stateName}. RehabLookup's verified directory covers facilities across all counties in ${stateName}.</p>
      <h2>Treatment Options in ${stateName}</h2>
      <p>${stateName} offers a range of ${treatmentName.toLowerCase()} programs including medical detox, residential inpatient, PHP, IOP, and outpatient services. Use our search tool to compare programs by location, insurance, and specialty.</p>
      <h2>Insurance Coverage</h2>
      <p>Most major insurance plans cover ${treatmentName.toLowerCase()} in ${stateName} under the Mental Health Parity and Addiction Equity Act. Use our free insurance verification tool to check your benefits.</p>
      <p><a href="/rehab-centers/${stateSlug}">All Rehab Centers in ${stateName}</a> &middot; <a href="/treatment-types">Browse Treatment Types</a></p>`,
    breadcrumbs: [
      { name: "Home", url: "/" },
      { name: stateName, url: `/rehab-centers/${stateSlug}` },
      { name: treatmentName, url: urlPath },
    ],
  };
}

// Rehab-marketing county: /rehab-marketing/{state}/county/{county}
function rehabMarketingCountyPage(urlPath) {
  const parts = urlPath.replace(/^\//, "").split("/");
  const stateSlug = parts[1];
  const countySlug = parts[3];
  const stateName = slugToName(stateSlug);
  const countyName = slugToName(countySlug) + " County";
  const title = `Rehab Centers in ${countyName}, ${stateName}`;
  return {
    title,
    metaTitle: `${title} — Find Treatment | RehabLookup`,
    metaDesc: `Find accredited rehab centers in ${countyName}, ${stateName}. Compare verified addiction treatment facilities, verify insurance, and get help today.`,
    h1: title,
    content: `
      <p>Find accredited addiction treatment centers in ${countyName}, ${stateName}. Our verified directory includes facilities offering detox, inpatient, outpatient, and specialty programs.</p>
      <h2>Treatment Programs in ${countyName}</h2>
      <p>Facilities in ${countyName} offer comprehensive addiction treatment including medical detox, residential inpatient, partial hospitalization (PHP), intensive outpatient (IOP), and standard outpatient programs.</p>
      <h2>Insurance Accepted</h2>
      <p>Most rehab centers in ${countyName} accept major insurance plans including Medicaid, Medicare, Aetna, Blue Cross Blue Shield, Cigna, and UnitedHealthcare.</p>
      <p><a href="/rehab-centers/${stateSlug}">All Rehab Centers in ${stateName}</a></p>`,
    breadcrumbs: [
      { name: "Home", url: "/" },
      { name: stateName, url: `/rehab-centers/${stateSlug}` },
      { name: countyName, url: urlPath },
    ],
  };
}

// Rehab-marketing county/treatment: /rehab-marketing/{state}/county/{county}/{treatment}
function rehabMarketingCountyTreatmentPage(urlPath) {
  const parts = urlPath.replace(/^\//, "").split("/");
  const stateSlug = parts[1];
  const countySlug = parts[3];
  const treatmentSlug = parts[4];
  const stateName = slugToName(stateSlug);
  const countyName = slugToName(countySlug) + " County";
  const treatmentName = slugToName(treatmentSlug);
  const title = `${treatmentName} in ${countyName}, ${stateName}`;
  return {
    title,
    metaTitle: `${title} — Find Accredited Centers | RehabLookup`,
    metaDesc: `Find accredited ${treatmentName.toLowerCase()} programs in ${countyName}, ${stateName}. Compare verified facilities and verify insurance coverage.`,
    h1: title,
    content: `
      <p>Find accredited ${treatmentName.toLowerCase()} programs in ${countyName}, ${stateName}. Our verified directory helps you compare facilities by program type, insurance acceptance, and amenities.</p>
      <h2>Insurance Coverage in ${countyName}</h2>
      <p>Most major insurance plans cover ${treatmentName.toLowerCase()} in ${countyName} under the Mental Health Parity Act. Verify your benefits before starting treatment.</p>
      <p><a href="/rehab-marketing/${stateSlug}/county/${countySlug}">All Rehab Centers in ${countyName}</a> &middot; <a href="/rehab-centers/${stateSlug}">All Rehab Centers in ${stateName}</a></p>`,
    breadcrumbs: [
      { name: "Home", url: "/" },
      { name: stateName, url: `/rehab-centers/${stateSlug}` },
      { name: countyName, url: `/rehab-marketing/${stateSlug}/county/${countySlug}` },
      { name: treatmentName, url: urlPath },
    ],
  };
}

// Rehab-marketing county/insurance: /rehab-marketing/{state}/county/{county}/insurance/{ins}
function rehabMarketingCountyInsurancePage(urlPath) {
  const parts = urlPath.replace(/^\//, "").split("/");
  const stateSlug = parts[1];
  const countySlug = parts[3];
  const insSlug = parts[5];
  const stateName = slugToName(stateSlug);
  const countyName = slugToName(countySlug) + " County";
  const insName = slugToName(insSlug);
  const title = `${insName} Rehab Centers in ${countyName}, ${stateName}`;
  return {
    title,
    metaTitle: `${title} — In-Network Treatment | RehabLookup`,
    metaDesc: `Find ${insName}-covered rehab centers in ${countyName}, ${stateName}. Verify your insurance benefits and find in-network addiction treatment.`,
    h1: title,
    content: `
      <p>Find addiction treatment centers in ${countyName}, ${stateName} that accept ${insName} insurance. Our verified directory includes in-network facilities for detox, inpatient, and outpatient treatment.</p>
      <h2>${insName} Coverage in ${countyName}</h2>
      <p>${insName} covers substance use disorder treatment in ${countyName} under the Mental Health Parity and Addiction Equity Act. Verify your specific benefits before starting treatment.</p>
      <p><a href="/rehab-marketing/${stateSlug}/county/${countySlug}">All Rehab Centers in ${countyName}</a> &middot; <a href="/rehab-centers/${stateSlug}">All Rehab Centers in ${stateName}</a></p>`,
    breadcrumbs: [
      { name: "Home", url: "/" },
      { name: stateName, url: `/rehab-centers/${stateSlug}` },
      { name: countyName, url: `/rehab-marketing/${stateSlug}/county/${countySlug}` },
      { name: insName, url: urlPath },
    ],
  };
}

// Rehab-centers county: /rehab-centers/{state}/county/{county}
function rehabCentersCountyPage(urlPath) {
  const parts = urlPath.replace(/^\//, "").split("/");
  const stateSlug = parts[1];
  const countySlug = parts[3];
  const stateName = slugToName(stateSlug);
  const countyName = slugToName(countySlug) + " County";
  const title = `Rehab Centers in ${countyName}, ${stateName}`;
  return {
    title,
    metaTitle: `${title} — Find Treatment | RehabLookup`,
    metaDesc: `Find accredited rehab centers in ${countyName}, ${stateName}. Compare verified addiction treatment programs, verify insurance, and get help today.`,
    h1: title,
    content: `
      <p>Find accredited addiction treatment centers in ${countyName}, ${stateName}. Our verified directory covers all licensed facilities in the county offering detox, inpatient, and outpatient programs.</p>
      <h2>Treatment Programs in ${countyName}</h2>
      <p>Facilities in ${countyName} offer comprehensive addiction treatment including medical detox, residential inpatient, partial hospitalization (PHP), intensive outpatient (IOP), and standard outpatient programs.</p>
      <h2>Insurance Coverage</h2>
      <p>Most rehab centers in ${countyName} accept Medicaid, Medicare, and major private insurance plans. Use our free insurance verification tool to find in-network facilities.</p>
      <p><a href="/rehab-centers/${stateSlug}">All Rehab Centers in ${stateName}</a></p>`,
    breadcrumbs: [
      { name: "Home", url: "/" },
      { name: "Rehab Centers", url: "/rehab-centers" },
      { name: stateName, url: `/rehab-centers/${stateSlug}` },
      { name: countyName, url: urlPath },
    ],
  };
}

// Rehab-centers county/treatment: /rehab-centers/{state}/county/{county}/{treatment}
function rehabCentersCountyTreatmentPage(urlPath) {
  const parts = urlPath.replace(/^\//, "").split("/");
  const stateSlug = parts[1];
  const countySlug = parts[3];
  const treatmentSlug = parts[4];
  const stateName = slugToName(stateSlug);
  const countyName = slugToName(countySlug) + " County";
  const treatmentName = slugToName(treatmentSlug);
  const title = `${treatmentName} in ${countyName}, ${stateName}`;
  return {
    title,
    metaTitle: `${title} — Find Accredited Centers | RehabLookup`,
    metaDesc: `Find accredited ${treatmentName.toLowerCase()} programs in ${countyName}, ${stateName}. Compare verified facilities and verify insurance coverage.`,
    h1: title,
    content: `
      <p>Find accredited ${treatmentName.toLowerCase()} programs in ${countyName}, ${stateName}. Our verified directory includes licensed facilities offering evidence-based addiction treatment.</p>
      <h2>Insurance Coverage</h2>
      <p>Most major insurance plans cover ${treatmentName.toLowerCase()} in ${countyName} under the Mental Health Parity Act. Verify your benefits before starting treatment.</p>
      <p><a href="/rehab-centers/${stateSlug}/county/${countySlug}">All Rehab Centers in ${countyName}</a> &middot; <a href="/rehab-centers/${stateSlug}">All Rehab Centers in ${stateName}</a></p>`,
    breadcrumbs: [
      { name: "Home", url: "/" },
      { name: "Rehab Centers", url: "/rehab-centers" },
      { name: stateName, url: `/rehab-centers/${stateSlug}` },
      { name: countyName, url: `/rehab-centers/${stateSlug}/county/${countySlug}` },
      { name: treatmentName, url: urlPath },
    ],
  };
}

// Rehab-centers city: /rehab-centers/{state}/{city}
function rehabCentersCityPage(urlPath) {
  const parts = urlPath.replace(/^\//, "").split("/");
  const stateSlug = parts[1];
  const citySlug = parts[2];
  const stateName = slugToName(stateSlug);
  const cityName = slugToName(citySlug);
  const title = `Rehab Centers in ${cityName}, ${stateName}`;
  return {
    title,
    metaTitle: `${title} — Find Treatment | RehabLookup`,
    metaDesc: `Find accredited rehab centers in ${cityName}, ${stateName}. Compare verified addiction treatment programs, verify insurance, and get help today.`,
    h1: title,
    content: `
      <p>Find accredited addiction treatment centers in ${cityName}, ${stateName}. Our verified directory covers all licensed facilities offering detox, inpatient, and outpatient programs.</p>
      <h2>Treatment Options in ${cityName}</h2>
      <p>Facilities in ${cityName} offer comprehensive programs including medical detox, residential inpatient, PHP, IOP, and outpatient treatment. Use our search tool to compare programs by insurance, specialty, and amenities.</p>
      <p><a href="/rehab-centers/${stateSlug}">All Rehab Centers in ${stateName}</a></p>`,
    breadcrumbs: [
      { name: "Home", url: "/" },
      { name: "Rehab Centers", url: "/rehab-centers" },
      { name: stateName, url: `/rehab-centers/${stateSlug}` },
      { name: cityName, url: urlPath },
    ],
  };
}

// Substance/demographic/duration state page: /{slug}/{state}
function substanceStatePage(urlPath) {
  const parts = urlPath.replace(/^\//, "").split("/");
  const typeSlug = parts[0];
  const stateSlug = parts[1];
  const typeName = slugToName(typeSlug);
  const stateName = slugToName(stateSlug);
  const title = `${typeName} in ${stateName}`;
  return {
    title,
    metaTitle: `${title} — Find Accredited Programs | RehabLookup`,
    metaDesc: `Find accredited ${typeName.toLowerCase()} programs in ${stateName}. Compare verified facilities, verify insurance, and start recovery today.`,
    h1: title,
    content: `
      <p>Find accredited ${typeName.toLowerCase()} programs in ${stateName}. RehabLookup's verified directory covers licensed facilities across all counties in ${stateName}.</p>
      <h2>Treatment Options in ${stateName}</h2>
      <p>${stateName} offers a range of ${typeName.toLowerCase()} programs including medical detox, residential inpatient, partial hospitalization (PHP), intensive outpatient (IOP), and outpatient treatment.</p>
      <h2>Insurance Coverage in ${stateName}</h2>
      <p>Most major insurance plans cover ${typeName.toLowerCase()} in ${stateName} under the Mental Health Parity and Addiction Equity Act. Verify your benefits with our free insurance check tool.</p>
      <p><a href="/${typeSlug}">All ${typeName} Programs</a> &middot; <a href="/rehab-centers/${stateSlug}">All Rehab Centers in ${stateName}</a></p>`,
    breadcrumbs: [
      { name: "Home", url: "/" },
      { name: typeName, url: `/${typeSlug}` },
      { name: stateName, url: urlPath },
    ],
  };
}

// List-your-facility city page: /list-your-facility-in-{city}
function listYourFacilityPage(urlPath) {
  const cityPart = urlPath.replace("/list-your-facility-in-", "");
  const cityName = slugToName(cityPart);
  const title = `List Your Rehab Facility in ${cityName}`;
  return {
    title,
    metaTitle: `${title} — RehabLookup Provider Directory`,
    metaDesc: `List your addiction treatment facility in ${cityName} on RehabLookup. Reach patients searching for rehab centers in your area. Free and paid listing options available.`,
    h1: title,
    content: `
      <p>Add your addiction treatment facility in ${cityName} to RehabLookup's verified provider directory. Thousands of patients and families search for rehab centers in ${cityName} every month.</p>
      <h2>Why List on RehabLookup?</h2>
      <p>RehabLookup is one of the most trusted addiction treatment directories in the United States. Our platform helps patients find accredited, licensed facilities that match their needs, insurance, and location.</p>
      <h2>How to Get Listed</h2>
      <p>Complete our provider application to have your facility reviewed and listed in our directory. We verify all facilities for state licensure and accreditation before listing.</p>
      <p><a href="/provider-signup">Apply to List Your Facility</a> &middot; <a href="/provider-resources">Provider Resources</a></p>`,
    breadcrumbs: [
      { name: "Home", url: "/" },
      { name: "For Providers", url: "/provider-resources" },
      { name: `List in ${cityName}`, url: urlPath },
    ],
  };
}

// Generic fallback for any unmatched pattern
function genericPage(urlPath) {
  const parts = urlPath.replace(/^\//, "").split("/");
  const title = slugToName(parts[parts.length - 1] || parts[0]);
  const parentTitle = parts.length > 1 ? slugToName(parts[0]) : "Home";
  const parentUrl = parts.length > 1 ? `/${parts[0]}` : "/";
  return {
    title,
    metaTitle: `${title} — RehabLookup`,
    metaDesc: `Find addiction treatment resources and rehab centers. RehabLookup helps you find accredited facilities, verify insurance, and start recovery.`,
    h1: title,
    content: `
      <p>Find addiction treatment resources and rehab centers on RehabLookup. Our verified directory covers accredited facilities across all 50 states.</p>
      <p><a href="/rehab-centers">Browse All Treatment Centers</a> &middot; <a href="/resources">Recovery Resources</a></p>`,
    breadcrumbs: [
      { name: "Home", url: "/" },
      { name: parentTitle, url: parentUrl },
      { name: title, url: urlPath },
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Route classifier
// ─────────────────────────────────────────────────────────────────────────────
function classifyAndBuildPage(urlPath) {
  const parts = urlPath.replace(/^\//, "").split("/");
  const p0 = parts[0] || "";
  const p1 = parts[1] || "";
  const p2 = parts[2] || "";
  const p3 = parts[3] || "";
  const p4 = parts[4] || "";
  const p5 = parts[5] || "";
  const depth = parts.length;

  // Near-me patterns
  if (p0.endsWith("-near-me") || p0 === "rehab-near-me") {
    if (depth === 1) return null; // already generated by generate-seo-html
    if (depth === 2) return nearMeStatePage(urlPath);
    if (depth === 3) return nearMeCityPage(urlPath);
  }

  // Insurance patterns
  if (p0 === "insurance") {
    if (depth === 2) return null; // already generated by generate-missing-html
    if (depth === 3) return insuranceStatePage(urlPath);
    if (depth === 4 && p3 !== "county") return insuranceCityPage(urlPath);
    if (depth === 5 && p3 === "county") return insuranceCountyPage(urlPath);
  }

  // Rehab-marketing patterns
  if (p0 === "rehab-marketing") {
    if (depth === 3 && p2 !== "county") return rehabMarketingStateTreatmentPage(urlPath);
    if (depth === 4 && p2 === "county") return rehabMarketingCountyPage(urlPath);
    if (depth === 5 && p2 === "county" && p4 !== "insurance") return rehabMarketingCountyTreatmentPage(urlPath);
    if (depth === 6 && p2 === "county" && p4 === "insurance") return rehabMarketingCountyInsurancePage(urlPath);
  }

  // Rehab-centers patterns
  if (p0 === "rehab-centers") {
    if (depth === 2) return null; // already generated by generate-seo-html
    if (depth === 3 && p2 !== "county") return rehabCentersCityPage(urlPath);
    if (depth === 4 && p2 === "county") return rehabCentersCountyPage(urlPath);
    if (depth === 5 && p2 === "county") return rehabCentersCountyTreatmentPage(urlPath);
  }

  // Substance/demographic/duration state pages: /{type-slug}/{state}
  const substanceTypes = [
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
  ];
  if (substanceTypes.includes(p0) && depth === 2) {
    return substanceStatePage(urlPath);
  }

  // List-your-facility city pages
  if (p0.startsWith("list-your-facility-in-")) {
    return listYourFacilityPage(urlPath);
  }

  // Fallback
  return genericPage(urlPath);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log("=".repeat(70));
  console.log("generate-all-missing-html.mjs — Generating missing pre-rendered pages");
  console.log("=".repeat(70));

  // Check if xml2js is available, install if not
  try {
    await import("xml2js");
  } catch {
    console.log("Installing xml2js...");
    const { execSync } = await import("child_process");
    execSync("npm install xml2js --no-save", { stdio: "inherit" });
  }

  console.log("\nLoading sitemap URLs...");
  const allUrls = await loadSitemapUrls();
  console.log(`  Total sitemap URLs: ${allUrls.size.toLocaleString()}`);

  const missing = [...allUrls].filter((u) => !hasHtmlFile(u));
  console.log(`  Already have HTML: ${(allUrls.size - missing.length).toLocaleString()}`);
  console.log(`  Need to generate: ${missing.length.toLocaleString()}`);
  console.log();

  let processed = 0;
  const startTime = Date.now();

  for (const urlPath of missing) {
    const pageData = classifyAndBuildPage(urlPath);
    if (!pageData) {
      skipped++;
      continue;
    }
    await writePage(urlPath, pageData);
    processed++;
    if (processed % 500 === 0) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`  Progress: ${processed.toLocaleString()} / ${missing.length.toLocaleString()} (${elapsed}s)`);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log();
  console.log("=".repeat(70));
  console.log(`COMPLETE in ${elapsed}s`);
  console.log(`  Generated: ${generated.toLocaleString()} new pages`);
  console.log(`  Skipped (already exist): ${skipped.toLocaleString()}`);
  console.log(`  Errors: ${errors}`);
  console.log("=".repeat(70));
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});

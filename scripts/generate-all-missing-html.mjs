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

import { writeFile, mkdir, access, unlink } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseStringPromise } from "xml2js";
import { readFile } from "node:fs/promises";
import { GA_MEASUREMENT_ID } from "./_ga.mjs";
import { seoStyles, seoHeader, seoCtaStrip, seoFooter } from "./_seo-page-shell.mjs";
// Per-state fact renderers already used by five other generators. This
// generator emits the largest families in the corpus and was the only
// major one not drawing on them, which is most of why its pages were
// interchangeable.
import {
  renderStateFactBox,
  renderStateSignature,
  renderLicensingBox,
  renderMetrosLine,
  getStateStatsBySlug,
} from "./_unique-content.mjs";
// The carrier axis: /insurance/* pages had a name and nothing else to
// say about the insurer, so 7,527 of them reduced to 29 distinct bodies.
import {
  buildInsuranceCityContent,
  buildInsuranceCountyContent,
  renderInsuranceCityHtml,
} from "../src/lib/seo/insuranceContent.mjs";
// Operator-facing market intelligence for /rehab-marketing/*: 6,653 pages
// that had only a state name and a treatment name to vary on.
import { buildProviderMarketContent } from "../src/lib/seo/providerMarketContent.mjs";
import { PAYER_SLUGS } from "../src/lib/seo/levelOfCareProfiles.mjs";
import { buildStateArticleContent, stateArticleKind } from "../src/lib/seo/stateArticleContent.mjs";
import { countyLabel, ordinal, titleCaseSlug } from "../src/lib/seo/textCase.mjs";
import { buildCityIndex } from "../src/lib/seo/cityProfiles.mjs";
import { buildCityTreatmentContent } from "../src/lib/seo/cityTreatmentContent.mjs";
import { countySupplement } from "../src/lib/seo/countySupplementalFacts.mjs";
// The topic axis for the 58 near-me families. Twenty-one of them ran ~420
// pages on TWO distinct bodies, because a "methadone clinic" page and a
// "sober living" page differed only by a noun.
import { buildNearMeContent, nearMeSlugForTreatment } from "../src/lib/seo/nearMeTopics.mjs";
import { renderComposedHtml } from "../src/lib/seo/composedHtml.mjs";
import { getStateLicensing } from "./_unique-content.mjs";

/**
 * County facts, indexed as "<stateSlug>/<countySlug>".
 *
 * Direct TS import under `--experimental-strip-types`, matching what
 * `generate-county-pages.mjs` already does against the same file in the
 * same build. Only the FACTS are read here — name, seat, population,
 * major cities. `countySeoData`'s prose fields are one template per
 * county and are deliberately not propagated; see the note in
 * `src/lib/seo/insuranceContent.mjs`.
 */
const COUNTY_INDEX = new Map();
let STATE_COUNTY_DATA = [];
try {
  const { stateCountyData } = await import("../src/data/countySeoData.ts");
  STATE_COUNTY_DATA = stateCountyData ?? [];
  for (const state of stateCountyData ?? []) {
    for (const county of state.counties ?? []) {
      COUNTY_INDEX.set(`${state.stateSlug}/${county.slug}`, county);
    }
  }
} catch (err) {
  // Fail loudly rather than silently regenerating 6,704 county pages
  // without the facts that make them distinct.
  console.error("✗ could not load countySeoData for county page facts:", err?.message ?? err);
  process.exit(1);
}

function lookupCounty(stateSlug, countySlug) {
  const full = COUNTY_INDEX.get(`${stateSlug}/${countySlug}`);
  if (full) return full;

  // 156 of the 621 published county slugs have no countySeoData entry,
  // which is why every remaining duplicate cluster in the corpus was a
  // county page. The supplement carries what can be stated confidently —
  // which population centers sit in the county, and where county
  // government is absent or limited — and deliberately no population,
  // because that would have to be estimated. Callers already omit the
  // population sentence when there is no number.
  const supplement = countySupplement(stateSlug, countySlug);
  if (!supplement) return null;
  return {
    name: supplement.name,
    slug: countySlug,
    seat: undefined,
    population: undefined,
    majorCities: supplement.majorCities ?? [],
    governance: supplement.governance,
    kind: supplement.kind,
  };
}

// City-level facts for the city-scoped families. Same reasoning as the
// county index: without it every city page in a state renders the same
// body. Fail loudly rather than regenerate thousands of pages without
// the axis that distinguishes them.
let CITY_INDEX;
let STATE_CITIES;
// Populated with the city index below; `resolvePlaceSlug` needs it and
// runs long after, but the index build happens at module load.
const STATE_SLUG_SET = new Set();
try {
  const { statesData } = await import("../src/data/locationSeoData.ts");
  CITY_INDEX = buildCityIndex({ statesData, stateCountyData: STATE_COUNTY_DATA });
  STATE_CITIES = new Map(
    statesData.map((st) => [
      st.slug,
      (st.cities ?? []).map((c) => ({
        name: c.name,
        population: c.population,
        county: CITY_INDEX.get(c.slug)?.county?.name ?? null,
      })),
    ]),
  );
  for (const st of statesData) STATE_SLUG_SET.add(st.slug);
  if (CITY_INDEX.size === 0) throw new Error("city index is empty");
} catch (err) {
  console.error("\u2717 could not build the city profile index:", err?.message ?? err);
  process.exit(1);
}

function lookupCity(stateSlug, citySlug, cityName) {
  return (
    CITY_INDEX.get(citySlug) ??
    CITY_INDEX.get(`${stateSlug}|${String(cityName ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "")}`) ??
    null
  );
}

// Block this generator from writing static HTML at any path that vercel.json
// already 301-redirects. The competing file would otherwise win Vercel's
// filesystem-match before the redirect fires, and Google would index the
// redirect-source URL with a self-canonical instead of consolidating signal
// onto the canonical target. See scripts/generate-missing-html.mjs for the
// same guard rationale.
const REDIRECT_SOURCES = (() => {
  try {
    const vc = JSON.parse(
      readFileSync(path.resolve(fileURLToPath(import.meta.url), "../../vercel.json"), "utf8"),
    );
    const set = new Set();
    for (const r of vc.redirects || []) {
      if (r.source && !r.source.includes(":") && !r.source.includes("*")) {
        set.add(r.source);
      }
    }
    return set;
  } catch {
    return new Set();
  }
})();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "../public");
const BASE_URL = "https://rehablookup.com";
const FORCE = process.argv.includes("--force");
const ONLY = (process.argv.find((a) => a.startsWith("--only=")) ?? "").split("=").slice(1).join("=") || "";

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
  ${seoStyles()}
  <script async src="https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_MEASUREMENT_ID}',{send_page_view:true});</script>
</head>
<body>
  ${seoHeader()}
  <main class="rl-main">
    <div class="rl-container">
      ${bcHtml ? `<nav class="breadcrumbs" aria-label="Breadcrumb"><ul>${bcHtml}</ul></nav>` : ""}
      <h1>${escHtml(h1 || title)}</h1>
      ${content}
      ${seoCtaStrip()}
    </div>
  </main>
  ${seoFooter()}
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Write page (single flat .html — Vercel cleanUrls serves it at /path).
// Previously also emitted /path/index.html as a soft-404 guard but Google
// was treating both URL forms as duplicates; see generate-seo-html.mjs.
// ─────────────────────────────────────────────────────────────────────────────
async function writePage(urlPath, pageData) {
  const htmlContent = buildHtml({ urlPath, ...pageData });
  const flatPath = path.join(publicDir, urlPath.replace(/^\//, "") + ".html");

  // Guard: never write a static file at a URL that has a vercel.json 301.
  // Delete any stale copy from prior builds so the redirect can fire.
  if (REDIRECT_SOURCES.has(urlPath)) {
    if (existsSync(flatPath)) {
      try { await unlink(flatPath); } catch { /* ignore */ }
    }
    skipped++;
    return;
  }

  // Skip if already exists and not forcing
  if (!FORCE && existsSync(flatPath)) {
    skipped++;
    return;
  }

  try {
    await mkdir(path.dirname(flatPath), { recursive: true });
    await writeFile(flatPath, htmlContent, "utf8");
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
          // PATH-FAMILY OWNERSHIP (SEO Phase 1): /center/ belongs exclusively to
          // generate-facility-profiles-html.mjs, which writes one profile per
          // row in `public_facilities` and PRUNES every mirror that is no longer
          // in that set. This generator runs after it and creates a page for any
          // sitemap URL lacking a file — including, from a stale committed
          // sitemap, facilities the prune had just correctly removed. That is
          // how a profile for a facility absent from the database entirely
          // (clearpath-recovery-center-dallas-texas) stayed live in production.
          // A generic fallback page for a facility is also wrong on its own
          // terms: it has no facility data in it.
          if (p.startsWith("/center/")) continue;
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
  // Topic axis + real place facts. See src/lib/seo/nearMeTopics.mjs.
  const nstats = getStateStatsBySlug(stateSlug);
  const nlic = getStateLicensing(stateSlug);
  const nearMe = buildNearMeContent({ topicSlug: nearMeSlug, topicLabel: toTitleCase(nearMeSlug.replace(/-near-me$/, '')), stateName, stats: nstats, licensing: nlic });

  return {
    title,
    metaTitle: `${title} — Find Local Treatment | RehabLookup`,
    metaDesc: `Find ${nearMeName} near you in ${stateName}. Compare addiction treatment facility listings. Verify insurance and get help today.`,
    h1: title,
    content: `
      ${renderComposedHtml(nearMe)}
      <p>Find accredited ${nearMeName.toLowerCase()} programs in ${stateName}. RehabLookup's directory covers facilities across every county in ${stateName}, with detailed information on treatment approaches, insurance acceptance, and amenities.</p>
      <h2>How to Find Treatment in ${stateName}</h2>
      <p>Use our search tool to filter by city, zip code, insurance provider, and treatment type. Listings show state licensure and accreditation details when a facility reports them. Confirm current licensing with the facility or the issuing state authority.</p>
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
  // Topic axis + real place facts. See src/lib/seo/nearMeTopics.mjs.
  const nstats = getStateStatsBySlug(stateSlug);
  const nlic = getStateLicensing(stateSlug);
  const nearMe = buildNearMeContent({ topicSlug: nearMeSlug, topicLabel: toTitleCase(nearMeSlug.replace(/-near-me$/, '')), stateName, stats: nstats, licensing: nlic, placeName: cityName });

  return {
    title,
    metaTitle: `${title} — Local Treatment Centers | RehabLookup`,
    metaDesc: `Find ${nearMeName.toLowerCase()} programs in ${cityName}, ${stateName}. Compare accredited local facilities, verify insurance, and get help today.`,
    h1: title,
    content: `
      ${renderComposedHtml(nearMe)}
      <p>Find accredited ${nearMeName.toLowerCase()} programs in ${cityName}, ${stateName}. Our directory includes facility listings with information on treatment programs, insurance acceptance and amenities as reported by each facility.</p>
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

  // Statewide scope: the carrier axis plus this state's own posture. No
  // city or county is named, so the composer is called without them.
  const stats = getStateStatsBySlug(stateSlug);
  const composed = buildInsuranceCityContent({
    insurerSlug: providerSlug,
    insurerName: providerName,
    cityName: stateName,
    stateName,
    stateAbbr: stats?.abbr,
    medicaidExpanded: stats?.medicaidExpanded,
    notableInfo: stats?.signatureNote,
    primaryMetro: stats?.primaryMetro,
    secondaryMetros: stats?.secondaryMetros,
  });

  return {
    title,
    metaTitle: `${title} — Find In-Network Treatment | RehabLookup`,
    metaDesc: composed.metaDescription,
    h1: title,
    content: `
      ${renderInsuranceCityHtml(composed)}
      ${renderStateFactBox(stateName, stateSlug)}
      ${renderMetrosLine(stateName, stateSlug)}
      ${renderLicensingBox(stateName, stateSlug)}
      ${renderStateSignature(stateName, stateSlug)}
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

  // Three independent real axes instead of one template with three
  // substitutions: the carrier's own structure and verification route,
  // this state's Medicaid posture / regulator / signature note, and the
  // city itself. See src/lib/seo/insuranceContent.mjs.
  const stats = getStateStatsBySlug(stateSlug);
  const composed = buildInsuranceCityContent({
    insurerSlug: providerSlug,
    insurerName: providerName,
    cityName,
    stateName,
    stateAbbr: stats?.abbr,
    medicaidExpanded: stats?.medicaidExpanded,
    notableInfo: stats?.signatureNote,
    primaryMetro: stats?.primaryMetro,
    secondaryMetros: stats?.secondaryMetros,
  });

  return {
    title,
    metaTitle: `${title} — In-Network Treatment | RehabLookup`,
    metaDesc: composed.metaDescription,
    h1: title,
    content: `
      ${renderInsuranceCityHtml(composed)}
      ${renderStateFactBox(stateName, stateSlug)}
      ${renderLicensingBox(stateName, stateSlug)}
      ${renderStateSignature(stateName, stateSlug)}
      <p><a href="/insurance/${providerSlug}/${stateSlug}">All ${providerName} Centers in ${stateName}</a> &middot; <a href="/rehab-centers/${stateSlug}/${citySlug}">Rehab Centers in ${cityName}</a> &middot; <a href="/rehab-centers/${stateSlug}">All Rehab Centers in ${stateName}</a></p>`,
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
  const countyName = countyScopeLabel(stateSlug, countySlug);
  const title = `${providerName} Rehab Coverage in ${countyName}, ${stateName}`;

  // The largest sub-family in the corpus (6,704 pages). Composed from the
  // carrier axis, this state's posture, and the county's OWN facts — seat,
  // population and major cities — rather than a name substitution.
  const stats = getStateStatsBySlug(stateSlug);
  const county = lookupCounty(stateSlug, countySlug);
  const composed = buildInsuranceCountyContent({
    insurerSlug: providerSlug,
    insurerName: providerName,
    countyName: slugToName(countySlug),
    countySeat: county?.seat,
    countyPopulation: county?.population,
    majorCities: county?.majorCities, countyGovernance: county?.governance,
    stateName,
    stateAbbr: stats?.abbr,
    medicaidExpanded: stats?.medicaidExpanded,
    notableInfo: stats?.signatureNote,
  });

  return {
    title,
    metaTitle: `${title} — In-Network Treatment | RehabLookup`,
    metaDesc: composed.metaDescription,
    h1: title,
    content: `
      ${renderInsuranceCityHtml(composed)}
      ${renderStateFactBox(stateName, stateSlug)}
      ${renderLicensingBox(stateName, stateSlug)}
      ${renderStateSignature(stateName, stateSlug)}
      <p><a href="/insurance/${providerSlug}/${stateSlug}">All ${providerName} Centers in ${stateName}</a> &middot; <a href="/rehab-centers/${stateSlug}/county/${countySlug}">Rehab Centers in ${countyName}</a> &middot; <a href="/rehab-centers/${stateSlug}">All Rehab Centers in ${stateName}</a></p>`,
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
// The /rehab-marketing county pages publish fourteen variants: eight
// levels of care and six payers. `slugToName` renders both as Title
// Case, which turned IOP into "Iop" and MAT into "Mat" on every one of
// them, and routed the payer slugs through the level-of-care path where
// they picked up no carrier facts at all.
const TREATMENT_ACRONYMS = { iop: "IOP", php: "PHP", mat: "MAT" };

function treatmentLabel(slug) {
  return TREATMENT_ACRONYMS[slug] ?? slugToName(slug);
}

/** Payer slug → the insurer-profile key, which spells some of them
 *  differently (blue-cross is published as bcbs-treatment). Returns null
 *  for anything that is a level of care rather than a payer. */
const PAYER_PROFILE_SLUG = {
  "blue-cross": "bcbs-treatment",
  "united-healthcare": "united-healthcare-rehab",
  aetna: "aetna-rehab",
  cigna: "cigna-rehab",
  medicaid: "medicaid-rehab",
  medicare: "medicare-rehab",
  humana: "humana-rehab",
  tricare: "tricare-rehab",
};

function payerProfileSlug(slug) {
  return PAYER_SLUGS.has(slug) ? PAYER_PROFILE_SLUG[slug] ?? `${slug}-rehab` : null;
}

/** The market-composer arguments for a /rehab-marketing variant: a level
 *  of care gets the level axis, a payer gets the carrier axis, and
 *  neither gets both. */
function marketAxisFor(slug) {
  const payer = payerProfileSlug(slug);
  return payer
    ? { insurerSlug: payer, insurerName: treatmentLabel(slug) }
    : { levelSlug: slug };
}

function rehabMarketingStateTreatmentPage(urlPath) {
  const parts = urlPath.replace(/^\//, "").split("/");
  const stateSlug = parts[1];
  const treatmentSlug = parts[2];
  const stateName = slugToName(stateSlug);
  const treatmentName = treatmentLabel(treatmentSlug);
  const title = `${treatmentName} Programs in ${stateName}`;
  // Market intelligence for operators, composed from real per-state
  // and per-county data. Added ABOVE the existing provider truth copy
  // (organic position never sold, Featured labelled sponsored), which
  // earlier phases established and which is preserved verbatim below.
  const mstats = getStateStatsBySlug(stateSlug);
  const mlic = getStateLicensing(stateSlug);
  const market = buildProviderMarketContent({ stateName, stats: mstats, licensing: mlic, treatmentName, ...marketAxisFor(treatmentSlug) });

  return {
    title,
    metaTitle: `${title} — Find Accredited Centers | RehabLookup`,
    metaDesc: `Find accredited ${treatmentName.toLowerCase()} programs in ${stateName}. Compare facility listings, check insurance, and contact facilities directly.`,
    h1: title,
    content: `
      ${renderComposedHtml(market)}
      <p>Find accredited ${treatmentName.toLowerCase()} programs in ${stateName}. RehabLookup's directory covers facilities across all counties in ${stateName}.</p>
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
// Provider-side marketing page. Distinct title + body from the seeker-side
// directory at /rehab-centers/{state}/county/{county} so the two URLs don't
// collide as "duplicate without canonical" in GSC.
function rehabMarketingCountyPage(urlPath) {
  const parts = urlPath.replace(/^\//, "").split("/");
  const stateSlug = parts[1];
  const countySlug = parts[3];
  const stateName = slugToName(stateSlug);
  const countyName = countyScopeLabel(stateSlug, countySlug);
  const title = `Reach Patients in ${countyName}, ${stateName}`;
  // Market intelligence for operators, composed from real per-state
  // and per-county data. Added ABOVE the existing provider truth copy
  // (organic position never sold, Featured labelled sponsored), which
  // earlier phases established and which is preserved verbatim below.
  const mstats = getStateStatsBySlug(stateSlug);
  const mlic = getStateLicensing(stateSlug);
  const market = buildProviderMarketContent({ stateName, stats: mstats, licensing: mlic, countyName: slugToName(countySlug), countySeat: lookupCounty(stateSlug, countySlug)?.seat, countyPopulation: lookupCounty(stateSlug, countySlug)?.population, majorCities: lookupCounty(stateSlug, countySlug)?.majorCities, countyGovernance: lookupCounty(stateSlug, countySlug)?.governance });

  return {
    title,
    metaTitle: `${title} — Rehab Marketing | RehabLookup for Providers`,
    metaDesc: `List your rehab in ${countyName}, ${stateName} on RehabLookup. Families searching for treatment in your county can find and contact you directly.`,
    h1: `Rehab Marketing in ${countyName}, ${stateName}`,
    content: `
      ${renderComposedHtml(market)}
      <p>RehabLookup lists treatment providers so families searching for addiction care can find and contact them directly. A claimed directory listing, geo-targeted visibility, and direct family inquiries.</p>
      <h2>Why ${countyName} Treatment Providers List With Us</h2>
      <p>RehabLookup is a directory, not a lead broker. Organic directory position is determined independently and is never purchased. Providers in ${countyName} reach families searching specifically for treatment in their service area.</p>
      <h2>How It Works for ${countyName} Facilities</h2>
      <p>Claim your free listing to keep your facility's directory information current. Pro enhances the profile and unlocks provider tools such as listing analytics; Featured is separately purchased, clearly labeled sponsored exposure. Organic position is never sold, and verification is earned independently of payment.</p>
      <p><a href="/for-providers">List Your Facility</a> &middot; <a href="/rehab-centers/${stateSlug}/county/${countySlug}">${countyName} Directory (Seeker View)</a> &middot; <a href="/rehab-marketing">All Provider Markets</a></p>`,
    breadcrumbs: [
      { name: "Home", url: "/" },
      { name: "For Providers", url: "/for-providers" },
      { name: stateName, url: `/rehab-marketing/${stateSlug}` },
      { name: countyName, url: urlPath },
    ],
  };
}

// Rehab-marketing county/treatment: /rehab-marketing/{state}/county/{county}/{treatment}
// Provider marketing page for a specific treatment vertical in a county.
function rehabMarketingCountyTreatmentPage(urlPath) {
  const parts = urlPath.replace(/^\//, "").split("/");
  const stateSlug = parts[1];
  const countySlug = parts[3];
  const treatmentSlug = parts[4];
  const stateName = slugToName(stateSlug);
  const countyName = countyScopeLabel(stateSlug, countySlug);
  const treatmentName = treatmentLabel(treatmentSlug);
  const title = `Get More ${treatmentName} Patients in ${countyName}, ${stateName}`;
  // Market intelligence for operators, composed from real per-state
  // and per-county data. Added ABOVE the existing provider truth copy
  // (organic position never sold, Featured labelled sponsored), which
  // earlier phases established and which is preserved verbatim below.
  const mstats = getStateStatsBySlug(stateSlug);
  const mlic = getStateLicensing(stateSlug);
  const county = lookupCounty(stateSlug, countySlug);
  const market = buildProviderMarketContent({ stateName, stats: mstats, licensing: mlic, treatmentName, ...marketAxisFor(treatmentSlug), countyName: slugToName(countySlug), countySeat: county?.seat, countyPopulation: county?.population, majorCities: county?.majorCities, countyGovernance: county?.governance });

  return {
    title,
    metaTitle: `${title} — Rehab Marketing | RehabLookup for Providers`,
    metaDesc: `${treatmentName} providers in ${countyName}, ${stateName} — claim your free directory listing. Families contact your facility directly, and organic position is never sold.`,
    h1: `${treatmentName} Marketing in ${countyName}, ${stateName}`,
    content: `
      ${renderComposedHtml(market)}
      <p>${treatmentName} providers serving ${countyName}, ${stateName} reach more families through RehabLookup. A claimed directory listing, geo-targeted visibility for ${treatmentName.toLowerCase()} searches, and direct family inquiries.</p>
      <h2>Why ${treatmentName} Providers in ${countyName} List With Us</h2>
      <p>Organic directory position is determined independently and is never purchased. Pro enhances the facility profile and unlocks provider tools such as listing analytics; Featured is a separately purchased, clearly labeled sponsored placement.</p>
      <h2>Get Started</h2>
      <p><a href="/for-providers">List Your ${treatmentName} Facility</a> &middot; <a href="/rehab-centers/${stateSlug}/county/${countySlug}/${treatmentSlug}">${countyName} ${treatmentName} Directory</a> &middot; <a href="/rehab-marketing/${stateSlug}/county/${countySlug}">All ${countyName} Provider Markets</a></p>`,
    breadcrumbs: [
      { name: "Home", url: "/" },
      { name: "For Providers", url: "/for-providers" },
      { name: stateName, url: `/rehab-marketing/${stateSlug}` },
      { name: countyName, url: `/rehab-marketing/${stateSlug}/county/${countySlug}` },
      { name: treatmentName, url: urlPath },
    ],
  };
}

// Rehab-marketing county/insurance: /rehab-marketing/{state}/county/{county}/insurance/{ins}
// Provider marketing page for an insurance carrier in a county.
function rehabMarketingCountyInsurancePage(urlPath) {
  const parts = urlPath.replace(/^\//, "").split("/");
  const stateSlug = parts[1];
  const countySlug = parts[3];
  const insSlug = parts[5];
  const stateName = slugToName(stateSlug);
  const countyName = countyScopeLabel(stateSlug, countySlug);
  const insName = slugToName(insSlug);
  const title = `Reach ${insName} Patients in ${countyName}, ${stateName}`;
  // Market intelligence for operators, composed from real per-state
  // and per-county data. Added ABOVE the existing provider truth copy
  // (organic position never sold, Featured labelled sponsored), which
  // earlier phases established and which is preserved verbatim below.
  const mstats = getStateStatsBySlug(stateSlug);
  const mlic = getStateLicensing(stateSlug);
  const market = buildProviderMarketContent({ stateName, stats: mstats, licensing: mlic, insurerSlug: `${insSlug}-rehab`, insurerName: insName, countyName: slugToName(countySlug), countySeat: lookupCounty(stateSlug, countySlug)?.seat, countyPopulation: lookupCounty(stateSlug, countySlug)?.population, majorCities: lookupCounty(stateSlug, countySlug)?.majorCities, countyGovernance: lookupCounty(stateSlug, countySlug)?.governance });

  return {
    title,
    metaTitle: `${title} — Rehab Marketing | RehabLookup for Providers`,
    metaDesc: `${insName}-accepting rehab providers in ${countyName}, ${stateName} — claim your free directory listing. Inquiries come directly from families searching for in-network ${insName} treatment.`,
    h1: `${insName} Patient Marketing in ${countyName}, ${stateName}`,
    content: `
      ${renderComposedHtml(market)}
      <p>${insName}-accepting providers in ${countyName}, ${stateName} reach more in-network patients through RehabLookup. Geo-targeted visibility on the directory pages families use to find ${insName}-covered addiction treatment.</p>
      <h2>Why ${insName}-Accepting Providers in ${countyName} List With Us</h2>
      <p>Organic directory position is determined independently and is never purchased. Pro enhances the facility profile — including the plans and network status a facility reports — and unlocks provider tools; Featured is a separately purchased, clearly labeled sponsored placement.</p>
      <h2>Get Started</h2>
      <p><a href="/for-providers">List Your Facility</a> &middot; <a href="/insurance/${insSlug}-rehab/${stateSlug}/county/${countySlug}">${countyName} ${insName} Directory</a> &middot; <a href="/rehab-marketing/${stateSlug}/county/${countySlug}">All ${countyName} Provider Markets</a></p>`,
    breadcrumbs: [
      { name: "Home", url: "/" },
      { name: "For Providers", url: "/for-providers" },
      { name: stateName, url: `/rehab-marketing/${stateSlug}` },
      { name: countyName, url: `/rehab-marketing/${stateSlug}/county/${countySlug}` },
      { name: insName, url: urlPath },
    ],
  };
}

// Rehab-centers county: /rehab-centers/{state}/county/{county}
// Rehab-marketing state hub: /rehab-marketing/{state}
// Fifty of these shipped as identical stubs carrying the SEEKER
// boilerplate — "Compare programs, verify insurance, and connect with
// treatment that fits your situation" — on a page for operators. They
// were reaching genericPage because no branch claimed depth 2.
function rehabMarketingStatePage(urlPath) {
  const stateSlug = urlPath.replace(/^\//, "").split("/")[1];
  const stateName = slugToName(stateSlug);
  const market = buildProviderMarketContent({
    stateName,
    stats: getStateStatsBySlug(stateSlug),
    licensing: getStateLicensing(stateSlug),
  });
  const title = `Rehab Marketing in ${stateName}`;

  return {
    title,
    metaTitle: `${title} — Provider Market Overview | RehabLookup`,
    metaDesc: market.metaDescription,
    h1: `${stateName} Treatment Market Overview for Providers`,
    content: `
      ${renderComposedHtml(market)}
      <h2>List your ${stateName} facility</h2>
      <p>Organic directory position is determined independently and is never purchased. Pro enhances the facility profile and unlocks provider tools; Featured is a separately purchased, clearly labeled sponsored placement.</p>
      <p><a href="/for-providers">List Your Facility</a> &middot; <a href="/rehab-marketing">Rehab Marketing Hub</a> &middot; <a href="/rehab-centers/${stateSlug}">${stateName} Treatment Directory</a></p>`,
    breadcrumbs: [
      { name: "Home", url: "/" },
      { name: "For Providers", url: "/for-providers" },
      { name: stateName, url: urlPath },
    ],
  };
}

// Rehab-marketing state/insurance: /rehab-marketing/{state}/insurance/{payer}
// Also unclaimed, so all six payers in a state rendered the same body.
function rehabMarketingStateInsurancePage(urlPath) {
  const parts = urlPath.replace(/^\//, "").split("/");
  const stateSlug = parts[1];
  const payerSlug = parts[3];
  const stateName = slugToName(stateSlug);
  const payerName = treatmentLabel(payerSlug);
  const market = buildProviderMarketContent({
    stateName,
    stats: getStateStatsBySlug(stateSlug),
    licensing: getStateLicensing(stateSlug),
    ...marketAxisFor(payerSlug),
  });
  const title = `Reach ${payerName} Patients in ${stateName}`;

  return {
    title,
    metaTitle: `${title} — Rehab Marketing | RehabLookup for Providers`,
    metaDesc: `${payerName}-accepting rehab providers in ${stateName} — market conditions, payer mix and licensing, plus a free directory listing.`,
    h1: `${payerName} Patient Marketing in ${stateName}`,
    content: `
      ${renderComposedHtml(market)}
      <h2>Why ${payerName}-accepting providers list with us</h2>
      <p>Organic directory position is determined independently and is never purchased. Pro enhances the facility profile — including the plans and network status a facility reports — and unlocks provider tools; Featured is a separately purchased, clearly labeled sponsored placement.</p>
      <p><a href="/for-providers">List Your Facility</a> &middot; <a href="/rehab-marketing/${stateSlug}">All ${stateName} Provider Markets</a></p>`,
    breadcrumbs: [
      { name: "Home", url: "/" },
      { name: "For Providers", url: "/for-providers" },
      { name: stateName, url: `/rehab-marketing/${stateSlug}` },
      { name: payerName, url: urlPath },
    ],
  };
}

// Rehab-centers state article: /rehab-centers/{state}/articles/{slug}
// Three articles across fifty states, previously three identical bodies
// with the state name swapped — on the three questions people most often
// type. See src/lib/seo/stateArticleContent.mjs for why the cost article
// publishes no price.
function rehabCentersArticlePage(urlPath) {
  const parts = urlPath.replace(/^\//, "").split("/");
  const stateSlug = parts[1];
  const articleSlug = parts[3];
  const stateName = slugToName(stateSlug);
  const kind = stateArticleKind(articleSlug);
  if (!kind) return null;

  const article = buildStateArticleContent({
    kind,
    stateName,
    stats: getStateStatsBySlug(stateSlug),
    licensing: getStateLicensing(stateSlug),
    cities: STATE_CITIES.get(stateSlug) ?? [],
  });
  if (!article) return null;

  // titleCaseSlug rather than toTitleCase: the latter capitalises every
  // word, which shipped "Cost Of Rehab In Ohio" as an <h1>.
  const title = titleCaseSlug(articleSlug);
  return {
    title,
    metaTitle: `${title} | RehabLookup`,
    metaDesc: article.metaDescription,
    h1: title,
    content: `
      ${renderComposedHtml(article)}
      <p><a href="/rehab-centers/${stateSlug}">All Treatment Centers in ${stateName}</a> &middot; <a href="/rehab-centers">Browse All States</a></p>`,
    breadcrumbs: [
      { name: "Home", url: "/" },
      { name: "Rehab Centers", url: "/rehab-centers" },
      { name: stateName, url: `/rehab-centers/${stateSlug}` },
      { name: title, url: urlPath },
    ],
  };
}

function rehabCentersCountyPage(urlPath) {
  const parts = urlPath.replace(/^\//, "").split("/");
  const stateSlug = parts[1];
  const countySlug = parts[3];
  const stateName = slugToName(stateSlug);
  const countyName = countyScopeLabel(stateSlug, countySlug);
  const title = `Rehab Centers in ${countyName}, ${stateName}`;
  // Topic axis (where the URL names a service) plus real place facts.
  const dstats = getStateStatsBySlug(stateSlug);
  const dlic = getStateLicensing(stateSlug);
  const dir = buildNearMeContent({ topicSlug: 'rehab-near-me', topicLabel: 'Addiction treatment', stateName, stats: dstats, licensing: dlic, placeName: countyName, countySeat: lookupCounty(stateSlug, countySlug)?.seat, placePopulation: lookupCounty(stateSlug, countySlug)?.population, majorCities: lookupCounty(stateSlug, countySlug)?.majorCities, countyGovernance: lookupCounty(stateSlug, countySlug)?.governance });

  return {
    title,
    metaTitle: `${title} — Find Treatment | RehabLookup`,
    metaDesc: `Find accredited rehab centers in ${countyName}, ${stateName}. Compare addiction treatment listings, check insurance, and contact facilities directly.`,
    h1: title,
    content: `
      ${renderComposedHtml(dir)}
      <p>Find accredited addiction treatment centers in ${countyName}, ${stateName}. Our directory lists facilities in the county offering detox, inpatient, and outpatient programs.</p>
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
  const countyName = countyScopeLabel(stateSlug, countySlug);
  const treatmentName = treatmentLabel(treatmentSlug);
  const title = `${treatmentName} in ${countyName}, ${stateName}`;
  // Topic axis (where the URL names a service) plus real place facts.
  const dstats = getStateStatsBySlug(stateSlug);
  const dlic = getStateLicensing(stateSlug);
  const dir = buildNearMeContent({ topicSlug: nearMeSlugForTreatment(treatmentSlug) ?? 'rehab-near-me', topicLabel: treatmentName, stateName, stats: dstats, licensing: dlic, placeName: countyName, countySeat: lookupCounty(stateSlug, countySlug)?.seat, placePopulation: lookupCounty(stateSlug, countySlug)?.population, majorCities: lookupCounty(stateSlug, countySlug)?.majorCities, countyGovernance: lookupCounty(stateSlug, countySlug)?.governance });

  return {
    title,
    metaTitle: `${title} — Find Accredited Centers | RehabLookup`,
    metaDesc: `Find accredited ${treatmentName.toLowerCase()} programs in ${countyName}, ${stateName}. Compare facility listings and check insurance coverage.`,
    h1: title,
    content: `
      ${renderComposedHtml(dir)}
      <p>Find accredited ${treatmentName.toLowerCase()} programs in ${countyName}, ${stateName}. Our directory includes listings for facilities offering evidence-based addiction treatment.</p>
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
  // Topic axis (where the URL names a service) plus real place facts.
  const dstats = getStateStatsBySlug(stateSlug);
  const dlic = getStateLicensing(stateSlug);
  const dir = buildNearMeContent({ topicSlug: 'rehab-near-me', topicLabel: 'Addiction treatment', stateName, stats: dstats, licensing: dlic, placeName: cityName });
  // City-level facts. Without these every city in a state renders the
  // same body, which is what put 26 Georgia cities in one cluster.
  const cityProfile = lookupCity(stateSlug, citySlug, cityName);
  const cityBlock = cityProfile
    ? renderComposedHtml(buildCityTreatmentContent({ profile: cityProfile, treatmentLabel: "Addiction treatment", treatmentSlug: "rehab" }))
    : "";

  return {
    title,
    metaTitle: `${title} — Find Treatment | RehabLookup`,
    metaDesc: `Find accredited rehab centers in ${cityName}, ${stateName}. Compare addiction treatment listings, check insurance, and contact facilities directly.`,
    h1: title,
    content: `
      ${cityBlock}
      ${renderComposedHtml(dir)}
      <p>Find accredited addiction treatment centers in ${cityName}, ${stateName}. Our directory lists facilities offering detox, inpatient, and outpatient programs.</p>
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
  // titleCaseSlug, not slugToName: the latter shipped
  // "Anxiety And Addiction Treatment" as an <h1>.
  const typeName = titleCaseSlug(typeSlug);
  const stateName = slugToName(stateSlug);
  const title = `${typeName} in ${stateName}`;
  // 42 of these families publish one page per state — 2,100 pages that
  // were all the same 234 words with two names swapped, and all under
  // the thin floor. The topic axis says what this treatment actually is;
  // the state axis carries the regulator, the payer posture and the
  // market picture.
  const topicSlug = nearMeSlugForTreatment(typeSlug) ?? "rehab-near-me";
  const composed = buildNearMeContent({
    topicSlug,
    topicLabel: typeName,
    stateName,
    stats: getStateStatsBySlug(stateSlug),
    licensing: getStateLicensing(stateSlug),
  });

  return {
    title,
    metaTitle: `${title} — Find Accredited Programs | RehabLookup`,
    metaDesc: composed.metaDescription,
    h1: title,
    content: `
      ${renderComposedHtml(composed)}
      <p><a href="/${typeSlug}">All ${typeName} Programs</a> &middot; <a href="/rehab-centers/${stateSlug}">All Rehab Centers in ${stateName}</a></p>`,
    breadcrumbs: [
      { name: "Home", url: "/" },
      { name: typeName, url: `/${typeSlug}` },
      { name: stateName, url: urlPath },
    ],
  };
}


// Near-me county page: /{near-me-slug}/{state}/county/{county}
function nearMeCountyPage(urlPath) {
  const parts = urlPath.replace(/^\//, "").split("/");
  const nearMeSlug = parts[0];
  const stateSlug = parts[1];
  const countySlug = parts[3];
  const nearMeName = slugToName(nearMeSlug.replace(/-near-me$/, "").replace(/-/g, " "));
  const stateName = slugToName(stateSlug);
  const countyName = countyScopeLabel(stateSlug, countySlug);
  const title = `${toTitleCase(nearMeSlug)} in ${countyName}, ${stateName}`;
  // Topic axis + real place facts. See src/lib/seo/nearMeTopics.mjs.
  const nstats = getStateStatsBySlug(stateSlug);
  const nlic = getStateLicensing(stateSlug);
  const nearMe = buildNearMeContent({ topicSlug: nearMeSlug, topicLabel: toTitleCase(nearMeSlug.replace(/-near-me$/, '')), stateName, stats: nstats, licensing: nlic, placeName: countyName, countySeat: lookupCounty(stateSlug, countySlug)?.seat, placePopulation: lookupCounty(stateSlug, countySlug)?.population, majorCities: lookupCounty(stateSlug, countySlug)?.majorCities, countyGovernance: lookupCounty(stateSlug, countySlug)?.governance });

  return {
    title,
    metaTitle: `${title} — Local Treatment Centers | RehabLookup`,
    metaDesc: `Find ${nearMeName.toLowerCase()} programs in ${countyName}, ${stateName}. Compare accredited local facilities, verify insurance, and get help today.`,
    h1: title,
    content: `
      ${renderComposedHtml(nearMe)}
      <p>Find accredited ${nearMeName.toLowerCase()} programs in ${countyName}, ${stateName}. Our directory includes facility listings with information on treatment programs, insurance acceptance and amenities as reported by each facility.</p>
      <h2>Treatment Options in ${countyName}</h2>
      <p>Facilities in ${countyName} offer a range of programs including medical detox, residential inpatient, partial hospitalization (PHP), intensive outpatient (IOP), and outpatient treatment.</p>
      <h2>Insurance Accepted in ${countyName}</h2>
      <p>Most rehab centers in ${countyName} accept major insurance plans. Use our free insurance verification tool to find in-network facilities.</p>
      <p><a href="/${nearMeSlug}/${stateSlug}">All ${toTitleCase(nearMeSlug)} in ${stateName}</a> &middot; <a href="/rehab-centers/${stateSlug}">All Rehab Centers in ${stateName}</a></p>`,
    breadcrumbs: [
      { name: "Home", url: "/" },
      { name: toTitleCase(nearMeSlug), url: `/${nearMeSlug}` },
      { name: stateName, url: `/${nearMeSlug}/${stateSlug}` },
      { name: countyName, url: urlPath },
    ],
  };
}

// Substance/demographic/duration city page: /{type-slug}/{state}/{city}
function substanceCityPage(urlPath) {
  const parts = urlPath.replace(/^\//, "").split("/");
  const typeSlug = parts[0];
  const stateSlug = parts[1];
  const citySlug = parts[2];
  // titleCaseSlug, not slugToName: the latter shipped
  // "Anxiety And Addiction Treatment" as an <h1>.
  const typeName = titleCaseSlug(typeSlug);
  const stateName = slugToName(stateSlug);
  const cityName = slugToName(citySlug);
  const title = `${typeName} in ${cityName}, ${stateName}`;
  const topicSlug = nearMeSlugForTreatment(typeSlug) ?? "rehab-near-me";
  const composed = buildNearMeContent({
    topicSlug,
    topicLabel: typeName,
    stateName,
    stats: getStateStatsBySlug(stateSlug),
    licensing: getStateLicensing(stateSlug),
    placeName: cityName,
  });
  const cityProfile = lookupCity(stateSlug, citySlug, cityName);
  const cityBlock = cityProfile
    ? renderComposedHtml(buildCityTreatmentContent({ profile: cityProfile, treatmentLabel: typeName, treatmentSlug: typeSlug }))
    : "";

  return {
    title,
    metaTitle: `${title} — Local Treatment Centers | RehabLookup`,
    metaDesc: composed.metaDescription,
    h1: title,
    content: `
      ${cityBlock}
      ${renderComposedHtml(composed)}
      <p><a href="/${typeSlug}/${stateSlug}">All ${typeName} in ${stateName}</a> &middot; <a href="/rehab-centers/${stateSlug}">All Rehab Centers in ${stateName}</a></p>`,
    breadcrumbs: [
      { name: "Home", url: "/" },
      { name: typeName, url: `/${typeSlug}` },
      { name: stateName, url: `/${typeSlug}/${stateSlug}` },
      { name: cityName, url: urlPath },
    ],
  };
}

// Generic fallback for any unmatched pattern. Builds a contextualized
// title from the path segments so deeply-nested URLs don't all share the
// same one-word title (e.g. /treatment-types/<rx>/<state> was rendering
// as just "<state> — RehabLookup" for every treatment vertical, which
// Google flagged as 'Duplicate without user-selected canonical' across
// all 50 states).
function genericPage(urlPath) {
  const parts = urlPath.replace(/^\//, "").split("/");
  let title = slugToName(parts[parts.length - 1] || parts[0]);
  if (parts.length >= 2) {
    // For /<topic>/<X>[/<Y>] URLs, prefix the leaf segment with the topic
    // so each combination has a distinct title. e.g.
    //   /treatment-types/alcohol-rehabilitation/alabama
    //     → "Alcohol Rehabilitation in Alabama"
    //   /treatment-types/alcohol-rehabilitation/california/san-jose
    //     → "Alcohol Rehabilitation in San Jose, California"
    const topic = slugToName(parts[parts.length === 2 ? 0 : 1]);
    if (parts.length === 2) {
      title = `${slugToName(parts[1])} — ${topic}`;
    } else if (parts.length === 3) {
      // 3-segment URLs under /treatment-types/ are state-level (e.g.
      // /treatment-types/dual-diagnosis-treatment/new-york). Differentiate
      // from city-level pages that share the same place name (NYC vs NY
      // State, etc.) by saying "Programs in <state>".
      const isTreatmentTypesState = parts[0] === "treatment-types";
      title = isTreatmentTypesState
        ? `${topic} Programs in ${slugToName(parts[2])}`
        : `${topic} in ${slugToName(parts[2])}`;
    } else if (parts.length >= 4) {
      const stateName = slugToName(parts[2]);
      const cityName = slugToName(parts[3]);
      title = `${topic} in ${cityName}, ${stateName}`;
    }
  }
  // Default to Home as the parent so the breadcrumb never points at a
  // segment that isn't a registered route (e.g. /center → Center isn't a
  // hub; facility profiles live under /rehab-centers as the canonical
  // browse parent). Per-prefix overrides below.
  let parentTitle = "Home";
  let parentUrl = "/";
  if (parts.length > 1) {
    if (parts[0] === "center") {
      // /center/<facility-slug> — facility profile pages. The browse parent
      // is the rehab-centers directory, not the literal "/center" path.
      parentTitle = "Rehab Centers";
      parentUrl = "/rehab-centers";
    } else {
      const candidateUrl = `/${parts[0]}`;
      // Only use the candidate parent if it's a real registered route or
      // has a prerendered HTML mirror. Otherwise fall back to Home.
      const candidateLooksReal = /^[a-z0-9-]+$/.test(parts[0]);
      if (candidateLooksReal) {
        parentTitle = slugToName(parts[0]);
        parentUrl = candidateUrl;
      }
    }
  }
  // Include the page title in the metaDesc so generic fallback pages
  // don't all share an identical meta description (which Google flags as
  // 'Duplicate without user-selected canonical' across the cohort).
  // /treatment-types/{service}/{state}[/{city}] and other topic+place
  // fallthroughs reach genericPage, which had one sentence for all of
  // them (910 /treatment-types pages on 16 distinct bodies). Where the
  // URL names a service AND a state we can compose the same topic and
  // place axes the dedicated families use. Where it does not, the page
  // keeps its original copy rather than being given facts that do not
  // apply to it.
  let generic = null;
  if (parts[0] === "treatment-types" && parts.length >= 3) {
    const gTopic = nearMeSlugForTreatment(parts[1]);
    const gStateSlug = parts[2];
    const gStats = getStateStatsBySlug(gStateSlug);
    if (gTopic && gStats) {
      generic = buildNearMeContent({
        topicSlug: gTopic,
        topicLabel: slugToName(parts[1]),
        stateName: slugToName(gStateSlug),
        stats: gStats,
        licensing: getStateLicensing(gStateSlug),
        placeName: parts.length >= 4 ? slugToName(parts[3]) : undefined,
      });
    }
  }

  return {
    title,
    metaTitle: `${title} — RehabLookup`,
    metaDesc: `${title} on RehabLookup — addiction treatment directory covering facility listings, insurance information and recovery resources. Compare programs and find help today.`,
    h1: title,
    content: `
      ${generic ? renderComposedHtml(generic) : ""}
      <p>${title} on RehabLookup. Our directory lists treatment centers across all 50 states. Compare programs, verify insurance, and connect with treatment that fits your situation.</p>
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
// ── Flat place-scoped pages ──────────────────────────────────────────
// A handful of families publish one flat page per place —
// /list-your-facility-in-{place}, /for-providers-in-{place},
// /get-more-patients-in-{place}, /best-rehab-centers-in-{place}. The
// place is sometimes a state slug, sometimes a city, and sometimes
// "{city}-{state}". All of them were reaching the generic builder, so
// each family rendered one body 50 to 100 times.
/** @returns {{kind: "state", stateSlug: string, stateName: string} |
 *            {kind: "city", profile: object} | null} */
function resolvePlaceSlug(slug) {
  if (STATE_SLUG_SET.has(slug)) return { kind: "state", stateSlug: slug, stateName: slugToName(slug) };

  const direct = CITY_INDEX.get(slug);
  if (direct) return { kind: "city", profile: direct };

  // "{city}-{state}", e.g. albuquerque-new-mexico
  for (const st of STATE_SLUG_SET) {
    if (!slug.endsWith(`-${st}`)) continue;
    const citySlug = slug.slice(0, -(st.length + 1));
    const profile =
      CITY_INDEX.get(citySlug) ??
      CITY_INDEX.get(`${st}|${citySlug.replace(/-/g, "")}`);
    if (profile) return { kind: "city", profile };
    return { kind: "state", stateSlug: st, stateName: slugToName(st) };
  }
  return null;
}

const FLAT_PROVIDER_PREFIXES = {
  "list-your-facility-in-": {
    title: (place) => `List Your Rehab Facility in ${place}`,
    lead: (place) =>
      `Add your addiction treatment facility in ${place} to RehabLookup's provider directory so families searching for care there can find and contact you directly.`,
    // Each family needs its OWN description. All three took the market
    // composer's, which is keyed on place — so the two city families
    // produced an identical description for every city and tripped 250
    // check:unique-meta errors.
    desc: (place) =>
      `List your addiction treatment facility in ${place} on RehabLookup. Free directory listing, a market overview of ${place}, and organic position that is never sold.`,
  },
  "for-providers-in-": {
    title: (place) => `RehabLookup for Treatment Providers in ${place}`,
    lead: (place) =>
      `What RehabLookup offers treatment providers operating in ${place}, and what the local market looks like before you commit to it.`,
    desc: (place) =>
      `What RehabLookup offers treatment providers in ${place}: how listings work, what Pro and Featured do, and a market overview of ${place} before you commit.`,
  },
  "get-more-patients-in-": {
    title: (place) => `Get More Treatment Admissions in ${place}`,
    lead: (place) =>
      `How treatment programs in ${place} reach families searching for care, and what the market they are competing in actually looks like.`,
    desc: (place) =>
      `How treatment programs in ${place} reach families searching for care — referral routes, directory visibility, and what the ${place} market looks like on the numbers.`,
  },
};

/** One operator-voice sentence about how big this market is. Only states
 *  a size when a population actually shipped for the city. */
function renderMarketSizeLine(profile, stateName, county) {
  const bits = [];
  if (Number.isFinite(profile.population)) {
    bits.push(
      `${profile.city} has about ${profile.population.toLocaleString()} residents, which makes it the ${profile.rankInState === 1 ? "largest" : `${ordinal(profile.rankInState)} largest`} of the ${profile.listedInState} ${stateName} markets this directory covers`,
    );
  } else {
    bits.push(`${profile.city} is one of the ${stateName} markets this directory covers`);
  }
  if (county) bits.push(`it sits in ${countyLabel(county.name)}`);
  return `<h2>The ${profile.city} market</h2><p>${bits.join(", and ")}.</p>`;
}

function flatProviderPlacePage(urlPath, prefix) {
  const meta = FLAT_PROVIDER_PREFIXES[prefix];
  const slug = urlPath.replace(`/${prefix}`, "");
  const place = resolvePlaceSlug(slug);
  if (!place) return null;

  const stateSlug = place.kind === "state" ? place.stateSlug : place.profile.stateSlug;
  const stateName = place.kind === "state" ? place.stateName : place.profile.state;
  const placeLabel = place.kind === "state" ? stateName : `${place.profile.city}, ${place.profile.stateAbbr}`;

  // These pages address operators, so the city facts go through the
  // MARKET composer rather than the seeker one — same underlying facts,
  // right voice. Dropping a "this page lists treatment options for…"
  // paragraph onto a page about listing your facility was the wrong
  // audience twice over.
  const county = place.kind === "city" ? place.profile.county : null;
  const market = buildProviderMarketContent({
    stateName,
    stats: getStateStatsBySlug(stateSlug),
    licensing: getStateLicensing(stateSlug),
    countyName: county?.name,
    countySeat: county?.seat,
    countyPopulation: county?.population,
    majorCities: place.kind === "city" ? place.profile.countyPeers : undefined,
  });
  const cityBlock = place.kind === "city" ? renderMarketSizeLine(place.profile, stateName, county) : "";

  const title = meta.title(placeLabel);
  return {
    title,
    metaTitle: `${title} — RehabLookup for Providers`,
    metaDesc: meta.desc(placeLabel),
    h1: title,
    content: `
      <p>${meta.lead(placeLabel)}</p>
      ${cityBlock}
      ${renderComposedHtml(market)}
      <h2>How listing works</h2>
      <p>Complete the provider application to have your facility reviewed and listed. Listings show state licensure and accreditation details when a facility reports them; confirm current licensing with the facility or the issuing state authority.</p>
      <p>Organic directory position is determined independently and is never purchased. Pro enhances the facility profile and unlocks provider tools; Featured is a separately purchased, clearly labeled sponsored placement.</p>
      <p><a href="/provider-signup">Apply to List Your Facility</a> &middot; <a href="/rehab-marketing/${stateSlug}">${stateName} Provider Market</a> &middot; <a href="/provider-resources">Provider Resources</a></p>`,
    breadcrumbs: [
      { name: "Home", url: "/" },
      { name: "For Providers", url: "/for-providers" },
      { name: placeLabel, url: urlPath },
    ],
  };
}

/** /best-rehab-centers-in-{place} — seeker-facing, so it gets the
 *  treatment content rather than the market overview, and it says out
 *  loud that this directory does not rank programs by quality. */
function bestRehabCentersPage(urlPath) {
  const slug = urlPath.replace("/best-rehab-centers-in-", "");
  const place = resolvePlaceSlug(slug);
  if (!place) return null;

  const stateSlug = place.kind === "state" ? place.stateSlug : place.profile.stateSlug;
  const stateName = place.kind === "state" ? place.stateName : place.profile.state;
  const placeLabel = place.kind === "state" ? stateName : `${place.profile.city}, ${place.profile.stateAbbr}`;

  const composed = buildNearMeContent({
    topicSlug: "rehab-near-me",
    topicLabel: "Addiction treatment",
    stateName,
    stats: getStateStatsBySlug(stateSlug),
    licensing: getStateLicensing(stateSlug),
    placeName: place.kind === "city" ? place.profile.city : undefined,
  });
  const cityBlock =
    place.kind === "city"
      ? renderComposedHtml(
          buildCityTreatmentContent({
            profile: place.profile,
            treatmentLabel: "Addiction treatment",
            treatmentSlug: "rehab",
          }),
        )
      : "";

  const title = `Rehab Centers in ${placeLabel}`;
  return {
    title,
    metaTitle: `${title} — How to Compare Them | RehabLookup`,
    metaDesc: `How to compare rehab centers in ${placeLabel}: what to verify with the ${stateName} regulator, what accreditation does and does not tell you, and why this is not a ranking.`,
    h1: title,
    content: `
      <h2>What "best" can and cannot mean here</h2>
      <p>RehabLookup does not rank treatment programs by quality and this page is not a ranking. Quality is a property of an individual program — its licensure, its accreditation, whether it treats what you actually have, and what it arranges for after discharge — and it varies far more between two programs in one city than it does between cities. What follows is what to check and how to check it.</p>
      ${cityBlock}
      ${renderComposedHtml(composed)}
      <p><a href="/rehab-centers/${stateSlug}">All Treatment Centers in ${stateName}</a> &middot; <a href="/rehab-centers">Browse All States</a></p>`,
    breadcrumbs: [
      { name: "Home", url: "/" },
      { name: "Rehab Centers", url: "/rehab-centers" },
      { name: placeLabel, url: urlPath },
    ],
  };
}

/** County-page label, disambiguated where a county-equivalent shares its
 *  slug with a city in the same state.
 *
 *  Most county slugs render with a " County" suffix that separates them
 *  from the city page automatically. Consolidated city-counties do not:
 *  Nevada publishes both /rehab-centers/nevada/carson-city and
 *  /rehab-centers/nevada/county/carson-city, and "Carson City County"
 *  is not a place. Naming the scope is the honest way to tell the two
 *  URLs apart. */
function countyScopeLabel(stateSlug, countySlug) {
  const label = countyLabel(slugToName(countySlug));
  if (/\bCounty$/i.test(label)) return label;
  const cityShares = Boolean(
    CITY_INDEX.get(countySlug) ??
      CITY_INDEX.get(`${stateSlug}|${countySlug.replace(/-/g, "")}`),
  );
  return cityShares ? `${label} (county)` : label;
}

const GENERIC_FALLBACK = new Map();

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
    if (depth === 4 && p2 === "county") return nearMeCountyPage(urlPath);
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
    if (depth === 2) return rehabMarketingStatePage(urlPath);
    if (depth === 4 && p2 === "insurance") return rehabMarketingStateInsurancePage(urlPath);
    if (depth === 3 && p2 !== "county") return rehabMarketingStateTreatmentPage(urlPath);
    if (depth === 4 && p2 === "county") return rehabMarketingCountyPage(urlPath);
    if (depth === 5 && p2 === "county" && p4 !== "insurance") return rehabMarketingCountyTreatmentPage(urlPath);
    if (depth === 6 && p2 === "county" && p4 === "insurance") return rehabMarketingCountyInsurancePage(urlPath);
  }

  // Rehab-centers patterns
  if (p0 === "rehab-centers") {
    if (depth === 2) return null; // already generated by generate-seo-html
    if (depth === 4 && p2 === "articles") return rehabCentersArticlePage(urlPath);
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
    // Treatment-type hubs that also publish a page per state. They were
    // reaching the generic builder, so all 50 states rendered one body.
    "detox-centers", "alcohol-rehab-centers", "drug-rehab-centers",
    "inpatient-rehab-centers", "outpatient-rehab-centers",
    "dual-diagnosis-treatment-centers", "sober-living-homes",
  ];
  if (substanceTypes.includes(p0) && depth === 2) {
    return substanceStatePage(urlPath);
  }
  if (substanceTypes.includes(p0) && depth === 3) {
    return substanceCityPage(urlPath);
  }

  // Flat place-scoped families
  for (const prefix of Object.keys(FLAT_PROVIDER_PREFIXES)) {
    if (p0.startsWith(prefix) && depth === 1) {
      const built = flatProviderPlacePage(urlPath, prefix);
      if (built) return built;
    }
  }
  if (p0.startsWith("best-rehab-centers-in-") && depth === 1) {
    const built = bestRehabCentersPage(urlPath);
    if (built) return built;
  }

  // Fallback. Counted so the "stub factory" is visible: a URL that
  // reaches here gets a page whose body is the generic directory
  // boilerplate, which is how 254 provider guides, 50 provider market
  // pages and 192 resource mirrors all ended up as the same page.
  // A rising number here is a content regression in the making.
  GENERIC_FALLBACK.set(p0, (GENERIC_FALLBACK.get(p0) ?? 0) + 1);
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

  // `--force` without `--only` is a foot-gun and has fired twice: it
  // rewrites all 43,294 URLs, and the ~12,000 that reach the generic
  // fallback lose whatever a dedicated generator had written for them —
  // the provider guides and the resource mirrors both get flattened back
  // into the boilerplate stub they were rescued from. Family-at-a-time is
  // the only safe way to force, so require the pairing explicitly.
  if (FORCE && !ONLY && !process.argv.includes("--force-everything")) {
    console.error(
      "✗ --force without --only would rewrite every URL, including the ~12,000 that\n" +
        "  reach the generic fallback and are owned by other generators (provider\n" +
        "  guides, resource mirrors). Pass --only=/prefix, or --force-everything if\n" +
        "  you genuinely mean to flatten those.",
    );
    process.exit(1);
  }

  // With --force, regenerate every URL we know about so legacy stubs that
  // predated the branded `_seo-page-shell.mjs` upgrade get overwritten.
  let missing = FORCE ? [...allUrls] : [...allUrls].filter((u) => !hasHtmlFile(u));

  // `--only=/prefix` narrows the run to one page family. Content
  // remediation proceeds family by family — each one needs its own data
  // axes wired and its own before/after uniqueness measurement — and
  // regenerating all 46k pages to inspect 7k of them makes the diff
  // unreadable and the measurement ambiguous.
  if (ONLY) {
    const before = missing.length;
    missing = missing.filter((u) => u.startsWith(ONLY));
    console.log(`  --only=${ONLY}: ${missing.length.toLocaleString()} of ${before.toLocaleString()} URLs selected`);
  }
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
  if (GENERIC_FALLBACK.size) {
    const top = [...GENERIC_FALLBACK.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
    console.log(
      `  Generic fallback (no family builder): ${[...GENERIC_FALLBACK.values()].reduce((a, b) => a + b, 0).toLocaleString()} URLs — ` +
        top.map(([family, n]) => `/${family} ${n}`).join(", "),
    );
  }
  console.log(`  Skipped (already exist): ${skipped.toLocaleString()}`);
  console.log(`  Errors: ${errors}`);
  console.log("=".repeat(70));
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * generate-locations-hub-html.mjs — crawler HTML for /locations, the national
 * directory hub (SEO recovery Phase 1, 2026-11-23).
 *
 * WHY
 *   /locations is what visitors see as "Browse All States": the React page
 *   (src/pages/Locations.tsx) lists every state with its city links. The
 *   prerendered file crawlers received was a 178-word generic shell from
 *   generate-missing-html.mjs that linked to NO state — so the directory had no
 *   crawlable hub, and /rehab-centers 301'd to the noindexed /search-results.
 *   /rehab-centers now 301s here, and every profile breadcrumb points here.
 *
 * PARITY
 *   The same source as the SPA (src/data/locationSeoData.ts → statesData) and
 *   the same content: H1, intro, every state linking to /rehab-centers/{state},
 *   and the cities the SPA lists under each state. Listing counts come from the
 *   live facility data the other generators use, so the numbers are real.
 *
 * Run: node --experimental-strip-types scripts/generate-locations-hub-html.mjs
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { seoStyles, seoHeader, seoCtaStrip, seoFooter } from "./_seo-page-shell.mjs";
import {
  fetchAllFacilities,
  groupByState,
  ALLOW_EMPTY_FACILITY_DATA,
  escapeHtml,
  escapeAttr,
} from "./_facility-data.mjs";
import { statesData } from "../src/data/locationSeoData.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const BASE_URL = "https://rehablookup.com";
const CANONICAL = `${BASE_URL}/locations`;
const TITLE = "Find Rehab Centers by Location | All 50 States & Major Cities | RehabLookup";
const DESCRIPTION =
  "Browse drug and alcohol treatment centers across all 50 US states and major cities. Find rehab facility listings near you with our location directory.";

function stateCount(byState, state) {
  return (byState.get(state.slug) ?? byState.get(state.name) ?? []).length;
}

async function main() {
  let facilities = [];
  try {
    facilities = await fetchAllFacilities();
  } catch (err) {
    if (!ALLOW_EMPTY_FACILITY_DATA) throw err;
    console.warn(`[locations-hub] facility data unavailable (${err.message}); counts omitted`);
  }
  const byState = groupByState(facilities);
  const total = facilities.length;

  const stateCards = statesData
    .map((state) => {
      const n = stateCount(byState, state);
      const cities = state.cities
        .map((c) => `<li><a href="/rehab-centers/${escapeAttr(state.slug)}/${escapeAttr(c.slug)}">${escapeHtml(c.name)}</a></li>`)
        .join("");
      const countLine = n > 0 ? `${n.toLocaleString("en-US")} ${n === 1 ? "listing" : "listings"}` : "No listings yet";
      return `<section class="rl-state" aria-labelledby="st-${escapeAttr(state.slug)}">
  <h3 id="st-${escapeAttr(state.slug)}"><a href="/rehab-centers/${escapeAttr(state.slug)}">${escapeHtml(state.name)}</a></h3>
  <p class="rl-state-meta">${countLine} &middot; ${state.cities.length} ${state.cities.length === 1 ? "city" : "cities"}</p>
  ${cities ? `<ul>${cities}</ul>` : ""}
</section>`;
    })
    .join("\n");

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${BASE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Locations", item: CANONICAL },
    ],
  };
  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Drug & Alcohol Rehab Centers by Location",
    description: DESCRIPTION,
    url: CANONICAL,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: statesData.length,
      itemListElement: statesData.map((s, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: { "@type": "Place", name: s.name, url: `${BASE_URL}/rehab-centers/${s.slug}` },
      })),
    },
  };

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(TITLE)}</title>
  <meta name="description" content="${escapeAttr(DESCRIPTION)}" />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="${CANONICAL}" />
  <meta property="og:title" content="${escapeAttr(TITLE)}" />
  <meta property="og:description" content="${escapeAttr(DESCRIPTION)}" />
  <meta property="og:url" content="${CANONICAL}" />
  <meta property="og:type" content="website" />
  <meta property="og:image" content="${BASE_URL}/og-image.jpg" />
  <script type="application/ld+json">${JSON.stringify(breadcrumbLd)}</script>
  <script type="application/ld+json">${JSON.stringify(collectionLd)}</script>
  ${seoStyles()}
  <style>
    .rl-states{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px;margin-top:16px}
    .rl-state{border:1px solid var(--rl-border);border-radius:12px;padding:16px}
    .rl-state h3{margin:0 0 4px;font-size:1.05rem}
    .rl-state-meta{color:var(--rl-muted);font-size:.85rem;margin:0 0 8px}
    .rl-state ul{list-style:none;padding:0;margin:0;display:flex;flex-wrap:wrap;gap:6px}
    .rl-state li a{display:inline-block;padding:3px 10px;background:#f1f5f9;border-radius:6px;font-size:.85rem}
  </style>
</head>
<body>
${seoHeader()}
<main class="rl-main"><div class="rl-container">
  <nav class="breadcrumbs" aria-label="Breadcrumb"><ul><li><a href="/">Home</a> &rsaquo;</li><li>Locations</li></ul></nav>
  <h1>Find Rehab Centers by Location</h1>
  <p>Treatment facility listings across all 50 US states and major cities.${total > 0 ? ` The directory currently lists ${total.toLocaleString("en-US")} facilities.` : ""} Most listings come from SAMHSA's FindTreatment.gov directory and reflect information facilities report; confirm details directly with each facility.</p>
  <h2>Browse All States</h2>
  <div class="rl-states">
${stateCards}
  </div>
  ${seoCtaStrip({ blurb: "Filter facility listings by location, level of care, and payment type." })}
</div></main>
${seoFooter()}
</body>
</html>
`;
  await writeFile(path.join(ROOT, "public", "locations.html"), html, "utf8");
  console.log(`[locations-hub] wrote public/locations.html — ${statesData.length} states, ${total} facilities`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

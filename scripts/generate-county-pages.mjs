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
  if (filePath.endsWith(".html") && !filePath.endsWith("/index.html")) {
    const nested = filePath.slice(0, -".html".length);
    await mkdir(nested, { recursive: true });
    await writeFile(path.join(nested, "index.html"), html, "utf8");
  }
  pagesGenerated++;
}

function buildHtml({ state, county, urlPath }) {
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
    body{font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:900px;margin:0 auto;padding:32px 20px;color:#1a2b4a;line-height:1.7}
    h1{font-size:2rem;color:#1B365D;margin-bottom:12px}
    h2{font-size:1.4rem;color:#1B365D;margin-top:28px}
    h3{font-size:1.1rem;color:#1B365D;margin-top:18px}
    p{color:#333;margin-bottom:16px}
    a{color:#2563eb;text-decoration:none}
    a:hover{text-decoration:underline}
    nav ul{list-style:none;padding:0;display:flex;flex-wrap:wrap;gap:8px}
    .breadcrumbs{font-size:.85rem;color:#666;margin-bottom:20px}
    .breadcrumbs ul{list-style:none;padding:0;display:flex;flex-wrap:wrap;gap:4px}
    footer{margin-top:40px;padding-top:20px;border-top:1px solid #e5e7eb;font-size:.8rem;color:#888}
  </style>
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-2VB6C1X2MQ"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-2VB6C1X2MQ');</script>
</head>
<body>
  <header><a href="/" aria-label="RehabLookup Home">RehabLookup</a></header>
  <nav class="breadcrumbs" aria-label="Breadcrumb"><ul>${breadcrumbHtml}</ul></nav>
  <main>
    <h1>${escHtml(title)}</h1>
    <p>${escHtml(county.description)}</p>
    <h2>Treatment Overview</h2>
    <p>${escHtml(county.treatmentOverview)}</p>
    <h2>Demographics &amp; Needs</h2>
    <p>${escHtml(county.demographics)}</p>
    <h2>Access &amp; Coverage</h2>
    <p>${escHtml(county.accessNotes)}</p>
    ${cityList ? `<h2>Cities in ${escHtml(county.name)} County</h2><ul style="columns:2;list-style:disc;padding-left:20px">${cityList}</ul>` : ""}
    <h2>Frequently Asked Questions</h2>
    ${faqHtml}
    <p style="margin-top:24px"><a href="/rehab-centers/${state.stateSlug}">All ${escHtml(state.stateName)} Rehab Centers</a> &middot; <a href="/concierge">Get Personalized Help</a> &middot; <a href="/">Home</a></p>
  </main>
  <footer><p>&copy; 2026 RehabLookup. All rights reserved. <a href="/privacy-policy">Privacy</a> &middot; <a href="/terms-of-service">Terms</a></p></footer>
</body>
</html>`;
}

async function main() {
  console.log("[county-html] starting...");
  for (const state of stateCountyData) {
    for (const county of state.counties) {
      const urlPath = `/rehab-centers/${state.stateSlug}/county/${county.slug}`;
      const html = buildHtml({ state, county, urlPath });
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
  console.log(`[county-html] generated ${pagesGenerated} county pages (flat + nested)`);
}

await main().catch((err) => {
  console.error("[county-html] fatal:", err);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * Build-time Static HTML Generator for Facility Profiles (/center/<slug>)
 *
 * For every approved + verified facility in the database, write a static
 * SEO-friendly HTML file at:
 *
 *     public/center/<slug>.html
 *
 * Vercel's filesystem handler (with cleanUrls = true) serves this file when
 * Googlebot or any crawler requests `/center/<slug>`, so search engines see
 * unique title/meta/JSON-LD instead of the SPA shell. JS-enabled users hit
 * React Router on the client and continue to the live CenterProfile page —
 * these flat files are SEO-only mirrors, matching the established pattern
 * used by the other generate-*-html.mjs scripts in this repo.
 *
 * Data source: the public sitemap-facilities edge function gives us the
 * canonical slug list, and we read public columns from `facilities` via the
 * Supabase REST API using the anon key (RLS already restricts what's
 * returned to the public-safe subset).
 *
 * Idempotent: safe to re-run; overwrites existing files.
 */

import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, "../public");
const centerDir = path.join(publicDir, "center");

const BASE_URL = "https://rehablookup.com";
const PROJECT_URL = (
  process.env.SUPABASE_URL ??
  process.env.VITE_SUPABASE_URL ??
  "https://plckxokpyiubuekvodtc.supabase.co"
).replace(/\/$/, "");
const ANON_KEY =
  process.env.SUPABASE_ANON_KEY ??
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  // Project anon key — safe to commit; matches src/integrations/supabase/client.ts
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsY2t4b2tweWl1YnVla3ZvZHRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3MjU5NjUsImV4cCI6MjA4MTMwMTk2NX0.vuHH51JTLDT3fVmHQeEBKsGZqu5qkCUjCtPiF_NOQx0";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeHtml(value) {
  if (value == null) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}

/** Safely embed JSON inside a <script type="application/ld+json">. */
function jsonLd(obj) {
  return JSON.stringify(obj).replace(/</g, "\\u003c");
}

function truncate(text, max) {
  if (!text) return "";
  const clean = String(text).replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
}

// Mirror the live CenterProfile slug logic exactly so internal links resolve
// to the same routes the SPA produces (lowercase, spaces → hyphens, keep dots).
// Diverging from this would break "St. Louis" → /rehab-centers/missouri/st.-louis.
function locationSlug(s) {
  return String(s ?? "").toLowerCase().replace(/\s+/g, "-");
}

// ---------------------------------------------------------------------------
// Data fetch
// ---------------------------------------------------------------------------

/**
 * Pull every approved + verified facility with a slug. We select only the
 * columns we need to render the static SEO mirror — keeps payload small and
 * matches the no-`select(*)` core memory rule.
 */
async function fetchFacilities() {
  const cols = [
    "id",
    "slug",
    "name",
    "facility_type",
    "city",
    "state",
    "zip_code",
    "address",
    "phone",
    "website",
    "description",
    "logo_url",
    "gallery_urls",
    "year_established",
    "verified",
    "featured",
    "updated_at",
  ].join(",");

  const url =
    `${PROJECT_URL}/rest/v1/facilities` +
    `?select=${encodeURIComponent(cols)}` +
    `&status=eq.approved` +
    `&verified=eq.true` +
    `&slug=not.is.null` +
    `&order=updated_at.desc`;

  const res = await fetch(url, {
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `[facility-prerender] Failed to fetch facilities (${res.status}): ${body.slice(0, 200)}`,
    );
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// HTML template
// ---------------------------------------------------------------------------

function renderFacilityHtml(f) {
  const slug = f.slug;
  const canonical = `${BASE_URL}/center/${slug}`;
  const stateSlug = citySlug(f.state);
  const cityHrefSlug = citySlug(f.city);

  const title = `${f.name} — Addiction Treatment in ${f.city}, ${f.state} | RehabLookup`;
  const baseDesc = f.description
    ? truncate(f.description, 155)
    : `${f.name} offers comprehensive addiction treatment services in ${f.city}, ${f.state}. Verify insurance and start your recovery journey today.`;
  const metaDescription = baseDesc;

  const ogImage =
    (Array.isArray(f.gallery_urls) && f.gallery_urls[0]) ||
    f.logo_url ||
    `${BASE_URL}/og-image.jpg`;

  const breadcrumbs = [
    { name: "Home", url: `${BASE_URL}/` },
    { name: "Find Rehab", url: `${BASE_URL}/rehab-centers` },
    { name: f.state, url: `${BASE_URL}/rehab-centers/${stateSlug}` },
    { name: f.city, url: `${BASE_URL}/rehab-centers/${stateSlug}/${cityHrefSlug}` },
    { name: f.name, url: canonical },
  ];

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbs.map((b, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: b.name,
      item: b.url,
    })),
  };

  const medicalClinicLd = {
    "@context": "https://schema.org",
    "@type": "MedicalClinic",
    name: f.name,
    url: canonical,
    description: baseDesc,
    image: ogImage,
    telephone: f.phone || undefined,
    address: {
      "@type": "PostalAddress",
      streetAddress: f.address || undefined,
      addressLocality: f.city,
      addressRegion: f.state,
      postalCode: f.zip_code || undefined,
      addressCountry: "US",
    },
    medicalSpecialty: "Addiction Medicine",
    ...(f.facility_type ? { "@additionalType": f.facility_type } : {}),
    ...(f.year_established ? { foundingDate: String(f.year_established) } : {}),
    ...(f.website ? { sameAs: [f.website] } : {}),
    isAcceptingNewPatients: true,
    publisher: {
      "@type": "Organization",
      name: "RehabLookup",
      url: BASE_URL,
    },
  };

  // Only render the pieces we have content for to avoid empty/unverifiable claims.
  const phoneLine = f.phone
    ? `<p><strong>Phone:</strong> <a href="tel:${escapeAttr(f.phone)}">${escapeHtml(f.phone)}</a></p>`
    : "";
  const addressLine = f.address
    ? `<p><strong>Address:</strong> ${escapeHtml(f.address)}, ${escapeHtml(f.city)}, ${escapeHtml(f.state)}${f.zip_code ? " " + escapeHtml(f.zip_code) : ""}</p>`
    : `<p><strong>Location:</strong> ${escapeHtml(f.city)}, ${escapeHtml(f.state)}</p>`;
  const websiteLine = f.website
    ? `<p><strong>Website:</strong> <a href="${escapeAttr(f.website)}" rel="nofollow noopener" target="_blank">${escapeHtml(f.website)}</a></p>`
    : "";
  const typeLine = f.facility_type
    ? `<p><strong>Facility Type:</strong> ${escapeHtml(f.facility_type)}</p>`
    : "";
  const descBlock = f.description
    ? `<h2>About ${escapeHtml(f.name)}</h2><p>${escapeHtml(f.description)}</p>`
    : `<h2>About ${escapeHtml(f.name)}</h2><p>${escapeHtml(f.name)} provides accredited addiction treatment services in ${escapeHtml(f.city)}, ${escapeHtml(f.state)}. View the full profile for programs, insurance accepted, and admissions details.</p>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeAttr(metaDescription)}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="business.business">
<meta property="og:title" content="${escapeAttr(title)}">
<meta property="og:description" content="${escapeAttr(metaDescription)}">
<meta property="og:url" content="${canonical}">
<meta property="og:site_name" content="RehabLookup">
<meta property="og:image" content="${escapeAttr(ogImage)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${escapeAttr(f.name)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeAttr(title)}">
<meta name="twitter:description" content="${escapeAttr(metaDescription)}">
<meta name="twitter:image" content="${escapeAttr(ogImage)}">
<link rel="icon" type="image/png" href="/favicon.png">
<script type="application/ld+json">${jsonLd(breadcrumbLd)}</script>
<script type="application/ld+json">${jsonLd(medicalClinicLd)}</script>
<style>
body{font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:900px;margin:0 auto;padding:32px 20px;color:#1a2b4a;line-height:1.7}
h1{font-size:2rem;color:#1B365D;margin-bottom:8px}
h2{font-size:1.4rem;color:#1B365D;margin-top:28px}
p{color:#333;margin-bottom:14px}
a{color:#2563eb;text-decoration:none}
a:hover{text-decoration:underline}
.breadcrumbs{font-size:.85rem;color:#666;margin-bottom:20px}
.breadcrumbs ul{list-style:none;padding:0;display:flex;flex-wrap:wrap;gap:4px}
.meta{background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;padding:16px 20px;margin-top:18px}
.meta p{margin:6px 0}
.cta{margin-top:28px;padding:18px 20px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px}
footer{margin-top:40px;padding-top:20px;border-top:1px solid #e5e7eb;font-size:.8rem;color:#888}
</style>
</head>
<body>
<header><a href="/" aria-label="RehabLookup Home">RehabLookup</a></header>
<nav class="breadcrumbs" aria-label="Breadcrumb"><ul>
<li><a href="/">Home</a> &rsaquo; </li>
<li><a href="/rehab-centers">Find Rehab</a> &rsaquo; </li>
<li><a href="/rehab-centers/${stateSlug}">${escapeHtml(f.state)}</a> &rsaquo; </li>
<li><a href="/rehab-centers/${stateSlug}/${cityHrefSlug}">${escapeHtml(f.city)}</a> &rsaquo; </li>
<li>${escapeHtml(f.name)}</li>
</ul></nav>
<main>
<h1>${escapeHtml(f.name)}</h1>
<p><em>Addiction treatment in ${escapeHtml(f.city)}, ${escapeHtml(f.state)}</em></p>
<div class="meta">
${typeLine}
${addressLine}
${phoneLine}
${websiteLine}
</div>
${descBlock}
<div class="cta">
<p><strong>View the full profile</strong> for verified programs, insurance accepted, amenities, photos, and admissions information.</p>
<p><a href="/center/${escapeAttr(slug)}">Open ${escapeHtml(f.name)} profile</a> &middot; <a href="/rehab-centers/${stateSlug}">More rehabs in ${escapeHtml(f.state)}</a> &middot; <a href="/concierge">Get Personalized Help</a></p>
</div>
</main>
<footer><p>&copy; ${new Date().getFullYear()} RehabLookup. All rights reserved. <a href="/privacy-policy">Privacy</a> &middot; <a href="/terms-of-service">Terms</a> &middot; <a href="/editorial-policy">Editorial Policy</a></p></footer>
</body>
</html>
`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("[facility-prerender] Fetching approved + verified facilities…");
  let facilities;
  try {
    facilities = await fetchFacilities();
  } catch (err) {
    console.error(`[facility-prerender] ${err.message}`);
    // Don't fail the build for transient REST issues — just skip with a warning.
    // The pre-existing static catalog (drug-rehab-centers, near-me hubs, etc.)
    // still gets generated by the other generate-*-html.mjs scripts.
    if (process.env.STRICT_FACILITY_PRERENDER === "1") process.exit(1);
    console.warn("[facility-prerender] Skipping facility prerender for this build.");
    return;
  }

  if (!Array.isArray(facilities) || facilities.length === 0) {
    console.log("[facility-prerender] No approved facilities returned — nothing to write.");
    return;
  }

  await mkdir(centerDir, { recursive: true });

  let written = 0;
  for (const f of facilities) {
    if (!f.slug || !f.name || !f.city || !f.state) {
      console.warn(`[facility-prerender] Skipping incomplete row id=${f.id}`);
      continue;
    }
    const html = renderFacilityHtml(f);
    const outFile = path.join(centerDir, `${f.slug}.html`);
    await writeFile(outFile, html, "utf8");
    written++;
  }

  console.log(
    `[facility-prerender] Wrote ${written} facility profile(s) to public/center/*.html`,
  );
}

main().catch((err) => {
  console.error("[facility-prerender] Fatal:", err);
  process.exit(1);
});

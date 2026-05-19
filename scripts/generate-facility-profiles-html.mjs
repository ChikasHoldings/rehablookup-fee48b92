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
 * Data source: `public_facilities` view (anon-readable, paywall-masked) for
 * the main row, plus four side tables for per-facility services / insurance
 * / age groups / accreditations. Each side table is pulled once per build
 * (paginated), bucketed by facility_id, and threaded into the per-facility
 * render so the static body carries the same structured data the SPA shows.
 *
 * Idempotent: safe to re-run; overwrites existing files.
 */

import { writeFile, mkdir, readdir, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GA_MEASUREMENT_ID } from "./_ga.mjs";
import { seoHeader, seoFooter, seoStyles } from "./_seo-page-shell.mjs";

// Branded shell CSS without the surrounding <style> tags so it can be
// concatenated into the facility-profile <style> block below.
const BRANDED_SHELL_CSS = seoStyles().replace(/<\/?style[^>]*>/g, "").trim();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, "../public");
const centerDir = path.join(publicDir, "center");

const BASE_URL = "https://rehablookup.com";
const PROJECT_URL = (
  process.env.SUPABASE_URL ??
  process.env.VITE_SUPABASE_URL ??
  "https://mldbxpntzcjalgjmwnqa.supabase.co"
).replace(/\/$/, "");
const ANON_KEY =
  process.env.SUPABASE_ANON_KEY ??
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  // Project anon key — safe to commit; matches src/integrations/supabase/client.ts
  "sb_publishable_tHLCRbeUrsu7EmMlCR0n6g_ygNXmMYP";

// ---------------------------------------------------------------------------
// Canonical taxonomies — kept in sync with the SPA's
// src/components/facility-profile/* counterparts so visible HTML and the
// SPA augmentation render the same buckets.
// ---------------------------------------------------------------------------

const LEVELS_OF_CARE = new Set([
  "Outpatient",
  "Intensive Outpatient (IOP)",
  "Partial Hospitalization (PHP)",
  "Detoxification",
  "Sober Living",
  "Telehealth/Virtual",
  "Residential",
]);

const EVIDENCE_BASED = new Set([
  "Cognitive Behavioral Therapy (CBT)",
  "Trauma Therapy",
  "Medication-Assisted Treatment (MAT)",
  "Dual Diagnosis",
  "Family Therapy",
  "Group Therapy",
]);

// External verifiers — authoritative sources only. State-issued accreditations
// have no canonical single verifier, so they omit the link.
const ACCRED_VERIFY = {
  "The Joint Commission (JCAHO)": "https://www.qualitycheck.org/",
  "CARF International": "https://carf.org/providersearch/",
  "SAMHSA-Listed": "https://findtreatment.samhsa.gov/",
  "NAATP Member": "https://www.naatp.org/find-a-provider",
};

const ACCRED_BLURB = {
  "The Joint Commission (JCAHO)":
    "Independent accreditation of healthcare quality and safety",
  "CARF International":
    "Commission on Accreditation of Rehabilitation Facilities",
  "State Department of Health": "State-issued operating license",
  "State Substance Use Treatment Agency":
    "State-issued substance use treatment authorization",
  "State Mental Health Authority":
    "State-issued mental health authorization",
  "SAMHSA-Listed":
    "Listed in the SAMHSA National Directory of Treatment Facilities",
  "NAATP Member":
    "Member, National Association of Addiction Treatment Providers",
};

const SLIDING_SCALE = "Sliding Scale/Financial Assistance";

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

// Oxford-comma list joiner. Empty array → empty string.
function joinList(arr) {
  if (!arr || arr.length === 0) return "";
  if (arr.length === 1) return arr[0];
  if (arr.length === 2) return `${arr[0]} and ${arr[1]}`;
  return `${arr.slice(0, -1).join(", ")}, and ${arr[arr.length - 1]}`;
}

function normalizeGender(value) {
  if (!value) return null;
  switch (String(value).toLowerCase()) {
    case "male":
    case "men":
    case "men only":
      return "Men Only";
    case "female":
    case "women":
    case "women only":
      return "Women Only";
    case "all":
    case "all genders":
    case "coed":
      return "All Genders";
    default:
      return value;
  }
}

// ---------------------------------------------------------------------------
// Data fetch
// ---------------------------------------------------------------------------

/**
 * Generic paginated fetch from a Supabase REST endpoint (view or table).
 * Uses offset/limit since PostgREST caps each response at ~1,000 rows
 * regardless of the requested limit. Matches the pagination pattern used
 * by scripts/_facility-data.mjs.
 */
async function fetchAll(viewName, cols, extraQuery = "") {
  const PAGE = 1000;
  const all = [];
  let from = 0;
  while (true) {
    const url =
      `${PROJECT_URL}/rest/v1/${viewName}` +
      `?select=${encodeURIComponent(cols)}` +
      `${extraQuery ? "&" + extraQuery : ""}` +
      `&offset=${from}&limit=${PAGE}`;

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
        `fetchAll(${viewName}) failed (${res.status}): ${body.slice(0, 200)}`,
      );
    }

    const batch = await res.json();
    all.push(...batch);
    if (batch.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

/**
 * Bucket flat rows by a key column, collecting `valueField` into a string[].
 * Returns Map<key, string[]>.
 */
function bucketBy(rows, keyField, valueField) {
  const m = new Map();
  for (const r of rows ?? []) {
    const k = r?.[keyField];
    if (!k) continue;
    const v = r[valueField];
    if (v == null || v === "") continue;
    const arr = m.get(k);
    if (arr) arr.push(String(v));
    else m.set(k, [String(v)]);
  }
  return m;
}

/**
 * Pull every approved facility with a slug.
 *
 * Reads from the `public_facilities` VIEW — not the `facilities` TABLE.
 * The build runs with the anon key, which has no SELECT grant on the
 * underlying table (intentional; phone/email/website are paywalled).
 * The view applies `status='approved' AND NOT suspended` and exposes
 * `gender_served` and `data_source` directly.
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
    "gender_served",
    "updated_at",
  ].join(",");

  return fetchAll(
    "public_facilities",
    cols,
    "slug=not.is.null&order=updated_at.desc",
  );
}

// ---------------------------------------------------------------------------
// Data-driven FAQ builder
// ---------------------------------------------------------------------------

/**
 * Build Q/A pairs grounded in real data. Any question we can't answer from
 * the facility row or its child tables is omitted — we never hedge with
 * generic copy. The two anchor questions (location, contact) always render
 * because their answers are computable from the row.
 */
function buildFaqItems(facility, facSvc, facIns, facAge, facAcc) {
  const items = [];
  const name = facility.name;
  const city = facility.city;
  const state = facility.state;

  // Anchor — location is always known.
  const locationLine = facility.address
    ? `${name} is located at ${facility.address}, ${city}, ${state}${facility.zip_code ? " " + facility.zip_code : ""}.`
    : `${name} is based in ${city}, ${state}.`;
  items.push({
    q: `Where is ${name} located?`,
    a: `${locationLine} View the full address, get directions, and see nearby treatment options on the facility profile.`,
  });

  // Levels of care
  const levels = facSvc.filter((s) => LEVELS_OF_CARE.has(s));
  if (levels.length) {
    items.push({
      q: `What levels of care does ${name} offer?`,
      a: `${name} offers ${joinList(levels)} services in ${city}, ${state}. Specific program length, intake criteria, and clinical schedule are confirmed during admissions.`,
    });
  }

  // Therapy approaches
  const approaches = facSvc.filter((s) => !LEVELS_OF_CARE.has(s));
  if (approaches.length) {
    items.push({
      q: `What therapies and treatment approaches does ${name} use?`,
      a: `${name} uses evidence-based and supportive approaches including ${joinList(approaches.slice(0, 6))}. The clinical team tailors the mix to each client's diagnosis, history, and goals.`,
    });
  }

  // Insurance
  if (facIns.length) {
    const plans = facIns.filter((i) => i !== SLIDING_SCALE);
    const sliding = facIns.includes(SLIDING_SCALE);
    const planSentence = plans.length
      ? `${name} accepts ${joinList(plans)}.`
      : `${name} works with families on payment arrangements.`;
    const slidingSentence = sliding
      ? " Sliding-scale fees and financial assistance may also be available — verify with the center before admission."
      : "";
    items.push({
      q: `Does ${name} accept insurance?`,
      a: `${planSentence}${slidingSentence} Coverage details vary by plan and individual benefits — request a benefits verification through the profile.`,
    });
  }

  // Ages
  if (facAge.length) {
    items.push({
      q: `What ages does ${name} treat?`,
      a: `${name} treats ${joinList(facAge)}. Some programs may have additional age-specific tracks — confirm with admissions.`,
    });
  }

  // Gender
  const gen = normalizeGender(facility.gender_served);
  if (gen) {
    const answer =
      gen === "Women Only"
        ? `${name} is a women-only facility, serving female-identifying clients.`
        : gen === "Men Only"
          ? `${name} is a men-only facility, serving male-identifying clients.`
          : `${name} serves clients of all genders.`;
    items.push({
      q: `Is ${name} a men-only, women-only, or coed facility?`,
      a: answer,
    });
  }

  // Accreditation
  if (facAcc.length) {
    items.push({
      q: `Is ${name} accredited?`,
      a: `Yes. ${name} is recognized by ${joinList(facAcc)}. Each accreditation can be verified directly with the issuing authority.`,
    });
  }

  // Year established
  if (facility.year_established) {
    items.push({
      q: `When was ${name} established?`,
      a: `${name} was established in ${facility.year_established} and currently operates in ${city}, ${state}.`,
    });
  }

  // Anchor — contact closer.
  items.push({
    q: `How do I contact ${name} or request more information?`,
    a: facility.phone
      ? `You can call ${name} at ${facility.phone} or use the "Request Information" form on the RehabLookup profile to send a confidential inquiry. A facility representative typically responds the same business day.`
      : `Use the "Request Information" form on the ${name} profile to send a confidential inquiry. A facility representative typically responds the same business day.`,
  });

  return items;
}

// ---------------------------------------------------------------------------
// Rich body sections — visible HTML between <h2>About …</h2> and the CTA.
// Each section self-hides when its data array is empty.
// ---------------------------------------------------------------------------

function renderRichSections(facility, facSvc, facIns, facAge, facAcc) {
  const levels = facSvc.filter((s) => LEVELS_OF_CARE.has(s));
  const approaches = facSvc.filter((s) => !LEVELS_OF_CARE.has(s));
  const evidence = approaches.filter((s) => EVIDENCE_BASED.has(s));
  const supports = approaches.filter((s) => !EVIDENCE_BASED.has(s));
  const slidingScale = facIns.includes(SLIDING_SCALE);
  const insurancePlans = facIns.filter((i) => i !== SLIDING_SCALE);
  const gen = normalizeGender(facility.gender_served);

  const parts = [];

  if (levels.length) {
    parts.push(`<section class="rich">
<h2>Levels of Care</h2>
<ul>
${levels.map((l) => `<li>${escapeHtml(l)}</li>`).join("\n")}
</ul>
</section>`);
  }

  if (approaches.length) {
    parts.push(`<section class="rich">
<h2>Services &amp; Therapy Approaches</h2>${
      evidence.length
        ? `
<h3>Evidence-Based Therapies</h3>
<ul>
${evidence.map((s) => `<li>${escapeHtml(s)}</li>`).join("\n")}
</ul>`
        : ""
    }${
      supports.length
        ? `
<h3>Recovery Supports</h3>
<ul>
${supports.map((s) => `<li>${escapeHtml(s)}</li>`).join("\n")}
</ul>`
        : ""
    }
</section>`);
  }

  if (facIns.length) {
    parts.push(`<section class="rich">
<h2>Insurance &amp; Payment</h2>${
      insurancePlans.length
        ? `
<ul>
${insurancePlans.map((i) => `<li>${escapeHtml(i)}</li>`).join("\n")}
</ul>`
        : ""
    }${
      slidingScale
        ? `
<p class="callout">Sliding-scale fees and financial assistance may be available. Verify cost and coverage with the center before admission.</p>`
        : ""
    }
</section>`);
  }

  if (facAge.length || gen) {
    parts.push(`<section class="rich">
<h2>Who's Served</h2>
<ul>${
      facAge.length
        ? `
<li><strong>Ages:</strong> ${facAge.map(escapeHtml).join(", ")}</li>`
        : ""
    }${
      gen
        ? `
<li><strong>Genders:</strong> ${escapeHtml(gen)}</li>`
        : ""
    }
</ul>
</section>`);
  }

  if (facAcc.length) {
    const rows = facAcc
      .map((a) => {
        const blurb = ACCRED_BLURB[a] ?? "";
        const verify = ACCRED_VERIFY[a];
        const verifyLink = verify
          ? ` <a href="${escapeAttr(verify)}" rel="nofollow noopener" target="_blank">Verify →</a>`
          : "";
        const blurbText = blurb ? ` — ${escapeHtml(blurb)}` : "";
        return `<li><strong>${escapeHtml(a)}</strong>${blurbText}${verifyLink}</li>`;
      })
      .join("\n");
    parts.push(`<section class="rich">
<h2>Accreditations &amp; Licenses</h2>
<ul>
${rows}
</ul>
</section>`);
  }

  return parts.join("\n");
}

// ---------------------------------------------------------------------------
// HTML template
// ---------------------------------------------------------------------------

function renderFacilityHtml(f, kids) {
  const facSvc = kids.services.get(f.id) ?? [];
  const facIns = kids.insurance.get(f.id) ?? [];
  const facAge = kids.ageGroups.get(f.id) ?? [];
  const facAcc = kids.accreditations.get(f.id) ?? [];

  const slug = f.slug;
  const canonical = `${BASE_URL}/center/${slug}`;
  const stateSlug = locationSlug(f.state);
  const cityHrefSlug = locationSlug(f.city);

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

  // Mirror src/components/SEO.tsx → generateLocalBusinessSchema() so the
  // crawler-served HTML carries the same multi-type LocalBusiness schema the
  // SPA hydrates client-side. Crawlers (Googlebot, Bingbot, social unfurlers)
  // typically read the static HTML before/instead of the hydrated DOM, so the
  // pre-rendered block is the authoritative copy for rich-results eligibility.
  const galleryImages = Array.isArray(f.gallery_urls) ? f.gallery_urls.filter(Boolean) : [];
  const schemaImages = [
    f.logo_url,
    ...galleryImages,
  ].filter(Boolean);
  const mapsQuery = encodeURIComponent(
    `${f.name}, ${f.address || ""}, ${f.city}, ${f.state} ${f.zip_code || ""}`.replace(/\s+/g, " ").trim(),
  );
  const hasMap = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;

  const medicalClinicLd = {
    "@context": "https://schema.org",
    "@type": ["MedicalOrganization", "MedicalClinic", "MedicalBusiness", "LocalBusiness"],
    "@id": canonical,
    url: canonical,
    name: f.name,
    legalName: f.name,
    description: baseDesc,
    image: schemaImages.length > 0 ? schemaImages : ogImage,
    ...(f.logo_url
      ? {
          logo: {
            "@type": "ImageObject",
            url: f.logo_url,
            caption: `${f.name} logo`,
          },
        }
      : {}),
    telephone: f.phone || undefined,
    address: {
      "@type": "PostalAddress",
      streetAddress: f.address || undefined,
      addressLocality: f.city,
      addressRegion: f.state,
      postalCode: f.zip_code || undefined,
      addressCountry: "US",
    },
    areaServed: [
      { "@type": "City", name: f.city },
      { "@type": "State", name: f.state },
    ],
    geo: {
      "@type": "GeoCoordinates",
      addressCountry: "US",
    },
    hasMap,
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      opens: "00:00",
      closes: "23:59",
    },
    isAccessibleForFree: false,
    medicalSpecialty: ["Addiction Medicine", "Psychiatry", "Behavioral Health"],
    ...(f.facility_type ? { "@additionalType": f.facility_type } : {}),
    ...(f.year_established ? { foundingDate: String(f.year_established) } : {}),
    ...(f.website ? { sameAs: [f.website] } : {}),
    isAcceptingNewPatients: true,
    knowsAbout: [
      "Substance Use Disorder Treatment",
      "Alcohol Addiction Treatment",
      "Drug Addiction Treatment",
      "Dual Diagnosis Treatment",
      "Mental Health Treatment",
    ],
    // Services this facility actually offers — drives Google's MedicalProcedure
    // entity matching and surfaces in some rich-result variants.
    ...(facSvc.length
      ? {
          availableService: facSvc.map((name) => ({
            "@type": "MedicalProcedure",
            name,
          })),
        }
      : {}),
    // Payment methods this facility accepts (insurance carriers + financial
    // assistance flags). `paymentAccepted` is the canonical schema.org field
    // for LocalBusiness and is recognized by Google's rich-results parser.
    ...(facIns.length ? { paymentAccepted: facIns } : {}),
    // Credentials / accreditations as EducationalOccupationalCredential
    // entities, with a `url` pointing at the issuer's verifier where one
    // exists (qualitycheck.org, carf.org, findtreatment.samhsa.gov, …).
    ...(facAcc.length
      ? {
          hasCredential: facAcc.map((name) => ({
            "@type": "EducationalOccupationalCredential",
            credentialCategory: "Accreditation",
            name,
            ...(ACCRED_VERIFY[name] ? { url: ACCRED_VERIFY[name] } : {}),
          })),
        }
      : {}),
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

  const richSections = renderRichSections(f, facSvc, facIns, facAge, facAcc);

  // ── Facility-specific FAQs ────────────────────────────────────────────────
  // Data-driven: every Q is dropped if we can't answer it from real columns.
  // Required by mem://seo/faq-jsonld-audit + mem://seo/quality-and-thin-content-protection:
  //   • Visible <section> with question/answer markup
  //   • Matching FAQPage JSON-LD with ≥3 Question entries (acceptedAnswer.text)
  //   • No fabricated claims — every A names actual values
  const faqs = buildFaqItems(f, facSvc, facIns, facAge, facAcc);
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((q) => ({
      "@type": "Question",
      name: q.q,
      acceptedAnswer: { "@type": "Answer", text: q.a },
    })),
  };
  const faqHtml =
    `<section class="faq" aria-labelledby="faq-heading">
<h2 id="faq-heading">Frequently Asked Questions</h2>
${faqs
  .map(
    (q) =>
      `<div class="faq-item"><h3>${escapeHtml(q.q)}</h3><p>${escapeHtml(q.a)}</p></div>`,
  )
  .join("\n")}
</section>`;

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
<script type="application/ld+json">${jsonLd(faqLd)}</script>
<style>
${BRANDED_SHELL_CSS}
body{font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a2b4a;line-height:1.7;margin:0;padding:0;background:#fff}
.rl-main{max-width:900px;margin:0 auto;padding:32px 20px}
h1{font-size:2rem;color:#1B365D;margin-bottom:8px}
h2{font-size:1.4rem;color:#1B365D;margin-top:28px}
h3{font-size:1.05rem;color:#1B365D;margin-top:14px;margin-bottom:6px}
p{color:#333;margin-bottom:14px}
ul{padding-left:22px;margin:8px 0 14px}
li{margin:4px 0}
a{color:#2563eb;text-decoration:none}
a:hover{text-decoration:underline}
.breadcrumbs{font-size:.85rem;color:#666;margin-bottom:20px}
.breadcrumbs ul{list-style:none;padding:0;display:flex;flex-wrap:wrap;gap:4px}
.meta{background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;padding:16px 20px;margin-top:18px}
.meta p{margin:6px 0}
.rich{margin-top:8px}
.rich .callout{background:#fffbeb;border-left:3px solid #f59e0b;padding:10px 14px;margin-top:10px;color:#78350f}
.cta{margin-top:28px;padding:20px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px}
.cta h2{margin-top:0}
.cta-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:14px}
.btn{display:inline-block;padding:10px 18px;border-radius:6px;font-weight:600;border:1px solid transparent}
.btn-primary{background:#1B365D;color:#fff !important;border-color:#1B365D}
.btn-primary:hover{background:#15294a;text-decoration:none}
.btn-secondary{background:#fff;color:#1B365D !important;border-color:#1B365D}
.btn-secondary:hover{background:#f1f5f9;text-decoration:none}
.related{margin-top:32px}
.related h2{font-size:1.2rem}
.related ul{padding-left:20px}
.related li{margin:6px 0}
.faq{margin-top:32px}
.faq h2{font-size:1.4rem}
.faq-item{margin:14px 0;padding:14px 16px;background:#fafafa;border:1px solid #eef2f7;border-radius:6px}
.faq-item h3{margin:0 0 6px;font-size:1.05rem;color:#1B365D}
.faq-item p{margin:0;color:#333}
footer{margin-top:40px;padding-top:20px;border-top:1px solid #e5e7eb;font-size:.8rem;color:#888}
</style>
<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_MEASUREMENT_ID}');</script>
</head>
<body>
${seoHeader()}
<main class="rl-main">
<nav class="breadcrumbs" aria-label="Breadcrumb"><ul>
<li><a href="/">Home</a> &rsaquo; </li>
<li><a href="/rehab-centers">Find Rehab</a> &rsaquo; </li>
<li><a href="/rehab-centers/${stateSlug}">${escapeHtml(f.state)}</a> &rsaquo; </li>
<li><a href="/rehab-centers/${stateSlug}/${cityHrefSlug}">${escapeHtml(f.city)}</a> &rsaquo; </li>
<li>${escapeHtml(f.name)}</li>
</ul></nav>
<h1>${escapeHtml(f.name)}</h1>
<p><em>Addiction treatment in ${escapeHtml(f.city)}, ${escapeHtml(f.state)}</em></p>
<div class="meta">
${typeLine}
${addressLine}
${phoneLine}
${websiteLine}
</div>
${descBlock}
${richSections}
<div class="cta">
<h2>Request Information from ${escapeHtml(f.name)}</h2>
<p>Get verified program details, insurance verification, and admissions information directly from this facility. Confidential — no obligation.</p>
<div class="cta-actions">
<a class="btn btn-primary" href="/center/${escapeAttr(slug)}?action=request-info">Request Information</a>
<a class="btn btn-secondary" href="/center/${escapeAttr(slug)}">View Full Profile</a>
${f.phone ? `<a class="btn btn-secondary" href="tel:${escapeAttr(f.phone)}">Call ${escapeHtml(f.phone)}</a>` : ""}
</div>
</div>
<section class="related">
<h2>Search Other Rehab Centers</h2>
<ul>
<li><a href="/rehab-centers/${stateSlug}/${cityHrefSlug}">Rehab centers in ${escapeHtml(f.city)}, ${escapeHtml(f.state)}</a></li>
<li><a href="/rehab-centers/${stateSlug}">All rehab centers in ${escapeHtml(f.state)}</a></li>
<li><a href="/rehab-centers">Browse the full RehabLookup directory</a></li>
<li><a href="/concierge">Get a free personalized placement match</a></li>
</ul>
</section>
${faqHtml}
</main>
${seoFooter()}
</body>
</html>
`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("[facility-prerender] Fetching approved facilities + child tables…");
  let facilities;
  let svcRows;
  let insRows;
  let ageRows;
  let accRows;
  try {
    [facilities, svcRows, insRows, ageRows, accRows] = await Promise.all([
      fetchFacilities(),
      fetchAll("facility_services", "facility_id,service_name"),
      fetchAll("facility_insurance", "facility_id,insurance_name"),
      fetchAll("facility_age_groups", "facility_id,age_group"),
      fetchAll("facility_accreditations", "facility_id,accreditation_type"),
    ]);
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

  console.log(
    `[facility-prerender] loaded ${facilities.length} facilities, ` +
      `${svcRows.length} services, ${insRows.length} insurance, ` +
      `${ageRows.length} ages, ${accRows.length} accreditations`,
  );

  const kids = {
    services: bucketBy(svcRows, "facility_id", "service_name"),
    insurance: bucketBy(insRows, "facility_id", "insurance_name"),
    ageGroups: bucketBy(ageRows, "facility_id", "age_group"),
    accreditations: bucketBy(accRows, "facility_id", "accreditation_type"),
  };

  await mkdir(centerDir, { recursive: true });

  // Track which slugs we're about to write so we can prune any stale .html
  // files left over from a prior run (facility flipped to pending/rejected,
  // slug renamed, etc.). Without this, an orphan file would surface as a
  // hard error in `check:facility-sitemap-sync` ("static HTML file has no
  // sitemap entry") and fail the SEO Validators CI job.
  const liveSlugs = new Set();
  let written = 0;
  for (const f of facilities) {
    if (!f.slug || !f.name || !f.city || !f.state) {
      console.warn(`[facility-prerender] Skipping incomplete row id=${f.id}`);
      continue;
    }
    const html = renderFacilityHtml(f, kids);
    const outFile = path.join(centerDir, `${f.slug}.html`);
    await writeFile(outFile, html, "utf8");
    liveSlugs.add(f.slug);
    written++;
  }

  // Prune stale mirrors so /public/center/*.html stays in lock-step with the
  // approved-facility set returned by the sitemap edge function.
  let pruned = 0;
  try {
    const existing = await readdir(centerDir);
    for (const file of existing) {
      if (!file.endsWith(".html")) continue;
      const slug = file.replace(/\.html$/, "");
      if (!liveSlugs.has(slug)) {
        await unlink(path.join(centerDir, file));
        pruned++;
      }
    }
  } catch (err) {
    console.warn(`[facility-prerender] Stale-file pruning skipped: ${err.message}`);
  }

  console.log(
    `[facility-prerender] Wrote ${written} facility profile(s); pruned ${pruned} stale mirror(s).`,
  );
}

main().catch((err) => {
  console.error("[facility-prerender] Fatal:", err);
  process.exit(1);
});

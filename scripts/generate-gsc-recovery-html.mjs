#!/usr/bin/env node
/**
 * Build-time generator for the specific URLs Google reported as
 * "Crawled — currently not indexed" or "Duplicate — Google chose
 * different canonical".
 *
 * Each of these URLs was previously served the SPA shell (homepage HTML),
 * which made Googlebot classify them as duplicates of "/". This script
 * emits a unique, content-rich static HTML file per URL into /public so
 * the hosting layer serves a distinct page to crawlers.
 *
 * IMPORTANT: This script ONLY generates HTML for the exact URL list
 * provided by Google Search Console. It does not touch any URL that
 * is already indexed.
 */

import { writeFile, mkdir, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "../public");
const BASE_URL = "https://rehablookup.com";
let count = 0;
let skipped = 0;

// ---------------------------------------------------------------------------
// Lookup tables — keep light; titles/descriptions/intro use these
// ---------------------------------------------------------------------------

const STATE_NAMES = {
  alabama: "Alabama", alaska: "Alaska", arizona: "Arizona", arkansas: "Arkansas",
  california: "California", colorado: "Colorado", connecticut: "Connecticut",
  delaware: "Delaware", florida: "Florida", georgia: "Georgia", hawaii: "Hawaii",
  idaho: "Idaho", illinois: "Illinois", indiana: "Indiana", iowa: "Iowa",
  kansas: "Kansas", kentucky: "Kentucky", louisiana: "Louisiana", maine: "Maine",
  maryland: "Maryland", massachusetts: "Massachusetts", michigan: "Michigan",
  minnesota: "Minnesota", mississippi: "Mississippi", missouri: "Missouri",
  montana: "Montana", nebraska: "Nebraska", nevada: "Nevada",
  "new-hampshire": "New Hampshire", "new-jersey": "New Jersey",
  "new-mexico": "New Mexico", "new-york": "New York",
  "north-carolina": "North Carolina", "north-dakota": "North Dakota",
  ohio: "Ohio", oklahoma: "Oklahoma", oregon: "Oregon", pennsylvania: "Pennsylvania",
  "rhode-island": "Rhode Island", "south-carolina": "South Carolina",
  "south-dakota": "South Dakota", tennessee: "Tennessee", texas: "Texas",
  utah: "Utah", vermont: "Vermont", virginia: "Virginia", washington: "Washington",
  "west-virginia": "West Virginia", wisconsin: "Wisconsin", wyoming: "Wyoming",
};

const INSURANCE_NAMES = {
  "tricare-rehab": "TRICARE", "medicare-rehab": "Medicare",
  "medicaid-rehab": "Medicaid", "kaiser-rehab": "Kaiser Permanente",
  "bcbs-treatment": "Blue Cross Blue Shield", "aetna-rehab": "Aetna",
  "cigna-rehab": "Cigna", "anthem-rehab": "Anthem",
  "humana-rehab": "Humana", "ambetter-rehab": "Ambetter",
  "wellcare-rehab": "WellCare", "oscar-rehab": "Oscar Health",
  "highmark-rehab": "Highmark", "magellan-rehab": "Magellan Health",
  "united-healthcare-rehab": "UnitedHealthcare",
};

const CARE_TYPE_LABEL = {
  "residential": "Residential Treatment",
  "sober-living": "Sober Living",
  "dual-diagnosis": "Dual Diagnosis Treatment",
  "luxury": "Luxury Rehab",
  "mat": "Medication-Assisted Treatment (MAT)",
  "detox": "Medical Detox",
  "inpatient-rehab": "Inpatient Rehab",
  "outpatient-rehab": "Outpatient Rehab",
  "alcohol-rehab": "Alcohol Rehab",
  "detox-centers": "Detox Centers",
};

const NEAR_ME_LABEL = {
  "alcohol-rehab-near-me": "Alcohol Rehab",
  "drug-rehab-near-me": "Drug Rehab",
  "inpatient-rehab-near-me": "Inpatient Rehab",
  "outpatient-rehab-near-me": "Outpatient Rehab",
  "detox-near-me": "Detox Centers",
  "free-rehab-near-me": "Free Rehab",
  "luxury-rehab-near-me": "Luxury Rehab",
  "teen-rehab-near-me": "Teen Rehab",
  "mens-rehab-near-me": "Men's Rehab",
  "womens-rehab-near-me": "Women's Rehab",
  "mat-clinic-near-me": "MAT Clinic",
  "rehab-near-me": "Rehab Centers",
  "affordable-rehab-near-me": "Affordable Rehab",
  "medicaid-rehab-near-me": "Medicaid Rehab",
  "medicare-rehab-near-me": "Medicare Rehab",
  "cigna-rehab-near-me": "Cigna Rehab",
  "united-healthcare-rehab-near-me": "UnitedHealthcare Rehab",
  "opioid-rehab-near-me": "Opioid Rehab",
  "same-day-rehab-near-me": "Same-Day Rehab",
  "emergency-rehab-near-me": "Emergency Rehab",
  "30-day-rehab-near-me": "30-Day Rehab",
  "dual-diagnosis-near-me": "Dual Diagnosis Treatment",
};

const TREATMENT_TYPE_LABEL = {
  "drug-addiction": "Drug Addiction Treatment",
  "alcohol-rehabilitation": "Alcohol Rehabilitation",
  "dual-diagnosis-treatment": "Dual Diagnosis Treatment",
  "outpatient-programs": "Outpatient Programs",
  "womens-rehab": "Women's Rehab",
  "veterans-rehab": "Veterans Rehab",
  "detox-programs": "Detox Programs",
  "residential-inpatient": "Residential Inpatient Treatment",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function titleCase(slug) {
  if (!slug) return "";
  return slug
    .replace(/-co$/i, "")
    .replace(/-ks$/i, "")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function stateName(slug) { return STATE_NAMES[slug] || titleCase(slug); }

async function exists(p) {
  try { await access(p); return true; } catch { return false; }
}

async function write(filePath, contents) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, contents, "utf8");
  count++;
}

// ---------------------------------------------------------------------------
// HTML template
// ---------------------------------------------------------------------------

function renderHtml({ urlPath, metaTitle, metaDescription, h1, breadcrumbs, intro, sections, faqs }) {
  const canonical = `${BASE_URL}${urlPath}`;
  const t = escHtml(metaTitle);
  const d = escHtml(metaDescription);

  const bcHtml = breadcrumbs
    .map((b, i) => `<li><a href="${b.url}">${escHtml(b.name)}</a>${i < breadcrumbs.length - 1 ? " &rsaquo; " : ""}</li>`)
    .join("");
  const bcSchema = `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: breadcrumbs.map((b, i) => ({
      "@type": "ListItem", position: i + 1, name: b.name, item: `${BASE_URL}${b.url}`,
    })),
  })}</script>`;
  const faqSchema = faqs?.length
    ? `<script type="application/ld+json">${JSON.stringify({
        "@context": "https://schema.org", "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({
          "@type": "Question", name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      })}</script>`
    : "";
  const sectionsHtml = sections
    .map((s) => `<section><h2>${escHtml(s.h)}</h2>${s.body.map((p) => `<p>${escHtml(p)}</p>`).join("")}</section>`)
    .join("");
  const faqHtml = faqs?.length
    ? `<section aria-labelledby="faq"><h2 id="faq">Frequently Asked Questions</h2>${faqs
        .map((f) => `<article><h3>${escHtml(f.q)}</h3><p>${escHtml(f.a)}</p></article>`)
        .join("")}</section>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t}</title>
  <meta name="description" content="${d}">
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
  <link rel="canonical" href="${canonical}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${t}">
  <meta property="og:description" content="${d}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:site_name" content="RehabLookup">
  <meta property="og:image" content="${BASE_URL}/og-image.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${t}">
  <meta name="twitter:description" content="${d}">
  <meta name="twitter:image" content="${BASE_URL}/og-image.jpg">
  <link rel="icon" type="image/png" href="/favicon.png">
  ${bcSchema}
  ${faqSchema}
  <style>
    body{font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:920px;margin:0 auto;padding:32px 20px;color:#1a2b4a;line-height:1.7}
    h1{font-size:2rem;color:#1B365D;margin-bottom:12px}
    h2{font-size:1.35rem;color:#1B365D;margin-top:28px}
    h3{font-size:1.1rem;color:#1B365D;margin-top:18px}
    p{color:#333;margin-bottom:14px}
    a{color:#2563eb;text-decoration:none}
    a:hover{text-decoration:underline}
    .breadcrumbs{font-size:.85rem;color:#666;margin-bottom:20px}
    .breadcrumbs ul{list-style:none;padding:0;display:flex;flex-wrap:wrap;gap:4px}
    .intro{font-size:1.05rem;color:#1f2a44}
    footer{margin-top:40px;padding-top:20px;border-top:1px solid #e5e7eb;font-size:.8rem;color:#888}
  </style>
</head>
<body>
  <header><a href="/" aria-label="RehabLookup Home">RehabLookup</a></header>
  <nav class="breadcrumbs" aria-label="Breadcrumb"><ul>${bcHtml}</ul></nav>
  <main>
    <h1>${escHtml(h1)}</h1>
    <p class="intro">${escHtml(intro)}</p>
    ${sectionsHtml}
    ${faqHtml}
    <p style="margin-top:24px"><a href="/rehab-centers">Browse All Treatment Centers</a> &middot; <a href="/concierge">Get Personalized Help</a> &middot; <a href="/">Home</a></p>
  </main>
  <footer><p>&copy; 2026 RehabLookup. All rights reserved. <a href="/privacy-policy">Privacy</a> &middot; <a href="/terms-of-service">Terms</a></p></footer>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Pattern resolvers — turn a URL into a unique page object
// ---------------------------------------------------------------------------

function buildInsurance(urlPath, parts) {
  // /insurance/{plan}/{state}[/county/{county}|/city]
  const planSlug = parts[1];
  const planName = INSURANCE_NAMES[planSlug] || titleCase(planSlug);
  const stateSlug = parts[2];
  const state = stateName(stateSlug);
  const isCounty = parts[3] === "county";
  const county = isCounty ? titleCase(parts[4]) : null;
  const city = !isCounty && parts[3] ? titleCase(parts[3]) : null;
  const locale = county ? `${county} County, ${state}` : city ? `${city}, ${state}` : state;

  return {
    metaTitle: `${planName} Rehab Coverage in ${locale} | RehabLookup`,
    metaDescription: `Find rehab centers in ${locale} that accept ${planName}. Verify benefits, compare programs, and start treatment.`,
    h1: `${planName} Rehab Coverage in ${locale}`,
    intro: `${planName} members in ${locale} have access to a wide range of accredited addiction treatment programs. Use RehabLookup to find local rehab centers that accept ${planName}, verify your benefits, and compare programs side by side.`,
    breadcrumbs: [
      { name: "Home", url: "/" }, { name: "Insurance", url: "/insurance" },
      { name: planName, url: `/insurance/${planSlug}` }, { name: state, url: `/insurance/${planSlug}/${stateSlug}` },
      ...(county ? [{ name: `${county} County`, url: urlPath }] : city ? [{ name: city, url: urlPath }] : []),
    ],
    sections: [
      { h: `What ${planName} Covers in ${state}`, body: [
        `${planName} typically covers medically necessary addiction treatment in ${state}, including detox, inpatient rehab, partial hospitalization (PHP), intensive outpatient (IOP), standard outpatient counseling, and medication-assisted treatment (MAT). Coverage details depend on your specific ${planName} plan tier and network status.`,
        `Most ${planName} plans require an in-network treatment center for the lowest out-of-pocket costs. RehabLookup helps you confirm in-network status before you commit to a program.`,
      ]},
      { h: `Finding ${planName}-Accepting Rehab in ${locale}`, body: [
        `Treatment centers in ${locale} that accept ${planName} are listed across all major levels of care. Whether you need short-term detox, a 30/60/90-day residential program, or flexible outpatient care, you can filter by your insurance plan and the type of program you need.`,
        `If you are unsure whether a facility accepts your specific ${planName} plan, our concierge team can verify benefits with your insurer at no cost.`,
      ]},
      { h: "Verify Your Benefits", body: [
        `Before you contact a treatment center, request a free, confidential benefits verification. We confirm your deductible, copay, out-of-pocket maximum, and prior authorization requirements so there are no surprises after admission.`,
      ]},
    ],
    faqs: [
      { q: `Does ${planName} cover rehab in ${state}?`, a: `Yes. ${planName} covers medically necessary addiction treatment in ${state}, including detox, inpatient, outpatient, and MAT. Specific coverage depends on your plan.` },
      { q: `How do I find an in-network ${planName} rehab in ${locale}?`, a: `Use RehabLookup to filter facilities by insurance, or request a free benefits check and we will identify in-network options for you.` },
      { q: `Do I need prior authorization?`, a: `Most ${planName} plans require prior authorization for inpatient rehab and certain outpatient services. Our team can verify this with your insurer.` },
    ],
  };
}

function buildTreatmentType(urlPath, parts) {
  // /treatment-types/{type}[/state[/city]]
  const typeSlug = parts[1];
  const typeName = TREATMENT_TYPE_LABEL[typeSlug] || titleCase(typeSlug);
  const stateSlug = parts[2];
  const citySlug = parts[3];
  if (!stateSlug) {
    return {
      metaTitle: `${typeName} Programs | RehabLookup`,
      metaDescription: `Compare ${typeName.toLowerCase()} programs across the US. Find accredited treatment centers, verify insurance, and start recovery.`,
      h1: `${typeName} Programs`,
      intro: `Explore ${typeName.toLowerCase()} programs across the United States. RehabLookup lists accredited facilities, treatment approaches, and insurance acceptance so you can choose the right level of care.`,
      breadcrumbs: [{ name: "Home", url: "/" }, { name: "Treatment Types", url: "/treatment-types" }, { name: typeName, url: urlPath }],
      sections: [
        { h: `What Is ${typeName}?`, body: [`${typeName} is a level of addiction care designed to address specific clinical needs. It typically includes assessment, evidence-based therapy, medical support, and aftercare planning.`] },
        { h: "Choosing a Program", body: [`When comparing programs, consider clinical credentials, length of stay, insurance acceptance, family involvement, and aftercare planning. RehabLookup makes side-by-side comparison straightforward.`] },
      ],
      faqs: [
        { q: `What is ${typeName}?`, a: `${typeName} is a structured addiction treatment approach with evidence-based therapy and medical support tailored to individual needs.` },
        { q: `How do I pay for ${typeName}?`, a: `Most ${typeName.toLowerCase()} programs accept private insurance, Medicaid, Medicare, and self-pay. Verify benefits before admission.` },
      ],
    };
  }
  const state = stateName(stateSlug);
  const city = citySlug ? titleCase(citySlug) : null;
  const locale = city ? `${city}, ${state}` : state;
  return {
    metaTitle: `${typeName} in ${locale} | RehabLookup`,
    metaDescription: `Find ${typeName.toLowerCase()} programs in ${locale}. Compare accredited centers, verify insurance, and start treatment.`,
    h1: `${typeName} in ${locale}`,
    intro: `Looking for ${typeName.toLowerCase()} in ${locale}? RehabLookup connects you with accredited facilities offering evidence-based care, insurance verification, and tailored treatment plans.`,
    breadcrumbs: [
      { name: "Home", url: "/" }, { name: "Treatment Types", url: "/treatment-types" },
      { name: typeName, url: `/treatment-types/${typeSlug}` },
      { name: state, url: `/treatment-types/${typeSlug}/${stateSlug}` },
      ...(city ? [{ name: city, url: urlPath }] : []),
    ],
    sections: [
      { h: `${typeName} Options in ${locale}`, body: [
        `${locale} offers a range of ${typeName.toLowerCase()} options, from medically supervised detox to long-term residential care and outpatient programs. The right choice depends on substance use history, co-occurring conditions, work and family obligations, and insurance coverage.`,
        `Programs in ${state} are licensed by the state and many are accredited by The Joint Commission or CARF. Use RehabLookup to filter facilities by accreditation, insurance, and clinical specialties.`,
      ]},
      { h: "What to Expect", body: [
        `Most ${typeName.toLowerCase()} programs begin with a clinical assessment to determine the appropriate level of care. Treatment plans typically combine individual therapy, group counseling, family involvement, and aftercare planning.`,
      ]},
    ],
    faqs: [
      { q: `Is ${typeName} available in ${locale}?`, a: `Yes. ${locale} has multiple accredited facilities offering ${typeName.toLowerCase()}.` },
      { q: `Does insurance cover ${typeName} in ${state}?`, a: `Most major insurers, Medicaid, and Medicare cover ${typeName.toLowerCase()} in ${state}. Verify your specific plan before admission.` },
    ],
  };
}

function buildNearMe(urlPath, parts) {
  // /{near-me-key}/{state}[/county/{county}|/city]
  const key = parts[0];
  const label = NEAR_ME_LABEL[key] || titleCase(key.replace(/-near-me$/, ""));
  const stateSlug = parts[1];
  const state = stateName(stateSlug);
  const isCounty = parts[2] === "county";
  const county = isCounty ? titleCase(parts[3]) : null;
  const city = !isCounty && parts[2] ? titleCase(parts[2]) : null;
  const locale = county ? `${county} County, ${state}` : city ? `${city}, ${state}` : state;
  return {
    metaTitle: `${label} Near Me in ${locale} | RehabLookup`,
    metaDescription: `Find ${label.toLowerCase()} programs in ${locale}. Compare accredited facilities, verify insurance, and start treatment today.`,
    h1: `${label} in ${locale}`,
    intro: `Find ${label.toLowerCase()} programs in ${locale}. RehabLookup helps you compare local facilities, check insurance acceptance, and connect with admissions teams the same day.`,
    breadcrumbs: [
      { name: "Home", url: "/" }, { name: label, url: `/${key}` },
      { name: state, url: `/${key}/${stateSlug}` },
      ...(county ? [{ name: `${county} County`, url: urlPath }] : city ? [{ name: city, url: urlPath }] : []),
    ],
    sections: [
      { h: `${label} Options in ${locale}`, body: [
        `${locale} has accredited treatment centers offering ${label.toLowerCase()} services for individuals and families. Most programs accept private insurance, Medicaid, Medicare, and self-pay.`,
        `When evaluating programs in ${state}, look for state licensure, third-party accreditation (Joint Commission, CARF), evidence-based clinical practices, and aftercare support.`,
      ]},
      { h: "How to Get Started", body: [
        `Browse listings, compare programs, and contact admissions directly. If you are not sure which level of care is right, request a free assessment from our concierge team.`,
      ]},
    ],
    faqs: [
      { q: `Where can I find ${label.toLowerCase()} in ${locale}?`, a: `Use RehabLookup to browse ${label.toLowerCase()} facilities in ${locale}, filter by insurance, and contact admissions.` },
      { q: `What does ${label.toLowerCase()} cost in ${state}?`, a: `Cost varies by level of care and insurance coverage. Many programs accept Medicaid, Medicare, and most private plans.` },
    ],
  };
}

function buildRehabMarketing(urlPath, parts) {
  // /rehab-marketing/{state}/county/{county}/{angle...}
  const stateSlug = parts[1];
  const state = stateName(stateSlug);
  const county = parts[2] === "county" ? titleCase(parts[3]) : null;
  const angle = parts.slice(county ? 4 : 2).join("/");
  const angleLabel = (() => {
    if (angle.startsWith("insurance/")) {
      const ins = angle.split("/")[1];
      return `${titleCase(ins)} Patients`;
    }
    return CARE_TYPE_LABEL[angle] || titleCase(angle);
  })();
  // Avoid awkward duplication like "Residential Treatment Treatment Centers"
  const angleQualifier = angleLabel.replace(/\s+Treatment$/i, "").replace(/\s+Centers?$/i, "");
  const locale = county ? `${county} County, ${state}` : state;
  return {
    metaTitle: `Marketing for ${angleQualifier} Treatment Centers in ${locale} | RehabLookup`,
    metaDescription: `Grow your ${angleLabel.toLowerCase()} program in ${locale}. Patient acquisition, SEO, and admissions strategies for treatment centers.`,
    h1: `Marketing for ${angleQualifier} Treatment Centers in ${locale}`,
    intro: `Treatment centers in ${locale} that focus on ${angleLabel.toLowerCase()} face unique marketing challenges — from local competition to insurance positioning. This guide covers patient acquisition, SEO, and admissions strategies that work in ${state}.`,
    breadcrumbs: [
      { name: "Home", url: "/" }, { name: "For Providers", url: "/for-providers" },
      { name: "Rehab Marketing", url: "/rehab-marketing" },
      { name: state, url: `/rehab-marketing/${stateSlug}` },
      ...(county ? [{ name: `${county} County`, url: `/rehab-marketing/${stateSlug}/county/${parts[3]}` }] : []),
      { name: angleLabel, url: urlPath },
    ],
    sections: [
      { h: `${angleLabel} Demand in ${locale}`, body: [
        `Demand for ${angleLabel.toLowerCase()} services in ${locale} reflects local demographics, insurance mix, and referral patterns. Programs that match their messaging to local search intent and referral channels see the strongest admissions growth.`,
        `Listing your ${angleLabel.toLowerCase()} program on RehabLookup gets you in front of families actively searching for treatment in ${state}.`,
      ]},
      { h: "Patient Acquisition Channels", body: [
        `The most effective channels for ${angleLabel.toLowerCase()} programs in ${locale} are local SEO, Google Business Profile optimization, directory listings (RehabLookup, etc.), and clinical referral relationships.`,
      ]},
    ],
    faqs: [
      { q: `How do I market a ${angleLabel.toLowerCase()} program in ${locale}?`, a: `Combine local SEO, directory listings, and clinical referral relationships. List on RehabLookup to reach families searching for ${angleLabel.toLowerCase()} in ${state}.` },
      { q: `What is the cost per admission?`, a: `Cost per admission varies by channel. Directory listings and organic search typically deliver the lowest cost per admission for ${angleLabel.toLowerCase()} programs.` },
    ],
  };
}

function buildRehabCenters(urlPath, parts) {
  // /rehab-centers/{state}[/county/{county}[/{care-type}] | /{city}[/{care-type}]]
  const stateSlug = parts[1];
  const state = stateName(stateSlug);
  const isCounty = parts[2] === "county";
  const county = isCounty ? titleCase(parts[3]) : null;
  const city = !isCounty && parts[2] ? titleCase(parts[2]) : null;
  const lastIdx = parts.length - 1;
  const trailing = parts[lastIdx];
  const care = (county && lastIdx >= 4) || (city && lastIdx >= 3) ? CARE_TYPE_LABEL[trailing] || titleCase(trailing) : null;
  const locale = county ? `${county} County, ${state}` : city ? `${city}, ${state}` : state;
  const titlePrefix = care ? `${care} in ${locale}` : `Rehab Centers in ${locale}`;
  return {
    metaTitle: `${titlePrefix} | RehabLookup`,
    metaDescription: care
      ? `Find ${care.toLowerCase()} programs in ${locale}. Compare accredited facilities and verify insurance.`
      : `Find accredited rehab centers in ${locale}. Compare programs, verify insurance, and start treatment.`,
    h1: titlePrefix,
    intro: care
      ? `Looking for ${care.toLowerCase()} in ${locale}? Browse accredited facilities, compare clinical approaches, and verify insurance coverage in one place.`
      : `Browse accredited rehab centers in ${locale}. Compare inpatient, outpatient, detox, and dual diagnosis programs side by side.`,
    breadcrumbs: [
      { name: "Home", url: "/" }, { name: "Rehab Centers", url: "/rehab-centers" },
      { name: state, url: `/rehab-centers/${stateSlug}` },
      ...(county ? [{ name: `${county} County`, url: `/rehab-centers/${stateSlug}/county/${parts[3]}` }] : city ? [{ name: city, url: `/rehab-centers/${stateSlug}/${parts[2]}` }] : []),
      ...(care ? [{ name: care, url: urlPath }] : []),
    ],
    sections: [
      { h: `Treatment in ${locale}`, body: [
        `${locale} offers accredited addiction treatment programs across every level of care, from medical detox through residential rehab and outpatient counseling. Most facilities accept major commercial insurance, Medicaid, Medicare, and self-pay.`,
        `When comparing options, look for state licensure, third-party accreditation, clinical credentials, and clearly described aftercare planning.`,
      ]},
      { h: "What Programs Cost", body: [
        `Treatment cost depends on level of care, length of stay, and insurance coverage. RehabLookup lists insurance acceptance for each facility, and our concierge team can verify your benefits at no cost.`,
      ]},
    ],
    faqs: [
      { q: `How do I find rehab in ${locale}?`, a: `Browse RehabLookup's directory for ${locale}, filter by insurance and care type, and contact admissions.` },
      { q: `Do programs in ${state} accept insurance?`, a: `Yes. Most accredited programs in ${state} accept major commercial insurance, Medicaid, and Medicare.` },
    ],
  };
}

function buildLocalizedRehab(urlPath, slug) {
  // Catch-all for slugs like /alcohol-addiction-treatment/colorado, /xanax-addiction-treatment/north-carolina,
  // /college-student-addiction-treatment/new-mexico, /lgbtq-rehab-programs/arizona, /teachers-rehab-programs/utah,
  // /eating-disorders-and-addiction-treatment/north-carolina, /benzodiazepine-addiction-treatment/florida/jacksonville,
  // /meth-addiction-treatment/texas/fort-worth, /prescription-drug-rehab/arizona/phoenix
  const parts = slug.split("/");
  const topic = parts[0];
  const stateSlug = parts[1];
  const citySlug = parts[2];
  const topicLabel = titleCase(topic.replace(/-/g, "-"));
  const state = stateName(stateSlug);
  const city = citySlug ? titleCase(citySlug) : null;
  const locale = city ? `${city}, ${state}` : state;
  return {
    metaTitle: `${topicLabel} in ${locale} | RehabLookup`,
    metaDescription: `Find ${topicLabel.toLowerCase()} programs in ${locale}. Compare accredited centers, verify insurance, and start care.`,
    h1: `${topicLabel} in ${locale}`,
    intro: `Looking for ${topicLabel.toLowerCase()} in ${locale}? RehabLookup connects you with accredited treatment programs, insurance verification, and same-day admissions support.`,
    breadcrumbs: [
      { name: "Home", url: "/" }, { name: topicLabel, url: `/${topic}` },
      { name: state, url: `/${topic}/${stateSlug}` },
      ...(city ? [{ name: city, url: urlPath }] : []),
    ],
    sections: [
      { h: `${topicLabel} Options in ${locale}`, body: [
        `${locale} offers accredited ${topicLabel.toLowerCase()} programs with evidence-based clinical care. Most accept major commercial insurance, Medicaid, Medicare, and offer financial assistance for self-pay clients.`,
      ]},
      { h: "How to Choose a Program", body: [
        `Look for state licensure, third-party accreditation, qualified clinical staff, and clear aftercare planning. RehabLookup makes it easy to compare programs side by side.`,
      ]},
    ],
    faqs: [
      { q: `Is ${topicLabel.toLowerCase()} available in ${locale}?`, a: `Yes. ${locale} has multiple accredited facilities offering ${topicLabel.toLowerCase()}.` },
      { q: `Does insurance cover this in ${state}?`, a: `Most insurers cover medically necessary addiction treatment in ${state}. Verify your specific plan before admission.` },
    ],
  };
}

function buildStateRehabilitation(urlPath, slug) {
  // /{type}-rehabilitation-{state}, /dual-diagnosis-treatment-{state}, /detox-programs-{state}
  const m = slug.match(/^(alcohol|drug|outpatient|inpatient|dual-diagnosis-treatment|detox-programs)-?(rehabilitation|treatment|programs)?-(.+)$/);
  if (!m) return null;
  const typeRaw = m[1];
  const stateSlug = m[3];
  const state = stateName(stateSlug);
  if (!STATE_NAMES[stateSlug]) return null;
  const typeLabel =
    typeRaw === "dual-diagnosis-treatment" ? "Dual Diagnosis Treatment"
    : typeRaw === "detox-programs" ? "Detox Programs"
    : `${titleCase(typeRaw)} Rehabilitation`;
  return {
    metaTitle: `${typeLabel} in ${state} | RehabLookup`,
    metaDescription: `Find ${typeLabel.toLowerCase()} programs in ${state}. Compare accredited facilities, verify insurance, and start treatment.`,
    h1: `${typeLabel} in ${state}`,
    intro: `Find ${typeLabel.toLowerCase()} programs in ${state}. RehabLookup lists accredited facilities, insurance acceptance, and admissions contacts so you can take the next step quickly.`,
    breadcrumbs: [
      { name: "Home", url: "/" }, { name: "Locations", url: "/locations" },
      { name: state, url: `/rehab-centers/${stateSlug}` }, { name: typeLabel, url: urlPath },
    ],
    sections: [
      { h: `${typeLabel} Options in ${state}`, body: [
        `${state} has accredited ${typeLabel.toLowerCase()} programs across every level of care. Most accept commercial insurance, Medicaid, and Medicare.`,
      ]},
      { h: "Choosing the Right Program", body: [
        `Match the level of care to clinical need: medical detox for acute withdrawal, residential for high-acuity cases, IOP/PHP for stable transitions, and outpatient counseling for early-stage or aftercare needs.`,
      ]},
    ],
    faqs: [
      { q: `Where is ${typeLabel.toLowerCase()} available in ${state}?`, a: `Browse RehabLookup's directory for ${state} and filter by program type and insurance.` },
    ],
  };
}

function buildHubPage(urlPath, slug) {
  const map = {
    "veterans-rehab-centers": ["Veterans Rehab Centers", "Find rehab centers serving veterans across the US, including VA-covered programs and PTSD-informed addiction treatment."],
    "faith-based-rehab-centers": ["Faith-Based Rehab Centers", "Find faith-based rehab centers integrating spiritual support with evidence-based addiction treatment."],
    "mens-rehab-centers": ["Men's Rehab Centers", "Find men-only rehab centers with gender-specific addiction treatment programs."],
    "womens-rehab-centers": ["Women's Rehab Centers", "Find women-only rehab centers with gender-specific addiction treatment programs."],
    "luxury-rehab-centers": ["Luxury Rehab Centers", "Find luxury rehab centers with premium amenities, private accommodations, and world-class addiction treatment."],
    "fentanyl-rehab-centers": ["Fentanyl Rehab Centers", "Find specialized fentanyl addiction treatment with medical detox, MAT, and long-term recovery programs."],
    "inpatient-rehab-centers": ["Inpatient Rehab Centers", "Find residential inpatient rehab programs with 24/7 care and structured treatment environments."],
    "detox-centers-centers": ["Medical Detox Centers", "Find medically supervised detox centers with 24/7 care for safe withdrawal management."],
  };
  const m = map[slug];
  if (!m) return null;
  return {
    metaTitle: `${m[0]} | RehabLookup`,
    metaDescription: m[1],
    h1: m[0],
    intro: m[1],
    breadcrumbs: [{ name: "Home", url: "/" }, { name: m[0], url: urlPath }],
    sections: [
      { h: "Find a Program", body: [`Browse accredited ${m[0].toLowerCase()} on RehabLookup, compare clinical approaches, and verify insurance coverage in one place.`] },
      { h: "Verify Insurance", body: [`Most major commercial plans, Medicaid, Medicare, and TRICARE cover medically necessary addiction treatment. Request a free benefits verification.`] },
    ],
    faqs: [{ q: `How do I find a ${m[0].toLowerCase()}?`, a: `Use RehabLookup's directory, filter by insurance and location, and contact admissions directly.` }],
  };
}

function buildCityRehab(urlPath, slug) {
  // /{type}-rehab-in-{city}, /faith-based-rehab-in-{city}, /veterans-rehab-in-{city}, /list-your-facility-in-{city}-{state}
  const m = slug.match(/^(.+?)-in-([a-z0-9-]+?)(-fl|-ca|-tx|-ny|-pa|-ga|-nc|-va|-il|-oh|-mi|-az|-wa|-ma|-md|-mo|-co|-tn|-in|-wi|-mn|-sc|-al|-la|-ky|-or|-ok|-ct|-ut|-nv|-ar|-ms|-ks|-nm|-ne|-wv|-id|-hi|-nh|-me|-mt|-ri|-de|-sd|-nd|-ak|-vt|-wy|-indiana)?$/);
  if (!m) return null;
  const typeSlug = m[1];
  const citySlug = m[2];
  const city = titleCase(citySlug);
  const typeLabel = titleCase(typeSlug.replace(/-/g, " "));
  return {
    metaTitle: `${typeLabel} in ${city} | RehabLookup`,
    metaDescription: `Find ${typeLabel.toLowerCase()} programs in ${city}. Compare accredited facilities, verify insurance, and start treatment.`,
    h1: `${typeLabel} in ${city}`,
    intro: `Find ${typeLabel.toLowerCase()} programs in ${city}. Compare accredited facilities, check insurance acceptance, and connect with admissions teams the same day.`,
    breadcrumbs: [{ name: "Home", url: "/" }, { name: typeLabel, url: `/${typeSlug}` }, { name: city, url: urlPath }],
    sections: [
      { h: `${typeLabel} Options in ${city}`, body: [
        `${city} has accredited ${typeLabel.toLowerCase()} programs offering evidence-based clinical care. Most accept major commercial insurance, Medicaid, and Medicare.`,
      ]},
      { h: "Verify Insurance", body: [`Confirm in-network status and benefits before admission. RehabLookup offers a free benefits verification.`] },
    ],
    faqs: [{ q: `Is ${typeLabel.toLowerCase()} available in ${city}?`, a: `Yes. ${city} has multiple accredited facilities offering ${typeLabel.toLowerCase()}.` }],
  };
}

function buildProviderCity(urlPath, slug) {
  // /get-more-{insurer}-patients-in-{city}-{state}
  const m = slug.match(/^get-more-(.+)-patients-in-(.+)-(alabama|alaska|arizona|arkansas|california|colorado|connecticut|delaware|florida|georgia|hawaii|idaho|illinois|indiana|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|missouri|montana|nebraska|nevada|new-hampshire|new-jersey|new-mexico|new-york|north-carolina|north-dakota|ohio|oklahoma|oregon|pennsylvania|rhode-island|south-carolina|south-dakota|tennessee|texas|utah|vermont|virginia|washington|west-virginia|wisconsin|wyoming)$/);
  if (!m) return null;
  const insurer = titleCase(m[1]);
  const city = titleCase(m[2]);
  const state = stateName(m[3]);
  return {
    metaTitle: `Get More ${insurer} Patients in ${city}, ${state} | RehabLookup`,
    metaDescription: `Patient acquisition for ${insurer}-accepting treatment centers in ${city}, ${state}. SEO, listings, and referral strategies that grow admissions.`,
    h1: `Get More ${insurer} Patients in ${city}, ${state}`,
    intro: `Treatment centers in ${city}, ${state} that accept ${insurer} can grow admissions by combining local SEO, directory listings, and referral relationships. This guide covers what works in ${state}.`,
    breadcrumbs: [{ name: "Home", url: "/" }, { name: "For Providers", url: "/for-providers" }, { name: `${insurer} in ${city}`, url: urlPath }],
    sections: [
      { h: `${insurer} Patient Demand in ${city}`, body: [`${insurer} members in ${city}, ${state} actively search for in-network rehab. Listing on RehabLookup with verified ${insurer} acceptance puts you in front of families ready to admit.`] },
      { h: "Top Acquisition Channels", body: [`Local SEO, Google Business Profile, directory listings, and clinical referral relationships consistently produce the lowest cost per admission for insurance-targeted programs.`] },
    ],
    faqs: [{ q: `How do I get more ${insurer} patients?`, a: `List on RehabLookup with verified ${insurer} acceptance, optimize Google Business Profile for ${city}, and build referral relationships with local health systems.` }],
  };
}

function buildBestRehab(urlPath, slug) {
  const m = slug.match(/^best-rehab-centers-in-(.+)$/);
  if (!m) return null;
  const stateSlug = m[1];
  const state = stateName(stateSlug);
  if (!STATE_NAMES[stateSlug]) return null;
  return {
    metaTitle: `Best Rehab Centers in ${state} | RehabLookup`,
    metaDescription: `Compare the best accredited rehab centers in ${state}. Verified reviews, insurance acceptance, and program details.`,
    h1: `Best Rehab Centers in ${state}`,
    intro: `Compare top-rated, accredited rehab centers in ${state}. RehabLookup ranks facilities by accreditation, verified reviews, insurance acceptance, and clinical specialties.`,
    breadcrumbs: [{ name: "Home", url: "/" }, { name: "Rehab Centers", url: "/rehab-centers" }, { name: state, url: `/rehab-centers/${stateSlug}` }, { name: `Best in ${state}`, url: urlPath }],
    sections: [
      { h: `What Makes a Top Rehab Center in ${state}`, body: [
        `Top-rated rehab centers in ${state} share common attributes: state licensure, third-party accreditation (Joint Commission or CARF), board-certified clinical staff, evidence-based therapies, and structured aftercare planning.`,
      ]},
      { h: "How We Rank Programs", body: [
        `RehabLookup combines verified reviews, accreditation status, insurance acceptance, and program transparency to highlight the strongest options in ${state}.`,
      ]},
    ],
    faqs: [{ q: `What is the best rehab in ${state}?`, a: `The best rehab depends on individual clinical needs. Browse RehabLookup's top-rated ${state} programs and filter by insurance and care type.` }],
  };
}

function buildNearMeHub(urlPath, key) {
  const label = NEAR_ME_LABEL[key] || titleCase(key.replace(/-near-me$/, ""));
  return {
    metaTitle: `${label} Near Me | RehabLookup`,
    metaDescription: `Find ${label.toLowerCase()} programs near you. Browse accredited centers nationwide, verify insurance, and start treatment today.`,
    h1: `${label} Near Me`,
    intro: `Looking for ${label.toLowerCase()} near you? RehabLookup lists accredited ${label.toLowerCase()} programs across the United States, with insurance verification and same-day admissions support.`,
    breadcrumbs: [{ name: "Home", url: "/" }, { name: `${label} Near Me`, url: urlPath }],
    sections: [
      { h: `How to Find ${label} Near You`, body: [
        `Browse RehabLookup's nationwide directory of ${label.toLowerCase()} programs. Filter by state, city, insurance, and clinical specialty to find the right fit.`,
        `Most ${label.toLowerCase()} programs accept private insurance, Medicaid, Medicare, and self-pay. Verify benefits before admission for the lowest out-of-pocket cost.`,
      ]},
      { h: "What to Expect", body: [
        `${label} typically begins with a clinical assessment, followed by an individualized treatment plan combining therapy, medical support, and aftercare planning.`,
      ]},
    ],
    faqs: [
      { q: `How do I find ${label.toLowerCase()} near me?`, a: `Use RehabLookup to browse ${label.toLowerCase()} programs by state and city, filter by insurance, and contact admissions directly.` },
      { q: `Does insurance cover ${label.toLowerCase()}?`, a: `Most major insurers, Medicaid, and Medicare cover medically necessary ${label.toLowerCase()}. Request a free benefits verification before admission.` },
    ],
  };
}

function buildListYourFacility(urlPath, slug) {
  // /list-your-facility-in-{slug}
  const tail = slug.replace(/^list-your-facility-in-/, "");
  // Detect if last segment is a known state
  const tailParts = tail.split("-");
  let stateSlug = null;
  // Try matching trailing segments as state (longest first)
  for (let i = 1; i <= 3 && i <= tailParts.length; i++) {
    const candidate = tailParts.slice(-i).join("-");
    if (STATE_NAMES[candidate]) { stateSlug = candidate; break; }
  }
  const state = stateSlug ? STATE_NAMES[stateSlug] : null;
  const cityPart = stateSlug ? tailParts.slice(0, tailParts.length - stateSlug.split("-").length).join("-") : tail;
  const city = cityPart ? titleCase(cityPart) : null;
  const locale = city && state ? `${city}, ${state}` : state || titleCase(tail);
  return {
    metaTitle: `List Your Facility in ${locale} | RehabLookup`,
    metaDescription: `List your treatment center on RehabLookup and reach families searching for accredited addiction treatment in ${locale}.`,
    h1: `List Your Facility in ${locale}`,
    intro: `${locale} families search RehabLookup every day for accredited addiction treatment. List your facility to reach them with a verified profile, insurance acceptance, and direct admissions inquiries.`,
    breadcrumbs: [
      { name: "Home", url: "/" },
      { name: "For Providers", url: "/for-providers" },
      { name: locale, url: urlPath },
    ],
    sections: [
      { h: `Why List on RehabLookup in ${locale}`, body: [
        `Verified directory listing with insurance acceptance, photos, accreditation badges, and direct family inquiries from people searching for treatment in ${locale}.`,
        `Pro plans get priority placement, lead routing, and detailed performance analytics so you can measure cost per admission accurately.`,
      ]},
      { h: "Get Started", body: [
        `Create your profile, verify accreditation, and start receiving inquiries within 24 hours. Our team helps with profile setup at no cost.`,
      ]},
    ],
    faqs: [
      { q: `How much does it cost to list a facility in ${locale}?`, a: `Free basic listings are available. Pro plans ($399/mo) include priority placement, verified inquiries, and a 20% discount on lead unlocks.` },
      { q: `How long does verification take?`, a: `Most facilities are verified within 24-48 hours after submitting accreditation and licensure documentation.` },
    ],
  };
}



function resolve(urlPath) {
  const clean = urlPath.replace(/\/+$/, "");
  const slug = clean.replace(/^\//, "");
  const parts = slug.split("/");

  if (parts[0] === "insurance" && parts.length >= 3) return buildInsurance(clean, parts);
  if (parts[0] === "treatment-types" && parts.length >= 2) return buildTreatmentType(clean, parts);
  if (parts[0] === "rehab-marketing" && parts.length >= 2) return buildRehabMarketing(clean, parts);
  if (parts[0] === "rehab-centers" && parts.length >= 2) return buildRehabCenters(clean, parts);
  if (NEAR_ME_LABEL[parts[0]] && parts.length >= 2) return buildNearMe(clean, parts);

  // Bare near-me hubs (e.g., /sober-living-near-me, /teen-rehab-near-me)
  if (parts.length === 1 && (NEAR_ME_LABEL[parts[0]] || parts[0].endsWith("-near-me"))) {
    return buildNearMeHub(clean, parts[0]);
  }

  const stateRehab = buildStateRehabilitation(clean, slug);
  if (stateRehab) return stateRehab;

  const best = buildBestRehab(clean, slug);
  if (best) return best;

  const provider = buildProviderCity(clean, slug);
  if (provider) return provider;

  // Generalized list-your-facility-in-{location} resolver
  if (slug.startsWith("list-your-facility-in-")) {
    return buildListYourFacility(clean, slug);
  }

  if (slug === "list-your-facility-in-indianapolis-indiana") {
    return {
      metaTitle: "List Your Facility in Indianapolis, Indiana | RehabLookup",
      metaDescription: "List your treatment center on RehabLookup and reach families searching for addiction treatment in Indianapolis, Indiana.",
      h1: "List Your Facility in Indianapolis, Indiana",
      intro: "Indianapolis families search RehabLookup for accredited addiction treatment every day. List your facility to reach them with verified profile, insurance acceptance, and direct admissions contact.",
      breadcrumbs: [{ name: "Home", url: "/" }, { name: "For Providers", url: "/for-providers" }, { name: "Indianapolis, IN", url: clean }],
      sections: [
        { h: "Why List on RehabLookup", body: ["Verified directory listing with insurance acceptance, photos, accreditation badges, and direct family inquiries."] },
        { h: "Get Started", body: ["Create your profile, verify accreditation, and start receiving inquiries within 24 hours."] },
      ],
      faqs: [{ q: "How much does listing cost?", a: "Free basic listings are available. Pro plans include priority placement and verified inquiries." }],
    };
  }

  // City/town in-X pages
  if (slug.includes("-in-")) {
    const city = buildCityRehab(clean, slug);
    if (city) return city;
  }

  // Localized topic pages: /{topic}/{state}[/{city}]
  if (parts.length >= 2 && STATE_NAMES[parts[1]]) {
    return buildLocalizedRehab(clean, slug);
  }

  // Hub pages
  const hub = buildHubPage(clean, slug);
  if (hub) return hub;

  return null;
}

// ---------------------------------------------------------------------------
// URL list (synced with the GSC export the user provided)
// ---------------------------------------------------------------------------

const URLS = [
  "/insurance/tricare-rehab/california/county/los-angeles",
  "/treatment-types/drug-addiction/south-carolina",
  "/insurance/medicare-rehab/north-dakota",
  "/rehab-marketing/nevada/county/lyon/residential",
  "/rehab-marketing/mississippi/county/hinds/sober-living",
  "/rehab-marketing/missouri/county/st-louis-city/dual-diagnosis",
  "/alcohol-rehab-near-me/new-york",
  "/inpatient-rehab-near-me/missouri",
  "/insurance/medicare-rehab/california/county/riverside",
  "/rehab-centers/nevada/county/clark",
  "/insurance/kaiser-rehab/alabama",
  "/insurance/bcbs-treatment/idaho",
  "/insurance/bcbs-treatment/new-hampshire",
  "/united-healthcare-rehab-near-me/new-mexico",
  "/free-rehab-near-me/florida",
  "/insurance/aetna-rehab/idaho",
  "/teen-rehab-near-me/illinois",
  "/alcohol-rehab-near-me/florida/county/hillsborough",
  "/insurance/anthem-rehab/north-dakota",
  "/insurance/oscar-rehab/alabama/huntsville",
  "/affordable-rehab-near-me/kentucky/county/daviess",
  "/rehab-marketing/louisiana/county/calcasieu/luxury",
  "/insurance/oscar-rehab/minnesota/county/anoka",
  "/rehab-marketing/arizona/county/cochise/sober-living",
  "/insurance/oscar-rehab/virginia/county/chesterfield",
  "/insurance/wellcare-rehab/new-mexico/county/san-juan",
  "/insurance/bcbs-treatment/mississippi/county/hinds",
  "/opioid-rehab-near-me/utah/county/iron",
  "/treatment-types/outpatient-programs",
  "/insurance/ambetter-rehab/idaho",
  "/insurance/tricare-rehab/iowa",
  "/insurance/medicaid-rehab/new-hampshire",
  "/insurance/tricare-rehab/vermont",
  "/insurance/aetna-rehab/new-hampshire",
  "/rehab-near-me/california/county/alameda",
  "/insurance/medicare-rehab/missouri/county/st-louis-city",
  "/mat-clinic-near-me/colorado/county/adams",
  "/inpatient-rehab-near-me/iowa",
  "/insurance/ambetter-rehab/oregon",
  "/insurance/tricare-rehab/north-carolina",
  "/mens-rehab-near-me/minnesota/county/ramsey",
  "/veterans-rehab-centers",
  "/rehab-marketing/maine/county/cumberland/insurance/cigna",
  "/insurance/cigna-rehab/idaho",
  "/teen-rehab-near-me/kansas",
  "/free-rehab-near-me/colorado",
  "/best-rehab-centers-in-wyoming",
  "/treatment-types/drug-addiction/california/san-jose",
  "/rehab-marketing/kentucky/county/kenton/mat",
  "/insurance/wellcare-rehab/utah/ogden",
  "/college-student-addiction-treatment/new-mexico",
  "/affordable-rehab-near-me/florida/county/volusia",
  "/free-rehab-near-me/mississippi/county/harrison",
  "/inpatient-rehab-near-me/maryland",
  "/cigna-rehab-near-me/new-jersey",
  "/insurance/aetna-rehab/alabama",
  "/treatment-types/drug-addiction/arizona",
  "/insurance/humana-rehab/oklahoma",
  "/insurance/tricare-rehab/arkansas",
  "/treatment-types/alcohol-rehabilitation/hawaii",
  "/insurance/ambetter-rehab/alabama",
  "/rehab-centers/nevada/county/washoe",
  "/treatment-types/drug-addiction/california/malibu",
  "/rehab-centers/massachusetts/county/norfolk-co",
  "/treatment-types/alcohol-rehabilitation/california/san-jose",
  "/luxury-rehab-near-me/arizona",
  "/teen-rehab-near-me/connecticut",
  "/outpatient-rehab-near-me/new-mexico/county/san-juan",
  "/drug-rehab-near-me/minnesota/county/st-louis",
  "/affordable-rehab-near-me/wisconsin/county/winnebago",
  "/inpatient-rehab-near-me/oklahoma",
  "/detox-near-me/michigan/county/kent",
  "/medicaid-rehab-near-me/ohio/county/lorain",
  "/alcohol-rehab-near-me/virginia/county/chesterfield",
  "/teen-rehab-near-me/florida",
  "/same-day-rehab-near-me/indiana",
  "/lgbtq-rehab-programs/arizona",
  "/faith-based-rehab-centers",
  "/same-day-rehab-near-me/massachusetts",
  "/detox-near-me/wyoming/county/albany",
  "/free-rehab-near-me/maine",
  "/inpatient-rehab-in-st-petersburg",
  "/faith-based-rehab-in-roanoke",
  "/inpatient-rehab-centers",
  "/detox-centers-centers",
  "/mens-rehab-centers",
  "/list-your-facility-in-indianapolis-indiana",
  "/womens-rehab-centers",
  "/fentanyl-rehab-centers",
  "/college-student-addiction-treatment/ohio/columbus",
  "/womens-rehab-near-me/new-york/county/erie",
  "/outpatient-rehab-in-west-palm-beach",
  "/luxury-rehab-centers",
  "/dual-diagnosis-treatment-in-chula-vista",
  "/luxury-rehab-in-hollywood-fl",
  "/insurance/aetna-rehab/north-carolina/raleigh",
  "/outpatient-rehab-in-gainesville-fl",
  "/outpatient-rehab-in-hialeah",
  "/free-rehab-in-hollywood-fl",
  "/free-rehab-near-me/connecticut",
  "/detox-near-me/nevada/county/elko",
  "/faith-based-rehab-in-stockton",
  "/outpatient-rehab-near-me/new-york/county/monroe",
  "/medicare-rehab-near-me/alabama",
  "/inpatient-rehab-in-san-bernardino",
  "/treatment-types/drug-addiction/texas/dallas",
  "/rehab-marketing/nevada/county/washoe/dual-diagnosis",
  "/luxury-rehab-near-me/indiana",
  "/rehab-marketing/colorado/county/boulder/insurance/united-healthcare",
  "/insurance/humana-rehab/arkansas/county/pulaski",
  "/medicaid-rehab-near-me/ohio/county/butler",
  "/alcohol-rehab-near-me/pennsylvania",
  "/teen-rehab-near-me/arkansas",
  "/faith-based-rehab-in-riverside",
  "/veterans-rehab-in-bellevue",
  "/rehab-centers/oregon/county/multnomah/inpatient-rehab",
  "/rehab-marketing/washington/county/clark/detox",
  "/rehab-marketing/south-carolina/county/richland/sober-living",
  "/womens-rehab-near-me/maine/county/androscoggin",
  "/affordable-rehab-near-me/nebraska/county/lancaster",
  "/luxury-rehab-near-me/kansas",
  "/insurance/medicaid-rehab/new-jersey/county/burlington",
  "/insurance/ambetter-rehab/indiana/county/marion",
  "/inpatient-rehab-near-me/idaho",
  "/prescription-drug-rehab/arizona/phoenix",
  "/insurance/medicaid-rehab/delaware/county/sussex",
  "/insurance/medicare-rehab/delaware/county/new-castle",
  "/insurance/kaiser-rehab/nebraska/omaha",
  "/mat-clinic-near-me/new-mexico/county/lea",
  "/rehab-near-me/louisiana/county/bossier",
  "/emergency-rehab-near-me/south-dakota",
  "/free-rehab-near-me/kentucky",
  "/inpatient-rehab-near-me/maine",
  "/drug-rehab-near-me/new-hampshire",
  "/rehab-marketing/utah/county/salt-lake/sober-living",
  "/insurance/highmark-rehab/michigan/county/oakland",
  "/rehab-marketing/missouri/county/jefferson/insurance/blue-cross",
  "/opioid-rehab-near-me/texas/county/bexar",
  "/rehab-marketing/massachusetts/county/norfolk/insurance/medicaid",
  "/insurance/magellan-rehab/utah/county/salt-lake",
  "/rehab-marketing/georgia/county/dekalb/dual-diagnosis",
  "/insurance/wellcare-rehab/louisiana/county/st-tammany",
  "/insurance/humana-rehab/illinois/county/lake",
  "/insurance/anthem-rehab/california",
  "/insurance/aetna-rehab/idaho/county/kootenai",
  "/insurance/medicare-rehab/new-york/county/kings",
  "/rehab-marketing/georgia/sober-living",
  "/30-day-rehab-near-me/florida/orlando",
  "/insurance/tricare-rehab/new-mexico/county/san-juan",
  "/veterans-rehab-in-richmond",
  "/dual-diagnosis-treatment-michigan",
  "/inpatient-rehabilitation-montana",
  "/outpatient-rehabilitation-rhode-island",
  "/drug-rehabilitation-montana",
  "/alcohol-rehabilitation-montana",
  "/dual-diagnosis-treatment-montana",
  "/outpatient-rehabilitation-montana",
  "/outpatient-rehabilitation-michigan",
  "/drug-rehabilitation-michigan",
  "/alcohol-rehabilitation-michigan",
  "/drug-rehabilitation-ohio",
  "/benzodiazepine-addiction-treatment/florida/jacksonville",
  "/treatment-types/womens-rehab/new-york",
  "/eating-disorders-and-addiction-treatment/north-carolina",
  "/meth-addiction-treatment/texas/fort-worth",
  "/get-more-cigna-patients-in-denver-colorado",
  "/get-more-united-healthcare-patients-in-boise-idaho",
  "/get-more-aetna-patients-in-detroit-michigan",
  "/treatment-types/veterans-rehab/south-carolina",
  "/xanax-addiction-treatment/north-carolina",
  "/rehab-centers/iowa/county/scott/alcohol-rehab",
  "/alcohol-addiction-treatment/colorado",
  "/teachers-rehab-programs/utah",
  "/rehab-centers/north-carolina/county/cabarrus",
  "/rehab-centers/colorado/county/denver/detox-centers",
  "/rehab-centers/maine/county/androscoggin/alcohol-rehab",
  "/rehab-centers/north-dakota/county/stark/outpatient-rehab",
  "/medicare-rehab-near-me/florida/miami",
  "/rehab-centers/south-carolina/county/charleston-co",
  "/rehab-centers/kansas/county/douglas-ks",
  "/rehab-centers/kansas/county/johnson-ks",
  "/rehab-centers/south-carolina/county/lexington-co",
  "/rehab-centers/kansas/county/shawnee-co",
  "/rehab-centers/nevada/carson-city",
  "/rehab-centers/montana/belgrade",
  "/alcohol-rehab-near-me/arkansas",
  "/rehab-centers/ohio/dayton",
  "/treatment-types/dual-diagnosis-treatment/north-carolina",
  "/rehab-centers/louisiana/lake-charles",
  "/insurance/cigna-rehab/ohio",
  "/rehab-centers/pennsylvania/harrisburg",

  // ── Batch 2: GSC "Alternate page with proper canonical tag" recovery ──
  "/insurance/tricare-rehab/massachusetts/county/worcester",
  "/insurance/kaiser-rehab/california/malibu",
  "/rehab-centers/maryland/towson",
  "/emergency-rehab-near-me/nevada/las-vegas",
  "/dual-diagnosis-near-me/alaska",
  "/treatment-types/residential-inpatient/texas/frisco",
  "/treatment-types/dual-diagnosis-treatment/illinois/naperville",
  "/treatment-types/dual-diagnosis-treatment/vermont/montpelier",
  "/treatment-types/residential-inpatient/texas/grand-prairie",
  "/treatment-types/dual-diagnosis-treatment/hawaii/honolulu",
  "/rehab-centers/florida/st-petersburg",
  "/treatment-types/detox-programs/rhode-island",
  "/treatment-types/detox-programs/rhode-island/east-providence",
  "/treatment-types/dual-diagnosis-treatment/maryland/rockville",
  "/treatment-types/detox-programs/maryland/baltimore",
  "/treatment-types/dual-diagnosis-treatment/texas/lubbock",
  "/treatment-types/dual-diagnosis-treatment/louisiana/new-orleans",
  "/treatment-types/dual-diagnosis-treatment/louisiana/shreveport",
  "/treatment-types/outpatient-programs/new-hampshire/dover",
  "/treatment-types/outpatient-programs/kansas/kansas-city",
  "/treatment-types/outpatient-programs/south-dakota/watertown",
  "/dual-diagnosis-near-me/colorado",
  "/treatment-types/detox-programs/hawaii/maui",
  "/treatment-types/detox-programs/virginia",
  "/rehab-centers/virginia/alexandria",
  "/treatment-types/dual-diagnosis-treatment/massachusetts/lowell",
  "/treatment-types/outpatient-programs/maryland/columbia",
];

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

const failed = [];

for (const urlPath of URLS) {
  const page = resolve(urlPath);
  if (!page) {
    failed.push(urlPath);
    continue;
  }
  const slug = urlPath.replace(/^\//, "").replace(/\/+$/, "");
  const filePath = path.join(publicDir, `${slug}.html`);
  // Don't overwrite an existing prerendered file (those are already in /public)
  if (await exists(filePath)) {
    skipped++;
    continue;
  }
  await write(filePath, renderHtml({
    urlPath,
    metaTitle: page.metaTitle,
    metaDescription: page.metaDescription,
    h1: page.h1,
    breadcrumbs: page.breadcrumbs,
    intro: page.intro,
    sections: page.sections,
    faqs: page.faqs,
  }));
}

console.log(`✓ GSC recovery: generated ${count} static HTML files (skipped ${skipped} existing).`);
if (failed.length) {
  console.error(`✗ ${failed.length} URL(s) had no resolver:`);
  failed.forEach((u) => console.error(`  ${u}`));
  process.exit(1);
}

/**
 * generate-missing-nearme-html.mjs
 *
 * Generates pre-rendered HTML for the 54 near-me state pages that were
 * missed by the original generate-all-missing-html.mjs script:
 *   - opioid-rehab-near-me/{all 50 states}
 *   - benzo-rehab-near-me/texas
 *   - cocaine-rehab-near-me/texas
 *   - heroin-rehab-near-me/texas
 *   - meth-rehab-near-me/texas
 *
 * These pages are in the sitemap but had no pre-rendered HTML file,
 * causing Googlebot to receive the homepage canonical tag.
 */

import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { GA_MEASUREMENT_ID } from './_ga.mjs';
import { seoStyles, seoHeader, seoCtaStrip, seoFooter } from './_seo-page-shell.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, '..', 'public');
const BASE_URL = 'https://rehablookup.com';

const US_STATES = [
  'alabama', 'alaska', 'arizona', 'arkansas', 'california',
  'colorado', 'connecticut', 'delaware', 'florida', 'georgia',
  'hawaii', 'idaho', 'illinois', 'indiana', 'iowa',
  'kansas', 'kentucky', 'louisiana', 'maine', 'maryland',
  'massachusetts', 'michigan', 'minnesota', 'mississippi', 'missouri',
  'montana', 'nebraska', 'nevada', 'new-hampshire', 'new-jersey',
  'new-mexico', 'new-york', 'north-carolina', 'north-dakota', 'ohio',
  'oklahoma', 'oregon', 'pennsylvania', 'rhode-island', 'south-carolina',
  'south-dakota', 'tennessee', 'texas', 'utah', 'vermont',
  'virginia', 'washington', 'west-virginia', 'wisconsin', 'wyoming',
];

function toTitleCase(slug) {
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildHtml({ urlPath, title, metaDesc, h1, content, breadcrumbs }) {
  const canonical = `${BASE_URL}${urlPath}`;
  const safeTitle = escHtml(title);
  const safeDesc = escHtml(metaDesc);

  const bcSchema = breadcrumbs?.length
    ? JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((b, i) => ({
          '@type': 'ListItem',
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
        .join('')
    : '';

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
  ${bcSchema ? `<script type="application/ld+json">${bcSchema}</script>` : ''}
  ${seoStyles()}
  <script async src="https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_MEASUREMENT_ID}',{send_page_view:true});</script>
</head>
<body>
  ${seoHeader()}
  <main class="rl-main">
    <div class="rl-container">
      ${bcHtml ? `<nav class="breadcrumbs" aria-label="Breadcrumb"><ul>${bcHtml}</ul></nav>` : ''}
      <h1>${escHtml(h1 || title)}</h1>
      ${content}
      ${seoCtaStrip()}
    </div>
  </main>
  ${seoFooter()}
</body>
</html>`;
}

function writePage(urlPath, pageData) {
  const html = buildHtml({ urlPath, ...pageData });
  // Single flat .html — see generate-seo-html.mjs for rationale on dropping
  // the redundant nested /index.html.
  const flatPath = join(PUBLIC_DIR, urlPath.replace(/^\//, '') + '.html');
  mkdirSync(dirname(flatPath), { recursive: true });
  writeFileSync(flatPath, html, 'utf8');
}

let count = 0;

// ─── opioid-rehab-near-me/{state} ────────────────────────────────────────────
for (const state of US_STATES) {
  const stateName = toTitleCase(state);
  const urlPath = `/opioid-rehab-near-me/${state}`;
  writePage(urlPath, {
    title: `Opioid Rehab Near Me in ${stateName} | RehabLookup`,
    metaDesc: `Find opioid addiction treatment centers near you in ${stateName}. Compare inpatient, outpatient, and MAT programs. Free insurance verification available.`,
    h1: `Opioid Rehab Near Me in ${stateName}`,
    content: `<p>Find accredited opioid addiction treatment centers in ${stateName}. RehabLookup lists rehab facilities offering medically supervised detox, inpatient residential programs, intensive outpatient (IOP), and medication-assisted treatment (MAT) for opioid use disorder.</p>
<h2>Types of Opioid Treatment in ${stateName}</h2>
<p>Treatment options for opioid addiction in ${stateName} include medical detox, inpatient residential care, partial hospitalization programs (PHP), intensive outpatient programs (IOP), and medication-assisted treatment with buprenorphine (Suboxone) or methadone.</p>
<h2>Find Help Today</h2>
<p>Use our free directory to search opioid rehab center listings in ${stateName} by location, insurance, and treatment type. Many facilities offer same-day admissions and free insurance verification.</p>`,
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Opioid Rehab Near Me', url: '/opioid-rehab-near-me' },
      { name: stateName, url: urlPath },
    ],
  });
  count++;
}

// ─── benzo-rehab-near-me/texas ───────────────────────────────────────────────
writePage('/benzo-rehab-near-me/texas', {
  title: 'Benzo Rehab Near Me in Texas | RehabLookup',
  metaDesc: 'Find benzodiazepine addiction treatment centers near you in Texas. Compare detox, inpatient, and outpatient programs. Free insurance verification.',
  h1: 'Benzo Rehab Near Me in Texas',
  content: `<p>Find accredited benzodiazepine (benzo) addiction treatment centers in Texas. RehabLookup lists rehab facilities offering medically supervised benzo detox and comprehensive addiction treatment programs across Texas.</p>
<h2>Benzo Detox in Texas</h2>
<p>Benzodiazepine withdrawal can be medically dangerous. Texas treatment centers offer 24/7 medically supervised detox to safely manage withdrawal symptoms before transitioning to residential or outpatient care.</p>`,
  breadcrumbs: [
    { name: 'Home', url: '/' },
    { name: 'Benzo Rehab Near Me', url: '/benzo-rehab-near-me' },
    { name: 'Texas', url: '/benzo-rehab-near-me/texas' },
  ],
});
count++;

// ─── cocaine-rehab-near-me/texas ─────────────────────────────────────────────
writePage('/cocaine-rehab-near-me/texas', {
  title: 'Cocaine Rehab Near Me in Texas | RehabLookup',
  metaDesc: 'Find cocaine addiction treatment centers near you in Texas. Compare inpatient, outpatient, and residential programs. Free insurance verification.',
  h1: 'Cocaine Rehab Near Me in Texas',
  content: `<p>Find accredited cocaine addiction treatment centers in Texas. RehabLookup lists rehab facilities offering inpatient residential programs, intensive outpatient (IOP), and dual diagnosis treatment for cocaine use disorder in Texas.</p>
<h2>Cocaine Addiction Treatment in Texas</h2>
<p>Texas treatment centers offer evidence-based therapies for cocaine addiction including cognitive behavioral therapy (CBT), contingency management, and group counseling. Many facilities accept Medicaid, Medicare, and private insurance.</p>`,
  breadcrumbs: [
    { name: 'Home', url: '/' },
    { name: 'Cocaine Rehab Near Me', url: '/cocaine-rehab-near-me' },
    { name: 'Texas', url: '/cocaine-rehab-near-me/texas' },
  ],
});
count++;

// ─── heroin-rehab-near-me/texas ──────────────────────────────────────────────
writePage('/heroin-rehab-near-me/texas', {
  title: 'Heroin Rehab Near Me in Texas | RehabLookup',
  metaDesc: 'Find heroin and opioid addiction treatment centers near you in Texas. Compare MAT, inpatient, and detox programs. Free insurance verification.',
  h1: 'Heroin Rehab Near Me in Texas',
  content: `<p>Find accredited heroin addiction treatment centers in Texas. RehabLookup lists rehab facilities offering medically supervised heroin detox, medication-assisted treatment (MAT), and inpatient residential programs across Texas.</p>
<h2>Heroin Treatment Options in Texas</h2>
<p>Texas treatment centers offer comprehensive heroin addiction treatment including medical detox, MAT with buprenorphine or methadone, inpatient residential care, and long-term recovery support services.</p>`,
  breadcrumbs: [
    { name: 'Home', url: '/' },
    { name: 'Heroin Rehab Near Me', url: '/heroin-rehab-near-me' },
    { name: 'Texas', url: '/heroin-rehab-near-me/texas' },
  ],
});
count++;

// ─── meth-rehab-near-me/texas ────────────────────────────────────────────────
writePage('/meth-rehab-near-me/texas', {
  title: 'Meth Rehab Near Me in Texas | RehabLookup',
  metaDesc: 'Find methamphetamine addiction treatment centers near you in Texas. Compare inpatient, residential, and outpatient programs. Free insurance verification.',
  h1: 'Meth Rehab Near Me in Texas',
  content: `<p>Find accredited methamphetamine (meth) addiction treatment centers in Texas. RehabLookup lists rehab facilities offering inpatient residential programs, intensive outpatient (IOP), and dual diagnosis treatment for meth use disorder in Texas.</p>
<h2>Meth Addiction Treatment in Texas</h2>
<p>Texas treatment centers offer evidence-based therapies for meth addiction including the Matrix Model, cognitive behavioral therapy (CBT), contingency management, and 12-step facilitation programs.</p>`,
  breadcrumbs: [
    { name: 'Home', url: '/' },
    { name: 'Meth Rehab Near Me', url: '/meth-rehab-near-me' },
    { name: 'Texas', url: '/meth-rehab-near-me/texas' },
  ],
});
count++;

console.log(`✅ Generated ${count} missing near-me HTML files`);

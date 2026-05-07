/**
 * generate-final-missing.mjs
 * Generates flat HTML files for pages that are in the sitemap but missing HTML files.
 * Covers: /detox-centers/{state}, /rehab-marketing/{state}, /treatment-types/outpatient-rehab, /near-me
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';

const BASE_URL = 'https://rehablookup.com';
const PUBLIC = 'public';

const US_STATES = [
  { slug: 'alabama', name: 'Alabama' },
  { slug: 'alaska', name: 'Alaska' },
  { slug: 'arizona', name: 'Arizona' },
  { slug: 'arkansas', name: 'Arkansas' },
  { slug: 'california', name: 'California' },
  { slug: 'colorado', name: 'Colorado' },
  { slug: 'connecticut', name: 'Connecticut' },
  { slug: 'delaware', name: 'Delaware' },
  { slug: 'florida', name: 'Florida' },
  { slug: 'georgia', name: 'Georgia' },
  { slug: 'hawaii', name: 'Hawaii' },
  { slug: 'idaho', name: 'Idaho' },
  { slug: 'illinois', name: 'Illinois' },
  { slug: 'indiana', name: 'Indiana' },
  { slug: 'iowa', name: 'Iowa' },
  { slug: 'kansas', name: 'Kansas' },
  { slug: 'kentucky', name: 'Kentucky' },
  { slug: 'louisiana', name: 'Louisiana' },
  { slug: 'maine', name: 'Maine' },
  { slug: 'maryland', name: 'Maryland' },
  { slug: 'massachusetts', name: 'Massachusetts' },
  { slug: 'michigan', name: 'Michigan' },
  { slug: 'minnesota', name: 'Minnesota' },
  { slug: 'mississippi', name: 'Mississippi' },
  { slug: 'missouri', name: 'Missouri' },
  { slug: 'montana', name: 'Montana' },
  { slug: 'nebraska', name: 'Nebraska' },
  { slug: 'nevada', name: 'Nevada' },
  { slug: 'new-hampshire', name: 'New Hampshire' },
  { slug: 'new-jersey', name: 'New Jersey' },
  { slug: 'new-mexico', name: 'New Mexico' },
  { slug: 'new-york', name: 'New York' },
  { slug: 'north-carolina', name: 'North Carolina' },
  { slug: 'north-dakota', name: 'North Dakota' },
  { slug: 'ohio', name: 'Ohio' },
  { slug: 'oklahoma', name: 'Oklahoma' },
  { slug: 'oregon', name: 'Oregon' },
  { slug: 'pennsylvania', name: 'Pennsylvania' },
  { slug: 'rhode-island', name: 'Rhode Island' },
  { slug: 'south-carolina', name: 'South Carolina' },
  { slug: 'south-dakota', name: 'South Dakota' },
  { slug: 'tennessee', name: 'Tennessee' },
  { slug: 'texas', name: 'Texas' },
  { slug: 'utah', name: 'Utah' },
  { slug: 'vermont', name: 'Vermont' },
  { slug: 'virginia', name: 'Virginia' },
  { slug: 'washington', name: 'Washington' },
  { slug: 'west-virginia', name: 'West Virginia' },
  { slug: 'wisconsin', name: 'Wisconsin' },
  { slug: 'wyoming', name: 'Wyoming' },
];

function buildHtml({ path, title, description, h1, breadcrumbs }) {
  const canonical = `${BASE_URL}${path}`;
  const bcJson = JSON.stringify(breadcrumbs.map((b, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: b.name,
    item: `${BASE_URL}${b.url}`,
  })));

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} | RehabLookup</title>
  <meta name="description" content="${description}" />
  <link rel="canonical" href="${canonical}" />
  <meta property="og:title" content="${title} | RehabLookup" />
  <meta property="og:description" content="${description}" />
  <meta property="og:url" content="${canonical}" />
  <meta property="og:type" content="website" />
  <meta property="og:image" content="${BASE_URL}/og-image.jpg" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title} | RehabLookup" />
  <meta name="twitter:description" content="${description}" />
  <script type="application/ld+json">
  {"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":${bcJson}}
  </script>
  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-2VB6C1X2MQ"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('consent', 'default', {
      analytics_storage: 'denied',
      ad_storage: 'denied',
      wait_for_update: 500
    });
    gtag('config', 'G-2VB6C1X2MQ', { send_page_view: true });
  </script>
</head>
<body>
  <h1>${h1}</h1>
  <p>${description}</p>
  <nav aria-label="breadcrumb">
    ${breadcrumbs.map((b, i) => i < breadcrumbs.length - 1
      ? `<a href="${b.url}">${b.name}</a> &rsaquo; `
      : `<span>${b.name}</span>`).join('')}
  </nav>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>`;
}

function writeFile(path, html) {
  const flatPath = `${PUBLIC}/${path.replace(/^\//, '')}.html`;
  const dir = dirname(flatPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(flatPath, html, 'utf-8');
  return flatPath;
}

let count = 0;

// 1. /near-me
{
  const html = buildHtml({
    path: '/near-me',
    title: 'Rehab Centers Near Me',
    description: 'Find rehab centers near you. Compare local addiction treatment programs including detox, inpatient, outpatient, and residential rehab.',
    h1: 'Rehab Centers Near Me',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Rehab Near Me', url: '/near-me' },
    ],
  });
  const f = writeFile('/near-me', html);
  console.log('✓ Generated', f);
  count++;
}

// 2. /treatment-types/outpatient-rehab (and other missing treatment types)
const missingTreatmentTypes = [
  { slug: 'outpatient-rehab', name: 'Outpatient Rehab', desc: 'Find outpatient rehab programs including IOP and PHP. Flexible addiction treatment while maintaining daily responsibilities.' },
  { slug: 'medication-assisted-treatment', name: 'Medication-Assisted Treatment', desc: 'Find MAT programs for opioid and alcohol addiction. Evidence-based treatment combining medication with counseling.' },
  { slug: 'sober-living', name: 'Sober Living Homes', desc: 'Find sober living homes near you. Transitional housing with peer support for people in recovery from addiction.' },
  { slug: 'aftercare-programs', name: 'Aftercare Programs', desc: 'Find addiction aftercare programs. Continuing care services including alumni programs, support groups, and relapse prevention.' },
];

for (const tt of missingTreatmentTypes) {
  const path = `/treatment-types/${tt.slug}`;
  const flatPath = `${PUBLIC}/${path.replace(/^\//, '')}.html`;
  if (existsSync(flatPath)) continue;
  const html = buildHtml({
    path,
    title: `${tt.name} Programs`,
    description: tt.desc,
    h1: `${tt.name} Programs`,
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Treatment Types', url: '/treatment-types' },
      { name: tt.name, url: path },
    ],
  });
  const f = writeFile(path, html);
  console.log('✓ Generated', f);
  count++;
}

// 3. /detox-centers/{state} for all 50 states
for (const state of US_STATES) {
  const path = `/detox-centers/${state.slug}`;
  const flatPath = `${PUBLIC}/${path.replace(/^\//, '')}.html`;
  if (existsSync(flatPath)) continue;
  const html = buildHtml({
    path,
    title: `Detox Centers in ${state.name}`,
    description: `Find medical detox centers in ${state.name}. Compare supervised withdrawal programs for alcohol, opioids, and other substances.`,
    h1: `Detox Centers in ${state.name}`,
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Detox Centers', url: '/detox-centers' },
      { name: state.name, url: path },
    ],
  });
  const f = writeFile(path, html);
  console.log('✓ Generated', f);
  count++;
}

// 4. /rehab-marketing/{state} for all 50 states
for (const state of US_STATES) {
  const path = `/rehab-marketing/${state.slug}`;
  const flatPath = `${PUBLIC}/${path.replace(/^\//, '')}.html`;
  if (existsSync(flatPath)) continue;
  const html = buildHtml({
    path,
    title: `Rehab Centers in ${state.name}`,
    description: `Find and compare rehab centers in ${state.name}. Browse addiction treatment facilities by location, treatment type, and insurance accepted.`,
    h1: `Rehab Centers in ${state.name}`,
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Rehab Marketing', url: '/rehab-marketing' },
      { name: state.name, url: path },
    ],
  });
  const f = writeFile(path, html);
  console.log('✓ Generated', f);
  count++;
}

console.log(`\n✅ Generated ${count} missing HTML files`);

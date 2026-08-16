#!/usr/bin/env node
/**
 * Generate prerendered HTML for every (near-me-type × state) combination.
 *
 * Each page is a state-level directory entry tied to a specific near-me
 * intent (e.g. "Seniors Rehab Near Me in Oregon"). To avoid templated
 * near-duplicates, every page pulls in:
 *   - state-specific fact box (population, overdose rate, opioid share,
 *     SAMHSA facility count, Medicaid status, primary metro) from
 *     stateAddictionStats.ts.
 *   - state signature line (180-char per-state human-written sentence).
 *   - state licensing/regulator box.
 *   - per-near-me-type "what this covers" copy keyed off the treatment
 *     category, with different language per intent.
 *
 * Result: 50 pages per near-me type share a treatment-intent paragraph
 * but never share the state fact box, signature line, or regulator —
 * and 58 near-me types per state share state data but never share the
 * intent paragraph. Net: each indexed URL is substantively distinct.
 *
 * Overwrites existing files — re-run to refresh content.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GA_MEASUREMENT_ID } from "./_ga.mjs";
import {
  escHtml,
  renderStateFactBox,
  renderStateSignature,
  renderTreatmentLevels,
  renderInsuranceDirectory,
  renderLicensingBox,
  renderCta,
  SHARED_DIRECTORY_CSS,
  SHARED_HEADER_HTML,
  SHARED_FOOTER_HTML,
} from "./_unique-content.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const publicDir = path.join(repoRoot, "public");
const BASE_URL = "https://rehablookup.com";

function parseNearMeTypes() {
  const txt = fs.readFileSync(path.join(repoRoot, "src/data/nearMeTypes.ts"), "utf8");
  const re = /\{\s*slug:\s*"([a-z0-9-]+-near-me)",\s*label:\s*"([^"]+)",\s*treatmentType:\s*"([^"]+)"\s*\}/g;
  const out = [];
  let m;
  while ((m = re.exec(txt))) out.push({ slug: m[1], label: m[2], treatmentType: m[3] });
  return out;
}

function parseStates() {
  const txt = fs.readFileSync(path.join(repoRoot, "src/data/usStates.ts"), "utf8");
  const re = /\{\s*name:\s*"([^"]+)",\s*slug:\s*"([a-z-]+)"\s*\}/g;
  const out = [];
  let m;
  while ((m = re.exec(txt))) out.push({ name: m[1], slug: m[2], abbr: "" });
  const loc = fs.readFileSync(path.join(repoRoot, "src/data/locationSeoData.ts"), "utf8");
  const ar = /\{\s*name:\s*"([^"]+)",\s*slug:\s*"([a-z-]+)",\s*abbreviation:\s*"([A-Z]{2})"/g;
  const map = new Map();
  let a;
  while ((a = ar.exec(loc))) map.set(a[2], a[3]);
  for (const s of out) s.abbr = map.get(s.slug) || "";
  return out;
}

// Per-near-me-type intent paragraph. Categories share copy across the 50
// states they apply to, but each near-me-type's paragraph is distinct.
function intentParagraph(nm) {
  const s = nm.slug;
  if (/^seniors-/.test(s))
    return `Senior-focused programs adapt detox protocols and pacing for older adults, manage age-related comorbidities (cardiac, diabetic, polypharmacy), and integrate Medicare coverage planning. Many providers run dedicated 55+ cohorts.`;
  if (/^teen-|^young-adult-/.test(s))
    return `Adolescent and young-adult tracks pair clinical care with academic continuity, family therapy, and developmentally appropriate group work. Look for programs offering on-site schooling and parent/caregiver participation.`;
  if (/^first-responder-/.test(s))
    return `First-responder programs serve police, fire, EMS, and corrections personnel — typically with peer-led groups, trauma-focused therapy (EMDR / CPT), and confidentiality protocols designed around department reporting.`;
  if (/^veterans-/.test(s))
    return `Veteran-focused programs treat co-occurring PTSD, traumatic-brain-injury sequelae, and military sexual trauma alongside substance use; many accept TRICARE, VA Community Care, and CHAMPVA.`;
  if (/^mens-/.test(s))
    return `Men's-only programs build a clinical environment around shared issues — fatherhood, work identity, anger, and stigma. Group composition is typically all-male; clinicians use gender-responsive curricula.`;
  if (/^womens-/.test(s))
    return `Women's-only programs prioritize trauma-informed care, pregnancy- and parenting-safe protocols, child-care logistics, and intimate-partner-violence screening.`;
  if (/^lgbtq-/.test(s))
    return `LGBTQ+ affirming programs use inclusive intake forms, avoid conversion-style content, and tailor group composition. Clinicians are trained in minority-stress models and gender-affirming care.`;
  if (/^couples-/.test(s))
    return `Couples-rehab tracks accept admissions as a pair where appropriate, combining individual care with behavioral-couples therapy (BCT) and joint relapse-prevention planning.`;
  if (/^executive-/.test(s))
    return `Executive tracks emphasize private rooms, on-site work accommodation (secure office, encrypted Wi-Fi), and discreet admissions. Expect higher self-pay and limited insurance participation.`;
  if (/^court-ordered-/.test(s))
    return `Court-mandated programs meet probation/parole reporting requirements and DUI-court protocols. Look for state-licensed providers willing to coordinate documentation with your attorney and court.`;
  if (/^christian-|^faith-based-/.test(s))
    return `Faith-based programs integrate scripture-grounded counseling with evidence-based clinical care; ask whether MAT is offered alongside spiritual programming or only as an alternative.`;
  if (/^holistic-/.test(s))
    return `Holistic programs supplement evidence-based therapy with mind-body modalities (yoga, mindfulness, acupuncture, equine therapy). Verify the program also offers MAT and standard medical detox where indicated.`;
  if (/^luxury-/.test(s))
    return `Luxury programs combine clinical care with private accommodation, chef-prepared meals, and concierge logistics. Most are private-pay or out-of-network, with limited Medicaid participation.`;
  if (/^free-|^affordable-|^low-cost-|^sliding-scale-/.test(s))
    return `Low-barrier programs include state-funded, county-funded, Medicaid-accepting, and sliding-scale providers. Eligibility is income-based; SAMHSA's helpline (1-800-662-4357) can route to no-cost local options.`;
  if (/^medicaid-/.test(s))
    return `Medicaid-participating programs are subject to your state Medicaid agency's level-of-care criteria and prior-authorization windows. Most state plans cover detox, residential, IOP, and MAT.`;
  if (/^medicare-/.test(s))
    return `Medicare typically covers inpatient detox (Part A), MAT in OTPs (Part B), and outpatient counseling. Coverage is age- or disability-based; supplemental plans handle copays.`;
  if (/^tricare-/.test(s))
    return `TRICARE covers detox, residential, PHP, IOP, and MAT through in-network providers; out-of-network admissions need pre-authorization. Specific coverage depends on your TRICARE plan (Prime, Select, For Life).`;
  if (/^humana-|^cigna-|^aetna-|^blue-cross-|^united-healthcare-/.test(s))
    return `In-network coverage varies by plan. Verify deductibles, copays, day-limits, and prior-authorization requirements directly with your insurer's behavioral-health line before admission.`;
  if (/^iop-/.test(s))
    return `IOPs run 9–15 clinical hours weekly across three to five sessions, combining group therapy, individual counseling, and family work. They suit people stepping down from residential or stepping up from outpatient.`;
  if (/^php-/.test(s))
    return `PHPs run 5–6 days per week, typically 5–6 clinical hours per day, returning home evenings. Common as a residential step-down or for stable patients who can't take 28 days off work.`;
  if (/^long-term-|^short-term-|^30-day-|^60-day-|^90-day-/.test(s))
    return `Length-of-stay programs match clinical need. Short-term (28–30 days) targets acute stabilization; medium (60 days) extends therapy depth; long-term (90+ days) suits repeated relapse, polysubstance use, or unstable housing.`;
  if (/^emergency-|^same-day-|^immediate-|^24-7-detox-|^crisis-/.test(s))
    return `Same-day and emergency admissions bypass standard intake delays for acute risk: severe withdrawal, suicidality with substance use, or post-overdose. Call ahead — bed availability changes by the hour.`;
  if (/^walk-in-/.test(s))
    return `Walk-in services accept new patients without a scheduled appointment. Common at MAT clinics offering low-barrier buprenorphine inductions and at county detox-receiving centers.`;
  if (/^suboxone-|^methadone-|^mat-clinic-/.test(s))
    return `MAT programs prescribe buprenorphine, methadone, or naltrexone under DEA-registered clinicians. Methadone requires daily-dosing OTPs; buprenorphine can be prescribed in office settings.`;
  if (/^fentanyl-|^opioid-|^heroin-/.test(s))
    return `Opioid-specific tracks pair medical detox with rapid MAT induction, naloxone training, and chronic-pain assessment. Fentanyl-tolerance complicates buprenorphine induction — ask about microdosing or extended-release protocols.`;
  if (/^benzo-|^xanax-/.test(s))
    return `Benzodiazepine withdrawal requires medically supervised tapering — abrupt cessation can be life-threatening. Specialized programs use long-acting benzos (diazepam, clonazepam) for symptom-managed cross-titration.`;
  if (/^cocaine-|^meth-|^stimulant-/.test(s))
    return `Stimulant-focused care emphasizes contingency management (CM), behavioral activation, and structured exercise alongside trauma work. MAT options are limited; vivitrol and bupropion show mixed evidence.`;
  if (/^marijuana-|^cannabis-/.test(s))
    return `Cannabis-focused programs use CBT, contingency management, and motivational enhancement. Severe cases may need short residential stabilization, especially with co-occurring anxiety or psychosis.`;
  if (/^prescription-drug-/.test(s))
    return `Prescription-drug programs treat opioid, benzodiazepine, stimulant, and Z-drug dependence. Look for providers fluent in dual diagnosis — chronic pain, ADHD, or anxiety are often the underlying drivers.`;
  if (/^kratom-/.test(s))
    return `Kratom withdrawal resembles short-acting opioid withdrawal and responds to buprenorphine where indicated. Few residential programs specialize; outpatient MAT plus counseling is the typical pathway.`;
  if (/^dual-diagnosis-/.test(s))
    return `Dual-diagnosis programs treat mental-health and substance-use disorders concurrently — depression, anxiety, PTSD, bipolar, ADHD, and psychotic disorders alongside addiction. Look for psychiatric medication management plus addiction-specific therapy.`;
  if (/^outpatient-|^drug-rehab-|^alcohol-rehab-/.test(s))
    return `Outpatient programs let patients live at home while attending structured clinical sessions. IOP and PHP are the higher-acuity options; standard outpatient is appropriate for maintenance and step-down.`;
  if (/^inpatient-|^residential-/.test(s))
    return `Inpatient and residential programs provide 24/7 structured care, removing patients from triggers for 28–90 days. Best fit for severe withdrawal risk, unstable housing, or repeated outpatient failure.`;
  if (/^detox-|^24-7-detox-/.test(s))
    return `Detox programs medically manage acute withdrawal — typically 3–7 days for opioids, 5–10 for alcohol, longer for benzodiazepines. Detox alone is not treatment; planned continuum-of-care is essential.`;
  if (/^sober-living-/.test(s))
    return `Sober-living homes provide structured, drug-free housing post-treatment. Most require active program participation, drug testing, and house-meeting attendance. Costs are out-of-pocket but lower than treatment.`;
  return `Programs in this category accept new patients seeking ${escHtml(nm.treatmentType.toLowerCase())}. Coverage, intake timeline, and clinical fit vary by provider.`;
}

function renderPage({ nm, state }) {
  const urlPath = `/${nm.slug}/${state.slug}`;
  const canonical = `${BASE_URL}${urlPath}`;
  const title = `${nm.label} Near Me in ${state.name}`;
  const metaTitle = `${title} — Treatment Directory | RehabLookup`;
  const desc = `Find ${nm.label.toLowerCase()} programs in ${state.name}. Verified facility directory with treatment levels, insurance coverage, and state licensing for ${state.abbr}.`;
  const safeTitle = escHtml(metaTitle);
  const safeDesc = escHtml(desc);

  const breadcrumbSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL + "/" },
      { "@type": "ListItem", position: 2, name: `${nm.label} Near Me`, item: `${BASE_URL}/${nm.slug}` },
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
  <style>${SHARED_DIRECTORY_CSS}</style>
  <script async src="https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_MEASUREMENT_ID}');</script>
</head>
<body>
  ${SHARED_HEADER_HTML}
  <main class="rl-main">
    <nav class="breadcrumbs" aria-label="Breadcrumb"><ul><li><a href="/">Home</a> &rsaquo; </li><li><a href="/${nm.slug}">${escHtml(nm.label)} Near Me</a> &rsaquo; </li><li>${escHtml(state.name)}</li></ul></nav>
    <h1>${escHtml(title)}</h1>
    <p>Directory of ${escHtml(nm.label.toLowerCase())} options in ${escHtml(state.name)} (${state.abbr}). Compare programs by level of care, insurance accepted, and state licensure.</p>

    <section aria-label="About ${escHtml(nm.label)}">
      <h2>About ${escHtml(nm.label)} Programs</h2>
      <p>${intentParagraph(nm)}</p>
    </section>

    ${renderStateFactBox(state.name, state.slug)}
    ${renderStateSignature(state.name, state.slug)}

    ${renderTreatmentLevels(state.name)}

    ${renderInsuranceDirectory(state.name, state.slug)}

    ${renderLicensingBox(state.name, state.slug)}

    <p class="small"><a href="/rehab-centers/${state.slug}">All rehab centers in ${escHtml(state.name)}</a> &middot; <a href="/${nm.slug}">All ${escHtml(nm.label.toLowerCase())} states</a></p>

    ${renderCta(
      `Find ${nm.label.toLowerCase()} in ${state.name}`,
      `Browse and compare licensed ${state.name} treatment providers, then contact them directly.`,
    )}

    <p class="small"><a href="/rehab-centers">Browse All States</a> &middot; <a href="/resources">Recovery Resources</a> &middot; <a href="/">Home</a></p>
  </main>
  ${SHARED_FOOTER_HTML}
</body>
</html>`;
}

function main() {
  const nearMeTypes = parseNearMeTypes();
  const states = parseStates();
  let written = 0;
  for (const nm of nearMeTypes) {
    const dir = path.join(publicDir, nm.slug);
    fs.mkdirSync(dir, { recursive: true });
    for (const state of states) {
      const outPath = path.join(dir, `${state.slug}.html`);
      fs.writeFileSync(outPath, renderPage({ nm, state }));
      written++;
    }
  }
  console.log(
    `near-me/state backfill: types=${nearMeTypes.length}, states=${states.length}, written=${written}.`,
  );
}

main();

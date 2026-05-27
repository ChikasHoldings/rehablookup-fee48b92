#!/usr/bin/env node
/**
 * Generate prerendered HTML for every (city-treatment prefix × topCity)
 * combination — e.g. /alcohol-rehab-in-los-angeles, /iop-in-chicago.
 *
 * Each page is a city-level directory entry for one treatment intent.
 * To avoid templated near-duplicates, every page combines:
 *   - state-specific fact box from stateAddictionStats.ts (different
 *     numbers per state).
 *   - state signature line (per-state human-written sentence).
 *   - state licensing/regulator box (different regulator per state).
 *   - per-prefix intent paragraph (different per treatment category).
 *   - city directory pill list of other treatment options in the same
 *     city, so each city's 48 pages cross-link laterally.
 *
 * Net: a state's 48 pages share a fact box but never the intent
 * paragraph; a treatment-prefix's 288 pages share an intent paragraph
 * but never the state fact box. Each indexed URL is substantively
 * distinct.
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
  renderInsuranceDirectory,
  renderLicensingBox,
  renderCta,
  SHARED_DIRECTORY_CSS,
  SHARED_HEADER_HTML,
  SHARED_FOOTER_HTML,
} from "./_unique-content.mjs";
import {
  fetchAllFacilities,
  groupByStateCity,
  renderFacilityList,
  citySlug,
} from "./_facility-data.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const publicDir = path.join(repoRoot, "public");
const BASE_URL = "https://rehablookup.com";

function parseTopCities() {
  const txt = fs.readFileSync(path.join(repoRoot, "src/data/seoPageConfig.ts"), "utf8");
  const re = /\{\s*slug:\s*"([a-z0-9-]+)",\s*city:\s*"([^"]+)"(?:,\s*population:\s*"([^"]+)")?[^}]*?stateAbbr:\s*"([A-Z]{2})"[^}]*?stateSlug:\s*"([a-z-]+)"/g;
  const out = [];
  let m;
  while ((m = re.exec(txt))) {
    out.push({
      slug: m[1],
      city: m[2],
      population: m[3] || "",
      stateAbbr: m[4],
      stateSlug: m[5],
    });
  }
  return out;
}

function parsePrefixes() {
  const txt = fs.readFileSync(path.join(repoRoot, "src/components/SmartCatchAll.tsx"), "utf8");
  const block = txt.match(/const CITY_TREATMENT_PREFIXES = \[([\s\S]*?)\];/);
  if (!block) throw new Error("CITY_TREATMENT_PREFIXES not found");
  const prefixes = [...block[1].matchAll(/"\/([a-z0-9-]+-in-)"/g)].map((m) => m[1]);
  return prefixes;
}

function stateSlugForAbbr(abbr) {
  const map = {
    AL: "alabama", AK: "alaska", AZ: "arizona", AR: "arkansas", CA: "california",
    CO: "colorado", CT: "connecticut", DE: "delaware", FL: "florida", GA: "georgia",
    HI: "hawaii", ID: "idaho", IL: "illinois", IN: "indiana", IA: "iowa",
    KS: "kansas", KY: "kentucky", LA: "louisiana", ME: "maine", MD: "maryland",
    MA: "massachusetts", MI: "michigan", MN: "minnesota", MS: "mississippi",
    MO: "missouri", MT: "montana", NE: "nebraska", NV: "nevada",
    NH: "new-hampshire", NJ: "new-jersey", NM: "new-mexico", NY: "new-york",
    NC: "north-carolina", ND: "north-dakota", OH: "ohio", OK: "oklahoma",
    OR: "oregon", PA: "pennsylvania", RI: "rhode-island", SC: "south-carolina",
    SD: "south-dakota", TN: "tennessee", TX: "texas", UT: "utah", VT: "vermont",
    VA: "virginia", WA: "washington", WV: "west-virginia", WI: "wisconsin",
    WY: "wyoming", DC: "district-of-columbia",
  };
  return map[abbr] || abbr.toLowerCase();
}

// Per-prefix label, hub URL, and unique intent paragraph. Each prefix's
// paragraph is distinct so the 288 city pages within a prefix don't
// share copy with another prefix's 288.
function prefixMeta(prefix) {
  const M = {
    "alcohol-rehab-in-": {
      label: "Alcohol Rehab",
      hub: "/alcohol-rehab-centers",
      intent: "Alcohol-use-disorder programs typically begin with 5–10 days of medically supervised detox to manage tremor, autonomic instability, and seizure risk, followed by residential or outpatient therapy. Naltrexone (oral or extended-release Vivitrol) and acamprosate are the most common pharmacotherapies; disulfiram suits motivated patients with strong external accountability.",
    },
    "drug-rehab-in-": {
      label: "Drug Rehab",
      hub: "/drug-rehab-centers",
      intent: "Drug-use-disorder programs are tailored to substance class — opioids, stimulants, benzodiazepines, cannabis, prescription medications — and to severity. Expect a clinical intake (ASAM 6-dimension assessment), level-of-care recommendation, medication review, and continuum-of-care planning across detox, residential, IOP, and aftercare.",
    },
    "detox-centers-in-": {
      label: "Detox Centers",
      hub: "/detox-centers",
      intent: "Medically supervised detox manages acute withdrawal in a 24/7 monitored setting. Length varies: opioids 3–7 days, alcohol 5–10 days, benzodiazepines 10–21 days (longer for high-dose long-acting agents). Detox is stabilization, not treatment — discharge straight to outpatient without a residential/IOP step has high early-relapse risk.",
    },
    "detox-in-": {
      label: "Detox",
      hub: "/detox-centers",
      intent: "Medical detoxification protocols stabilize patients through acute withdrawal under physician oversight. Common medications include benzodiazepines for alcohol, buprenorphine or methadone for opioids, and supportive care for stimulant crashes. Lab work, vitals, and CIWA/COWS scoring guide titration.",
    },
    "inpatient-rehab-in-": {
      label: "Inpatient Rehab",
      hub: "/inpatient-rehab-near-me",
      intent: "Inpatient and residential treatment removes patients from triggering environments for a structured 28–90 day stay. Days are scheduled around group therapy, individual sessions, psychiatric medication management (if dual-diagnosis), recovery education, and family work. Best fit when withdrawal risk is high or outpatient has failed.",
    },
    "outpatient-rehab-in-": {
      label: "Outpatient Rehab",
      hub: "/outpatient-rehab-near-me",
      intent: "Outpatient programs let patients live at home while attending structured clinical sessions. IOP (9–15 hours/week) and PHP (25+ hours/week) are the higher-acuity options; standard outpatient (1–3 hours/week) suits maintenance and step-down. Most insurances cover outpatient at parity with medical care.",
    },
    "dual-diagnosis-treatment-in-": {
      label: "Dual Diagnosis Treatment",
      hub: "/dual-diagnosis-near-me",
      intent: "Dual-diagnosis programs treat mental-health and substance-use conditions concurrently — depression, anxiety, PTSD, bipolar, ADHD, and psychotic disorders alongside addiction. Look for licensed psychiatric medication management, addiction-specialty therapy (CBT, DBT, MET), and integrated discharge planning.",
    },
    "luxury-rehab-in-": {
      label: "Luxury Rehab",
      hub: "/luxury-rehab-near-me",
      intent: "Luxury programs pair clinical care with private accommodation, chef-prepared meals, concierge logistics, and amenities (pool, gym, equine therapy). Most operate out-of-network or private-pay; clinical quality varies — check accreditation (Joint Commission / CARF), physician credentials, and outcomes data before paying premium rates.",
    },
    "sober-living-in-": {
      label: "Sober Living",
      hub: "/sober-living-near-me",
      intent: "Sober-living houses are drug- and alcohol-free residences for people in early recovery. Residents typically attend outside treatment or work while abiding by house rules (curfew, drug testing, mandatory meetings). Costs are out-of-pocket but lower than treatment; length-of-stay is open-ended.",
    },
    "free-rehab-in-": {
      label: "Free Rehab",
      hub: "/free-rehab-near-me",
      intent: "No-cost programs include state-funded, county-funded, federally-qualified health centers (FQHCs), Salvation Army Adult Rehabilitation Centers, and faith-based residential ministries. Eligibility is income- or hardship-based; SAMHSA's helpline (1-800-662-4357) routes callers to local options.",
    },
    "faith-based-rehab-in-": {
      label: "Faith-Based Rehab",
      hub: "/faith-based-rehab-near-me",
      intent: "Faith-based programs integrate spiritual practice — scripture study, prayer, chaplain counseling — with clinical care. Most accept any faith; some are denominationally specific. Verify whether MAT is offered or whether the program insists on abstinence-only approaches that exclude buprenorphine and methadone.",
    },
    "fentanyl-rehab-in-": {
      label: "Fentanyl Rehab",
      hub: "/fentanyl-rehab-near-me",
      intent: "Fentanyl-specific tracks address the drug's extreme potency and tolerance: buprenorphine induction often requires microdosing or extended-release formulations to avoid precipitated withdrawal. Programs should integrate naloxone training for the patient's support network and screen for adulterants (xylazine).",
    },
    "veterans-rehab-in-": {
      label: "Veterans Rehab",
      hub: "/veterans-rehab-near-me",
      intent: "Veteran-focused programs treat co-occurring PTSD, traumatic-brain-injury sequelae, and military sexual trauma alongside substance use. Most accept TRICARE, VA Community Care, and CHAMPVA. Veteran peer support, evidence-based trauma therapy (PE, CPT, EMDR), and reintegration planning are clinical staples.",
    },
    "womens-rehab-in-": {
      label: "Women's Rehab",
      hub: "/womens-rehab-near-me",
      intent: "Women's-only programs use trauma-informed protocols, pregnancy- and parenting-safe medications, child-care coordination, intimate-partner-violence screening, and gender-specific group composition. Many include perinatal-substance-use specialty tracks for pregnant or postpartum patients.",
    },
    "mens-rehab-in-": {
      label: "Men's Rehab",
      hub: "/mens-rehab-near-me",
      intent: "Men's-only programs build a clinical environment around shared issues — fatherhood, work identity, anger management, and stigma. Group composition is all-male; clinicians use gender-responsive curricula and address issues like erectile dysfunction or testosterone changes that affect engagement.",
    },
    "holistic-rehab-in-": {
      label: "Holistic Rehab",
      hub: "/treatment-types/holistic-therapy",
      intent: "Holistic programs supplement evidence-based therapy with mind-body modalities — yoga, mindfulness meditation, acupuncture, equine therapy, art and music therapy. The strongest programs preserve standard clinical care (MAT, medical detox) and use complementary modalities as add-ons, not replacements.",
    },
    "mat-clinic-in-": {
      label: "MAT Clinic",
      hub: "/mat-clinic-near-me",
      intent: "Medication-Assisted Treatment clinics prescribe buprenorphine, methadone, or naltrexone alongside counseling. Methadone requires daily-dosing OTPs; buprenorphine can be prescribed in office settings; vivitrol is monthly IM. Treatment retention strongly predicts long-term outcomes — duration is open-ended.",
    },
    "iop-in-": {
      label: "IOP",
      hub: "/iop-near-me",
      intent: "Intensive outpatient programs (IOP) run 9–15 clinical hours per week across three to five sessions, combining group therapy, individual counseling, and family work. IOP suits step-down from residential or step-up from standard outpatient; most plans cover it at parity with medical/surgical benefits.",
    },
    "php-in-": {
      label: "PHP",
      hub: "/php-near-me",
      intent: "Partial hospitalization programs (PHP) run 5–6 days per week for ~5 clinical hours per day, returning home evenings. PHP is common as a residential step-down or for patients who can't take 28 days off work. It's higher acuity than IOP and typically requires prior authorization.",
    },
    "affordable-rehab-in-": {
      label: "Affordable Rehab",
      hub: "/affordable-rehab-near-me",
      intent: "Affordable programs combine Medicaid-accepting providers, sliding-scale community providers, FQHCs, and state-funded slots. The lowest-cost options are typically state-funded residential (free for residents meeting income criteria) and outpatient counseling at FQHCs ($0–$25 per session).",
    },
    "low-cost-rehab-in-": {
      label: "Low-Cost Rehab",
      hub: "/affordable-rehab-near-me",
      intent: "Low-cost rehab options include state and county-funded slots, Medicaid-participating providers, sliding-scale FQHCs, and ministry-based residential programs. Wait-lists are common at state-funded facilities; FQHCs typically have shorter waits and accept walk-ins for assessment.",
    },
    "teen-rehab-in-": {
      label: "Teen Rehab",
      hub: "/teen-rehab-near-me",
      intent: "Adolescent programs (typically 13–17) pair clinical care with academic continuity, family therapy, and developmentally appropriate group work. Look for on-site schooling, parent participation requirements, and clinicians credentialed in adolescent substance use (LADC-A, CCADC).",
    },
    "christian-rehab-in-": {
      label: "Christian Rehab",
      hub: "/faith-based-rehab-near-me",
      intent: "Christian programs combine licensed clinical care with scripture-grounded counseling, chapel services, and chaplain-led groups. Verify accreditation (Joint Commission, CARF) and whether the program offers MAT — some abstinence-only Christian programs exclude buprenorphine and methadone.",
    },
    "couples-rehab-in-": {
      label: "Couples Rehab",
      hub: "/couples-rehab-near-me",
      intent: "Couples programs admit partners together when clinically appropriate, combining individual care with Behavioral Couples Therapy (BCT) and joint relapse-prevention planning. Programs screen for intimate-partner violence; couples involving IPV typically need individual treatment first.",
    },
    "executive-rehab-in-": {
      label: "Executive Rehab",
      hub: "/executive-rehab-near-me",
      intent: "Executive tracks emphasize private rooms, on-site work accommodation (secure office, encrypted Wi-Fi, phone access), and discreet admissions. Expect higher self-pay rates and limited insurance participation. Confidentiality protocols around employer disclosures are typically robust.",
    },
    "court-ordered-rehab-in-": {
      label: "Court-Ordered Rehab",
      hub: "/court-ordered-rehab-near-me",
      intent: "Court-mandated programs meet probation, parole, and drug-court reporting requirements (attendance verification, urinalysis, completion certificates). Look for state-licensed providers with documented experience coordinating with attorneys and courts; some specialize in DUI tracks.",
    },
    "lgbtq-rehab-in-": {
      label: "LGBTQ+ Rehab",
      hub: "/lgbtq-rehab-near-me",
      intent: "LGBTQ+ affirming programs use inclusive intake forms, gender-affirming pronoun and bathroom protocols, and clinicians trained in minority-stress models. They avoid conversion-style content and integrate care for transgender patients on hormone therapy.",
    },
    "young-adult-rehab-in-": {
      label: "Young Adult Rehab",
      hub: "/young-adult-rehab-near-me",
      intent: "Young-adult tracks (typically 18–28) focus on identity development, executive functioning, college continuity, and parent-relationship work. Group composition skews same-age; treatment often pairs clinical care with vocational, educational, or independent-living coaching.",
    },
    "seniors-rehab-in-": {
      label: "Seniors Rehab",
      hub: "/seniors-rehab-near-me",
      intent: "Senior-focused programs adapt detox protocols and pacing for older adults, manage age-related comorbidities (cardiac, diabetic, polypharmacy), and integrate Medicare coverage planning. Many providers run dedicated 55+ cohorts and watch for delirium and benzodiazepine-related cognitive risk.",
    },
    "first-responder-rehab-in-": {
      label: "First Responder Rehab",
      hub: "/first-responder-rehab-near-me",
      intent: "First-responder programs serve police, fire, EMS, and corrections personnel — typically with peer-led groups, trauma-focused therapy (EMDR, CPT, PE), and confidentiality protocols designed around departmental reporting. Many participate in employee-assistance and union-sponsored coverage.",
    },
    "opioid-rehab-in-": {
      label: "Opioid Rehab",
      hub: "/opioid-rehab-near-me",
      intent: "Opioid-use-disorder programs pair medical detox with rapid MAT induction (buprenorphine, methadone, or naltrexone) and structured counseling. Naloxone training for the patient and support network is standard. Treatment retention beyond 6 months is the strongest predictor of long-term outcomes.",
    },
    "heroin-rehab-in-": {
      label: "Heroin Rehab",
      hub: "/heroin-rehab-near-me",
      intent: "Heroin-specific tracks integrate medical detox, MAT (buprenorphine or methadone preferred over naltrexone for retention), and harm-reduction coordination. Most current 'heroin' supply contains fentanyl — induction protocols and overdose prevention need to assume polysubstance exposure.",
    },
    "cocaine-rehab-in-": {
      label: "Cocaine Rehab",
      hub: "/cocaine-rehab-near-me",
      intent: "Cocaine and stimulant programs emphasize contingency management (CM) — structured incentives for verified abstinence — plus CBT, behavioral activation, and structured exercise. No FDA-approved MAT exists; off-label options (bupropion, naltrexone, topiramate) show mixed evidence.",
    },
    "meth-rehab-in-": {
      label: "Meth Rehab",
      hub: "/meth-rehab-near-me",
      intent: "Methamphetamine programs use contingency management, the Matrix Model (16-week intensive outpatient), and structured exercise. No FDA-approved MAT exists; recent trials of mirtazapine and naltrexone+bupropion show modest signal. Recovery from cognitive deficits can take 6–12 months of sustained abstinence.",
    },
    "benzo-rehab-in-": {
      label: "Benzo Rehab",
      hub: "/benzo-rehab-near-me",
      intent: "Benzodiazepine withdrawal can be life-threatening — abrupt cessation risks seizures and delirium. Specialized programs use slow tapering (Ashton protocol or similar) with long-acting agents (diazepam, clonazepam) cross-titrated from the patient's home benzo. Tapering windows of 8–26 weeks are common.",
    },
    "xanax-rehab-in-": {
      label: "Xanax Rehab",
      hub: "/xanax-rehab-near-me",
      intent: "Alprazolam (Xanax) dependence is among the hardest benzodiazepine cases to taper safely — short half-life produces severe interdose withdrawal. Specialized programs cross-titrate to longer-acting agents (diazepam, clonazepam) over weeks before initiating the taper proper.",
    },
    "marijuana-rehab-in-": {
      label: "Marijuana Rehab",
      hub: "/marijuana-rehab-near-me",
      intent: "Cannabis-use-disorder programs use CBT, motivational enhancement therapy, and contingency management. Severe cases — particularly with co-occurring anxiety, psychosis, or daily high-THC concentrate use — may need short residential stabilization. Withdrawal is real but rarely medically dangerous.",
    },
    "medicaid-rehab-in-": {
      label: "Medicaid Rehab",
      hub: "/medicaid-rehab-near-me",
      intent: "Medicaid-participating programs are subject to your state Medicaid agency's level-of-care criteria and prior-authorization windows. Most state plans cover detox, residential, IOP, PHP, and MAT. Provider participation varies — call the provider directly to confirm your specific plan is accepted.",
    },
    "medicare-rehab-in-": {
      label: "Medicare Rehab",
      hub: "/medicare-rehab-near-me",
      intent: "Medicare covers inpatient detox (Part A), outpatient counseling (Part B), MAT in opioid-treatment programs (Part B), and prescription medications (Part D). Coverage is age- or disability-based; Medigap or Medicare Advantage supplemental plans handle copays and out-of-pocket limits.",
    },
    "long-term-rehab-in-": {
      label: "Long-Term Rehab",
      hub: "/long-term-rehab-near-me",
      intent: "Long-term residential (90+ days) suits patients with repeated relapse, polysubstance use, unstable housing, or significant trauma histories. Programs typically pair extended clinical care with vocational support and gradual community re-integration. Therapeutic communities (TCs) are a long-established model.",
    },
    "short-term-rehab-in-": {
      label: "Short-Term Rehab",
      hub: "/short-term-rehab-near-me",
      intent: "Short-term residential (28–30 days) targets acute stabilization, evidence-based therapy initiation, and continuum-of-care planning. It's the most common insurance-covered residential length. Discharge planning into IOP, sober living, or MAT is essential — short-term rehab alone is not a complete treatment course.",
    },
    "30-day-rehab-in-": {
      label: "30-Day Rehab",
      hub: "/30-day-rehab-near-me",
      intent: "30-day residential programs are the standard insurance-authorized length. They deliver acute stabilization, evidence-based therapy initiation, and continuum-of-care planning. Most graduates step down into IOP, PHP, sober living, or weekly therapy — 30 days alone is rarely sufficient.",
    },
    "60-day-rehab-in-": {
      label: "60-Day Rehab",
      hub: "/60-day-rehab-near-me",
      intent: "60-day residential extends therapy depth — more EMDR/trauma sessions, deeper family work, more relapse-prevention practice — without committing to the full long-term track. Insurance authorization at 60 days is typically tied to documented clinical need (high acuity, complex dual-diagnosis).",
    },
    "90-day-rehab-in-": {
      label: "90-Day Rehab",
      hub: "/90-day-rehab-near-me",
      intent: "90-day residential is the threshold most outcome research associates with sustained remission. It accommodates trauma processing, vocational planning, and gradual community re-integration. Insurance coverage at 90 days varies; self-pay and scholarship options are common at residential providers.",
    },
    "emergency-rehab-in-": {
      label: "Emergency Rehab",
      hub: "/emergency-rehab-near-me",
      intent: "Emergency-admission tracks bypass standard intake delays for acute risk — severe withdrawal, suicidality with substance use, post-overdose presentation. Call ahead: bed availability changes hour to hour, and providers route urgent cases through the ED for medical clearance first.",
    },
    "same-day-rehab-in-": {
      label: "Same-Day Rehab",
      hub: "/same-day-rehab-near-me",
      intent: "Same-day admissions are common at low-barrier MAT clinics (rapid buprenorphine induction), some detox centers, and crisis-receiving facilities. Residential same-day is rare and depends on bed availability, insurance authorization, and medical clearance for withdrawal management.",
    },
    "suboxone-clinic-in-": {
      label: "Suboxone Clinic",
      hub: "/suboxone-clinic-near-me",
      intent: "Suboxone (buprenorphine/naloxone) clinics offer office-based opioid-use-disorder treatment. Induction typically happens after 12–24 hours of mild withdrawal; maintenance dosing stabilizes at 8–24 mg daily. Treatment is open-ended — retention strongly predicts outcomes.",
    },
    "methadone-clinic-in-": {
      label: "Methadone Clinic",
      hub: "/methadone-clinic-near-me",
      intent: "Methadone OTPs (opioid treatment programs) dose under DEA Part 90 federal regulations: initial supervised daily dosing, takehomes earned over months of stable participation. Methadone is highly effective for severe OUD and pregnancy; access is more regulated than office-based buprenorphine.",
    },
  };
  return M[prefix] || {
    label: prefix.replace(/-in-$/, "").split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" "),
    hub: "/rehab-centers",
    intent: `Programs in this category provide ${prefix.replace(/-in-$/, "").replace(/-/g, " ")} care across the recovery continuum. Coverage, intake timeline, and clinical fit vary by provider.`,
  };
}

const ALL_PREFIX_LABELS = [
  ["alcohol-rehab-in-", "Alcohol Rehab"],
  ["drug-rehab-in-", "Drug Rehab"],
  ["detox-centers-in-", "Detox Centers"],
  ["inpatient-rehab-in-", "Inpatient Rehab"],
  ["outpatient-rehab-in-", "Outpatient Rehab"],
  ["dual-diagnosis-treatment-in-", "Dual Diagnosis"],
  ["iop-in-", "IOP"],
  ["php-in-", "PHP"],
  ["mat-clinic-in-", "MAT Clinic"],
];

function renderCityOtherIntents(citySlug, currentPrefix) {
  const items = ALL_PREFIX_LABELS.filter(([p]) => p !== currentPrefix)
    .map(([p, label]) => `<li><a href="/${p}${citySlug}">${escHtml(label)}</a></li>`)
    .join("");
  return `<section aria-label="Other treatment options in this city">
      <h2>Other Treatment Options</h2>
      <ul class="pill-list">${items}</ul>
    </section>`;
}

function renderPage({ prefix, city, facilities = [] }) {
  const meta = prefixMeta(prefix);
  const { label, hub, intent } = meta;
  const stateSlug = city.stateSlug || stateSlugForAbbr(city.stateAbbr);
  const stateName = ((s) => s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, " "))(stateSlug);
  const urlPath = "/" + prefix + city.slug;
  const canonical = BASE_URL + urlPath;
  const title = `${label} in ${city.city}, ${city.stateAbbr}`;
  const metaTitle = `${title} — Treatment Directory | RehabLookup`;
  const desc = `Directory of ${label.toLowerCase()} options in ${city.city}, ${city.stateAbbr}. Compare programs, verify insurance, and find state-licensed facilities serving ${city.city}.`;
  const safeTitle = escHtml(metaTitle);
  const safeDesc = escHtml(desc);

  const breadcrumbSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL + "/" },
      { "@type": "ListItem", position: 2, name: label, item: BASE_URL + hub },
      { "@type": "ListItem", position: 3, name: city.city, item: canonical },
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
      geographicArea: {
        "@type": "City",
        name: city.city,
        containedInPlace: { "@type": "State", name: city.stateAbbr },
      },
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
  <meta property="og:image:alt" content="${safeTitle}">
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
    <nav class="breadcrumbs" aria-label="Breadcrumb"><ul><li><a href="/">Home</a> &rsaquo; </li><li><a href="${hub}">${escHtml(label)}</a> &rsaquo; </li><li>${escHtml(city.city)}</li></ul></nav>
    <h1>${escHtml(title)}</h1>
    <p>Directory of ${escHtml(label.toLowerCase())} options serving ${escHtml(city.city)}${city.population ? ` (${city.population} residents)` : ""}, ${city.stateAbbr}. Compare programs by clinical level, insurance accepted, and state licensure.</p>

    <section aria-label="About ${escHtml(label)}">
      <h2>About ${escHtml(label)}</h2>
      <p>${intent}</p>
    </section>

    ${renderFacilityList(facilities, `${city.city}, ${city.stateAbbr}`)}

    ${renderStateFactBox(stateName, stateSlug)}
    ${renderStateSignature(stateName, stateSlug)}

    ${renderCityOtherIntents(city.slug, prefix)}

    ${renderInsuranceDirectory(stateName, stateSlug)}

    ${renderLicensingBox(stateName, stateSlug)}

    <p class="small"><a href="/rehab-centers/${stateSlug}/${city.slug}">All Rehab Centers in ${escHtml(city.city)}</a> &middot; <a href="${hub}">${escHtml(label)} Near You</a> &middot; <a href="/rehab-centers/${stateSlug}">Treatment Centers in ${city.stateAbbr}</a></p>

    ${renderCta(
      `Find ${label.toLowerCase()} in ${city.city}`,
      `Verified ${city.city}, ${city.stateAbbr} ${label.toLowerCase()} options — free placement guidance from licensed coordinators.`,
    )}

    <p class="small"><a href="/rehab-centers">Browse All Treatment Centers</a> &middot; <a href="/resources">Recovery Resources</a> &middot; <a href="/">Home</a></p>
  </main>
  ${SHARED_FOOTER_HTML}
</body>
</html>`;
}

async function main() {
  const prefixes = parsePrefixes();
  const cities = parseTopCities();
  // Inject real local facilities (with /center/ links) so each page carries
  // unique, substantive content instead of templated boilerplate — the fix
  // for GSC "soft 404 / thin / crawled-not-indexed". Fetched once; matched
  // per city. Fail-soft: an empty list (no facilities / offline build) falls
  // back to the existing rich copy via renderFacilityList returning "".
  const facilities = await fetchAllFacilities();
  const byCity = groupByStateCity(facilities);
  let written = 0;
  let withFacilities = 0;
  for (const prefix of prefixes) {
    for (const city of cities) {
      const key = `${city.stateSlug || stateSlugForAbbr(city.stateAbbr)}/${citySlug(city.city)}`;
      const cityFacilities = byCity.get(key) || [];
      if (cityFacilities.length > 0) withFacilities++;
      const outPath = path.join(publicDir, `${prefix}${city.slug}.html`);
      fs.writeFileSync(outPath, renderPage({ prefix, city, facilities: cityFacilities }));
      written++;
    }
  }
  console.log(`city-treatment generator: prefixes=${prefixes.length}, cities=${cities.length}, wrote ${written} pages (${withFacilities} with live facility listings).`);
}

main().catch((err) => {
  console.error("city-treatment generator failed:", err);
  process.exit(1);
});

// Maps a facility's services + insurance + location into a curated set of
// internal links pointing at canonical hub pages. Used by CenterProfile to
// surface contextual crawl paths to related treatment, city, and insurance
// pages — strengthening internal linking without polluting the page with
// off-topic anchors.
//
// IMPORTANT: every emitted href MUST match a literal Route or SmartCatchAll
// prefix in src/App.tsx so `npm run check:internal-links` stays green.

export interface RelatedLink {
  title: string;
  href: string;
}

const slugify = (s: string): string =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// Treatment-type service-name → canonical /treatment-types slug.
// Keys are matched case-insensitively against substrings of the service name
// so variants like "Inpatient Detox" map to the right hub.
const TREATMENT_SLUG_MAP: { match: RegExp; slug: string; label: string }[] = [
  { match: /detox/i, slug: "drug-addiction-treatment", label: "Detox & Drug Treatment" },
  { match: /inpatient|residential/i, slug: "residential-inpatient", label: "Inpatient Rehab" },
  { match: /outpatient|iop|php|partial hospitalization/i, slug: "outpatient-programs", label: "Outpatient Programs" },
  { match: /dual diagnosis|co.?occurring|mental health/i, slug: "dual-diagnosis-treatment", label: "Dual Diagnosis Treatment" },
  { match: /alcohol/i, slug: "alcohol-rehabilitation", label: "Alcohol Rehabilitation" },
  { match: /holistic|yoga|meditation|mindfulness/i, slug: "holistic-therapy", label: "Holistic Therapy" },
  { match: /luxury|executive/i, slug: "luxury-rehab", label: "Luxury Rehab" },
  { match: /sober living|halfway/i, slug: "sober-living", label: "Sober Living" },
  { match: /faith|christian|spiritual/i, slug: "faith-based-rehab", label: "Faith-Based Rehab" },
  { match: /veteran/i, slug: "veterans-rehab", label: "Veterans Rehab" },
  { match: /women/i, slug: "womens-rehab", label: "Women's Rehab" },
  { match: /men/i, slug: "mens-rehab", label: "Men's Rehab" },
  { match: /fentanyl/i, slug: "fentanyl-rehab", label: "Fentanyl Rehab" },
  { match: /free|low.?cost|no.?cost/i, slug: "free-rehab", label: "Free & Low-Cost Rehab" },
];

// Insurance carrier → canonical /insurance hub slug. Keys are matched
// case-insensitively against substrings of the carrier name.
const INSURANCE_SLUG_MAP: { match: RegExp; slug: string; label: string }[] = [
  { match: /aetna/i, slug: "aetna-rehab", label: "Aetna" },
  { match: /blue cross|bcbs|blue shield|anthem blue/i, slug: "bcbs-treatment", label: "Blue Cross Blue Shield" },
  { match: /cigna/i, slug: "cigna-rehab", label: "Cigna" },
  { match: /united.?health|uhc/i, slug: "united-healthcare-rehab", label: "UnitedHealthcare" },
  { match: /humana/i, slug: "humana-rehab", label: "Humana" },
  { match: /kaiser/i, slug: "kaiser-rehab", label: "Kaiser Permanente" },
  { match: /medicare/i, slug: "medicare-rehab", label: "Medicare" },
  { match: /medicaid/i, slug: "medicaid-rehab", label: "Medicaid" },
  { match: /anthem/i, slug: "anthem-rehab", label: "Anthem" },
];

interface BuildArgs {
  city: string;
  state: string;
  services?: { service_name: string }[];
  insurance?: { insurance_name: string }[];
  /** Max links per category (keeps the section scannable). */
  maxPerCategory?: number;
}

interface RelatedLinkSets {
  treatmentLinks: RelatedLink[];
  locationLinks: RelatedLink[];
  insuranceLinks: RelatedLink[];
}

/**
 * Build the three link buckets surfaced inside <RelatedLinksSection /> on
 * a center profile. Always state-scopes the treatment links (so they point
 * at the closest geographic hub the user/crawler can act on), and adds a
 * city + state directory link to the location bucket.
 */
export function buildProfileRelatedLinks({
  city,
  state,
  services = [],
  insurance = [],
  maxPerCategory = 5,
}: BuildArgs): RelatedLinkSets {
  const stateSlug = slugify(state);
  const citySlug = slugify(city);

  // ─── Treatment links: dedupe by canonical slug, scope to this state ───
  const matchedTreatments = new Map<string, RelatedLink>();
  for (const svc of services) {
    const name = svc?.service_name ?? "";
    if (!name) continue;
    for (const m of TREATMENT_SLUG_MAP) {
      if (m.match.test(name) && !matchedTreatments.has(m.slug)) {
        matchedTreatments.set(m.slug, {
          title: `${m.label} in ${state}`,
          href: `/treatment-types/${m.slug}/${stateSlug}`,
        });
        break;
      }
    }
  }
  // Always include the state directory as an evergreen anchor at the end
  // so even facilities with sparse service tags ship at least one link.
  const treatmentLinks = Array.from(matchedTreatments.values()).slice(0, maxPerCategory);

  // ─── Location links: city + state hubs + a couple of cluster pages ───
  const locationLinks: RelatedLink[] = [
    { title: `All Rehabs in ${city}`, href: `/rehab-centers/${stateSlug}/${citySlug}` },
    { title: `${state} Treatment Directory`, href: `/rehab-centers/${stateSlug}` },
    { title: `Inpatient Rehab in ${state}`, href: `/treatment-types/residential-inpatient/${stateSlug}` },
    { title: `Outpatient in ${state}`, href: `/treatment-types/outpatient-programs/${stateSlug}` },
  ].slice(0, maxPerCategory);

  // ─── Insurance links: dedupe by canonical slug, prefer state-scoped hub ───
  const matchedInsurance = new Map<string, RelatedLink>();
  for (const ins of insurance) {
    const name = ins?.insurance_name ?? "";
    if (!name) continue;
    for (const m of INSURANCE_SLUG_MAP) {
      if (m.match.test(name) && !matchedInsurance.has(m.slug)) {
        matchedInsurance.set(m.slug, {
          title: `${m.label} Coverage in ${state}`,
          href: `/insurance/${m.slug}/${stateSlug}`,
        });
        break;
      }
    }
  }
  const insuranceLinks = Array.from(matchedInsurance.values()).slice(0, maxPerCategory);

  return { treatmentLinks, locationLinks, insuranceLinks };
}

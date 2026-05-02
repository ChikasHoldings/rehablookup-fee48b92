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
//
// Each entry carries:
//   - `match`: a word-bounded regex (so "men" doesn't match "women", and
//     "veteran" doesn't accidentally match "veterinary").
//   - `slug`: the canonical hub slug (multiple matches collapsing to the
//     same slug are deduped at emit time).
//   - `label`: the human-facing CTA text.
//   - `family`: a coarse grouping key. Only ONE link per family is emitted
//     to prevent near-duplicate labels like "Detox & Drug Treatment" + "Alcohol
//     Rehabilitation" + "Inpatient Rehab" all stacking up as generic addiction
//     CTAs. Pick the most specific family member that actually matched.
//   - `priority`: tie-breaker within a family (lower = preferred). More
//     specific intent wins over generic addiction labels.
//
// Order in the list also defines first-match precedence within a single
// service string so e.g. "Inpatient Detox" prefers "inpatient" over "detox".
const TREATMENT_SLUG_MAP: {
  match: RegExp;
  slug: string;
  label: string;
  family: string;
  priority: number;
}[] = [
  // Setting-of-care family — only one of these is emitted.
  { match: /\b(inpatient|residential)\b/i, slug: "residential-inpatient", label: "Inpatient Rehab", family: "setting", priority: 1 },
  { match: /\b(outpatient|iop|php|partial hospitalization)\b/i, slug: "outpatient-programs", label: "Outpatient Programs", family: "setting", priority: 2 },

  // Substance / clinical-intent family — only one of these is emitted.
  { match: /\bdetox(ification)?\b/i, slug: "drug-addiction-treatment", label: "Detox & Drug Treatment", family: "substance", priority: 1 },
  { match: /\b(alcohol|alcoholism)\b/i, slug: "alcohol-rehabilitation", label: "Alcohol Rehabilitation", family: "substance", priority: 2 },
  { match: /\bfentanyl\b/i, slug: "fentanyl-rehab", label: "Fentanyl Rehab", family: "substance", priority: 0 },
  { match: /\b(dual[- ]?diagnosis|co[- ]?occurring|mental[- ]health)\b/i, slug: "dual-diagnosis-treatment", label: "Dual Diagnosis Treatment", family: "substance", priority: 0 },

  // Modality family — at most one (e.g. "Holistic Therapy" OR "Faith-Based").
  { match: /\b(holistic|yoga|meditation|mindfulness)\b/i, slug: "holistic-therapy", label: "Holistic Therapy", family: "modality", priority: 1 },
  { match: /\b(faith[- ]?based|christian|spiritual)\b/i, slug: "faith-based-rehab", label: "Faith-Based Rehab", family: "modality", priority: 2 },

  // Tier / cost family.
  { match: /\b(luxury|executive)\b/i, slug: "luxury-rehab", label: "Luxury Rehab", family: "tier", priority: 1 },
  { match: /\b(free|low[- ]?cost|no[- ]?cost)\b/i, slug: "free-rehab", label: "Free & Low-Cost Rehab", family: "tier", priority: 2 },
  { match: /\b(sober[- ]living|halfway)\b/i, slug: "sober-living", label: "Sober Living", family: "tier", priority: 3 },

  // Audience family — gendered & demographic. At most ONE audience link.
  // Word-bounded `\bmen\b` means "women" won't trigger the men's match.
  { match: /\bveterans?\b/i, slug: "veterans-rehab", label: "Veterans Rehab", family: "audience", priority: 1 },
  { match: /\bwomen('s)?\b/i, slug: "womens-rehab", label: "Women's Rehab", family: "audience", priority: 2 },
  { match: /\bmen('s)?\b/i, slug: "mens-rehab", label: "Men's Rehab", family: "audience", priority: 2 },
];

// Insurance carrier → canonical /insurance hub slug. Word-bounded so
// "anthem blue cross" deterministically maps to BCBS (it sits earlier in
// the list) and free-text mentions of "blue" alone don't false-positive.
const INSURANCE_SLUG_MAP: { match: RegExp; slug: string; label: string }[] = [
  { match: /\b(blue\s*cross|bcbs|blue\s*shield|anthem\s*blue)\b/i, slug: "bcbs-treatment", label: "Blue Cross Blue Shield" },
  { match: /\baetna\b/i, slug: "aetna-rehab", label: "Aetna" },
  { match: /\bcigna\b/i, slug: "cigna-rehab", label: "Cigna" },
  { match: /\b(united[- ]?health(care)?|uhc)\b/i, slug: "united-healthcare-rehab", label: "UnitedHealthcare" },
  { match: /\bhumana\b/i, slug: "humana-rehab", label: "Humana" },
  { match: /\bkaiser\b/i, slug: "kaiser-rehab", label: "Kaiser Permanente" },
  { match: /\bmedicare\b/i, slug: "medicare-rehab", label: "Medicare" },
  { match: /\bmedicaid\b/i, slug: "medicaid-rehab", label: "Medicaid" },
  { match: /\banthem\b/i, slug: "anthem-rehab", label: "Anthem" },
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
 *
 * Dedup strategy:
 *   1. Within `treatmentLinks`, only one entry per `family` survives — the
 *      one with the lowest `priority` value. This kills near-duplicate CTAs
 *      like "Inpatient Rehab" + "Outpatient Programs" both screaming
 *      "addiction care" at the user.
 *   2. The location bucket suppresses its setting-of-care fallbacks
 *      (Inpatient/Outpatient state links) when treatment links already
 *      cover that family — preventing the same hub URL from rendering
 *      twice on a single page.
 *   3. Insurance dedupes by canonical slug; the first regex wins, so BCBS
 *      beats Anthem on "Anthem Blue Cross".
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

  // ─── Treatment links: family-aware dedupe, scope to this state ───
  // Track best (lowest-priority) match per family AND per slug. We collect
  // candidates first, then resolve, so a later service line can upgrade an
  // earlier match within the same family (e.g. "outpatient detox" — detox
  // wins on the substance family because it has lower priority).
  type Candidate = {
    slug: string;
    label: string;
    family: string;
    priority: number;
  };
  const familyBest = new Map<string, Candidate>();
  const seenSlugs = new Set<string>();

  for (const svc of services) {
    const name = svc?.service_name ?? "";
    if (!name) continue;
    for (const m of TREATMENT_SLUG_MAP) {
      if (!m.match.test(name)) continue;
      // Skip if this slug was already chosen elsewhere — same hub URL
      // shouldn't appear twice no matter how many services match it.
      if (seenSlugs.has(m.slug)) {
        break;
      }
      const existing = familyBest.get(m.family);
      if (!existing || m.priority < existing.priority) {
        familyBest.set(m.family, m);
      }
      // Stop scanning further patterns for this service — first regex
      // hit defines the service's intent.
      break;
    }
  }

  // Materialize the per-family winners into RelatedLink shape, recording
  // their slugs so the location bucket can suppress duplicates downstream.
  const treatmentSlugsEmitted = new Set<string>();
  const treatmentFamiliesEmitted = new Set<string>();
  const treatmentLinksAll: RelatedLink[] = [];
  for (const cand of familyBest.values()) {
    if (seenSlugs.has(cand.slug)) continue;
    seenSlugs.add(cand.slug);
    treatmentSlugsEmitted.add(cand.slug);
    treatmentFamiliesEmitted.add(cand.family);
    treatmentLinksAll.push({
      title: `${cand.label} in ${state}`,
      href: `/treatment-types/${cand.slug}/${stateSlug}`,
    });
  }
  // Stable display order: substance → setting → modality → tier → audience
  const FAMILY_ORDER = ["substance", "setting", "modality", "tier", "audience"];
  treatmentLinksAll.sort((a, b) => {
    const fa = [...familyBest.values()].find((c) => c.slug === extractSlug(a.href))?.family ?? "";
    const fb = [...familyBest.values()].find((c) => c.slug === extractSlug(b.href))?.family ?? "";
    return FAMILY_ORDER.indexOf(fa) - FAMILY_ORDER.indexOf(fb);
  });
  const treatmentLinks = treatmentLinksAll.slice(0, maxPerCategory);

  // ─── Location links: city + state hubs + setting-of-care fallbacks ───
  // Only add the Inpatient/Outpatient state shortcuts when the treatment
  // bucket didn't already feature that "setting" family — otherwise we'd
  // emit /treatment-types/residential-inpatient/<state> twice on the page.
  const locationCandidates: RelatedLink[] = [
    { title: `All Rehabs in ${city}`, href: `/rehab-centers/${stateSlug}/${citySlug}` },
    { title: `${state} Treatment Directory`, href: `/rehab-centers/${stateSlug}` },
  ];
  if (!treatmentSlugsEmitted.has("residential-inpatient")) {
    locationCandidates.push({
      title: `Inpatient Rehab in ${state}`,
      href: `/treatment-types/residential-inpatient/${stateSlug}`,
    });
  }
  if (!treatmentSlugsEmitted.has("outpatient-programs")) {
    locationCandidates.push({
      title: `Outpatient in ${state}`,
      href: `/treatment-types/outpatient-programs/${stateSlug}`,
    });
  }
  // Final defensive dedupe by href (city == state edge cases, etc.).
  const locationLinks = dedupeByHref(locationCandidates).slice(0, maxPerCategory);

  // ─── Insurance links: dedupe by canonical slug ───
  const matchedInsurance = new Map<string, RelatedLink>();
  for (const ins of insurance) {
    const name = ins?.insurance_name ?? "";
    if (!name) continue;
    for (const m of INSURANCE_SLUG_MAP) {
      if (m.match.test(name) && !matchedInsurance.has(m.slug)) {
        matchedInsurance.set(m.slug, {
          title: `${m.label} Coverage`,
          // Hub is national; the state context is already implied by the
          // surrounding profile + location bucket. Pointing at the hub
          // (not /insurance/:slug/:state which isn't a literal route)
          // keeps `check:internal-links` happy.
          href: `/insurance/${m.slug}`,
        });
        break;
      }
    }
  }
  const insuranceLinks = Array.from(matchedInsurance.values()).slice(0, maxPerCategory);

  return { treatmentLinks, locationLinks, insuranceLinks };
}

// Extract the treatment slug (second-to-last path segment) from
// `/treatment-types/:slug/:state` for ordering lookups.
function extractSlug(href: string): string {
  const parts = href.split("/").filter(Boolean);
  // e.g. ["treatment-types", "residential-inpatient", "florida"] → "residential-inpatient"
  return parts.length >= 3 ? parts[1] : "";
}

function dedupeByHref(links: RelatedLink[]): RelatedLink[] {
  const seen = new Set<string>();
  const out: RelatedLink[] = [];
  for (const l of links) {
    if (seen.has(l.href)) continue;
    seen.add(l.href);
    out.push(l);
  }
  return out;
}

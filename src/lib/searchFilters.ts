/**
 * Single source of truth for the public search filters.
 *
 * Background: prior to 2026-05-21 the same filter options were defined inline
 * in three places (SearchResults.tsx, RehabCenters.tsx, SearchResultsForm.tsx)
 * with subtly different matching rules. Most notably:
 *   - "private-pay" had label "Self-Pay / Private Pay" (spaces around the slash)
 *     but the data carries "Self-Pay/Private Pay" (no spaces). The substring
 *     test never bridged the whitespace, silently excluding ~2,918 facilities.
 *   - "inpatient" matched only against facility_services rows ("Inpatient",
 *     "Residential") that the production catalog does not actually contain;
 *     the 44 facilities tagged `facility_type='Residential Treatment Center'`
 *     never surfaced.
 *   - "holistic" had no signal at all once the static seed array was emptied.
 *
 * This module replaces those inline maps with a normalized matcher that
 * folds case + whitespace and supports a multi-field fallback chain
 * (services → facility_type → description).
 */

import type { PublicFacility } from "@/hooks/useStaticFacilities";

/**
 * Strips internal whitespace and lowercases so that filter labels with cosmetic
 * spaces around punctuation still match data values that omit them. e.g.
 * "Self-Pay / Private Pay" → "self-pay/privatepay" and the data value
 * "Self-Pay/Private Pay" → "self-pay/privatepay" both collapse identically.
 */
const normalize = (s: string | null | undefined): string =>
  (s ?? "").toLowerCase().replace(/\s+/g, "");

export interface SearchableFacility {
  treatmentTypes?: readonly string[] | null;
  insuranceAccepted?: readonly string[] | null;
  description?: string | null;
  facilityType?: string | null;
}

export interface TreatmentFilterOption {
  /** URL slug — must stay stable; saved searches and landing-page links depend on it. */
  readonly value: string;
  /** Human label rendered in the dropdown. */
  readonly label: string;
  /** Patterns matched against `facility_services.service_name`. */
  readonly serviceMatches: readonly string[];
  /** Optional fallback patterns matched against `facilities.facility_type`. */
  readonly facilityTypeMatches?: readonly string[];
  /** Optional last-resort patterns matched against description text. */
  readonly descriptionMatches?: readonly string[];
}

export interface InsuranceFilterOption {
  readonly value: string;
  readonly label: string;
  readonly logo?: string;
  /**
   * Patterns matched against `facility_insurance.insurance_name`. Each pattern
   * is normalized (lowercase + whitespace-stripped) before comparison so
   * label variants like "Self-Pay / Private Pay" vs "Self-Pay/Private Pay"
   * resolve to the same key.
   */
  readonly matches: readonly string[];
}

/**
 * Canonical treatment filters. Values must remain stable — they appear in
 * saved-search payloads, URL query strings, and SEO hub-page redirects.
 * The `matches` arrays were derived from the live production catalog
 * (`facility_services` + `facilities.facility_type`) so every option has at
 * least one matching facility in the current dataset.
 */
export const TREATMENT_FILTERS: readonly TreatmentFilterOption[] = [
  {
    value: "detox",
    label: "Detox",
    serviceMatches: ["Detox", "Detoxification", "Withdrawal Management"],
    facilityTypeMatches: ["Detox Center"],
  },
  {
    value: "inpatient",
    label: "Inpatient / Residential",
    // F2: production catalog has zero rows with `Inpatient` or `Residential`
    // in facility_services; the only signal is facility_type. Without this
    // fallback the filter returns 0 facilities.
    serviceMatches: ["Inpatient", "Residential"],
    facilityTypeMatches: [
      "Residential Treatment Center",
      "Residential",
      "Inpatient",
    ],
  },
  {
    value: "outpatient",
    label: "Outpatient",
    serviceMatches: [
      "Outpatient",
      "Intensive Outpatient (IOP)",
      "Partial Hospitalization (PHP)",
      "IOP",
      "PHP",
    ],
    facilityTypeMatches: [
      "Outpatient Program",
      "Intensive Outpatient (IOP)",
      "Partial Hospitalization (PHP)",
    ],
  },
  {
    value: "dual-diagnosis",
    label: "Dual Diagnosis",
    serviceMatches: ["Dual Diagnosis", "Co-Occurring", "Co-occurring"],
    facilityTypeMatches: ["Dual Diagnosis"],
    descriptionMatches: ["mental health", "co-occurring"],
  },
  {
    value: "holistic",
    label: "Holistic Therapy",
    // F3: catalog has zero rows with "Holistic" in facility_services.
    // Description fallback recovers facilities that describe yoga/meditation/
    // mindfulness in their narrative even without a discrete service tag.
    serviceMatches: ["Holistic", "Holistic Therapy"],
    descriptionMatches: [
      "yoga",
      "meditation",
      "mindfulness",
      "art therapy",
      "equine",
      "holistic",
    ],
  },
  // Secondary group — high-coverage services that previously had no UI surface.
  {
    value: "mat",
    label: "Medication-Assisted (MAT)",
    serviceMatches: [
      "Medication-Assisted Treatment (MAT)",
      "Medication Assisted",
      "MAT",
      "Suboxone",
      "Methadone",
      "Vivitrol",
    ],
  },
  {
    value: "cbt",
    label: "Cognitive Behavioral (CBT)",
    serviceMatches: [
      "Cognitive Behavioral Therapy (CBT)",
      "Cognitive Behavioral",
      "CBT",
      "DBT",
      "Dialectical Behavior",
    ],
  },
  {
    value: "trauma",
    label: "Trauma Therapy",
    serviceMatches: ["Trauma Therapy", "Trauma-Informed", "EMDR", "PTSD"],
  },
  {
    value: "aftercare",
    label: "Aftercare / Continuing Care",
    serviceMatches: [
      "Aftercare/Continuing Care",
      "Aftercare",
      "Continuing Care",
      "Alumni",
    ],
  },
  {
    value: "twelve-step",
    label: "12-Step Programs",
    serviceMatches: [
      "12-Step Programs",
      "12-Step",
      "12 Step",
      "AA",
      "Alcoholics Anonymous",
      "NA",
      "Narcotics Anonymous",
    ],
  },
  {
    value: "family",
    label: "Family Therapy",
    serviceMatches: ["Family Therapy", "Family Counseling", "Family Program"],
  },
] as const;

/**
 * Canonical insurance filters. Each entry's `matches` array carries every
 * substring observed in the catalog plus common aliases (e.g. "United
 * Healthcare" / "UnitedHealthcare" / "UHC"). All matching is normalized
 * (lowercase, whitespace-stripped) so cosmetic-space mismatches no longer
 * suppress results.
 */
export const INSURANCE_FILTERS: readonly InsuranceFilterOption[] = [
  {
    value: "aetna",
    label: "Aetna",
    logo: "/insurance-logos/aetna.svg",
    matches: ["Aetna"],
  },
  {
    value: "bcbs",
    label: "Blue Cross Blue Shield",
    logo: "/insurance-logos/bcbs.svg",
    matches: [
      "Blue Cross Blue Shield",
      "BCBS",
      "Blue Cross",
      "BlueCross",
      "Anthem Blue Cross",
      "Empire Blue",
      "Highmark",
    ],
  },
  {
    value: "cigna",
    label: "Cigna",
    logo: "/insurance-logos/cigna.svg",
    matches: ["Cigna", "Evernorth"],
  },
  {
    value: "united",
    label: "United Healthcare",
    logo: "/insurance-logos/united.svg",
    matches: ["United Healthcare", "UnitedHealthcare", "United Health", "UHC", "Optum"],
  },
  {
    value: "kaiser",
    label: "Kaiser Permanente",
    logo: "/insurance-logos/kaiser.svg",
    matches: ["Kaiser Permanente", "Kaiser"],
  },
  {
    value: "humana",
    label: "Humana",
    logo: "/insurance-logos/humana.svg",
    matches: ["Humana"],
  },
  {
    value: "anthem",
    label: "Anthem",
    logo: "/insurance-logos/anthem.svg",
    matches: ["Anthem", "Anthem Blue Cross"],
  },
  {
    value: "medicare",
    label: "Medicare",
    logo: "/insurance-logos/medicare.svg",
    matches: ["Medicare"],
  },
  {
    value: "medicaid",
    label: "Medicaid",
    logo: "/insurance-logos/medicaid.svg",
    matches: ["Medicaid", "Medi-Cal", "AHCCCS", "MassHealth", "Apple Health"],
  },
  {
    value: "tricare",
    label: "TRICARE",
    logo: "/insurance-logos/tricare.svg",
    matches: ["Tricare", "TRICARE", "VA", "Veterans Affairs", "VA Healthcare"],
  },
  {
    // F1 fix: prior label was "Self-Pay / Private Pay" (with cosmetic spaces)
    // but the catalog stores "Self-Pay/Private Pay". Normalized matching
    // now bridges the gap; explicit alias list also catches "Out of Pocket"
    // and "Cash Pay" if a provider records it that way.
    value: "private-pay",
    label: "Self-Pay / Private Pay",
    matches: [
      "Self-Pay/Private Pay",
      "Self-Pay",
      "Private Pay",
      "Self Pay",
      "Out of Pocket",
      "Cash Pay",
    ],
  },
  {
    value: "sliding-scale",
    label: "Sliding Scale / Financial Assistance",
    matches: [
      "Sliding Scale/Financial Assistance",
      "Sliding Scale",
      "Financial Assistance",
      "Scholarship",
    ],
  },
] as const;

/**
 * Legacy aliases — keep shareable URLs working when callers pass an older
 * filter value that has been collapsed into a broader canonical option.
 * Add entries here when a previously-public filter value is retired so
 * bookmarks and saved searches don't break.
 *
 * Many surfaces (hero `SearchForm`, sticky `SearchResultsForm`, the legacy
 * inline forms) build URL params straight from human-readable labels
 * ("Detox", "Inpatient", "Blue Cross Blue Shield"). Without aliasing,
 * routing those through `matchesTreatmentFilter("inpatient")` works but
 * `matchesTreatmentFilter("dual diagnosis")` fails. The label-lookup
 * fallback in `resolveTreatmentFilterKey` covers that without forcing
 * every form to migrate URL writers.
 */
export const TREATMENT_FILTER_ALIASES: Record<string, string> = {
  iop: "outpatient",
  php: "outpatient",
  "mental-health": "dual-diagnosis",
  residential: "inpatient",
};

export const INSURANCE_FILTER_ALIASES: Record<string, string> = {
  bluecross: "bcbs",
  "blue-cross": "bcbs",
  uhc: "united",
  unitedhealthcare: "united",
  "united-healthcare": "united",
  vahealthcare: "tricare",
  va: "tricare",
};

/** Normalizes any free-text key (canonical value, label, alias) → canonical
 * TREATMENT_FILTERS value, or `null` if no match. Matching is whitespace +
 * case insensitive so callers can pass "Dual Diagnosis", "dual-diagnosis",
 * or "dualdiagnosis" interchangeably. */
export const resolveTreatmentFilterKey = (raw: string): string | null => {
  if (!raw) return null;
  const direct = raw.toLowerCase().trim();
  if (TREATMENT_FILTERS.some((o) => o.value === direct)) return direct;
  if (TREATMENT_FILTER_ALIASES[direct]) return TREATMENT_FILTER_ALIASES[direct];
  const collapsed = normalize(raw);
  for (const opt of TREATMENT_FILTERS) {
    if (normalize(opt.value) === collapsed) return opt.value;
    if (normalize(opt.label) === collapsed) return opt.value;
  }
  for (const [alias, target] of Object.entries(TREATMENT_FILTER_ALIASES)) {
    if (normalize(alias) === collapsed) return target;
  }
  return null;
};

export const resolveInsuranceFilterKey = (raw: string): string | null => {
  if (!raw) return null;
  const direct = raw.toLowerCase().trim();
  if (INSURANCE_FILTERS.some((o) => o.value === direct)) return direct;
  if (INSURANCE_FILTER_ALIASES[direct]) return INSURANCE_FILTER_ALIASES[direct];
  const collapsed = normalize(raw);
  for (const opt of INSURANCE_FILTERS) {
    if (normalize(opt.value) === collapsed) return opt.value;
    if (normalize(opt.label) === collapsed) return opt.value;
    if (opt.matches.some((m) => normalize(m) === collapsed)) return opt.value;
  }
  for (const [alias, target] of Object.entries(INSURANCE_FILTER_ALIASES)) {
    if (normalize(alias) === collapsed) return target;
  }
  return null;
};

/**
 * Tests whether a treatment filter matches the facility, using the
 * services → facility_type → description fallback chain. Each pattern is
 * tested as a normalized substring so cosmetic punctuation/spacing differences
 * don't suppress matches.
 */
export function matchesTreatmentFilter(
  facility: SearchableFacility,
  filterValue: string,
): boolean {
  if (!filterValue) return true;
  const key = resolveTreatmentFilterKey(filterValue);
  if (!key) return false;
  const opt = TREATMENT_FILTERS.find((o) => o.value === key);
  if (!opt) return false;

  const services = (facility.treatmentTypes ?? []).map(normalize);
  for (const pattern of opt.serviceMatches) {
    const needle = normalize(pattern);
    if (!needle) continue;
    if (services.some((s) => s.includes(needle))) return true;
  }

  if (opt.facilityTypeMatches && facility.facilityType) {
    const ft = normalize(facility.facilityType);
    for (const pattern of opt.facilityTypeMatches) {
      const needle = normalize(pattern);
      if (!needle) continue;
      if (ft.includes(needle)) return true;
    }
  }

  if (opt.descriptionMatches && facility.description) {
    const desc = normalize(facility.description);
    for (const pattern of opt.descriptionMatches) {
      const needle = normalize(pattern);
      if (!needle) continue;
      if (desc.includes(needle)) return true;
    }
  }

  return false;
}

/**
 * Tests whether an insurance filter matches the facility. Bidirectional
 * substring (data-includes-pattern OR pattern-includes-data) so we tolerate
 * both narrower and broader catalog labels.
 */
export function matchesInsuranceFilter(
  facility: SearchableFacility,
  filterValue: string,
): boolean {
  if (!filterValue) return true;
  const key = resolveInsuranceFilterKey(filterValue);
  if (!key) return false;
  const opt = INSURANCE_FILTERS.find((o) => o.value === key);
  if (!opt) return false;

  const data = (facility.insuranceAccepted ?? []).map(normalize);
  if (data.length === 0) return false;

  for (const pattern of opt.matches) {
    const needle = normalize(pattern);
    if (!needle) continue;
    if (data.some((d) => d.includes(needle) || needle.includes(d))) return true;
  }

  return false;
}

/**
 * Returns a `{ filterValue: count }` map for the given facility set. Used
 * by filter UIs to render "(N)" badges next to each option so users can see
 * up-front which filters have results.
 */
export function countTreatmentFacets(
  facilities: readonly SearchableFacility[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const opt of TREATMENT_FILTERS) {
    counts[opt.value] = 0;
  }
  for (const f of facilities) {
    for (const opt of TREATMENT_FILTERS) {
      if (matchesTreatmentFilter(f, opt.value)) counts[opt.value]++;
    }
  }
  return counts;
}

export function countInsuranceFacets(
  facilities: readonly SearchableFacility[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const opt of INSURANCE_FILTERS) {
    counts[opt.value] = 0;
  }
  for (const f of facilities) {
    for (const opt of INSURANCE_FILTERS) {
      if (matchesInsuranceFilter(f, opt.value)) counts[opt.value]++;
    }
  }
  return counts;
}

/**
 * Back-compat shim for callers that previously used the SearchResults
 * `treatmentTypeFilters.matches`-array shape. New code should call
 * `matchesTreatmentFilter` instead.
 */
export const treatmentFilterByValue = (
  value: string,
): TreatmentFilterOption | undefined =>
  TREATMENT_FILTERS.find((o) => o.value === value);

export const insuranceFilterByValue = (
  value: string,
): InsuranceFilterOption | undefined =>
  INSURANCE_FILTERS.find((o) => o.value === value);

/**
 * The publicly-rendered set of treatment options is split visually into
 * "Levels of Care" (top 5 — backwards-compatible with all existing landing
 * pages and saved searches) and "Therapies & Programs" (the new high-
 * coverage services exposed in this pass). Consumers that don't care about
 * grouping can keep iterating `TREATMENT_FILTERS` directly.
 */
export const TREATMENT_LEVELS_OF_CARE = TREATMENT_FILTERS.filter((t) =>
  ["detox", "inpatient", "outpatient", "dual-diagnosis", "holistic"].includes(
    t.value,
  ),
);

export const TREATMENT_THERAPIES = TREATMENT_FILTERS.filter(
  (t) => !TREATMENT_LEVELS_OF_CARE.some((l) => l.value === t.value),
);

/** Narrow helper for typing in callers that accept `PublicFacility`. */
export const asSearchableFacility = (f: PublicFacility): SearchableFacility => ({
  treatmentTypes: f.treatmentTypes ?? [],
  insuranceAccepted: f.insuranceAccepted ?? [],
  description: f.description ?? null,
  facilityType: f.facilityType ?? null,
});

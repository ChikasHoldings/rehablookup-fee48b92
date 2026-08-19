/**
 * ONE CANONICAL PUBLIC FILTER STATE for /search-results.
 *
 * The contract
 * ────────────
 *   ONE user search
 *     → ONE canonical filter state
 *       → ONE result set
 *         → counts, chips, cards and the URL all describe that same set.
 *
 * Before this module the page carried THREE independent treatment dimensions
 * and TWO independent payment/insurance dimensions, AND-ed together, only one
 * of which any UI surface displayed:
 *
 *   ?treatment=detox&treatmentTypes=outpatient   →  detox AND outpatient
 *   ?type=residential&treatmentTypes=outpatient  →  inpatient AND outpatient
 *   ?insurance=aetna&insuranceTypes=medicaid     →  aetna AND medicaid
 *
 * A user who had selected "Outpatient" in the sidebar saw exactly one active
 * filter chip and one active dropdown value while the result set was being
 * narrowed by a second, invisible constraint carried over from an older link.
 * Counts, chips, cards and URL described four different sets.
 *
 * `parsePublicSearchState` collapses all of it into two arrays —
 * `treatment.values` and `insurance.values` — by PRECEDENCE, never by
 * conjunction. Every public surface then reads those two arrays.
 *
 * What this module does NOT do
 * ────────────────────────────
 * It defines no taxonomy. Filter values, labels, aliases and membership rules
 * all live in `src/lib/searchFilters.ts` and are untouched by Phase 3A; this
 * module only resolves WHICH canonical values a URL is asking for, and only
 * ever through `resolveTreatmentFilterKey` / `resolveInsuranceFilterKey`.
 */

import {
  INSURANCE_FILTERS,
  TREATMENT_FILTERS,
  resolveInsuranceFilterKey,
  resolveTreatmentFilterKey,
} from "@/lib/searchFilters";

/** Canonical multi-value filter keys. Everything else is a legacy alias. */
export const TREATMENT_PARAM = "treatmentTypes";
export const INSURANCE_PARAM = "insuranceTypes";

/** Legacy single-dimension aliases that must keep working on old links. */
export const LEGACY_TREATMENT_PARAM = "treatment";
export const LEGACY_INSURANCE_PARAM = "insurance";
export const LEGACY_TYPE_PARAM = "type";

/**
 * Params that once narrowed the result set and no longer can.
 *
 *  `distance` — the catalogue has no coordinates, so "within N miles" was a
 *               categorical tier wearing a radius costume. Removed earlier.
 *  `amenities` — Private Rooms / Fitness Center / Swimming Pool / Meditation
 *               were inferred by substring over description + treatment
 *               strings ("pool" matched "pooling", "private"+"room" matched a
 *               sentence about privacy in a room). The dataset exposes no
 *               structured amenity attribute, so the filter published an
 *               inference as a fact. Removed in Phase 3A.
 *
 * Both are INERT for membership. They are still read for `hasSearchParams`
 * (so an old filtered URL does not become newly indexable just because we
 * stopped honouring its filter) and are deleted from the URL on the next
 * user interaction.
 */
export const INERT_FILTER_PARAMS = ["distance", "amenities"] as const;

export type FilterSource =
  | "none"
  | "canonical"
  | "legacy"
  | "type-preset";

export interface ResolvedFilterDimension {
  /** Canonical, de-duplicated, order-preserving filter values. */
  readonly values: string[];
  /** Which URL representation won the precedence contest. */
  readonly source: FilterSource;
  /** Raw values present in the URL that resolve to no canonical filter. */
  readonly unsupported: string[];
}

export interface PublicSearchState {
  readonly location: string;
  readonly stateParam: string;
  readonly query: string;
  readonly treatment: ResolvedFilterDimension;
  readonly insurance: ResolvedFilterDimension;
  readonly verifiedOnly: boolean;
  readonly featuredOnly: boolean;
}

/**
 * Legacy `?type=` presets from the homepage cards and treatment landing pages.
 *
 * These previously ran as EXACT service-name checks
 * (`c.treatmentTypes.includes("Inpatient")`), which bypassed the canonical
 * matcher and therefore missed the whole `facility_type='Residential
 * Treatment Center'` population — the exact gap that
 * `TREATMENT_FILTERS.inpatient`'s `facilityTypeMatches` fallback exists to
 * close. `type=residential` and `treatmentTypes=inpatient` returned different
 * sets while claiming the same thing.
 *
 * The INTENT of each preset is preserved verbatim; only the membership test
 * changes, from raw string equality to the shared canonical matcher.
 *
 * `holistic → inpatient + outpatient` is preserved AS FOUND. It is a
 * pre-existing mapping defect (holistic is neither inpatient nor outpatient),
 * but correcting it would change treatment membership, which Phase 3A freezes.
 * Routing it through the canonical matcher now makes the two presets VISIBLE
 * in the filter UI instead of leaving them hidden — the defect is surfaced,
 * not silently carried.
 */
export const TYPE_PRESETS: Readonly<Record<string, readonly string[]>> = {
  drug: ["detox", "inpatient", "outpatient"],
  alcohol: ["detox", "inpatient", "outpatient"],
  "mental-health": ["dual-diagnosis"],
  residential: ["inpatient"],
  outpatient: ["outpatient"],
  holistic: ["inpatient", "outpatient"],
};

const EMPTY_DIMENSION: ResolvedFilterDimension = {
  values: [],
  source: "none",
  unsupported: [],
};

/** Splits a comma-separated URL value into trimmed, non-empty parts. */
export function splitFilterParam(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

interface CanonicalizeResult {
  values: string[];
  unsupported: string[];
}

function canonicalize(
  raw: string[],
  resolve: (value: string) => string | null,
): CanonicalizeResult {
  const values: string[] = [];
  const unsupported: string[] = [];
  for (const candidate of raw) {
    const key = resolve(candidate);
    if (key) {
      if (!values.includes(key)) values.push(key);
    } else if (!unsupported.includes(candidate)) {
      // An unrecognised value is UNSUPPORTED INPUT, not a constraint every
      // facility fails. Left in the URL until the next interaction, ignored
      // for membership, and never rendered as an active filter — the old
      // behaviour turned one dead bookmark value into "no facilities found".
      unsupported.push(candidate);
    }
  }
  return { values, unsupported };
}

export function canonicalTreatmentValues(raw: string[]): CanonicalizeResult {
  return canonicalize(raw, resolveTreatmentFilterKey);
}

export function canonicalInsuranceValues(raw: string[]): CanonicalizeResult {
  return canonicalize(raw, resolveInsuranceFilterKey);
}

/**
 * TREATMENT PRECEDENCE
 *   1. valid `treatmentTypes`
 *   2. otherwise valid legacy `treatment`
 *   3. otherwise a known `type=` preset
 *
 * Never a conjunction of two representations of the same dimension. If
 * `treatmentTypes` resolves to at least one canonical value, `treatment` and
 * `type` add nothing — they are duplicate spellings of one question, not two
 * questions.
 */
function resolveTreatmentDimension(params: URLSearchParams): ResolvedFilterDimension {
  const canonical = canonicalTreatmentValues(splitFilterParam(params.get(TREATMENT_PARAM)));
  const legacy = canonicalTreatmentValues(splitFilterParam(params.get(LEGACY_TREATMENT_PARAM)));
  const typeRaw = (params.get(LEGACY_TYPE_PARAM) ?? "").trim().toLowerCase();
  const preset = TYPE_PRESETS[typeRaw];

  // Everything the URL asked for that resolves to nothing, whichever tier it
  // came from — all of it gets cleaned off on the next interaction.
  const unsupported = [
    ...canonical.unsupported,
    ...legacy.unsupported,
    ...(typeRaw && !preset ? [typeRaw] : []),
  ];

  if (canonical.values.length > 0) {
    return { values: canonical.values, source: "canonical", unsupported };
  }
  if (legacy.values.length > 0) {
    return { values: legacy.values, source: "legacy", unsupported };
  }
  if (preset) {
    return { values: [...preset], source: "type-preset", unsupported };
  }
  return { values: [], source: "none", unsupported };
}

/**
 * INSURANCE PRECEDENCE
 *   1. valid `insuranceTypes`
 *   2. otherwise valid legacy `insurance`
 */
function resolveInsuranceDimension(params: URLSearchParams): ResolvedFilterDimension {
  const canonical = canonicalInsuranceValues(splitFilterParam(params.get(INSURANCE_PARAM)));
  const legacy = canonicalInsuranceValues(splitFilterParam(params.get(LEGACY_INSURANCE_PARAM)));
  const unsupported = [...canonical.unsupported, ...legacy.unsupported];

  if (canonical.values.length > 0) {
    return { values: canonical.values, source: "canonical", unsupported };
  }
  if (legacy.values.length > 0) {
    return { values: legacy.values, source: "legacy", unsupported };
  }
  return { values: [], source: "none", unsupported };
}

/** The single canonical read of the public search URL. */
export function parsePublicSearchState(params: URLSearchParams): PublicSearchState {
  return {
    location: params.get("location") ?? "",
    stateParam: params.get("state") ?? "",
    query: params.get("q") ?? "",
    treatment: resolveTreatmentDimension(params),
    insurance: resolveInsuranceDimension(params),
    verifiedOnly: params.get("verified") === "true",
    featuredOnly: params.get("featuredOnly") === "true",
  };
}

export const emptyFilterDimension = (): ResolvedFilterDimension => EMPTY_DIMENSION;

/**
 * Every public search refinement. `clearAllSearchParams` removes all of them
 * — including the legacy spellings and the inert leftovers, which the old
 * "delete the params I know about" approach could silently retain.
 */
export const ALL_PUBLIC_SEARCH_PARAMS = [
  "location",
  "q",
  "state",
  TREATMENT_PARAM,
  INSURANCE_PARAM,
  LEGACY_TREATMENT_PARAM,
  LEGACY_INSURANCE_PARAM,
  LEGACY_TYPE_PARAM,
  "verified",
  "featuredOnly",
  ...INERT_FILTER_PARAMS,
  "page",
  "sort",
] as const;

/**
 * Clear all. Historically implemented as `new URLSearchParams()`, which is
 * correct but only by accident — it also discards non-filter params. This
 * enumerates the refinements explicitly so the behaviour survives the day a
 * non-filter param needs to be preserved, and so the test suite can assert
 * on a named list.
 */
export function clearAllSearchParams(current: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(current);
  for (const key of ALL_PUBLIC_SEARCH_PARAMS) next.delete(key);
  return next;
}

/**
 * The URL rewrite applied on EVERY deliberate user interaction with the
 * search surface. It converges whatever the user arrived with onto the
 * canonical representation:
 *
 *   • both filter dimensions written as canonical `treatmentTypes` /
 *     `insuranceTypes`, with unsupported values dropped;
 *   • legacy `treatment`, `insurance` and `type` deleted, so no hidden second
 *     constraint can survive the interaction;
 *   • inert `distance` / `amenities` deleted, so the URL stops implying a
 *     filter that narrows nothing;
 *   • `page` reset, because the result set just changed underneath it.
 *
 * On INITIAL LOAD nothing is rewritten — no automatic redirect — so a stale
 * link keeps its params (and therefore its existing noindex verdict) until
 * the visitor actually does something.
 */
export function canonicalizeSearchParams(
  current: URLSearchParams,
  overrides: {
    treatment?: readonly string[];
    insurance?: readonly string[];
  } = {},
): URLSearchParams {
  const next = new URLSearchParams(current);
  const state = parsePublicSearchState(current);

  const treatment = overrides.treatment ?? state.treatment.values;
  const insurance = overrides.insurance ?? state.insurance.values;

  if (treatment.length > 0) next.set(TREATMENT_PARAM, treatment.join(","));
  else next.delete(TREATMENT_PARAM);

  if (insurance.length > 0) next.set(INSURANCE_PARAM, insurance.join(","));
  else next.delete(INSURANCE_PARAM);

  next.delete(LEGACY_TREATMENT_PARAM);
  next.delete(LEGACY_INSURANCE_PARAM);
  next.delete(LEGACY_TYPE_PARAM);
  for (const key of INERT_FILTER_PARAMS) next.delete(key);
  next.delete("page");

  return next;
}

/** Human label for a canonical treatment value; falls back to the raw value. */
export function treatmentLabel(value: string): string {
  return TREATMENT_FILTERS.find((o) => o.value === value)?.label ?? value;
}

/** Human label for a canonical payment/insurance value. */
export function insuranceLabel(value: string): string {
  return INSURANCE_FILTERS.find((o) => o.value === value)?.label ?? value;
}

/**
 * Count of ACTIVE public refinements, for the filter badge and the mobile
 * sheet counter. Counts the canonical dimensions — not the raw params — so a
 * URL carrying `treatment` + `treatmentTypes` + `type` for one dimension is
 * counted once, and an unsupported value is counted zero times because it
 * narrows nothing.
 */
export function activeFilterCount(state: PublicSearchState): number {
  return (
    state.treatment.values.length +
    state.insurance.values.length +
    (state.verifiedOnly ? 1 : 0) +
    (state.featuredOnly ? 1 : 0)
  );
}

/**
 * Maps single-filter combos on /rehab-centers (e.g. ?browseTreatment=detox)
 * to their dedicated, indexable hub pages (/treatment-types/detox-programs,
 * /insurance/aetna-rehab, etc.).
 *
 * Why redirect instead of self-canonicalize?
 * - We already maintain rich, well-linked hub pages for each treatment type
 *   and each major insurer. Self-canonicalizing the /rehab-centers query-string
 *   variant would compete with those hubs (keyword cannibalization) and
 *   fragment ranking signals.
 * - 301'ing the filter URL to its hub keeps a single canonical target,
 *   consolidates link equity, and makes the filter URL safely shareable —
 *   anyone who lands on it is bounced to the better page.
 *
 * Dual-filter combos (treatment AND insurance) intentionally do NOT redirect
 * — there's no dedicated hub for arbitrary combinations, and we keep them
 * noindex on /rehab-centers to avoid filter-facet bloat.
 *
 * Vercel-side 301s for the same query→path mappings live in vercel.json so
 * crawlers see a real 301 instead of a client-side bounce.
 */

export const TREATMENT_FILTER_TO_HUB: Record<string, string> = {
  detox: "/treatment-types/detox-programs",
  inpatient: "/treatment-types/residential-inpatient",
  outpatient: "/treatment-types/outpatient-programs",
  iop: "/treatment-types/outpatient-programs",
  php: "/treatment-types/outpatient-programs",
  "dual-diagnosis": "/treatment-types/dual-diagnosis-treatment",
  "mental-health": "/treatment-types/dual-diagnosis-treatment",
  holistic: "/treatment-types/holistic-therapy",
};

export const INSURANCE_FILTER_TO_HUB: Record<string, string> = {
  aetna: "/insurance/aetna-rehab",
  bcbs: "/insurance/bcbs-treatment",
  cigna: "/insurance/cigna-rehab",
  united: "/insurance/united-healthcare-rehab",
  medicare: "/insurance/medicare-rehab",
  medicaid: "/insurance/medicaid-rehab",
};

/**
 * Resolve the hub URL a single-filter combo should redirect to.
 * Returns null when:
 * - both filters are set (no canonical hub exists for combos)
 * - the filter value has no mapped hub (e.g. anthem, humana, kaiser, tricare)
 * - neither filter is set
 *
 * The caller should perform the redirect; this module only owns the mapping.
 */
export function resolveFilterHubRedirect(params: {
  browseTreatment?: string;
  browseInsurance?: string;
}): string | null {
  const treatment = (params.browseTreatment || "").toLowerCase().trim();
  const insurance = (params.browseInsurance || "").toLowerCase().trim();

  // Both filters → no single hub exists; let the page render its noindex view
  if (treatment && insurance) return null;

  if (treatment) return TREATMENT_FILTER_TO_HUB[treatment] ?? null;
  if (insurance) return INSURANCE_FILTER_TO_HUB[insurance] ?? null;

  return null;
}

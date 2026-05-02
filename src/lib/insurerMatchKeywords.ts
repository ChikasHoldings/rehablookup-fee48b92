/**
 * Centralized map of insurer "slug" identifiers to the keywords used to
 * match against `facility.insuranceAccepted[]` (case-insensitive substring).
 *
 * Used by:
 *  - <InsuranceFacilitiesSection /> on each /insurance/<slug> hub page
 *  - <Insurance /> directory tile counts
 *  - Future search deep-links via /rehab-centers?browseInsurance=<param>
 */

export interface InsurerMatchConfig {
  /** Stable slug used in URLs and lookups. */
  slug: string;
  /** Display name shown in headings and labels. */
  name: string;
  /** Lowercased substrings — a facility matches if ANY appears in its insuranceAccepted strings. */
  keywords: string[];
  /** Value to pass to /rehab-centers?browseInsurance=… when deep-linking "View all". */
  searchParam?: string;
}

export const INSURER_MATCH_CONFIGS: InsurerMatchConfig[] = [
  {
    slug: "aetna",
    name: "Aetna",
    keywords: ["aetna"],
    searchParam: "Aetna",
  },
  {
    slug: "bcbs",
    name: "Blue Cross Blue Shield",
    keywords: ["blue cross", "bcbs", "blue shield"],
    searchParam: "Blue Cross Blue Shield",
  },
  {
    slug: "cigna",
    name: "Cigna",
    keywords: ["cigna", "evernorth"],
    searchParam: "Cigna",
  },
  {
    slug: "united-healthcare",
    name: "UnitedHealthcare",
    keywords: ["united healthcare", "unitedhealthcare", "unitedhealth", "uhc", "optum"],
    searchParam: "UnitedHealthcare",
  },
  {
    slug: "humana",
    name: "Humana",
    keywords: ["humana"],
    searchParam: "Humana",
  },
  {
    slug: "kaiser",
    name: "Kaiser Permanente",
    keywords: ["kaiser"],
    searchParam: "Kaiser Permanente",
  },
  {
    slug: "medicare",
    name: "Medicare",
    keywords: ["medicare"],
    searchParam: "Medicare",
  },
  {
    slug: "medicaid",
    name: "Medicaid",
    keywords: ["medicaid"],
    searchParam: "Medicaid",
  },
  {
    slug: "anthem",
    name: "Anthem",
    keywords: ["anthem", "elevance"],
    searchParam: "Anthem",
  },
  {
    slug: "tricare",
    name: "TRICARE",
    keywords: ["tricare", "champus"],
    searchParam: "TRICARE",
  },
  {
    slug: "molina",
    name: "Molina Healthcare",
    keywords: ["molina"],
    searchParam: "Molina Healthcare",
  },
  {
    slug: "magellan",
    name: "Magellan Health",
    keywords: ["magellan"],
    searchParam: "Magellan",
  },
  {
    slug: "wellcare",
    name: "WellCare",
    keywords: ["wellcare", "well care"],
    searchParam: "WellCare",
  },
  {
    slug: "ambetter",
    name: "Ambetter",
    keywords: ["ambetter", "centene"],
    searchParam: "Ambetter",
  },
  {
    slug: "oscar",
    name: "Oscar Health",
    keywords: ["oscar"],
    searchParam: "Oscar Health",
  },
  {
    slug: "highmark",
    name: "Highmark BCBS",
    keywords: ["highmark"],
    searchParam: "Highmark",
  },
];

/** Find the keyword config for a given slug. */
export function getInsurerMatch(slug: string): InsurerMatchConfig | undefined {
  return INSURER_MATCH_CONFIGS.find((i) => i.slug === slug);
}

/**
 * Returns true if a facility's insuranceAccepted list mentions ANY of the
 * given keywords (case-insensitive substring match).
 */
export function facilityMatchesInsurer(
  insuranceAccepted: string[] | null | undefined,
  keywords: string[],
): boolean {
  if (!insuranceAccepted?.length || !keywords.length) return false;
  return insuranceAccepted.some((entry) => {
    const lower = entry.toLowerCase();
    return keywords.some((kw) => lower.includes(kw));
  });
}

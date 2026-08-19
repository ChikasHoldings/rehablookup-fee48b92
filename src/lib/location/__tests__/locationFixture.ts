/**
 * Location test fixture — mirrors the shape and the awkward corners of
 * the live `facilities` catalogue.
 *
 * Every city/state/ZIP value and every per-market count below was read
 * from the production catalogue (3,797 approved facilities) during the
 * Phase 2 audit, so the fixture exercises real-world messiness rather
 * than invented cases:
 *
 *   Los Angeles, CA  23      New York, NY     29
 *   Chicago, IL      28      Houston, TX      24
 *   Miami, FL         6      Denver, CO       18
 *   Washington, DC   18      (state stored as "District of Columbia")
 *
 *   Saint Charles, IL  2  +  St Charles, IL  1  → one city, 3 facilities
 *   Saint Charles, MO  2                        → a DIFFERENT city
 *
 *   ZIP 21215 (Baltimore, MD)  11
 *
 * State values are stored as FULL NAMES, matching the catalogue, where
 * 100% of approved rows use "California" rather than "CA".
 *
 * IDs are deterministic and synthetic. Real UUIDs would make the suite
 * rot the next time the catalogue is re-imported; what these tests need
 * is a STABLE set they can compare across the canonical, search and SEO
 * code paths, which is exactly what this provides.
 */

export interface FixtureFacility {
  id: string;
  name: string;
  city: string;
  state: string;
  zipCode: string;
  /** Paid signals — present only to prove they do NOT affect geography. */
  isPro?: boolean;
  featured?: boolean;
}

const make = (
  prefix: string,
  city: string,
  state: string,
  zips: readonly string[],
  count: number,
): FixtureFacility[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `${prefix}-${String(i + 1).padStart(3, "0")}`,
    name: `${city} Treatment Center ${i + 1}`,
    city,
    state,
    zipCode: zips[i % zips.length],
  }));

export const FIXTURE: FixtureFacility[] = [
  // ---- the six parity markets -----------------------------------------
  ...make("la", "Los Angeles", "California", ["90001", "90013", "90028"], 23),
  ...make("nyc", "New York", "New York", ["10001", "10035", "10002"], 29),
  ...make("chi", "Chicago", "Illinois", ["60607", "60623", "60640"], 28),
  ...make("hou", "Houston", "Texas", ["77006", "77093", "77018"], 24),
  ...make("mia", "Miami", "Florida", ["33136", "33127", "33150"], 6),
  ...make("den", "Denver", "Colorado", ["80206", "80215", "80204"], 18),

  // ---- District of Columbia -------------------------------------------
  // Stored as the full district name, which the old 50-entry state table
  // could not normalize at all.
  ...make("dc", "Washington", "District of Columbia", ["20001", "20020", "20032"], 18),

  // ---- same state, different cities (the NEARBY bucket) ---------------
  ...make("sd", "San Diego", "California", ["92103", "92105"], 14),
  ...make("sf", "San Francisco", "California", ["94110", "94102"], 4),

  // ---- neighbouring states (must NEVER enter a CA exact set) ----------
  ...make("phx", "Phoenix", "Arizona", ["85016", "85008"], 30),
  ...make("lv", "Las Vegas", "Nevada", ["89101", "89121"], 20),
  ...make("pdx", "Portland", "Oregon", ["97209", "97206"], 10),

  // ---- St. / Saint, and the same city name in two states --------------
  // Recorded three different ways in one city; two rows in a genuinely
  // different city that happens to share the name.
  {
    id: "stc-il-001",
    name: "Saint Charles Recovery",
    city: "Saint Charles",
    state: "Illinois",
    zipCode: "60175",
  },
  {
    id: "stc-il-002",
    name: "Fox Valley Treatment",
    city: "Saint Charles",
    state: "Illinois",
    zipCode: "60175",
  },
  {
    id: "stc-il-003",
    name: "St Charles Wellness",
    city: "St Charles", // no period — as stored in the catalogue
    state: "Illinois",
    zipCode: "60174",
  },
  {
    id: "stc-mo-001",
    name: "Saint Charles MO Recovery",
    city: "Saint Charles",
    state: "Missouri",
    zipCode: "63301",
  },
  {
    id: "stc-mo-002",
    name: "Missouri River Treatment",
    city: "Saint Charles",
    state: "Missouri",
    zipCode: "63303",
  },

  // ---- ZIP concentration ----------------------------------------------
  ...make("balt", "Baltimore", "Maryland", ["21215"], 11),

  // ---- paid-status controls -------------------------------------------
  // A Featured + Pro San Diego facility. It must not become a Los Angeles
  // match, and a Featured Phoenix facility must not become a California
  // match. Paid status has no bearing on geography.
  {
    id: "paid-sd-001",
    name: "Featured San Diego Center",
    city: "San Diego",
    state: "California",
    zipCode: "92101",
    isPro: true,
    featured: true,
  },
  {
    id: "paid-phx-001",
    name: "Featured Phoenix Center",
    city: "Phoenix",
    state: "Arizona",
    zipCode: "85016",
    isPro: true,
    featured: true,
  },
];

/** Sorted ID list — order-independent set comparison in assertions. */
export const idsOf = (rows: readonly { id: string }[]): string[] =>
  rows.map((r) => r.id).sort();

/** Expected EXACT counts, asserted directly by the parity matrix test. */
export const EXPECTED_EXACT: Record<string, number> = {
  "Los Angeles, CA": 23,
  "New York, NY": 29,
  "Chicago, IL": 28,
  "Houston, TX": 24,
  "Miami, FL": 6,
  "Denver, CO": 18,
};

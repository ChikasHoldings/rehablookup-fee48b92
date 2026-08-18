/**
 * PHASE 2 — LOCATION TRUTH regression suite.
 *
 * The contract under test: a page or search labelled "Los Angeles"
 * contains Los Angeles facilities and nothing else.
 *
 * These tests are written against behaviour that was WRONG before this
 * phase. Several of them fail loudly if the old widening semantics ever
 * come back — see "planted failure" at the bottom, which reconstructs
 * the old algorithm and asserts it violates the new contract.
 */

import { describe, expect, it } from "vitest";

import {
  countExact,
  describeScope,
  filterExact,
  isValidZip,
  matchesExactly,
  normalizeCityName,
  normalizeState,
  normalizeZip,
  parseLocation,
  relateToScope,
  splitByLocation,
  stateDisplayName,
  statesMatch,
} from "../core.mjs";
import { FIXTURE, idsOf } from "./locationFixture.ts";

const scopeFor = (q: string) => parseLocation(q);
const exact = (q: string) => filterExact(FIXTURE, scopeFor(q));

describe("exact city semantics — the six parity markets", () => {
  // 1–6. Each market returns exactly its own facilities.
  const markets: Array<[string, number, string]> = [
    ["Los Angeles, CA", 23, "Los Angeles"],
    ["New York, NY", 29, "New York"],
    ["Chicago, IL", 28, "Chicago"],
    ["Houston, TX", 24, "Houston"],
    ["Miami, FL", 6, "Miami"],
    ["Denver, CO", 18, "Denver"],
  ];

  it.each(markets)("%s returns exactly %i facilities, all in %s", (query, count, city) => {
    const rows = exact(query);
    expect(rows).toHaveLength(count);
    for (const r of rows) expect(r.city).toBe(city);
  });

  // 14. Exact city excludes other cities in the SAME state.
  it("Los Angeles excludes San Diego and San Francisco", () => {
    const cities = new Set(exact("Los Angeles, CA").map((r) => r.city));
    expect(cities).toEqual(new Set(["Los Angeles"]));
    expect(cities.has("San Diego")).toBe(false);
    expect(cities.has("San Francisco")).toBe(false);
  });

  // 15. Exact state excludes neighbouring states.
  it("California excludes Arizona, Nevada and Oregon", () => {
    const states = new Set(exact("California").map((r) => r.state));
    expect(states).toEqual(new Set(["California"]));
  });

  it("a California state search does not inherit the old 4-state widening", () => {
    // Old behaviour returned CA + AZ + NV + OR. On the live catalogue
    // that was 575 rows for a 23-facility city.
    const rows = exact("California");
    expect(rows.every((r) => r.state === "California")).toBe(true);
    expect(rows.some((r) => r.state === "Arizona")).toBe(false);
    expect(rows.some((r) => r.state === "Nevada")).toBe(false);
    expect(rows.some((r) => r.state === "Oregon")).toBe(false);
  });
});

describe("state normalization", () => {
  // 7. CA ↔ California
  it("normalizes CA and California to one value", () => {
    expect(normalizeState("CA")).toBe("CA");
    expect(normalizeState("California")).toBe("CA");
    expect(statesMatch("CA", "California")).toBe(true);
    expect(stateDisplayName("ca")).toBe("California");
  });

  // 8. NY ↔ New York
  it("normalizes NY and New York to one value", () => {
    expect(normalizeState("NY")).toBe("NY");
    expect(normalizeState("New York")).toBe("NY");
    expect(statesMatch("ny", "new york")).toBe(true);
  });

  // 9. whitespace / case
  it("ignores case and harmless whitespace", () => {
    expect(normalizeState("  california  ")).toBe("CA");
    expect(normalizeState("NeW   YoRk")).toBe("NY");
    expect(normalizeState("illinois")).toBe("IL");
  });

  it("rejects unknown states instead of guessing", () => {
    expect(normalizeState("Freedonia")).toBeNull();
    expect(normalizeState("Californ")).toBeNull();
    expect(normalizeState("XX")).toBeNull();
    expect(normalizeState("")).toBeNull();
    expect(normalizeState(null)).toBeNull();
    // No fuzzy matching: a near-miss is a miss.
    expect(statesMatch("Californa", "California")).toBe(false);
  });

  it("supports District of Columbia, which the old 50-state table omitted", () => {
    expect(normalizeState("District of Columbia")).toBe("DC");
    expect(normalizeState("DC")).toBe("DC");
    expect(normalizeState("Washington, D.C.")).toBe("DC");
    // The regression this guards: 18 real DC facilities matched nothing,
    // which then tripped the zero-result widening path.
    const rows = exact("Washington, DC");
    expect(rows).toHaveLength(18);
    expect(rows.every((r) => r.state === "District of Columbia")).toBe(true);
  });

  it("keeps bare Washington as the state, not the district", () => {
    expect(normalizeState("Washington")).toBe("WA");
  });
});

describe("city normalization — St. / Saint", () => {
  // 10. Supported St. ↔ Saint case, from real catalogue rows.
  it("treats Saint Charles and St Charles as one city", () => {
    expect(normalizeCityName("St. Charles")).toBe("saint charles");
    expect(normalizeCityName("St Charles")).toBe("saint charles");
    expect(normalizeCityName("Saint Charles")).toBe("saint charles");

    const rows = exact("Saint Charles, IL");
    expect(rows).toHaveLength(3);
    expect(idsOf(rows)).toEqual(["stc-il-001", "stc-il-002", "stc-il-003"]);
  });

  it("resolves the same set whichever spelling the user types", () => {
    expect(idsOf(exact("St Charles, IL"))).toEqual(idsOf(exact("Saint Charles, IL")));
    expect(idsOf(exact("St. Charles, Illinois"))).toEqual(idsOf(exact("Saint Charles, IL")));
  });

  // 11. Same city name in different states.
  it("keeps Saint Charles IL and Saint Charles MO apart", () => {
    const il = exact("Saint Charles, IL");
    const mo = exact("Saint Charles, MO");
    expect(il).toHaveLength(3);
    expect(mo).toHaveLength(2);
    expect(idsOf(mo)).toEqual(["stc-mo-001", "stc-mo-002"]);
    // Disjoint sets — normalization must never merge two municipalities.
    const overlap = idsOf(il).filter((id) => idsOf(mo).includes(id));
    expect(overlap).toEqual([]);
  });

  it("does not collapse genuinely different cities", () => {
    expect(normalizeCityName("San Diego")).not.toBe(normalizeCityName("San Francisco"));
    expect(normalizeCityName("Chicago")).not.toBe(normalizeCityName("Chicopee"));
  });

  it("a bare city name does not silently choose a state", () => {
    const scope = parseLocation("Saint Charles");
    expect(scope.type).toBe("city-any-state");
    // It matches the city in EVERY state, and says so, rather than
    // guessing Illinois or Missouri.
    expect(filterExact(FIXTURE, scope)).toHaveLength(5);
  });
});

describe("ZIP semantics", () => {
  // 16. ZIP exact behaviour.
  it("matches an exact ZIP and nothing else", () => {
    const rows = exact("21215");
    expect(rows).toHaveLength(11);
    expect(rows.every((r) => r.zipCode === "21215")).toBe(true);
  });

  it("folds ZIP+4 onto its 5-digit base", () => {
    expect(normalizeZip("21215-1234")).toBe("21215");
    expect(idsOf(exact("21215-1234"))).toEqual(idsOf(exact("21215")));
  });

  it("does not widen a ZIP into its city or state", () => {
    // The old path resolved 90001 → Los Angeles → California → +AZ/NV/OR.
    const rows = exact("90001");
    expect(rows.every((r) => r.zipCode === "90001")).toBe(true);
    expect(rows.length).toBeLessThan(countExact(FIXTURE, parseLocation("Los Angeles, CA")));
  });

  // 17. Invalid ZIP behaviour.
  it("refuses partial or malformed ZIPs rather than inventing precision", () => {
    expect(normalizeZip("902")).toBeNull();
    expect(normalizeZip("9021")).toBeNull();
    expect(normalizeZip("abcde")).toBeNull();
    expect(isValidZip("902")).toBe(false);

    // A partial ZIP is not a prefix search — it selects nothing.
    expect(parseLocation("902").type).toBe("unresolved");
    expect(exact("902")).toHaveLength(0);
  });

  it("never treats a ZIP as a substring match", () => {
    // "121" appears inside "21215" but must not match it.
    expect(exact("121")).toHaveLength(0);
  });
});

describe("zero-result behaviour", () => {
  // 12. Zero exact results stay zero.
  it("returns 0 for a city with no facilities", () => {
    const rows = exact("Fresno, CA");
    expect(rows).toHaveLength(0);
    expect(countExact(FIXTURE, parseLocation("Fresno, CA"))).toBe(0);
  });

  // 13. Zero results must not disable location filtering.
  it("does NOT fall back to statewide or nationwide results", () => {
    const scope = parseLocation("Fresno, CA");
    const split = splitByLocation(FIXTURE, scope);

    // The exact bucket is empty and stays empty.
    expect(split.exact).toHaveLength(0);

    // Nothing from outside California leaked into the nearby bucket
    // either — nearby is same-state-only, and it is a SEPARATE bucket.
    expect(split.nearby.every((r) => r.state === "California")).toBe(true);
    expect(split.exact.length + split.nearby.length).toBeLessThan(FIXTURE.length);
  });

  it("an unresolvable query selects nothing at all", () => {
    expect(parseLocation("qqzzxx county").type).toBe("unresolved");
    expect(filterExact(FIXTURE, parseLocation("qqzzxx county"))).toHaveLength(0);
    expect(filterExact(FIXTURE, { type: "unresolved", raw: "junk" })).toHaveLength(0);
  });
});

describe("nearby is a separate bucket", () => {
  // 19. Nearby results do not enter the exact count.
  it("keeps same-state-different-city facilities out of the exact set", () => {
    const scope = parseLocation("Los Angeles, CA");
    const split = splitByLocation(FIXTURE, scope);

    expect(split.exact).toHaveLength(23);
    expect(split.exact.every((r) => r.city === "Los Angeles")).toBe(true);

    // Nearby holds the rest of California and only California.
    expect(split.nearby.length).toBeGreaterThan(0);
    expect(split.nearby.every((r) => r.state === "California")).toBe(true);
    expect(split.nearby.every((r) => r.city !== "Los Angeles")).toBe(true);

    // The two buckets never overlap.
    const overlap = idsOf(split.exact).filter((id) => idsOf(split.nearby).includes(id));
    expect(overlap).toEqual([]);
  });

  it("never puts a neighbouring state into nearby", () => {
    const split = splitByLocation(FIXTURE, parseLocation("Los Angeles, CA"));
    const nearbyStates = new Set(split.nearby.map((r) => r.state));
    expect(nearbyStates).toEqual(new Set(["California"]));
    expect(nearbyStates.has("Arizona")).toBe(false);
    expect(nearbyStates.has("Nevada")).toBe(false);
    expect(nearbyStates.has("Oregon")).toBe(false);
  });

  it("offers no nearby bucket for a state or ZIP scope", () => {
    expect(splitByLocation(FIXTURE, parseLocation("California")).nearby).toHaveLength(0);
    expect(splitByLocation(FIXTURE, parseLocation("21215")).nearby).toHaveLength(0);
  });

  it("classifies relations explicitly", () => {
    const la = parseLocation("Los Angeles, CA");
    const laRow = FIXTURE.find((f) => f.id === "la-001")!;
    const sdRow = FIXTURE.find((f) => f.id === "sd-001")!;
    const phxRow = FIXTURE.find((f) => f.id === "phx-001")!;
    expect(relateToScope(laRow, la)).toBe("exact");
    expect(relateToScope(sdRow, la)).toBe("nearby");
    expect(relateToScope(phxRow, la)).toBe("none");
  });
});

describe("county semantics", () => {
  // 18. County behaviour based on ACTUAL data capability.
  it("matches nothing, because no facility-level county data exists", () => {
    // The facilities table exposes city, state, zip_code and address —
    // there is no county column. Rather than infer county from city
    // names, a county scope selects nothing and callers surface the
    // limitation. County PAGES keep working from their curated
    // majorCities crosswalk; this is about not claiming exactness.
    const scope = parseLocation("Cook County, IL");
    expect(scope.type).toBe("county");
    expect(filterExact(FIXTURE, scope)).toHaveLength(0);
  });

  it("never infers a county from a similarly named city", () => {
    // A facility in the city of Orange is not evidence about Orange
    // County. Both directions must stay empty.
    expect(filterExact(FIXTURE, parseLocation("Orange County, CA"))).toHaveLength(0);
    expect(filterExact(FIXTURE, parseLocation("Cook County, Illinois"))).toHaveLength(0);
  });

  it("refuses a county with no state context", () => {
    expect(parseLocation("Cook County").type).toBe("unresolved");
  });
});

describe("paid status never affects geography", () => {
  it("a Featured San Diego facility is not a Los Angeles match", () => {
    const featuredSD = FIXTURE.find((f) => f.id === "paid-sd-001")!;
    expect(featuredSD.featured).toBe(true);
    expect(featuredSD.isPro).toBe(true);
    expect(matchesExactly(featuredSD, parseLocation("Los Angeles, CA"))).toBe(false);
    expect(idsOf(exact("Los Angeles, CA"))).not.toContain("paid-sd-001");
  });

  it("a Featured Phoenix facility is not a California match", () => {
    expect(matchesExactly(
      FIXTURE.find((f) => f.id === "paid-phx-001")!,
      parseLocation("California"),
    )).toBe(false);
  });

  it("stripping paid flags changes nothing about membership", () => {
    const scope = parseLocation("San Diego, CA");
    const withFlags = idsOf(filterExact(FIXTURE, scope));
    const withoutFlags = idsOf(
      filterExact(
        FIXTURE.map((f) => ({ ...f, isPro: false, featured: false })),
        scope,
      ),
    );
    expect(withoutFlags).toEqual(withFlags);
  });
});

describe("query parsing", () => {
  it("recognises the supported formats", () => {
    expect(parseLocation("90210")).toEqual({ type: "zip", zip: "90210" });
    expect(parseLocation("Los Angeles, CA")).toEqual({
      type: "city",
      city: "Los Angeles",
      state: "CA",
    });
    expect(parseLocation("Los Angeles, California")).toEqual({
      type: "city",
      city: "Los Angeles",
      state: "CA",
    });
    expect(parseLocation("California")).toEqual({ type: "state", state: "CA" });
    expect(parseLocation("Los Angeles")).toEqual({
      type: "city-any-state",
      city: "Los Angeles",
    });
    expect(parseLocation("Cook County, IL")).toEqual({
      type: "county",
      county: "Cook",
      state: "IL",
    });
  });

  it("labels a scope with the geography it actually covers", () => {
    expect(describeScope(parseLocation("Los Angeles, CA"))).toBe("Los Angeles, CA");
    expect(describeScope(parseLocation("21215"))).toBe("ZIP 21215");
    expect(describeScope(parseLocation("California"))).toBe("CA");
  });

  it("tolerates messy but valid input", () => {
    expect(parseLocation("  los angeles ,  ca ")).toEqual({
      type: "city",
      city: "los angeles",
      state: "CA",
    });
    expect(idsOf(exact("  LOS   ANGELES ,  california "))).toEqual(
      idsOf(exact("Los Angeles, CA")),
    );
  });

  it("does not read a stray number as a place", () => {
    expect(parseLocation("1234567").type).toBe("unresolved");
    expect(parseLocation("").type).toBe("unresolved");
  });
});

/**
 * PLANTED FAILURE TEST.
 *
 * Reconstructs the pre-Phase-2 algorithm and proves it violates the new
 * contract. If someone reintroduces tier-based membership or the
 * zero-result auto-expand, the production matcher starts behaving like
 * `legacyMatches` below and the contract assertions in this file fail.
 */
describe("planted failure — the old widening behaviour is now a contract violation", () => {
  const NEARBY_STATES: Record<string, string[]> = { CA: ["AZ", "NV", "OR"] };
  const LONG_TO_ABBR: Record<string, string> = {
    California: "CA",
    Arizona: "AZ",
    Nevada: "NV",
    Oregon: "OR",
  };

  /** The old `facilityMatchesLocation`: true for city OR state OR nearby. */
  const legacyMatches = (
    f: { city: string; state: string },
    city: string,
    stateAbbr: string,
  ): boolean => {
    const fAbbr = LONG_TO_ABBR[f.state];
    if (f.city.toLowerCase() === city.toLowerCase() && fAbbr === stateAbbr) return true;
    if (fAbbr === stateAbbr) return true; // statewide tier
    if ((NEARBY_STATES[stateAbbr] ?? []).includes(fAbbr)) return true; // nearby tier
    return false;
  };

  it("the old matcher returns facilities that are NOT in Los Angeles", () => {
    const legacy = FIXTURE.filter((f) => legacyMatches(f, "Los Angeles", "CA"));
    const canonical = exact("Los Angeles, CA");

    // The old set is dramatically larger...
    expect(legacy.length).toBeGreaterThan(canonical.length);
    // ...and it is polluted with other cities and other states entirely.
    expect(legacy.some((f) => f.city !== "Los Angeles")).toBe(true);
    expect(legacy.some((f) => f.state !== "California")).toBe(true);

    // The new contract: everything in the exact set really is in LA.
    expect(canonical.every((f) => f.city === "Los Angeles")).toBe(true);
    expect(canonical.every((f) => f.state === "California")).toBe(true);
  });

  it("every facility the old matcher added would now fail the contract", () => {
    const canonicalIds = new Set(exact("Los Angeles, CA").map((f) => f.id));
    const extras = FIXTURE.filter(
      (f) => legacyMatches(f, "Los Angeles", "CA") && !canonicalIds.has(f.id),
    );
    expect(extras.length).toBeGreaterThan(0);
    for (const f of extras) {
      expect(matchesExactly(f, parseLocation("Los Angeles, CA"))).toBe(false);
    }
  });

  it("the old zero-result auto-expand would have returned the whole catalogue", () => {
    // Old code: 0 exact matches → stop filtering → every facility shown,
    // still labelled with the user's search term.
    const scope = parseLocation("Fresno, CA");
    const legacyOnZero = filterExact(FIXTURE, scope).length === 0 ? FIXTURE : [];
    expect(legacyOnZero).toHaveLength(FIXTURE.length);

    // New behaviour: zero means zero.
    expect(filterExact(FIXTURE, scope)).toHaveLength(0);
  });
});

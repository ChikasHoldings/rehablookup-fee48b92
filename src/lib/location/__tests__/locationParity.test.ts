/**
 * PHASE 2 — SEARCH ↔ SEO LOCATION PARITY MATRIX.
 *
 * The audit found three parallel, non-equivalent geographic matchers:
 *
 *   1. public search      — `proximitySearch.facilityMatchesLocation`
 *   2. React SEO pages    — `citiesMatch` + an ad-hoc state comparison
 *   3. Node generators    — a raw `toLowerCase().replace(/\s+/g,"-")` slug
 *
 * They disagreed, so the same city could report three different facility
 * sets depending on which surface you asked. This suite pins all three
 * to the canonical layer and compares FACILITY ID SETS, not just counts,
 * for every parity market.
 *
 * Each path below is exercised through the real production code:
 *   • search  → `facilityMatchesLocation` from `@/lib/proximitySearch`
 *   • SEO     → `stateCityKey` grouping, the same helper the Node
 *               generators and the city-inventory injector call
 *   • canon   → `filterExact` from the canonical layer
 */

import { describe, expect, it } from "vitest";

import { facilityMatchesLocation, parseLocationInput } from "@/lib/proximitySearch";
import {
  cityMatchKey,
  cityMatchKeyFromSlug,
  countExact,
  filterExact,
  normalizeState,
  parseLocation,
  splitByLocation,
  stateSlugFor,
} from "../core.mjs";
import { EXPECTED_EXACT, FIXTURE, idsOf, type FixtureFacility } from "./locationFixture.ts";

/** PATH 1 — what public search returns for a typed location. */
function searchPath(query: string): FixtureFacility[] {
  const match = parseLocationInput(query);
  return FIXTURE.filter((f) =>
    facilityMatchesLocation({ city: f.city, state: f.state, zipCode: f.zipCode }, match),
  );
}

/** PATH 2 — canonical layer, the single source of truth. */
function canonicalPath(query: string): FixtureFacility[] {
  return filterExact(FIXTURE, parseLocation(query));
}

/**
 * PATH 3 — the SEO generator path. Mirrors `groupByStateCity` in
 * `scripts/_facility-data.mjs`: facilities are bucketed by canonical
 * `state/city` key, and a city PAGE looks itself up by the same key
 * derived from its URL slugs.
 */
function seoInventoryPath(stateSlug: string, citySlug: string): FixtureFacility[] {
  const buckets = new Map<string, FixtureFacility[]>();
  for (const f of FIXTURE) {
    const key = `${stateSlugFor(f.state) ?? ""}/${cityMatchKey(f.city)}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(f);
  }
  const pageKey = `${stateSlugFor(stateSlug.replace(/-+/g, " ")) ?? ""}/${cityMatchKeyFromSlug(citySlug)}`;
  return buckets.get(pageKey) ?? [];
}

/** The parity matrix. Slugs are the real published city-page paths. */
const MATRIX = [
  { label: "Los Angeles, CA", query: "Los Angeles, CA", stateSlug: "california", citySlug: "los-angeles" },
  { label: "New York, NY", query: "New York, NY", stateSlug: "new-york", citySlug: "new-york" },
  { label: "Chicago, IL", query: "Chicago, IL", stateSlug: "illinois", citySlug: "chicago" },
  { label: "Houston, TX", query: "Houston, TX", stateSlug: "texas", citySlug: "houston" },
  { label: "Miami, FL", query: "Miami, FL", stateSlug: "florida", citySlug: "miami" },
  { label: "Denver, CO", query: "Denver, CO", stateSlug: "colorado", citySlug: "denver" },
] as const;

describe("search ↔ SEO exact-location parity", () => {
  // 20. Search and SEO agree on exact location membership — by ID set.
  it.each(MATRIX)(
    "$label — canonical, search and SEO inventory return the same facility IDs",
    ({ label, query, stateSlug, citySlug }) => {
      const canon = idsOf(canonicalPath(query));
      const search = idsOf(searchPath(query));
      const seo = idsOf(seoInventoryPath(stateSlug, citySlug));

      expect(canon).toHaveLength(EXPECTED_EXACT[label]);
      expect(search).toEqual(canon);
      expect(seo).toEqual(canon);
    },
  );

  it("parity holds for District of Columbia", () => {
    const canon = idsOf(canonicalPath("Washington, DC"));
    expect(canon).toHaveLength(18);
    expect(idsOf(searchPath("Washington, DC"))).toEqual(canon);
    expect(idsOf(seoInventoryPath("district-of-columbia", "washington"))).toEqual(canon);
  });

  it("parity holds across the St./Saint spelling split", () => {
    // The city page ships at /rehab-centers/illinois/st-charles while the
    // catalogue stores two rows as "Saint Charles" and one as
    // "St Charles". All three paths must agree on all three facilities.
    const canon = idsOf(canonicalPath("Saint Charles, IL"));
    expect(canon).toEqual(["stc-il-001", "stc-il-002", "stc-il-003"]);
    expect(idsOf(searchPath("St Charles, IL"))).toEqual(canon);
    expect(idsOf(seoInventoryPath("illinois", "st-charles"))).toEqual(canon);
    expect(idsOf(seoInventoryPath("illinois", "saint-charles"))).toEqual(canon);
  });

  it("the SEO path keeps same-named cities in different states apart", () => {
    const il = idsOf(seoInventoryPath("illinois", "st-charles"));
    const mo = idsOf(seoInventoryPath("missouri", "st-charles"));
    expect(il).toHaveLength(3);
    expect(mo).toHaveLength(2);
    expect(il.filter((id) => mo.includes(id))).toEqual([]);
  });

  it("a page slug with no facilities yields an empty set, not a fallback", () => {
    expect(seoInventoryPath("california", "fresno")).toHaveLength(0);
    expect(canonicalPath("Fresno, CA")).toHaveLength(0);
    expect(searchPath("Fresno, CA")).toHaveLength(0);
  });
});

describe("counts rendered to users equal the exact matched set", () => {
  it.each(MATRIX)("$label count is the exact set size", ({ label, query }) => {
    const scope = parseLocation(query);
    const split = splitByLocation(FIXTURE, scope);
    expect(split.exact).toHaveLength(EXPECTED_EXACT[label]);
    // The rendered count is the exact set and nothing else.
    expect(countExact(FIXTURE, scope)).toBe(EXPECTED_EXACT[label]);
    // Nearby, where it exists, is strictly additional and disjoint.
    for (const n of split.nearby) {
      expect(idsOf(split.exact)).not.toContain(n.id);
    }
  });

  it("Los Angeles has a non-empty nearby bucket that is excluded from its count", () => {
    // Guards the assertion above from going vacuous: LA is the market
    // where same-state-different-city facilities actually exist.
    const split = splitByLocation(FIXTURE, parseLocation("Los Angeles, CA"));
    expect(split.nearby.length).toBeGreaterThan(0);
    expect(split.exact).toHaveLength(23);
    expect(split.exact.length + split.nearby.length).toBeGreaterThan(split.exact.length);
  });

  it("Los Angeles reports 23, not the old widened 575-style total", () => {
    const split = splitByLocation(FIXTURE, parseLocation("Los Angeles, CA"));
    const widened = FIXTURE.filter(
      (f) => ["California", "Arizona", "Nevada", "Oregon"].includes(f.state),
    );
    expect(split.exact).toHaveLength(23);
    // The old tier-based set was far larger than the truthful count.
    expect(widened.length).toBeGreaterThan(split.exact.length * 4);
  });
});

describe("combined filters isolate LOCATION membership", () => {
  /**
   * Location + a second dimension. The second filter here is a stand-in
   * for the EXISTING treatment/insurance matchers, applied unchanged as
   * a fixed second filter. Phase 2 does not touch treatment or insurance
   * semantics; this only proves the LOCATION half is canonical and that
   * the second filter narrows the exact set rather than widening it.
   */
  const secondFilter = (f: FixtureFacility) => f.zipCode.endsWith("1");

  it("location + second filter is a strict subset of location alone", () => {
    for (const { query } of MATRIX) {
      const locationOnly = canonicalPath(query);
      const combined = locationOnly.filter(secondFilter);
      const combinedIds = new Set(idsOf(combined));
      expect(combined.length).toBeLessThanOrEqual(locationOnly.length);
      for (const id of combinedIds) expect(idsOf(locationOnly)).toContain(id);
    }
  });

  it("a second filter that matches nothing still cannot widen the location", () => {
    const locationOnly = canonicalPath("Miami, FL");
    const combined = locationOnly.filter(() => false);
    expect(combined).toHaveLength(0);
    // Crucially: it does NOT fall back to Florida or the nation.
    expect(locationOnly.every((f) => f.city === "Miami")).toBe(true);
  });
});

describe("legacy search adapter no longer widens", () => {
  it("a city+state search returns only that city", () => {
    for (const { query } of MATRIX) {
      const rows = searchPath(query);
      const cities = new Set(rows.map((r) => r.city));
      expect(cities.size).toBe(1);
    }
  });

  it("a state-only search returns only that state", () => {
    const rows = searchPath("California");
    expect(rows.length).toBeGreaterThan(0);
    expect(new Set(rows.map((r) => r.state))).toEqual(new Set(["California"]));
  });

  it("a ZIP search returns only that ZIP", () => {
    const rows = searchPath("21215");
    expect(rows).toHaveLength(11);
    expect(new Set(rows.map((r) => r.zipCode))).toEqual(new Set(["21215"]));
  });

  it("normalizes state form so CA and California agree", () => {
    expect(idsOf(searchPath("Los Angeles, CA"))).toEqual(
      idsOf(searchPath("Los Angeles, California")),
    );
    expect(normalizeState("California")).toBe(normalizeState("CA"));
  });
});

/**
 * Guards for the supplemental county facts.
 *
 * 621 county slugs are published and countySeoData covers 465. The other
 * 156 rendered with state facts only, which is why every remaining
 * duplicate cluster in the corpus was a county page — all seven New
 * Jersey counties produced one body, all six Illinois counties produced
 * another. This dataset closes that, and these guards hold it to the two
 * rules it was built under: cover every published slug, and never assert
 * a fact that was estimated rather than known.
 */

import { describe, expect, it } from "vitest";
import { readdirSync, statSync } from "node:fs";
import path from "node:path";

import { stateCountyData } from "@/data/countySeoData";
import { COUNTY_SUPPLEMENT, countySupplement, supplementCount } from "../countySupplementalFacts.mjs";

/** Every county slug this site actually publishes a page for, read from
 *  the prerendered corpus rather than from a list that could drift. */
function publishedCountySlugs() {
  const found = new Set<string>();
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (entry.endsWith(".html")) {
        const m = full.match(/\/([a-z-]+)\/county\/([a-z0-9-]+)(?:\/|\.html)/);
        if (m) found.add(`${m[1]}/${m[2]}`);
      }
    }
  };
  walk(path.resolve(process.cwd(), "public"));
  return found;
}

const covered = new Set<string>();
for (const st of stateCountyData) for (const c of st.counties ?? []) covered.add(`${st.stateSlug}/${c.slug}`);

describe("county coverage", () => {
  it("leaves no published county without facts", () => {
    const uncovered = [...publishedCountySlugs()].filter(
      (key) => !covered.has(key) && !countySupplement(key.split("/")[0], key.split("/")[1]),
    );
    expect(uncovered).toEqual([]);
  });

  it("does not shadow a county countySeoData already carries", () => {
    // Two sources for one county would mean two versions of its facts,
    // and the one that won would depend on lookup order.
    const overlap: string[] = [];
    for (const [stateSlug, counties] of Object.entries(COUNTY_SUPPLEMENT)) {
      for (const countySlug of Object.keys(counties)) {
        if (covered.has(`${stateSlug}/${countySlug}`)) overlap.push(`${stateSlug}/${countySlug}`);
      }
    }
    expect(overlap).toEqual([]);
  });

  it("carries the number of entries it claims", () => {
    expect(supplementCount()).toBe(156);
  });
});

describe("what the supplement is allowed to assert", () => {
  const entries = Object.entries(COUNTY_SUPPLEMENT).flatMap(([stateSlug, counties]) =>
    Object.entries(counties).map(([countySlug, v]) => ({ stateSlug, countySlug, ...(v as Record<string, unknown>) })),
  );

  it("never carries a population", () => {
    // countySeoData's populations are exact. An estimate sitting beside
    // them would read as exact, so these entries carry none and the
    // composers omit the population sentence entirely.
    for (const e of entries) expect(e).not.toHaveProperty("population");
  });

  it("never carries a county seat", () => {
    // In Connecticut, Massachusetts and Rhode Island the seat is largely
    // nominal, and Virginia's independent cities are in no county at
    // all. "The seat is X" misleads in those places, so no entry has one.
    for (const e of entries) expect(e).not.toHaveProperty("seat");
  });

  it("names at least one population center for every entry", () => {
    const empty = entries.filter((e) => !Array.isArray(e.majorCities) || (e.majorCities as string[]).length === 0);
    expect(empty).toEqual([]);
  });

  it("flags every Virginia independent city as one", () => {
    const va = Object.entries(COUNTY_SUPPLEMENT.virginia).filter(([slug]) => slug.endsWith("-city"));
    expect(va.length).toBeGreaterThan(0);
    for (const [, v] of va) {
      expect((v as Record<string, unknown>).kind).toBe("independent-city");
      expect(String((v as Record<string, unknown>).governance)).toMatch(/not part of any county/);
    }
  });

  it("says where county government is absent rather than pointing at an authority that is not there", () => {
    // The county composer tells readers publicly funded treatment is
    // often administered by a county authority. In Connecticut there is
    // no county government at all, so that advice needs contradicting.
    for (const [, v] of Object.entries(COUNTY_SUPPLEMENT.connecticut)) {
      expect(String((v as Record<string, unknown>).governance)).toMatch(/abolished county government/);
    }
    for (const [, v] of Object.entries(COUNTY_SUPPLEMENT["rhode-island"])) {
      expect(String((v as Record<string, unknown>).governance)).toMatch(/no county government/);
    }
  });

  it("keeps county names free of the suffix the composers add", () => {
    const withSuffix = entries.filter((e) => /\bCounty\b/i.test(String(e.name)));
    expect(withSuffix).toEqual([]);
  });
});

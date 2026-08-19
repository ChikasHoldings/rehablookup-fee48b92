/**
 * PHASE 2 — COUNTY INVENTORY TRUTH in the generated static HTML.
 *
 * `scripts/generate-county-pages.mjs` builds each county page's facility
 * list by walking the county's hand-curated `majorCities` array and
 * collecting the facilities in THOSE CITIES. That crosswalk is useful —
 * it is why these pages carry real, crawlable inventory instead of
 * boilerplate — but it is NOT a facility→county mapping. The `facilities`
 * table has no county column, so no listing on the page has ever been
 * checked against the county's boundary.
 *
 * The page may therefore keep the inventory and must qualify it. This
 * suite renders `buildHtml` against a planted county and asserts on the
 * CRAWLER-FACING STRING: the links are present, the heading names the
 * approximation, the disclosure is in the markup rather than in a source
 * comment, and the exact-count footer is gone.
 *
 * Indexability is deliberately asserted too — the fix for an over-claiming
 * page is honest wording, not `noindex`.
 */

import { describe, expect, it } from "vitest";

const { buildHtml } = await import("../../scripts/generate-county-pages.mjs");

interface PlantedFacility {
  slug: string;
  name: string;
  city: string;
  state: string;
  facility_type?: string;
  verified?: boolean;
  featured?: boolean;
  phone?: string | null;
  website?: string | null;
}

const STATE = { stateSlug: "illinois", stateAbbr: "IL", stateName: "Illinois" };

const COUNTY = {
  name: "Cook",
  slug: "cook",
  metaDescription: "Rehab centers in Cook County, IL.",
  description: "Cook County overview.",
  treatmentOverview: "Treatment overview.",
  demographics: "Demographics.",
  accessNotes: "Access notes.",
  // The curated crosswalk. These are the ONLY cities the facility list
  // below was drawn from.
  majorCities: ["Chicago", "Evanston", "Cicero"],
  faqs: [{ question: "Q?", answer: "A." }],
};

const facility = (
  slug: string,
  name: string,
  city: string,
): PlantedFacility => ({
  slug,
  name,
  city,
  state: "Illinois",
  facility_type: "Treatment Center",
  verified: false,
  featured: false,
  phone: null,
  website: null,
});

/** 20 facilities across the three curated cities — comfortably over the
 *  12-per-page limit, which is what used to trigger the "View all N
 *  facilities in Cook County" footer. */
const FACILITIES: PlantedFacility[] = [
  ...Array.from({ length: 10 }, (_, i) => facility(`chi-${i}`, `Chicago Center ${i}`, "Chicago")),
  ...Array.from({ length: 6 }, (_, i) => facility(`evn-${i}`, `Evanston Center ${i}`, "Evanston")),
  ...Array.from({ length: 4 }, (_, i) => facility(`cic-${i}`, `Cicero Center ${i}`, "Cicero")),
];

const renderCounty = (facilities: PlantedFacility[] = FACILITIES): string =>
  buildHtml({
    state: STATE,
    county: COUNTY,
    urlPath: "/rehab-centers/illinois/county/cook",
    facilities,
  });

describe("county static HTML — inventory is present", () => {
  it("links facility profiles from the curated cities", () => {
    const html = renderCounty();
    expect(html).toContain('href="/center/chi-0"');
    expect(html).toContain('href="/center/evn-0"');
    expect(html).toContain("Chicago Center 0");
  });

  it("still renders a substantive list (the crosswalk is kept, not deleted)", () => {
    const profileLinks = renderCounty().match(/href="\/center\//g) ?? [];
    expect(profileLinks.length).toBeGreaterThanOrEqual(10);
  });

  it("remains indexable — the fix is wording, not noindex", () => {
    const html = renderCounty();
    expect(html).toContain('<meta name="robots" content="index, follow">');
    expect(html).not.toMatch(/content="[^"]*noindex/i);
  });
});

describe("county static HTML — the inventory is qualified, not claimed", () => {
  it("does NOT emit an unqualified 'Treatment Facilities in Cook County' heading", () => {
    const html = renderCounty();
    expect(html).not.toContain("Treatment Facilities in Cook County");
    expect(html).not.toMatch(/<h2>\s*Treatment Facilities in Cook County/);
  });

  it("names the approximation in the heading", () => {
    expect(renderCounty()).toContain(
      "<h2>Treatment Facilities in Selected Cities in Cook County, Illinois</h2>",
    );
  });

  it("discloses the limitation in crawler-visible HTML, not in a comment", () => {
    const html = renderCounty();
    // Strip HTML comments — the disclosure must survive.
    const visible = html.replace(/<!--[\s\S]*?-->/g, "");
    expect(visible).toContain(
      "RehabLookup does not currently have facility-level county assignments",
    );
    expect(visible).toMatch(/curated city list/i);
    expect(visible).toMatch(/not a complete or exact Cook County inventory/i);
  });

  it("names the curated cities the list was actually drawn from", () => {
    const html = renderCounty();
    expect(html).toMatch(/curated city list \(Chicago, Evanston, Cicero\)/);
  });

  it("does NOT claim 'View all N facilities in Cook County'", () => {
    const html = renderCounty();
    expect(html).not.toMatch(/View all \d+ facilities in Cook County/);
    expect(html).not.toMatch(/View all \d+ facilities/);
  });

  it("offers the state directory instead of a county-count link", () => {
    const html = renderCounty();
    expect(html).toContain('href="/rehab-centers/illinois"');
    expect(html).toMatch(/Browse all Illinois rehab centers/);
  });

  it("keeps the disclosure even when the curated cities yield no facilities", () => {
    const html = renderCounty([]);
    expect(html).toContain(
      "RehabLookup does not currently have facility-level county assignments",
    );
    expect(html).not.toContain("Treatment Facilities in Cook County");
  });
});

describe("renderFacilityList — city and state callers are untouched", () => {
  it("keeps the exact heading and exact 'View all' footer for a city label", async () => {
    const { renderFacilityList } = await import("../../scripts/_facility-data.mjs");
    const cityFacilities = Array.from({ length: 20 }, (_, i) =>
      facility(`chi-${i}`, `Chicago Center ${i}`, "Chicago"),
    );

    const html = renderFacilityList(cityFacilities, "Chicago, IL");
    // City membership IS exact (matched on the facility's own city+state),
    // so the exact heading and count stay exactly as they were.
    expect(html).toContain("<h2>Treatment Facilities in Chicago, IL</h2>");
    expect(html).toContain("View all 20 facilities in Chicago, IL");
  });

  it("honours a numeric third argument the way it always did", async () => {
    const { renderFacilityList } = await import("../../scripts/_facility-data.mjs");
    const cityFacilities = Array.from({ length: 8 }, (_, i) =>
      facility(`chi-${i}`, `Chicago Center ${i}`, "Chicago"),
    );

    const html = renderFacilityList(cityFacilities, "Chicago, IL", 3);
    expect((html.match(/href="\/center\//g) ?? []).length).toBe(3);
    expect(html).toContain("View all 8 facilities in Chicago, IL");
  });
});

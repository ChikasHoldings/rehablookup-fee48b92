/**
 * PHASE 2 — LOCATION TRUTH on the LIVE /search-results SURFACE.
 *
 * `src/lib/location/__tests__/locationTruth.test.ts` proves the canonical
 * matcher is exact. `citySeoLocationTruth.test.tsx` proves the React SEO
 * templates hand it the right scope. Neither drives the SEARCH FORM, and
 * that is where the last widening lived: the form resolved a typed ZIP
 * through Zippopotam.us and then submitted the RESOLVED CITY in its
 * place, so `21215` ran as a Baltimore-wide city search and returned
 * facilities in ZIPs the user never asked for.
 *
 * These tests type into the real `SearchResultsForm` rendered by the real
 * `SearchResults` page, submit it, and then assert on (a) the URL the
 * form produced and (b) the cards the page rendered. The ZIP lookup is
 * stubbed to SUCCEED — a failing lookup would pass the old code too, so
 * only a successful resolution proves the widening is gone.
 *
 * `SearchResultCard` is stubbed down to its identifying data attributes.
 * The blockers are all on the "which facilities are in this place" side;
 * stubbing the card keeps a visual change from breaking a truth test.
 */

import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Planted catalogue
// ---------------------------------------------------------------------------
//
// Baltimore is deliberately dense and multi-ZIP. ZIP 21215 holds two
// facilities; the rest of Baltimore holds eight more, in four other ZIPs.
// If a ZIP search ever widens to its city, the count jumps from 2 to 10
// and these assertions fail loudly.

interface PlantedFacility {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string;
  zipCode: string;
  treatmentTypes: string[];
  insuranceAccepted: string[];
  description: string;
  verified: boolean;
  featured: boolean;
  calculatedRankingScore: number;
}

const plant = (
  id: string,
  city: string,
  state: string,
  zipCode: string,
): PlantedFacility => ({
  id,
  name: `${city} Center ${id}`,
  slug: `center-${id}`,
  city,
  state,
  zipCode,
  treatmentTypes: ["Detox", "Inpatient", "Outpatient"],
  insuranceAccepted: ["Aetna", "Medicaid"],
  description: "Detox, inpatient and outpatient care.",
  verified: false,
  featured: false,
  calculatedRankingScore: 50,
});

/** The two facilities that genuinely sit in ZIP 21215. */
const IN_21215 = [
  plant("z1", "Baltimore", "Maryland", "21215"),
  // ZIP+4 on the FACILITY side — folds to the same 5-digit base, so this
  // is an exact match, not a near miss.
  plant("z2", "Baltimore", "Maryland", "21215-1234"),
];

/** Same city, different ZIPs. Only reachable by widening ZIP → city. */
const BALTIMORE_OTHER_ZIPS = [
  plant("b1", "Baltimore", "Maryland", "21201"),
  plant("b2", "Baltimore", "Maryland", "21202"),
  plant("b3", "Baltimore", "Maryland", "21230"),
  plant("b4", "Baltimore", "Maryland", "21231"),
  plant("b5", "Baltimore", "Maryland", "21201"),
  plant("b6", "Baltimore", "Maryland", "21202"),
  plant("b7", "Baltimore", "Maryland", "21230"),
  plant("b8", "Baltimore", "Maryland", "21231"),
];

/** Elsewhere in Maryland, plus Cook County's state for the county case. */
const ELSEWHERE = [
  plant("md1", "Rockville", "Maryland", "20850"),
  plant("md2", "Annapolis", "Maryland", "21401"),
  plant("il1", "Chicago", "Illinois", "60601"),
  plant("il2", "Evanston", "Illinois", "60201"),
  plant("il3", "Springfield", "Illinois", "62701"),
];

const CATALOGUE = [...IN_21215, ...BALTIMORE_OTHER_ZIPS, ...ELSEWHERE];

// ---------------------------------------------------------------------------
// Module doubles
// ---------------------------------------------------------------------------

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
    }),
    channel: () => {
      const ch: Record<string, unknown> = {};
      ch.on = () => ch;
      ch.subscribe = () => ch;
      return ch;
    },
    removeChannel: () => {},
  },
}));

vi.mock("@/lib/analytics", () => ({
  analytics: new Proxy({}, { get: () => () => {} }),
  trackEvent: () => {},
}));

const STATIC_FACILITIES = {
  data: CATALOGUE,
  isLoading: false,
  error: null,
  refetch: () => {},
};
vi.mock("@/hooks/useStaticFacilities", () => ({
  PUBLIC_FACILITIES_QUERY_KEY: ["static-public-facilities"] as const,
  useStaticFacilities: () => STATIC_FACILITIES,
}));

/** No geo-IP in tests — an ambient location would give the page a second
 *  way to pick a scope and make the assertions ambiguous. */
const GEO_OFF = {
  city: null,
  region: null,
  regionCode: null,
  isUS: false,
  isLoading: false,
  error: null,
};
vi.mock("@/hooks/useGeoLocation", () => ({
  useGeoLocation: () => GEO_OFF,
}));

/**
 * ZIP lookup SUCCEEDS. 21215 resolves to Baltimore, MD — exactly the
 * condition under which the old form replaced the ZIP with the city.
 *
 * `lookup` / `reset` are hoisted to module scope so their identities are
 * stable across renders, mirroring the real hook's `useCallback`. Fresh
 * closures per render would retrigger the effects that depend on them and
 * spin the page forever.
 */
const zipLookupCalls: string[] = [];
const BALTIMORE_ZIP_DATA = {
  city: "Baltimore",
  state: "Maryland",
  stateAbbr: "MD",
  latitude: null,
  longitude: null,
};
const stableLookup = async (zip: string) => {
  zipLookupCalls.push(zip);
  return BALTIMORE_ZIP_DATA;
};
const stableReset = () => {};
const zipHookValue = {
  data: BALTIMORE_ZIP_DATA,
  isLoading: false,
  error: null,
  lookup: stableLookup,
  reset: stableReset,
};
vi.mock("@/hooks/useZipcodeLookup", () => ({
  useZipcodeLookup: () => zipHookValue,
}));

vi.mock("@/components/layout/Layout", () => ({
  Layout: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/SEO", () => ({
  SEO: ({ description }: { description?: string }) => (
    <meta data-testid="seo-description" content={description} />
  ),
  generateSearchResultsSchema: () => ({}),
}));

vi.mock("@/components/featured/FeaturedRail", () => ({
  FeaturedRail: () => null,
}));

vi.mock("@/components/seo/AreaWaitlistCapture", () => ({
  AreaWaitlistCapture: () => null,
}));

vi.mock("@/components/cards/SearchResultCard", () => ({
  SearchResultCard: ({ center }: { center: PlantedFacility }) => (
    <article
      data-testid="facility-card"
      data-id={center.id}
      data-city={center.city}
      data-state={center.state}
      data-zip={center.zipCode}
    >
      {center.name}
    </article>
  ),
}));

// Imported AFTER the mocks so the page tree binds to the doubles.
const { default: SearchResults } = await import("@/pages/SearchResults");

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

let currentSearch = "";

function SearchSpy() {
  const loc = useLocation();
  currentSearch = loc.search;
  return null;
}

function renderSearch(initialEntry = "/search-results") {
  currentSearch = "";
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <SearchSpy />
        <SearchResults />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const renderedZips = () =>
  screen.queryAllByTestId("facility-card").map((el) => el.getAttribute("data-zip"));
const renderedIds = () =>
  screen.queryAllByTestId("facility-card").map((el) => el.getAttribute("data-id"));

const locationParam = () => new URLSearchParams(currentSearch).get("location");

beforeEach(() => {
  zipLookupCalls.length = 0;
});

// ---------------------------------------------------------------------------
// BLOCKER 1 — an exact ZIP stays an exact ZIP
// ---------------------------------------------------------------------------

describe("BLOCKER 1 — ZIP input stays a ZIP through the real search form", () => {
  it("submits 21215 as location=21215, not as the resolved city", async () => {
    const user = userEvent.setup();
    renderSearch();

    const input = screen.getByLabelText(/Location: ZIP code, city, or state/i);
    await user.type(input, "21215");
    await user.click(screen.getByRole("button", { name: /^Search rehab centers$/i }));

    await waitFor(() => expect(locationParam()).toBe("21215"));

    // The failure this test exists for: `location=Baltimore, MD`.
    expect(currentSearch).not.toMatch(/Baltimore/i);
  });

  it("renders ONLY facilities whose canonical 5-digit ZIP is 21215", async () => {
    const user = userEvent.setup();
    renderSearch();

    const input = screen.getByLabelText(/Location: ZIP code, city, or state/i);
    await user.type(input, "21215");
    await user.click(screen.getByRole("button", { name: /^Search rehab centers$/i }));

    await waitFor(() => expect(locationParam()).toBe("21215"));
    await waitFor(() => expect(screen.queryAllByTestId("facility-card").length).toBeGreaterThan(0));

    // Exactly the two planted 21215 rows — ZIP+4 included, city siblings not.
    expect(renderedIds().sort()).toEqual(["z1", "z2"]);
    for (const zip of renderedZips()) {
      expect(String(zip).slice(0, 5)).toBe("21215");
    }
    // The eight other Baltimore facilities are the widening signature.
    expect(renderedIds()).not.toContain("b1");
    expect(screen.queryAllByTestId("facility-card")).toHaveLength(2);
  });

  it("counts the ZIP scope as 2, not as the city's 10", async () => {
    renderSearch("/search-results?location=21215");
    await waitFor(() => expect(screen.queryAllByTestId("facility-card").length).toBe(2));
    expect(screen.getByText(/2 facilities in ZIP 21215/i)).toBeTruthy();
  });

  it("a successful ZIP lookup does not widen the query", async () => {
    renderSearch("/search-results?location=21215");

    // The page's own defence-in-depth lookup fires for a ZIP input...
    await waitFor(() => expect(zipLookupCalls).toContain("21215"));
    // ...and resolving Baltimore, MD changes nothing about membership.
    await waitFor(() => expect(renderedIds().sort()).toEqual(["z1", "z2"]));
    expect(locationParam()).toBe("21215");
  });

  it("folds a typed ZIP+4 onto its 5-digit base", async () => {
    renderSearch("/search-results?location=21215-4321");
    await waitFor(() => expect(renderedIds().sort()).toEqual(["z1", "z2"]));
  });

  it("keeps a ZIP with no facilities at zero rather than widening to its city", async () => {
    renderSearch("/search-results?location=21299");
    await waitFor(() => expect(screen.queryAllByTestId("facility-card")).toHaveLength(0));
  });
});

// ---------------------------------------------------------------------------
// BLOCKER 2 — no fabricated mileage
// ---------------------------------------------------------------------------

describe("BLOCKER 2 — distance filtering is gone, not approximated", () => {
  it("offers no 'Within X miles' control anywhere on the page", async () => {
    renderSearch("/search-results?location=Baltimore, MD");
    await waitFor(() => expect(screen.queryAllByTestId("facility-card").length).toBeGreaterThan(0));

    expect(screen.queryByText(/within\s+\d+\s+mi/i)).toBeNull();
    expect(screen.queryByText(/any distance/i)).toBeNull();
    expect(screen.queryByLabelText(/distance/i)).toBeNull();
  });

  it("ignores a stale ?distance= URL entirely", async () => {
    renderSearch("/search-results?location=Baltimore, MD&distance=10");
    await waitFor(() => expect(screen.queryAllByTestId("facility-card").length).toBeGreaterThan(0));
    const withStaleDistance = renderedIds().sort();

    cleanup();

    renderSearch("/search-results?location=Baltimore, MD");
    await waitFor(() => expect(screen.queryAllByTestId("facility-card").length).toBeGreaterThan(0));

    expect(withStaleDistance).toEqual(renderedIds().sort());
    // No active chip for a param that filters nothing.
    expect(screen.queryByText(/within 10 mi/i)).toBeNull();
  });

  it("does not let ?distance= touch exact ZIP membership", async () => {
    renderSearch("/search-results?location=21215&distance=100");
    await waitFor(() => expect(renderedIds().sort()).toEqual(["z1", "z2"]));
  });

  it("drops a stale ?distance= when the form is resubmitted", async () => {
    const user = userEvent.setup();
    renderSearch("/search-results?location=21215&distance=25");

    await user.click(screen.getByRole("button", { name: /^Search rehab centers$/i }));
    await waitFor(() =>
      expect(new URLSearchParams(currentSearch).get("distance")).toBeNull(),
    );
    expect(locationParam()).toBe("21215");
  });
});

// ---------------------------------------------------------------------------
// BLOCKER 2B — public copy may not imply a measured distance
// ---------------------------------------------------------------------------

describe("BLOCKER 2B — proximity wording", () => {
  it("labels the default sort 'Location Match', never 'Nearest First'", async () => {
    renderSearch("/search-results?location=Baltimore, MD");
    await waitFor(() => expect(screen.queryAllByTestId("facility-card").length).toBeGreaterThan(0));

    const body = document.body.textContent ?? "";
    expect(body).not.toMatch(/nearest first/i);
    expect(body).not.toMatch(/closest/i);
  });

  it("says 'neighboring states', not 'nearby states', on a dead-end search", async () => {
    // Ocean City has no exact matches, so the page shows the empty state.
    // The same-state bucket below it still renders cards — those are
    // Maryland facilities under a Maryland heading, which is the truthful
    // arrangement this phase established, so the count is not asserted here.
    renderSearch("/search-results?location=Ocean City, MD");
    await waitFor(() => expect(screen.getByText(/try neighboring states/i)).toBeTruthy());
    expect(screen.queryByText(/try nearby states/i)).toBeNull();
  });

  it("keeps the same-state bucket labelled by state, with no distance claim", async () => {
    renderSearch("/search-results?location=Ocean City, MD");
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: /Other facilities in Maryland/i })).toBeTruthy(),
    );
    const body = document.body.textContent ?? "";
    expect(body).not.toMatch(/\d+\s*miles? (away|from)/i);
  });
});

// ---------------------------------------------------------------------------
// BLOCKER 3 — a county search is a capability gap, not a zero
// ---------------------------------------------------------------------------

describe("BLOCKER 3 — Cook County, IL surfaces the data limitation", () => {
  const COUNTY_URL = "/search-results?location=Cook%20County%2C%20IL";

  it("never claims zero facilities in the county", async () => {
    renderSearch(COUNTY_URL);
    await waitFor(() => expect(screen.getByTestId("county-limitation")).toBeTruthy());

    const body = document.body.textContent ?? "";
    expect(body).not.toMatch(/no facilities found in Cook County/i);
    expect(body).not.toMatch(/no listings match those filters in Cook County/i);
    expect(body).not.toMatch(/0 facilities in Cook County/i);
    expect(body).not.toMatch(/no matching centers/i);
  });

  it("explains that county-level matching is unavailable", async () => {
    renderSearch(COUNTY_URL);
    const panel = await screen.findByTestId("county-limitation");
    const text = panel.textContent ?? "";

    expect(text).toMatch(/does not currently have facility-level county assignments/i);
    expect(text).toMatch(/Cook County/);
    expect(text).toMatch(/can.?t filter/i);
  });

  it("labels no facility as a Cook County match", async () => {
    renderSearch(COUNTY_URL);
    await screen.findByTestId("county-limitation");
    expect(screen.queryAllByTestId("facility-card")).toHaveLength(0);
  });

  it("does not silently relabel statewide Illinois facilities as county matches", async () => {
    renderSearch(COUNTY_URL);
    const panel = await screen.findByTestId("county-limitation");

    // The three Illinois facilities exist in the catalogue; none of them
    // may be rendered under the county's name.
    expect(within(panel).queryByText(/Chicago Center il1/)).toBeNull();
    expect(document.body.textContent).not.toMatch(/Evanston Center il2/);
    expect(document.body.textContent).not.toMatch(/Springfield Center il3/);
  });

  it("publishes a meta description that reports unavailability, not a zero count", async () => {
    renderSearch(COUNTY_URL);
    await screen.findByTestId("county-limitation");

    const desc = screen.getByTestId("seo-description").getAttribute("content") ?? "";
    expect(desc).toMatch(/does not currently have facility-level county assignments/i);
    expect(desc).not.toMatch(/Browse 0 /i);
  });

  it("still answers the searches it can — state directory and state search", async () => {
    renderSearch(COUNTY_URL);
    const panel = await screen.findByTestId("county-limitation");

    expect(within(panel).getByRole("link", { name: /Browse the Illinois directory/i })
      .getAttribute("href")).toBe("/rehab-centers/illinois");
    expect(within(panel).getByRole("link", { name: /Search all of Illinois/i })).toBeTruthy();
  });
});

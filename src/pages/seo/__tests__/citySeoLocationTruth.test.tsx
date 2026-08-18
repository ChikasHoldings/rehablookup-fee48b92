/**
 * PHASE 2 — LOCATION TRUTH on the REACT SEO SURFACES.
 *
 * `src/lib/location/__tests__/locationParity.test.ts` proves the canonical
 * layer and the Node inventory generators agree. It does NOT render the
 * React templates, and that is exactly where the widening survived: five
 * city templates computed a truthful `directMatchCount` and then handed
 * `SEOLandingTemplate` a DIFFERENT, wider list. The page said "1 facility
 * in Fresno" and rendered twelve cards from across California.
 *
 * These tests render the real page components against a planted catalogue
 * and assert on the facility list the template actually receives. The
 * catalogue is deliberately hostile: every target city is sparse (0 or 1
 * exact match) while its state is dense, so any surviving `if (fewer than
 * three) widen` ladder produces cards and fails the assertion.
 *
 * `SEOLandingTemplate` is stubbed — it is the boundary between "the page
 * decided what is in this city" and "the design system draws it", and the
 * blockers are all on the deciding side. Stubbing it keeps the suite fast
 * and keeps a hero redesign from breaking a location-truth test.
 */

import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Used ONLY by the noindex-parity block at the bottom of this file, to
// recompute what main decided about each URL. The page components under
// test import the same validator; nothing here is mocked, so both sides
// of the comparison run the real policy.
import { citiesMatch, normalizeState } from "@/lib/location";
import { asSearchableFacility, matchesInsuranceFilter } from "@/lib/searchFilters";
import { validatePage, type PageType } from "@/utils/seoPageValidator";

// ---------------------------------------------------------------------------
// Planted catalogue
// ---------------------------------------------------------------------------
//
// Shapes match the live `facilities` rows: state stored as a FULL NAME,
// city as free text, treatment/insurance as string arrays.

interface PlantedFacility {
  id: string;
  name: string;
  city: string;
  state: string;
  zipCode: string;
  treatmentTypes: string[];
  insuranceAccepted: string[];
  description: string;
  featured?: boolean;
}

/** Every facet keyword any page under test filters on. A planted facility
 *  carrying all of them can only ever be excluded by GEOGRAPHY, which is
 *  what these tests are about. */
const ALL_FACETS = [
  "Detox",
  "Inpatient",
  "Outpatient",
  "Cocaine",
  "Stimulant",
  "Drug",
  "Dual-Diagnosis",
  "Anxiety",
  "Mental Health",
  "Co-Occurring",
  "Young Adult",
  "Adult",
  "30-Day",
  "Short-Term",
];

const ALL_INSURERS = ["Cigna", "Aetna", "Blue Cross Blue Shield"];

const plant = (
  id: string,
  name: string,
  city: string,
  state: string,
  overrides: Partial<PlantedFacility> = {},
): PlantedFacility => ({
  id,
  name,
  city,
  state,
  zipCode: "00000",
  treatmentTypes: [...ALL_FACETS],
  insuranceAccepted: [...ALL_INSURERS],
  description: `${name} offers detox, inpatient, outpatient, cocaine, stimulant, drug, dual-diagnosis, anxiety, mental health, co-occurring, young adult, adult, 30-day and short-term care.`,
  ...overrides,
});

/**
 * California: one facility in Los Angeles, twenty-two elsewhere in the
 * state. Under the OLD ladder every city page for a sparse LA facet
 * rendered up to twelve of those twenty-two.
 */
const CALIFORNIA = [
  plant("la-only", "Los Angeles Sole Center", "Los Angeles", "California"),
  ...Array.from({ length: 12 }, (_, i) =>
    plant(`sd-${i}`, `San Diego Center ${i}`, "San Diego", "California", { featured: true }),
  ),
  ...Array.from({ length: 10 }, (_, i) =>
    plant(`sf-${i}`, `San Francisco Center ${i}`, "San Francisco", "California"),
  ),
];

/** Neighbouring states — must never appear on a California city page. */
const OUT_OF_STATE = [
  ...Array.from({ length: 8 }, (_, i) =>
    plant(`phx-${i}`, `Phoenix Center ${i}`, "Phoenix", "Arizona", { featured: true }),
  ),
  ...Array.from({ length: 6 }, (_, i) =>
    plant(`lv-${i}`, `Las Vegas Center ${i}`, "Las Vegas", "Nevada"),
  ),
];

/**
 * Fresno: dense city, but NOT ONE facility accepts Cigna. This is the
 * CityInsurance case the contract calls out — the old code answered "no
 * Cigna facility here" by listing Fresno facilities that take other
 * plans, then by listing Cigna facilities elsewhere in California.
 */
const FRESNO_NO_CIGNA = Array.from({ length: 9 }, (_, i) =>
  plant(`fresno-${i}`, `Fresno Center ${i}`, "Fresno", "California", {
    insuranceAccepted: ["Aetna", "Humana"],
  }),
);

/** Cigna IS accepted in Los Angeles — one facility, below every `< 3` gate. */
const LA_CIGNA_ONE = [
  plant("la-cigna", "Los Angeles Cigna Center", "Los Angeles", "California", {
    insuranceAccepted: ["Cigna"],
  }),
];

/** Statewide Cigna inventory that the old state-level fallback reached for. */
const CA_CIGNA_ELSEWHERE = Array.from({ length: 7 }, (_, i) =>
  plant(`sac-cigna-${i}`, `Sacramento Cigna Center ${i}`, "Sacramento", "California", {
    insuranceAccepted: ["Cigna"],
  }),
);

let catalogue: PlantedFacility[] = [];

// ---------------------------------------------------------------------------
// Module doubles
// ---------------------------------------------------------------------------

// The page tree pulls in `@/lib/analytics`, which constructs a Supabase
// client at import time. No network call happens in these tests; the stub
// just keeps module init from throwing on absent env vars.
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

vi.mock("@/hooks/useStaticFacilities", () => ({
  PUBLIC_FACILITIES_QUERY_KEY: ["static-public-facilities"] as const,
  useStaticFacilities: () => ({ data: catalogue, isLoading: false }),
}));

/** Props the stub last received, per render. */
interface CapturedProps {
  facilities: PlantedFacility[];
  facilityCount?: number;
  metaDescription?: string;
  noindex?: boolean;
  faqs?: { question: string; answer: string }[];
}

const captured: CapturedProps[] = [];

vi.mock("@/components/seo/SEOLandingTemplate", () => ({
  SEOLandingTemplate: (props: CapturedProps & { children?: ReactNode }) => {
    captured.push(props);
    return (
      <div data-testid="seo-page">
        <span data-testid="facility-count">{String(props.facilityCount)}</span>
        {props.facilities.map((f) => (
          <article
            key={f.id}
            data-testid="facility-card"
            data-city={f.city}
            data-state={f.state}
          >
            {f.name}
          </article>
        ))}
      </div>
    );
  },
}));

// Imported AFTER the mocks so the doubles are in place.
const CityTreatmentPage = (await import("../CityTreatmentPage")).default;
const CityInsurancePage = (await import("../CityInsurancePage")).default;
const SubstanceCityPage = (await import("../SubstanceCityPage")).default;
const CoOccurringCityPage = (await import("../CoOccurringCityPage")).default;
const DemographicCityPage = (await import("../DemographicCityPage")).default;
const DurationCityPage = (await import("../DurationCityPage")).default;

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

const renderAt = (path: string, routePath: string, element: ReactNode) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={routePath} element={element} />
      </Routes>
    </MemoryRouter>,
  );

/** The facility cards the template was actually handed. */
const renderedCards = () =>
  screen.queryAllByTestId("facility-card").map((el) => ({
    name: el.textContent ?? "",
    city: el.getAttribute("data-city") ?? "",
    state: el.getAttribute("data-state") ?? "",
  }));

const lastProps = () => captured[captured.length - 1];

beforeEach(() => {
  captured.length = 0;
  catalogue = [];
});

afterEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// BLOCKER A — city SEO lists must not widen
// ---------------------------------------------------------------------------

describe("city SEO templates render only exact city inventory", () => {
  // Each entry is a real route for a real config slug in this repo. The
  // second dimension differs per page; the geography assertion does not.
  const CITY_PAGES: Array<{
    label: string;
    path: string;
    routePath: string;
    element: ReactNode;
  }> = [
    {
      label: "CityTreatmentPage",
      path: "/detox-centers-in-los-angeles",
      routePath: "/:slug",
      element: <CityTreatmentPage />,
    },
    {
      label: "SubstanceCityPage",
      path: "/cocaine-addiction-treatment/california/los-angeles",
      routePath: "/:substanceSlug/:stateSlug/:citySlug",
      element: <SubstanceCityPage />,
    },
    {
      label: "CoOccurringCityPage",
      path: "/anxiety-and-addiction-treatment/california/los-angeles",
      routePath: "/:conditionSlug/:stateSlug/:citySlug",
      element: <CoOccurringCityPage />,
    },
    {
      label: "DemographicCityPage",
      path: "/young-adult-rehab/california/los-angeles",
      routePath: "/:demographicSlug/:stateSlug/:citySlug",
      element: <DemographicCityPage />,
    },
    {
      label: "DurationCityPage",
      path: "/30-day-rehab-programs/california/los-angeles",
      routePath: "/:durationSlug/:stateSlug/:citySlug",
      element: <DurationCityPage />,
    },
  ];

  describe.each(CITY_PAGES)("$label", ({ path, routePath, element }) => {
    it("renders the single exact match and nothing else when the city is sparse", () => {
      catalogue = [...CALIFORNIA, ...OUT_OF_STATE];
      renderAt(path, routePath, element);

      const cards = renderedCards();

      // The whole point: ONE card, not twelve. The old ladder saw
      // `1 < 3` and swapped in the statewide list.
      expect(cards).toHaveLength(1);
      expect(cards[0].name).toBe("Los Angeles Sole Center");
      expect(cards.every((c) => c.city === "Los Angeles")).toBe(true);

      // No facility from another city in the same state...
      expect(cards.some((c) => c.city === "San Diego")).toBe(false);
      expect(cards.some((c) => c.city === "San Francisco")).toBe(false);
      // ...and none from another state.
      expect(cards.every((c) => c.state === "California")).toBe(true);

      // The published count matches the published list.
      expect(lastProps().facilityCount).toBe(1);
    });

    it("renders nothing when the city has no exact match, however dense the state", () => {
      // Los Angeles removed; 22 California facilities and 14 out-of-state
      // ones remain. A widening page would show twelve cards here.
      catalogue = [
        ...CALIFORNIA.filter((f) => f.city !== "Los Angeles"),
        ...OUT_OF_STATE,
      ];
      renderAt(path, routePath, element);

      expect(renderedCards()).toHaveLength(0);
      expect(lastProps().facilities).toEqual([]);
      expect(lastProps().facilityCount).toBe(0);
    });

    it("does not manufacture inventory from an empty catalogue", () => {
      catalogue = [];
      renderAt(path, routePath, element);

      expect(renderedCards()).toHaveLength(0);
      expect(lastProps().facilityCount).toBe(0);
    });

    it("keeps a same-named city in another state out of the list", () => {
      // "Los Angeles, Texas" is not a real place, which is the point:
      // membership is decided by city AND state, so an invented
      // same-named row must not be able to sneak in.
      catalogue = [
        ...CALIFORNIA,
        plant("tx-la", "Los Angeles Texas Center", "Los Angeles", "Texas"),
      ];
      renderAt(path, routePath, element);

      const cards = renderedCards();
      expect(cards).toHaveLength(1);
      expect(cards[0].state).toBe("California");
      expect(cards.some((c) => c.name === "Los Angeles Texas Center")).toBe(false);
    });
  });

  it("still applies the page's own second-dimension filter inside the city", () => {
    // Two Los Angeles facilities; only one is tagged for detox. The
    // geography fix must not have turned the treatment filter off.
    catalogue = [
      plant("la-detox", "LA Detox Center", "Los Angeles", "California", {
        treatmentTypes: ["Detox"],
        description: "Medically supervised detox.",
      }),
      plant("la-sober", "LA Sober Living House", "Los Angeles", "California", {
        treatmentTypes: ["Sober Living"],
        description: "Structured sober living residence.",
      }),
      ...CALIFORNIA.filter((f) => f.city !== "Los Angeles"),
    ];

    renderAt("/detox-centers-in-los-angeles", "/:slug", <CityTreatmentPage />);

    const cards = renderedCards();
    expect(cards).toHaveLength(1);
    expect(cards[0].name).toBe("LA Detox Center");
  });
});

// ---------------------------------------------------------------------------
// BLOCKER B — city + insurer
// ---------------------------------------------------------------------------

describe("CityInsurancePage renders only city + insurer matches", () => {
  const INSURANCE_ROUTE = "/insurance/:insurerSlug/:stateSlug/:citySlug";
  const cignaFresno = "/insurance/cigna-rehab/california/fresno";
  const cignaLosAngeles = "/insurance/cigna-rehab/california/los-angeles";

  it("shows nothing when the city has facilities but none accept the insurer", () => {
    // Nine Fresno facilities (Aetna/Humana) + seven Cigna facilities in
    // Sacramento. The old code returned the Fresno nine — they cleared
    // the `>= 3` city gate — and called them the Cigna answer.
    catalogue = [...FRESNO_NO_CIGNA, ...CA_CIGNA_ELSEWHERE];
    renderAt(cignaFresno, INSURANCE_ROUTE, <CityInsurancePage />);

    const cards = renderedCards();
    expect(cards).toHaveLength(0);

    // Not the city-without-insurer fallback...
    expect(cards.some((c) => c.city === "Fresno")).toBe(false);
    // ...and not the statewide insurer fallback.
    expect(cards.some((c) => c.city === "Sacramento")).toBe(false);
    expect(lastProps().facilityCount).toBe(0);
  });

  it("shows the single exact match rather than widening to reach three", () => {
    catalogue = [...LA_CIGNA_ONE, ...FRESNO_NO_CIGNA, ...CA_CIGNA_ELSEWHERE];
    renderAt(cignaLosAngeles, INSURANCE_ROUTE, <CityInsurancePage />);

    const cards = renderedCards();
    expect(cards).toHaveLength(1);
    expect(cards[0].name).toBe("Los Angeles Cigna Center");
    expect(cards[0].city).toBe("Los Angeles");
    expect(lastProps().facilityCount).toBe(1);
  });

  it("never publishes a fallback tally as the city's insurer count", () => {
    catalogue = [...FRESNO_NO_CIGNA, ...CA_CIGNA_ELSEWHERE];
    renderAt(cignaFresno, INSURANCE_ROUTE, <CityInsurancePage />);

    const props = lastProps();

    // The hero tile, the meta description and the FAQ answer all read
    // from the same exact count. `9` (city-without-insurer) and `7`
    // (statewide-with-insurer) are the two numbers a fallback would
    // have leaked; neither may appear as a facility tally.
    expect(props.facilityCount).toBe(0);
    expect(props.metaDescription).toContain("Compare 0 listed facilities");
    expect(props.metaDescription).not.toContain("Compare 9");
    expect(props.metaDescription).not.toContain("Compare 7");

    const countFaq = props.faqs?.find((f) =>
      f.question.startsWith("How many Cigna-accepting"),
    );
    expect(countFaq).toBeDefined();
    expect(countFaq!.answer).toContain("no facility in Fresno, California");
    expect(countFaq!.answer).not.toMatch(/\b9\b/);
    expect(countFaq!.answer).not.toMatch(/\b7\b/);
  });

  it("reports the exact count in the FAQ when the city does have a match", () => {
    catalogue = [...LA_CIGNA_ONE, ...CA_CIGNA_ELSEWHERE];
    renderAt(cignaLosAngeles, INSURANCE_ROUTE, <CityInsurancePage />);

    const countFaq = lastProps().faqs?.find((f) =>
      f.question.startsWith("How many Cigna-accepting"),
    );
    expect(countFaq!.answer).toContain("1 facility in Los Angeles, California");
  });
});

// ---------------------------------------------------------------------------
// BLOCKER C — the correction must not move indexability
// ---------------------------------------------------------------------------

describe("indexability is untouched by the location correction", () => {
  it("keeps a CityInsurance page indexable when the pre-PR fallback did", () => {
    // Pre-PR: `exact` (0) failed the `>= 3` gate, `cityFallback` (9)
    // cleared it, so `validatePage` saw 9 and the page indexed. The
    // corrected page publishes ZERO facilities — and must still index,
    // because changing the noindex policy belongs to a later phase.
    catalogue = [...FRESNO_NO_CIGNA, ...CA_CIGNA_ELSEWHERE];
    renderAt(
      "/insurance/cigna-rehab/california/fresno",
      "/insurance/:insurerSlug/:stateSlug/:citySlug",
      <CityInsurancePage />,
    );

    expect(lastProps().facilities).toEqual([]);
    expect(lastProps().noindex).toBe(false);
  });

  it("keeps a CityInsurance page noindexed when the pre-PR fallback found nothing either", () => {
    // No Fresno inventory at all and no statewide Cigna inventory: the
    // old ladder bottomed out at 0 too, so this page was noindex before
    // and must stay noindex now. Correcting geography may not make a
    // dead URL newly indexable any more than it may kill a live one.
    catalogue = [
      ...Array.from({ length: 5 }, (_, i) =>
        plant(`phx-a-${i}`, `Phoenix Center ${i}`, "Phoenix", "Arizona"),
      ),
    ];
    renderAt(
      "/insurance/cigna-rehab/california/fresno",
      "/insurance/:insurerSlug/:stateSlug/:citySlug",
      <CityInsurancePage />,
    );

    expect(lastProps().noindex).toBe(true);
  });

  it("leaves CityTreatment indexability keyed to the direct match, as before", () => {
    // `validatePage("city-treatment", directMatchCount, …)` predates this
    // PR. One exact match indexed before and indexes now.
    catalogue = [...CALIFORNIA, ...OUT_OF_STATE];
    renderAt("/detox-centers-in-los-angeles", "/:slug", <CityTreatmentPage />);
    expect(lastProps().noindex).toBe(false);

    captured.length = 0;
    catalogue = [...CALIFORNIA.filter((f) => f.city !== "Los Angeles")];
    renderAt("/detox-centers-in-los-angeles", "/:slug", <CityTreatmentPage />);
    // Zero direct matches with a populated state was `recommendation:
    // "enhance"` → noindex on main as well. Unchanged.
    expect(lastProps().noindex).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// BLOCKER C — NOINDEX URL-SET PARITY vs main@25e32b2
// ---------------------------------------------------------------------------
//
// The contract for this correction is that it changes what a city page
// LISTS without changing which city URLs are indexable. Those two things
// were entangled: `validatePage` is fed a facility count, and the count
// the pages fed it used to come off the widened list.
//
// This block re-derives, for every (corpus × URL) pair below, the noindex
// decision main@25e32b2 would have made, and asserts the rendered page
// agrees. It is a set comparison, not a spot check: the two URL sets are
// accumulated and diffed, and BOTH directions must be empty — a
// correction that quietly rescued a dead URL from noindex is as much a
// violation as one that killed a live URL.
//
// How the reference stays independent rather than circular:
//
//  * Geography is recomputed here from main's OWN predicate
//    (`citiesMatch(f.city, C) && normalizeState(f.state) === S` for the
//    five facet pages; the literal `.toLowerCase()` ladder for
//    city-insurance), not read back off the component.
//  * Every facility in these corpora carries every facet keyword, so the
//    unchanged second-dimension filter is a no-op and `directMatchCount`
//    reduces to the size of the exact city set — a quantity this file can
//    compute on its own. The FACET_SPARSE corpus covers the other side by
//    stripping facets entirely, where the expected count is 0.

interface ParityRoute {
  /** The URL, and the key both sets are keyed by. */
  url: string;
  routePath: string;
  element: ReactNode;
  pageType: PageType;
  city: string;
  state: string;
  /** Only city-insurance needs one; the others share the facet formula. */
  insurer?: string;
}

const PARITY_ROUTES: ParityRoute[] = [
  {
    url: "/detox-centers-in-los-angeles",
    routePath: "/:slug",
    element: <CityTreatmentPage />,
    pageType: "city-treatment",
    city: "Los Angeles",
    state: "California",
  },
  {
    url: "/cocaine-addiction-treatment/california/los-angeles",
    routePath: "/:substanceSlug/:stateSlug/:citySlug",
    element: <SubstanceCityPage />,
    pageType: "substance-city",
    city: "Los Angeles",
    state: "California",
  },
  {
    url: "/anxiety-and-addiction-treatment/california/los-angeles",
    routePath: "/:conditionSlug/:stateSlug/:citySlug",
    element: <CoOccurringCityPage />,
    pageType: "co-occurring-city",
    city: "Los Angeles",
    state: "California",
  },
  {
    url: "/young-adult-rehab/california/los-angeles",
    routePath: "/:demographicSlug/:stateSlug/:citySlug",
    element: <DemographicCityPage />,
    pageType: "demographic-city",
    city: "Los Angeles",
    state: "California",
  },
  {
    url: "/30-day-rehab-programs/california/los-angeles",
    routePath: "/:durationSlug/:stateSlug/:citySlug",
    element: <DurationCityPage />,
    pageType: "duration-city",
    city: "Los Angeles",
    state: "California",
  },
  {
    url: "/insurance/cigna-rehab/california/los-angeles",
    routePath: "/insurance/:insurerSlug/:stateSlug/:citySlug",
    element: <CityInsurancePage />,
    pageType: "city-insurance",
    city: "Los Angeles",
    state: "California",
    insurer: "Cigna",
  },
  {
    url: "/insurance/cigna-rehab/california/fresno",
    routePath: "/insurance/:insurerSlug/:stateSlug/:citySlug",
    element: <CityInsurancePage />,
    pageType: "city-insurance",
    city: "Fresno",
    state: "California",
    insurer: "Cigna",
  },
];

/** Corpora chosen to sit ON the thresholds the validator switches at
 *  (0 direct, 1 direct, and the `stateFallbackCount >= 3` branch), plus
 *  the ladder gates main used (`>= 3`). */
const PARITY_CORPORA: Array<{ name: string; rows: PlantedFacility[] }> = [
  { name: "empty catalogue", rows: [] },
  { name: "one exact match, dense state", rows: [...CALIFORNIA, ...OUT_OF_STATE] },
  {
    name: "zero exact matches, dense state",
    rows: [...CALIFORNIA.filter((f) => f.city !== "Los Angeles"), ...OUT_OF_STATE],
  },
  { name: "out-of-state only", rows: [...OUT_OF_STATE] },
  {
    name: "city dense but no insurer match",
    rows: [...FRESNO_NO_CIGNA, ...CA_CIGNA_ELSEWHERE],
  },
  {
    name: "single insurer match in city",
    rows: [...LA_CIGNA_ONE, ...FRESNO_NO_CIGNA, ...CA_CIGNA_ELSEWHERE],
  },
  {
    name: "two exact matches — under main's >= 3 ladder gate",
    rows: [
      plant("la-1", "LA One", "Los Angeles", "California"),
      plant("la-2", "LA Two", "Los Angeles", "California"),
      ...CALIFORNIA.filter((f) => f.city !== "Los Angeles"),
    ],
  },
  {
    name: "facet-sparse city — no facility carries any facet keyword",
    rows: [
      ...Array.from({ length: 6 }, (_, i) =>
        plant(`la-bare-${i}`, `LA Bare ${i}`, "Los Angeles", "California", {
          treatmentTypes: ["Sober Living"],
          description: "Structured sober living residence.",
          insuranceAccepted: ["Humana"],
        }),
      ),
      ...CALIFORNIA.filter((f) => f.city !== "Los Angeles"),
    ],
  },
];

/** main@25e32b2's decision for one URL against one corpus. */
const mainNoindexFor = (route: ParityRoute, rows: PlantedFacility[]): boolean => {
  const scopeState = normalizeState(route.state);
  const stateLower = route.state.toLowerCase();

  if (route.pageType === "city-insurance") {
    // The ladder exactly as main shipped it, including the raw
    // `.toLowerCase()` state comparison and the 12-item caps.
    const insMatch = (f: PlantedFacility) =>
      matchesInsuranceFilter(asSearchableFacility(f as never), route.insurer!);
    const cityStateMatch = (f: PlantedFacility) =>
      citiesMatch(f.city, route.city) && f.state.toLowerCase() === stateLower;

    const exact = rows.filter((f) => cityStateMatch(f) && insMatch(f));
    let len: number;
    if (exact.length >= 3) {
      len = exact.slice(0, 12).length;
    } else {
      const cityFallback = rows.filter(cityStateMatch);
      len =
        cityFallback.length >= 3
          ? cityFallback.slice(0, 12).length
          : rows.filter((f) => f.state.toLowerCase() === stateLower && insMatch(f)).slice(0, 12)
              .length;
    }
    return !validatePage("city-insurance", len).shouldIndex;
  }

  // The five facet pages: main fed `validatePage` the DIRECT count and the
  // statewide tally, both of which this correction leaves alone. Every row
  // in these corpora carries every facet keyword unless the corpus name
  // says otherwise, so the direct count is the exact city set — except in
  // the facet-sparse corpus, where nothing matches the facet and the
  // answer is 0 either way.
  const exactCity = rows.filter(
    (f) => citiesMatch(f.city, route.city) && normalizeState(f.state) === scopeState,
  );
  const facetCarrying = exactCity.filter((f) => f.treatmentTypes.some((t) => ALL_FACETS.includes(t)));
  const stateFallbackCount = rows.filter((f) => normalizeState(f.state) === scopeState).length;

  return !validatePage(route.pageType, facetCarrying.length, { stateFallbackCount }).shouldIndex;
};

describe("noindex URL set is identical to main@25e32b2", () => {
  it("introduces zero newly noindexed and zero newly indexable URLs", () => {
    const mainNoindexed = new Set<string>();
    const branchNoindexed = new Set<string>();
    let urlsCompared = 0;

    for (const corpus of PARITY_CORPORA) {
      for (const route of PARITY_ROUTES) {
        captured.length = 0;
        catalogue = corpus.rows;

        const view = renderAt(route.url, route.routePath, route.element);
        const branch = lastProps().noindex === true;
        const reference = mainNoindexFor(route, corpus.rows);
        view.unmount();

        // Keyed per corpus so the two sets are comparable as sets while
        // still naming the exact failing combination in the diff.
        const key = `${corpus.name} :: ${route.url}`;
        if (reference) mainNoindexed.add(key);
        if (branch) branchNoindexed.add(key);
        urlsCompared += 1;

        expect(
          branch,
          `noindex drifted from main for ${key} (main=${reference}, branch=${branch})`,
        ).toBe(reference);
      }
    }

    const newlyNoindexed = [...branchNoindexed].filter((u) => !mainNoindexed.has(u));
    const newlyIndexable = [...mainNoindexed].filter((u) => !branchNoindexed.has(u));

    expect(newlyNoindexed).toEqual([]);
    expect(newlyIndexable).toEqual([]);

    // Guard the guard: a harness that silently stopped rendering would
    // also report a clean diff.
    expect(urlsCompared).toBe(PARITY_CORPORA.length * PARITY_ROUTES.length);
    expect(mainNoindexed.size).toBe(branchNoindexed.size);
    expect(mainNoindexed.size).toBeGreaterThan(0);
  });

  it("keeps the indexability shim frozen to main's raw state comparison", () => {
    // A facility recorded as "CA" rather than "California". The canonical
    // predicate matches it, so it APPEARS in the public list; main's raw
    // `.toLowerCase()` comparison did not, so it must NOT rescue the page
    // from noindex. This is the one place the two deliberately disagree,
    // and the disagreement is what keeps the noindex set frozen.
    catalogue = [
      plant("la-abbrev", "LA Abbrev Center", "Los Angeles", "CA", {
        insuranceAccepted: ["Cigna"],
      }),
    ];
    renderAt(
      "/insurance/cigna-rehab/california/los-angeles",
      "/insurance/:insurerSlug/:stateSlug/:citySlug",
      <CityInsurancePage />,
    );

    // Listed — the public inventory uses the canonical predicate.
    expect(renderedCards().map((c) => c.name)).toEqual(["LA Abbrev Center"]);
    expect(lastProps().facilityCount).toBe(1);

    // But indexability is unchanged from main, which saw zero here.
    expect(lastProps().noindex).toBe(true);
    expect(mainNoindexFor(PARITY_ROUTES[5], catalogue)).toBe(true);
  });
});

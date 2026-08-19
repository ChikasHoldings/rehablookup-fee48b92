/**
 * PHASE 3A — PUBLIC SEARCH CONTRACT on the LIVE /search-results surface.
 *
 *   ONE user search → ONE canonical filter state → ONE result set,
 *   with counts, chips, cards and the URL all describing that same set.
 *
 * Everything here drives the real page against a planted catalogue and
 * asserts on facility ID SETS, not on counts alone — a count can be right
 * while the membership behind it is wrong, and the defects this phase fixes
 * (a hidden second treatment constraint, a facet pool that ignored the other
 * group) both produced plausible-looking numbers.
 *
 * `SearchResultCard` is stubbed to its identifying data attributes; the card's
 * own public copy is covered by
 * `src/components/cards/__tests__/searchResultCardTruth.test.tsx`.
 */

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// ADVERSARIAL CATALOGUE
// ---------------------------------------------------------------------------
//
// Chicago, IL is the dense scope. It contains every combination the boolean
// and facet contracts need to distinguish, plus the narrative traps that a
// substring-based free-text matcher fires on. Evanston and Springfield are
// same-state/different-city (the separate NEARBY bucket, never counted).
// "Chicago, CA" is the same CITY NAME in a different state — it must never
// enter a Chicago, IL result set or any Chicago, IL facet count.

interface PlantedFacility {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string;
  zipCode: string;
  facilityType: string | null;
  treatmentTypes: string[];
  insuranceAccepted: string[];
  description: string;
  verified: boolean;
  featured: boolean;
  calculatedRankingScore: number;
}

let seq = 0;
const plant = (
  id: string,
  over: Partial<PlantedFacility> & { city: string; state: string },
): PlantedFacility => ({
  id,
  name: `${over.city} Center ${id}`,
  slug: `center-${id}`,
  zipCode: "60601",
  facilityType: "Outpatient Program",
  treatmentTypes: [],
  insuranceAccepted: [],
  description: "Adult treatment programming.",
  verified: false,
  featured: false,
  calculatedRankingScore: 100 - seq++,
  ...over,
} as PlantedFacility);

const CHI = { city: "Chicago", state: "Illinois" } as const;

const CATALOGUE: PlantedFacility[] = [
  // ── treatment × payment combinations ─────────────────────────────────
  plant("detox-aetna", { ...CHI, treatmentTypes: ["Detox"], insuranceAccepted: ["Aetna"] }),
  plant("outp-medicaid", { ...CHI, treatmentTypes: ["Outpatient"], insuranceAccepted: ["Medicaid"] }),
  plant("both-both", {
    ...CHI,
    zipCode: "60602",
    treatmentTypes: ["Detox", "Outpatient"],
    insuranceAccepted: ["Aetna", "Medicaid"],
  }),
  // Same city, DIFFERENT ZIP — must stay inside a city scope, must stay out
  // of a ZIP scope.
  plant("detox-selfpay", {
    ...CHI,
    zipCode: "60602",
    treatmentTypes: ["Detox"],
    insuranceAccepted: ["Self-Pay/Private Pay"],
  }),
  // Sliding Scale lives OUTSIDE the dense scope: Chicago is deliberately
  // capped at ITEMS_PER_PAGE (12) facilities so one rendered page is the
  // whole exact set and an ID-set comparison cannot be fooled by pagination.
  plant("evanston-sliding", {
    city: "Evanston",
    state: "Illinois",
    zipCode: "60201",
    treatmentTypes: ["Outpatient"],
    insuranceAccepted: ["Sliding Scale/Financial Assistance"],
  }),

  // ── quick-filter booleans ────────────────────────────────────────────
  plant("detox-verified", {
    ...CHI,
    treatmentTypes: ["Detox"],
    insuranceAccepted: ["Aetna"],
    verified: true,
  }),
  plant("outp-featured", {
    ...CHI,
    treatmentTypes: ["Outpatient"],
    insuranceAccepted: ["Medicaid"],
    featured: true,
  }),

  // ── inpatient reachable ONLY through the facility_type fallback ───────
  // This is what `type=residential`'s old raw `includes("Inpatient")` check
  // could never find.
  plant("residential", {
    ...CHI,
    facilityType: "Residential Treatment Center",
    treatmentTypes: [],
    insuranceAccepted: ["Aetna"],
  }),

  // ── structured acronyms ──────────────────────────────────────────────
  plant("mat", {
    ...CHI,
    treatmentTypes: ["Medication-Assisted Treatment (MAT)"],
    insuranceAccepted: ["Medicaid"],
  }),
  plant("cbt", {
    ...CHI,
    treatmentTypes: ["Cognitive Behavioral Therapy (CBT)"],
    insuranceAccepted: ["Cigna"],
  }),
  plant("iop", {
    ...CHI,
    treatmentTypes: ["Intensive Outpatient (IOP)"],
    insuranceAccepted: ["Cigna"],
  }),

  // ── narrative traps for the free-text matcher ────────────────────────
  plant("trauma-trap", {
    ...CHI,
    treatmentTypes: ["Trauma Therapy"],
    insuranceAccepted: ["Aetna"],
    description: "Traumatic stress recovery in a formatted, automatic intake program.",
  }),
  plant("dual", {
    ...CHI,
    treatmentTypes: ["Dual Diagnosis"],
    insuranceAccepted: ["Medicare"],
    description: "Integrated care for co-occurring conditions.",
  }),

  // ── same state, different city — the separate NEARBY bucket ──────────
  plant("evanston", {
    city: "Evanston",
    state: "Illinois",
    zipCode: "60201",
    treatmentTypes: ["Detox"],
    insuranceAccepted: ["Aetna"],
  }),
  plant("springfield", {
    city: "Springfield",
    state: "Illinois",
    zipCode: "62701",
    treatmentTypes: ["Outpatient"],
    insuranceAccepted: ["Medicaid"],
    description: "Our equine-assisted programming runs on weekends.",
  }),

  // ── same CITY NAME, different state ──────────────────────────────────
  plant("chicago-ca", {
    city: "Chicago",
    state: "California",
    zipCode: "90001",
    treatmentTypes: ["Detox"],
    insuranceAccepted: ["Aetna"],
  }),
];

/** Every Chicago, IL facility — the exact scope for the assertions below. */
const CHICAGO_IDS = CATALOGUE.filter((f) => f.city === "Chicago" && f.state === "Illinois")
  .map((f) => f.id)
  .sort();

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

/** No ambient location — a detected one would give the page a second way to
 *  pick a scope and make every membership assertion ambiguous. */
vi.mock("@/hooks/useGeoLocation", () => ({
  useGeoLocation: () => ({
    city: null,
    region: null,
    regionCode: null,
    isUS: false,
    isLoading: false,
    error: null,
  }),
}));

const noopLookup = async () => null;
const noopReset = () => {};
vi.mock("@/hooks/useZipcodeLookup", () => ({
  useZipcodeLookup: () => ({
    data: null,
    isLoading: false,
    error: null,
    lookup: noopLookup,
    reset: noopReset,
  }),
}));

vi.mock("@/components/layout/Layout", () => ({
  Layout: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/SEO", () => ({
  SEO: ({
    title,
    description,
    noindex,
    canonical,
  }: {
    title?: string;
    description?: string;
    noindex?: boolean;
    canonical?: string;
  }) => (
    <>
      <meta data-testid="seo-title" content={title} />
      <meta data-testid="seo-description" content={description} />
      <meta data-testid="seo-noindex" content={noindex ? "true" : "false"} />
      <meta data-testid="seo-canonical" content={canonical} />
    </>
  ),
  generateSearchResultsSchema: () => ({}),
}));

vi.mock("@/components/featured/FeaturedRail", () => ({ FeaturedRail: () => null }));
vi.mock("@/components/seo/AreaWaitlistCapture", () => ({ AreaWaitlistCapture: () => null }));

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

const { default: SearchResults } = await import("@/pages/SearchResults");

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

let currentSearch = "";

function SearchSpy() {
  currentSearch = useLocation().search;
  return null;
}

function renderSearch(initialEntry: string) {
  currentSearch = "";
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <SearchSpy />
        <SearchResults />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const renderedIds = () =>
  screen
    .queryAllByTestId("facility-card")
    .map((el) => el.getAttribute("data-id") ?? "")
    // The same-state bucket renders its cards with a `nearby-` React key but
    // the same data-id; de-duplicate so the exact set is what we compare.
    .filter((id, i, all) => all.indexOf(id) === i);

/** The EXACT result set: cards rendered inside the paginated grid only. */
const exactIds = async (): Promise<string[]> => {
  await waitFor(() => expect(document.querySelector("main")).toBeTruthy());
  const main = document.querySelector("main")!;
  const nearbyHeading = main.querySelector("[aria-labelledby='nearby-heading']");
  return Array.from(main.querySelectorAll("[data-testid='facility-card']"))
    .filter((el) => !nearbyHeading || !nearbyHeading.contains(el))
    .map((el) => el.getAttribute("data-id") ?? "")
    .sort();
};

interface OptionRow {
  group: string;
  value: string;
  count: number;
  active: boolean;
  disabled: boolean;
}

const optionRows = (panel: "desktop" | "mobile"): OptionRow[] => {
  const container = document.querySelector(`[data-testid='filter-panel'][data-panel='${panel}']`);
  if (!container) return [];
  return Array.from(container.querySelectorAll("[data-testid='filter-option']")).map((el) => ({
    group: el.getAttribute("data-group") ?? "",
    value: el.getAttribute("data-value") ?? "",
    count: Number(el.getAttribute("data-count")),
    active: el.getAttribute("data-active") === "true",
    disabled: el.getAttribute("data-disabled") === "true",
  }));
};

const facet = (group: string, value: string, panel: "desktop" | "mobile" = "desktop"): number =>
  optionRows(panel).find((r) => r.group === group && r.value === value)?.count ?? -1;

const param = (key: string) => new URLSearchParams(currentSearch).get(key);

const settle = async () => {
  await waitFor(() =>
    expect(document.querySelector("[data-testid='filter-panel'][data-panel='desktop']")).toBeTruthy(),
  );
};

/**
 * jsdom implements neither the Pointer Capture API nor scrollIntoView, both
 * of which Radix's Select uses when its listbox opens. Without these the
 * dropdown never mounts its options and the form tests below cannot reach
 * them.
 */
beforeAll(() => {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
  Element.prototype.scrollIntoView = () => {};
});

beforeEach(() => {
  cleanup();
  localStorage.clear();
});

/** Chicago must fit on one page for the ID-set comparisons to be complete. */
it("guard — the dense scope fits on a single result page", () => {
  expect(CHICAGO_IDS.length).toBeLessThanOrEqual(12);
});

// ---------------------------------------------------------------------------
// A. URL STATE
// ---------------------------------------------------------------------------

describe("A. URL state — one canonical filter state", () => {
  it("1. canonical ?treatmentTypes= filters the result set", async () => {
    renderSearch("/search-results?location=Chicago,%20IL&treatmentTypes=detox");
    await expect(exactIds()).resolves.toEqual(
      ["detox-aetna", "both-both", "detox-selfpay", "detox-verified"].sort(),
    );
  });

  it("2. legacy ?treatment= still filters when the canonical param is absent", async () => {
    renderSearch("/search-results?location=Chicago,%20IL&treatment=detox");
    await expect(exactIds()).resolves.toEqual(
      ["detox-aetna", "both-both", "detox-selfpay", "detox-verified"].sort(),
    );
  });

  it("3. canonical WINS over legacy — the two are never ANDed", async () => {
    renderSearch("/search-results?location=Chicago,%20IL&treatment=detox&treatmentTypes=cbt");
    // ANDing detox with cbt would return nothing at all.
    await expect(exactIds()).resolves.toEqual(["cbt"]);
  });

  it("4. canonical ?insuranceTypes= filters the result set", async () => {
    renderSearch("/search-results?location=Chicago,%20IL&insuranceTypes=cigna");
    await expect(exactIds()).resolves.toEqual(["cbt", "iop"].sort());
  });

  it("5. legacy ?insurance= still filters when the canonical param is absent", async () => {
    renderSearch("/search-results?location=Chicago,%20IL&insurance=cigna");
    await expect(exactIds()).resolves.toEqual(["cbt", "iop"].sort());
  });

  it("6. canonical insurance WINS over legacy insurance", async () => {
    renderSearch("/search-results?location=Chicago,%20IL&insurance=cigna&insuranceTypes=medicare");
    await expect(exactIds()).resolves.toEqual(["dual"]);
  });

  it("7. type=residential returns the SAME ids as canonical inpatient", async () => {
    renderSearch("/search-results?location=Chicago,%20IL&type=residential");
    const viaType = await exactIds();
    cleanup();
    renderSearch("/search-results?location=Chicago,%20IL&treatmentTypes=inpatient");
    const viaCanonical = await exactIds();
    expect(viaType).toEqual(viaCanonical);
    // …and it actually finds the facility_type-only record, which the old
    // raw `treatmentTypes.includes("Inpatient")` check could not.
    expect(viaType).toEqual(["residential"]);
  });

  it("8. type=outpatient returns the SAME ids as canonical outpatient", async () => {
    renderSearch("/search-results?location=Chicago,%20IL&type=outpatient");
    const viaType = await exactIds();
    cleanup();
    renderSearch("/search-results?location=Chicago,%20IL&treatmentTypes=outpatient");
    expect(viaType).toEqual(await exactIds());
    expect(viaType).toContain("iop");
  });

  it("9. type=mental-health returns the SAME ids as canonical dual-diagnosis", async () => {
    renderSearch("/search-results?location=Chicago,%20IL&type=mental-health");
    const viaType = await exactIds();
    cleanup();
    renderSearch("/search-results?location=Chicago,%20IL&treatmentTypes=dual-diagnosis");
    expect(viaType).toEqual(await exactIds());
  });

  it("10. type=drug runs Detox/Inpatient/Outpatient through the SHARED matcher", async () => {
    renderSearch("/search-results?location=Chicago,%20IL&type=drug");
    const viaType = await exactIds();
    cleanup();
    renderSearch("/search-results?location=Chicago,%20IL&treatmentTypes=detox,inpatient,outpatient");
    expect(viaType).toEqual(await exactIds());
    // The shared matcher reaches the facility_type-only residential record.
    expect(viaType).toContain("residential");
  });

  it("11. a treatment interaction removes the legacy `treatment` and `type` params", async () => {
    const user = userEvent.setup();
    renderSearch("/search-results?location=Chicago,%20IL&treatment=detox&type=residential");
    await settle();
    // The legacy `treatment=detox` resolved to canonical [detox]; toggling
    // CBT adds to that set rather than silently discarding it. What must not
    // survive is the legacy spelling, or the `type=` preset it out-ranked.
    await user.click(document.querySelector("[data-panel='desktop'] [data-value='cbt']")!);
    await waitFor(() => expect(param("treatmentTypes")).toBe("detox,cbt"));
    expect(param("treatment")).toBeNull();
    expect(param("type")).toBeNull();
  });

  it("12. an insurance interaction removes the legacy `insurance` param", async () => {
    const user = userEvent.setup();
    renderSearch("/search-results?location=Chicago,%20IL&insurance=aetna");
    await settle();
    await user.click(document.querySelector("[data-panel='desktop'] [data-value='cigna']")!);
    await waitFor(() => expect(param("insuranceTypes")).toBe("aetna,cigna"));
    expect(param("insurance")).toBeNull();
  });

  it("13. an unknown treatment value does NOT zero the catalogue", async () => {
    renderSearch("/search-results?location=Chicago,%20IL&treatmentTypes=defunct-old-filter");
    await expect(exactIds()).resolves.toEqual(CHICAGO_IDS);
  });

  it("14. an unknown insurance value does NOT zero the catalogue", async () => {
    renderSearch("/search-results?location=Chicago,%20IL&insuranceTypes=bogus-payer");
    await expect(exactIds()).resolves.toEqual(CHICAGO_IDS);
  });

  it("13b. an unknown value is not rendered as an active filter chip", async () => {
    renderSearch("/search-results?location=Chicago,%20IL&treatmentTypes=defunct-old-filter");
    await settle();
    expect(screen.queryByText("defunct-old-filter")).toBeNull();
    expect(screen.queryByRole("button", { name: /clear all filters/i })).toBeNull();
  });

  it("15. a stale ?amenities= is inert for membership", async () => {
    renderSearch("/search-results?location=Chicago,%20IL&amenities=pool,gym,private-rooms");
    await expect(exactIds()).resolves.toEqual(CHICAGO_IDS);
  });

  it("16. a stale ?distance= is inert for membership", async () => {
    renderSearch("/search-results?location=Chicago,%20IL&distance=10");
    await expect(exactIds()).resolves.toEqual(CHICAGO_IDS);
  });

  it("15b. a stale ?amenities= is dropped on the next interaction", async () => {
    const user = userEvent.setup();
    renderSearch("/search-results?location=Chicago,%20IL&amenities=pool&distance=25");
    await settle();
    await user.click(document.querySelector("[data-panel='desktop'] [data-value='detox']")!);
    await waitFor(() => expect(param("treatmentTypes")).toBe("detox"));
    expect(param("amenities")).toBeNull();
    expect(param("distance")).toBeNull();
  });

  it("17. clear-all removes every hidden legacy and stale param", async () => {
    const user = userEvent.setup();
    renderSearch(
      "/search-results?location=Chicago,%20IL&q=detox&state=IL&treatmentTypes=detox" +
        "&insuranceTypes=aetna&treatment=outpatient&insurance=medicaid&type=residential" +
        "&verified=true&featuredOnly=true&amenities=pool&distance=25&page=2&sort=name-asc",
    );
    await settle();
    await user.click(screen.getAllByRole("button", { name: /clear all filters/i })[0]);
    await waitFor(() => expect(param("treatmentTypes")).toBeNull());
    for (const key of [
      "location", "q", "state", "treatmentTypes", "insuranceTypes", "treatment",
      "insurance", "type", "verified", "featuredOnly", "amenities", "distance",
      "page", "sort",
    ]) {
      expect(param(key), `${key} survived clear-all`).toBeNull();
    }
  });
});

// ---------------------------------------------------------------------------
// B. BOOLEAN LOGIC
// ---------------------------------------------------------------------------

describe("B. Boolean logic — OR within a group, AND across groups", () => {
  it("18. treatment multi-select is OR", async () => {
    renderSearch("/search-results?location=Chicago,%20IL&treatmentTypes=detox,cbt");
    await expect(exactIds()).resolves.toEqual(
      ["detox-aetna", "both-both", "detox-selfpay", "detox-verified", "cbt"].sort(),
    );
  });

  it("19. payment/insurance multi-select is OR", async () => {
    renderSearch("/search-results?location=Chicago,%20IL&insuranceTypes=cigna,medicare");
    await expect(exactIds()).resolves.toEqual(["cbt", "iop", "dual"].sort());
  });

  it("20. treatment AND payment/insurance across groups", async () => {
    renderSearch("/search-results?location=Chicago,%20IL&treatmentTypes=detox&insuranceTypes=aetna");
    await expect(exactIds()).resolves.toEqual(["detox-aetna", "both-both", "detox-verified"].sort());
  });

  it("21. location AND treatment AND payment/insurance", async () => {
    // Evanston also has a Detox + Aetna facility; the Chicago scope excludes it.
    renderSearch("/search-results?location=Chicago,%20IL&treatmentTypes=detox&insuranceTypes=aetna");
    const ids = await exactIds();
    expect(ids).not.toContain("evanston");
    expect(ids).not.toContain("chicago-ca");
  });

  it("22. verified combines with the other groups", async () => {
    renderSearch(
      "/search-results?location=Chicago,%20IL&treatmentTypes=detox&insuranceTypes=aetna&verified=true",
    );
    await expect(exactIds()).resolves.toEqual(["detox-verified"]);
  });

  it("23. featuredOnly combines with the other groups", async () => {
    renderSearch("/search-results?location=Chicago,%20IL&treatmentTypes=outpatient&featuredOnly=true");
    await expect(exactIds()).resolves.toEqual(["outp-featured"]);
  });

  it("an OR group with two values never returns fewer than either alone", async () => {
    renderSearch("/search-results?location=Chicago,%20IL&treatmentTypes=detox");
    const detoxOnly = await exactIds();
    cleanup();
    renderSearch("/search-results?location=Chicago,%20IL&treatmentTypes=detox,cbt");
    const both = await exactIds();
    expect(detoxOnly.every((id) => both.includes(id))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// C. FACET COUNTS
// ---------------------------------------------------------------------------

describe("C. Facet counts — self-excluding and truthful", () => {
  it("24. the treatment group EXCLUDES its own selection from its counts", async () => {
    renderSearch("/search-results?location=Chicago,%20IL&treatmentTypes=detox");
    await settle();
    // Selecting Detox must not collapse the other treatment options to zero.
    expect(facet("treatment", "cbt")).toBe(1);
    expect(facet("treatment", "outpatient")).toBeGreaterThan(0);
    // Detox's own count is unchanged by having been selected.
    expect(facet("treatment", "detox")).toBe(4);
  });

  it("25. treatment counts INCLUDE the active payment/insurance constraint", async () => {
    renderSearch("/search-results?location=Chicago,%20IL&insuranceTypes=aetna");
    await settle();
    // Aetna ∩ Detox = detox-aetna, both-both, detox-verified. NOT the 4
    // Chicago detox facilities the old cross-contaminated pool reported.
    expect(facet("treatment", "detox")).toBe(3);
  });

  it("26. the insurance group EXCLUDES its own selection from its counts", async () => {
    renderSearch("/search-results?location=Chicago,%20IL&insuranceTypes=aetna");
    await settle();
    expect(facet("insurance", "medicaid")).toBeGreaterThan(0);
    expect(facet("insurance", "cigna")).toBe(2);
  });

  it("27. insurance counts INCLUDE the active treatment constraint", async () => {
    renderSearch("/search-results?location=Chicago,%20IL&treatmentTypes=detox");
    await settle();
    expect(facet("insurance", "aetna")).toBe(3);
    expect(facet("insurance", "medicaid")).toBe(1);
    expect(facet("insurance", "cigna")).toBe(0);
  });

  it("quick-filter counts self-exclude and respect the other groups", async () => {
    renderSearch("/search-results?location=Chicago,%20IL&treatmentTypes=detox");
    await settle();
    expect(facet("quick", "verified")).toBe(1);
    expect(facet("quick", "featuredOnly")).toBe(0);

    cleanup();
    renderSearch("/search-results?location=Chicago,%20IL&treatmentTypes=outpatient");
    await settle();
    expect(facet("quick", "featuredOnly")).toBe(1);
  });

  it("28. facet counts EXCLUDE the same-state (nearby) bucket", async () => {
    renderSearch("/search-results?location=Chicago,%20IL");
    await settle();
    // Chicago, IL holds 4 detox facilities. Evanston and Chicago, CA hold one
    // each; neither may be counted.
    expect(facet("treatment", "detox")).toBe(4);
  });

  it("29. every facet count equals the ID set that option actually yields", async () => {
    const base = "/search-results?location=Chicago,%20IL&insuranceTypes=aetna";
    renderSearch(base);
    await settle();
    const claimed = facet("treatment", "detox");
    cleanup();
    renderSearch(`${base}&treatmentTypes=detox`);
    const actual = await exactIds();
    expect(actual.length).toBe(claimed);
    expect(actual).toEqual(["detox-aetna", "both-both", "detox-verified"].sort());
  });

  it("30. an ACTIVE option with a zero count stays enabled so it can be removed", async () => {
    // Cigna ∩ Detox is empty, so Cigna's own count under this treatment
    // selection is 0 — but it is selected, so it must remain clickable.
    renderSearch("/search-results?location=Chicago,%20IL&treatmentTypes=detox&insuranceTypes=cigna");
    await settle();
    const rows = optionRows("desktop");
    const cigna = rows.find((r) => r.group === "insurance" && r.value === "cigna")!;
    expect(cigna.active).toBe(true);
    expect(cigna.disabled).toBe(false);
  });

  it("an INACTIVE zero-count option is disabled and marked so", async () => {
    renderSearch("/search-results?location=Chicago,%20IL&treatmentTypes=detox");
    await settle();
    const cigna = optionRows("desktop").find((r) => r.group === "insurance" && r.value === "cigna")!;
    expect(cigna.count).toBe(0);
    expect(cigna.active).toBe(false);
    expect(cigna.disabled).toBe(true);
  });

  it("removing the zero-count active filter restores a non-empty result set", async () => {
    const user = userEvent.setup();
    renderSearch("/search-results?location=Chicago,%20IL&treatmentTypes=detox&insuranceTypes=cigna");
    await settle();
    await expect(exactIds()).resolves.toEqual([]);
    await user.click(document.querySelector("[data-panel='desktop'] [data-value='cigna']")!);
    await waitFor(() => expect(param("insuranceTypes")).toBeNull());
    await waitFor(async () => expect((await exactIds()).length).toBe(4));
  });
});

// ---------------------------------------------------------------------------
// D. FREE TEXT on the page
// ---------------------------------------------------------------------------

describe("D. Free text — membership only, no coincidences", () => {
  it("matches a service token", async () => {
    renderSearch("/search-results?location=Chicago,%20IL&q=detox");
    await expect(exactIds()).resolves.toEqual(
      ["detox-aetna", "both-both", "detox-selfpay", "detox-verified"].sort(),
    );
  });

  it("38. `mat` does not match 'traumatic' / 'formatted' / 'automatic'", async () => {
    renderSearch("/search-results?location=Chicago,%20IL&q=mat");
    const ids = await exactIds();
    expect(ids).not.toContain("trauma-trap");
    expect(ids).toEqual(["mat"]);
  });

  it("39. a structured acronym still matches its own service label", async () => {
    renderSearch("/search-results?location=Chicago,%20IL&q=cbt");
    await expect(exactIds()).resolves.toEqual(["cbt"]);
  });

  it("41. a one-character query returns nothing and says why", async () => {
    renderSearch("/search-results?q=x");
    await waitFor(() => expect(screen.getByText(/enter at least 2 characters/i)).toBeTruthy());
    expect(screen.queryAllByTestId("facility-card").length).toBe(0);
  });

  it("does not present a one-character query as if it matched the catalogue", async () => {
    renderSearch("/search-results?q=x");
    await waitFor(() => expect(screen.getByTestId("seo-description")).toBeTruthy());
    expect(screen.getByTestId("seo-description").getAttribute("content")).toContain("Browse 0 ");
  });

  it("37. a multi-token query ANDs across fields", async () => {
    renderSearch("/search-results?q=detox%20evanston");
    await expect(exactIds()).resolves.toEqual(["evanston"]);
  });
});

// ---------------------------------------------------------------------------
// E. ZERO RESULTS — zero stays zero
// ---------------------------------------------------------------------------

describe("E. Zero results — no silent widening", () => {
  it("returns zero rather than dropping a filter", async () => {
    renderSearch("/search-results?location=Chicago,%20IL&treatmentTypes=detox&insuranceTypes=cigna");
    await expect(exactIds()).resolves.toEqual([]);
    expect(screen.getByText(/no matching centers/i)).toBeTruthy();
  });

  it("exposes every ACTIVE filter with a one-tap way to relax it", async () => {
    renderSearch(
      "/search-results?location=Chicago,%20IL&treatmentTypes=detox&insuranceTypes=cigna&verified=true",
    );
    await waitFor(() => expect(screen.getByText(/active filters/i)).toBeTruthy());
    expect(screen.getByRole("button", { name: /Treatment: Detox/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Payment: Cigna/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Verified only/ })).toBeTruthy();
  });

  it("surfaces a filter that arrived through a LEGACY param too", async () => {
    renderSearch("/search-results?location=Chicago,%20IL&type=mental-health&insuranceTypes=cigna");
    await waitFor(() => expect(screen.getByText(/active filters/i)).toBeTruthy());
    expect(screen.getByRole("button", { name: /Treatment: Dual Diagnosis/ })).toBeTruthy();
  });

  it("never counts the same-state bucket into the exact result count", async () => {
    renderSearch("/search-results?location=Chicago,%20IL&treatmentTypes=twelve-step");
    await expect(exactIds()).resolves.toEqual([]);
    await waitFor(() => expect(screen.getByTestId("seo-description")).toBeTruthy());
    expect(screen.getByTestId("seo-description").getAttribute("content")).toContain("Browse 0 ");
  });
});

// ---------------------------------------------------------------------------
// F. DESKTOP / MOBILE PARITY
// ---------------------------------------------------------------------------

describe("F. Desktop / mobile parity", () => {
  it("52-53. both panels render identical values, counts and disabled states", async () => {
    const user = userEvent.setup();
    renderSearch("/search-results?location=Chicago,%20IL&treatmentTypes=detox&verified=true");
    await settle();
    await user.click(screen.getByRole("button", { name: /open filters and sort/i }));
    await waitFor(() =>
      expect(document.querySelector("[data-testid='filter-panel'][data-panel='mobile']")).toBeTruthy(),
    );

    const desktop = optionRows("desktop");
    const mobile = optionRows("mobile");
    expect(mobile.length).toBe(desktop.length);
    expect(mobile).toEqual(desktop);
  });

  it("the mobile sheet's result count equals the exact result count", async () => {
    const user = userEvent.setup();
    renderSearch("/search-results?location=Chicago,%20IL&treatmentTypes=detox");
    await settle();
    const ids = await exactIds();
    await user.click(screen.getByRole("button", { name: /open filters and sort/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: `Show ${ids.length} results` })).toBeTruthy());
  });
});

// ---------------------------------------------------------------------------
// G. SEARCH FORM — multi-value preservation
// ---------------------------------------------------------------------------

describe("G. Search form — no silent filter loss", () => {
  it("54. a submit that changes nothing preserves a multi-value treatment set", async () => {
    const user = userEvent.setup();
    renderSearch("/search-results?location=Chicago,%20IL&treatmentTypes=detox,cbt");
    await settle();
    await user.click(screen.getByRole("button", { name: /^Search rehab centers$/i }));
    await waitFor(() => expect(param("treatmentTypes")).toBe("detox,cbt"));
  });

  it("55. a submit that changes nothing preserves a multi-value payment set", async () => {
    const user = userEvent.setup();
    renderSearch("/search-results?location=Chicago,%20IL&insuranceTypes=aetna,cigna");
    await settle();
    await user.click(screen.getByRole("button", { name: /^Search rehab centers$/i }));
    await waitFor(() => expect(param("insuranceTypes")).toBe("aetna,cigna"));
  });

  it("the form STATES that several treatment filters are active", async () => {
    renderSearch("/search-results?location=Chicago,%20IL&treatmentTypes=detox,cbt");
    await settle();
    expect(screen.getByRole("combobox", { name: /treatment type/i }).textContent).toMatch(
      /2 treatment filters/i,
    );
  });

  it("a submit converges a legacy param onto the canonical representation", async () => {
    const user = userEvent.setup();
    renderSearch("/search-results?location=Chicago,%20IL&treatment=detox&amenities=pool");
    await settle();
    await user.click(screen.getByRole("button", { name: /^Search rehab centers$/i }));
    await waitFor(() => expect(param("treatmentTypes")).toBe("detox"));
    expect(param("treatment")).toBeNull();
    expect(param("amenities")).toBeNull();
  });

  it("57. choosing 'Any' clears ONLY that dimension", async () => {
    const user = userEvent.setup();
    renderSearch("/search-results?location=Chicago,%20IL&treatmentTypes=detox&insuranceTypes=aetna");
    await settle();
    await user.click(screen.getByRole("combobox", { name: /treatment type/i }));
    await user.click(await screen.findByRole("option", { name: /any treatment/i }));
    await user.click(screen.getByRole("button", { name: /^Search rehab centers$/i }));
    await waitFor(() => expect(param("treatmentTypes")).toBeNull());
    expect(param("insuranceTypes")).toBe("aetna");
    expect(param("location")).toBe("Chicago, IL");
  });

  it("56. a deliberate change replaces only the dimension that changed", async () => {
    const user = userEvent.setup();
    renderSearch("/search-results?location=Chicago,%20IL&treatmentTypes=detox,cbt&insuranceTypes=aetna");
    await settle();
    await user.click(screen.getByRole("combobox", { name: /treatment type/i }));
    await user.click(await screen.findByRole("option", { name: "Outpatient" }));
    await user.click(screen.getByRole("button", { name: /^Search rehab centers$/i }));
    await waitFor(() => expect(param("treatmentTypes")).toBe("outpatient"));
    expect(param("insuranceTypes")).toBe("aetna");
  });
});

// ---------------------------------------------------------------------------
// H. NO RANKING CHANGE
// ---------------------------------------------------------------------------

describe("H. Ranking is untouched by Phase 3A", () => {
  it("preserves the existing result ORDER for a fixed corpus and sort", async () => {
    renderSearch("/search-results?location=Chicago,%20IL&sort=name-asc");
    await settle();
    const names = screen
      .queryAllByTestId("facility-card")
      .map((el) => el.textContent ?? "");
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  it("keeps Featured out of the organic membership decision", async () => {
    // A featured facility is neither promoted into, nor excluded from, a
    // filter it does not satisfy.
    renderSearch("/search-results?location=Chicago,%20IL&treatmentTypes=detox");
    const ids = await exactIds();
    expect(ids).not.toContain("outp-featured");
  });
});

// ---------------------------------------------------------------------------
// I. INDEXABILITY POLICY — unchanged by Phase 3A
// ---------------------------------------------------------------------------

/**
 * Phase 3A must produce ZERO newly-noindexed URLs and ZERO newly-indexable
 * ones. `hasSearchParams` therefore keeps its exact pre-phase composition —
 * RAW param presence, including the now-inert `amenities`. These tests pin
 * that: an old filtered URL must not become indexable just because we
 * stopped honouring its filter, and an unfiltered URL must not acquire a
 * noindex it never had.
 */
const noindexed = async (): Promise<boolean> => {
  await waitFor(() => expect(screen.getByTestId("seo-noindex")).toBeTruthy());
  return screen.getByTestId("seo-noindex").getAttribute("content") === "true";
};

describe("I. Indexability policy is unchanged", () => {
  it("keeps the unfiltered search page indexable", async () => {
    renderSearch("/search-results");
    await expect(noindexed()).resolves.toBe(false);
  });

  it("keeps a filtered search page noindexed", async () => {
    renderSearch("/search-results?location=Chicago,%20IL&treatmentTypes=detox");
    await expect(noindexed()).resolves.toBe(true);
  });

  it("keeps a stale ?amenities= URL noindexed even though it now filters nothing", async () => {
    renderSearch("/search-results?amenities=pool");
    await expect(noindexed()).resolves.toBe(true);
  });

  it("keeps a stale unsupported ?treatmentTypes= URL noindexed", async () => {
    renderSearch("/search-results?treatmentTypes=defunct-old-filter");
    await expect(noindexed()).resolves.toBe(true);
  });

  it("keeps every legacy filter spelling noindexed, exactly as before", async () => {
    for (const qs of ["treatment=detox", "insurance=aetna", "type=residential", "q=detox", "state=IL"]) {
      cleanup();
      renderSearch(`/search-results?${qs}`);
      expect(await noindexed(), qs).toBe(true);
    }
  });

  it("does NOT noindex on the quick filters or sort — same as before the phase", async () => {
    for (const qs of ["verified=true", "featuredOnly=true", "sort=name-asc"]) {
      cleanup();
      renderSearch(`/search-results?${qs}`);
      expect(await noindexed(), qs).toBe(false);
    }
  });

  it("keeps the canonical URL policy for indexable variants", async () => {
    renderSearch("/search-results");
    await waitFor(() => expect(screen.getByTestId("seo-canonical")).toBeTruthy());
    expect(screen.getByTestId("seo-canonical").getAttribute("content")).toBe("/search-results");
  });
});

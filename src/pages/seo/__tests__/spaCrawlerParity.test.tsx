/**
 * The SPA and the crawler must render the same page.
 *
 * A URL like /insurance/cigna-rehab/california/fresno has two
 * renderings: the prerendered file under public/, which is what
 * Googlebot is served, and the React route, which is what a visitor
 * gets after client-side navigation. Phase 3 enriched the static side
 * and left the templates alone, so for a while those two renderings
 * said different things about the same place — and the version Google
 * indexed was not the version anyone saw.
 *
 * These tests render the real page components, capture what the template
 * is handed, and compare it against the composer the static generator
 * runs. If someone removes the wiring, or a composer gains a section the
 * template silently drops, this fails.
 *
 * `SEOLandingTemplate` is stubbed for the same reason the location-truth
 * suite stubs it: the boundary under test is "what did the page decide
 * to say", not "how does the design system draw it".
 */

import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildInsuranceCityContent } from "@/lib/seo/insuranceContent.mjs";
import { buildCityIndex } from "@/lib/seo/cityProfiles.mjs";
import { buildCityTreatmentContent } from "@/lib/seo/cityTreatmentContent.mjs";
import { statesData } from "@/data/locationSeoData";
import { stateCountyData } from "@/data/countySeoData";
import { stateAddictionStats } from "@/data/stateAddictionStats";

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

// No facilities: the parity being tested is about COPY, and an empty
// catalogue also exercises the zero-count branch, which is the one that
// has to state a plain zero rather than deflect.
vi.mock("@/hooks/useStaticFacilities", () => ({
  PUBLIC_FACILITIES_QUERY_KEY: ["static-public-facilities"] as const,
  useStaticFacilities: () => ({ data: [], isLoading: false }),
}));

interface CapturedProps {
  sections?: { heading: string; content: string }[];
  faqs?: { question: string; answer: string }[];
  introContent?: string;
}

const captured: CapturedProps[] = [];

vi.mock("@/components/seo/SEOLandingTemplate", () => ({
  SEOLandingTemplate: (props: CapturedProps & { children?: ReactNode }) => {
    captured.push(props);
    return <div data-testid="seo-page" />;
  },
}));

const CityInsurancePage = (await import("../CityInsurancePage")).default;
const CityTreatmentPage = (await import("../CityTreatmentPage")).default;

beforeEach(() => {
  captured.length = 0;
});

function renderRoute(path: string, pattern: string, element: ReactNode) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={pattern} element={element} />
      </Routes>
    </MemoryRouter>,
  );
  return captured[captured.length - 1];
}

const headings = (props: CapturedProps) => (props.sections ?? []).map((s) => s.heading);
const questions = (props: CapturedProps) => (props.faqs ?? []).map((f) => f.question);

describe("insurance city page carries the composed content", () => {
  const props = () =>
    renderRoute(
      "/insurance/cigna-rehab/california/fresno",
      "/insurance/:insurerSlug/:stateSlug/:citySlug",
      <CityInsurancePage />,
    );

  const composed = () => {
    const stats = stateAddictionStats.find((s) => s.slug === "california");
    const state = statesData.find((s) => s.slug === "california")!;
    return buildInsuranceCityContent({
      insurerSlug: "cigna-rehab",
      insurerName: "Cigna",
      cityName: "Fresno",
      stateName: "California",
      stateAbbr: state.abbreviation,
      medicaidExpanded: true,
      notableInfo: stats?.signatureNote,
      population: state.cities.find((c) => c.slug === "fresno")?.population,
      facilityCount: 0,
      primaryMetro: stats?.primaryMetro,
      secondaryMetros: stats?.secondaryMetros,
    });
  };

  it("hands the template every composed section", () => {
    const got = headings(props());
    for (const section of composed().sections) expect(got).toContain(section.heading);
  });

  it("hands the template every composed FAQ", () => {
    const got = questions(props());
    for (const faq of composed().faqs) expect(got).toContain(faq.question);
  });

  it("keeps the page's own sections rather than replacing them", () => {
    // The merge is additive. A composer that started replacing the
    // hand-written blocks would lose real content silently.
    expect(headings(props())).toContain("Cigna Coverage in Fresno");
  });

  it("does not print one topic twice", () => {
    const got = headings(props());
    expect(new Set(got).size).toBe(got.length);
    const qs = questions(props());
    expect(new Set(qs).size).toBe(qs.length);
  });

  it("states the same zero the static page states", () => {
    const text = (props().faqs ?? []).map((f) => f.answer).join(" ");
    expect(text).toMatch(/no facility in Fresno|does not currently list/i);
  });
});

describe("city treatment page carries the composed content", () => {
  const index = buildCityIndex({ statesData, stateCountyData });

  it("hands the template the city's own facts", () => {
    const props = renderRoute("/detox-centers-in-fresno", "/:slug", <CityTreatmentPage />);
    const profile = index.get("fresno");
    const composed = buildCityTreatmentContent({
      profile,
      treatmentLabel: "Detox Centers",
      treatmentSlug: "detox-centers",
      facilityCount: 0,
    });
    const got = headings(props);
    for (const section of composed.sections) expect(got).toContain(section.heading);
    // The county is the axis that separates two cities in one state, so
    // its absence would mean the wiring is present but inert.
    expect(JSON.stringify(props.sections)).toContain(profile.county.name);
  });

  it("does not print one topic twice", () => {
    const props = renderRoute("/detox-centers-in-fresno", "/:slug", <CityTreatmentPage />);
    const got = headings(props);
    expect(new Set(got).size).toBe(got.length);
  });
});

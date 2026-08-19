/**
 * Guards for the composed SEO content layer.
 *
 * Two things can silently rot here. The first is COVERAGE: a new insurer
 * or near-me slug added to the config lists without a matching profile
 * quietly falls back to generic copy, and that page rejoins the duplicate
 * cluster it was pulled out of — invisibly, because nothing errors.
 *
 * The second is TRUTH. These pages are health content. The composers are
 * built to state structural facts (who administers a benefit, what a
 * level of care is, what a state requires) and never plan-specific or
 * outcome-specific ones. A future edit that adds "covers 30 days" or
 * "85% success rate" would read as an improvement and would be a
 * regression, so the forbidden shapes are asserted rather than trusted.
 */

import { describe, expect, it } from "vitest";

import { insurerConfigs } from "@/data/seoInsuranceStateConfig";
import { NEAR_ME_TYPES } from "@/data/nearMeTypes";
import { INSURER_PROFILES, insurerProfile, insurerProfileByName } from "../insurerProfiles.mjs";
import { NEAR_ME_TOPICS, nearMeTopic, nearMeSlugForTreatment, buildNearMeContent } from "../nearMeTopics.mjs";
import { buildInsuranceCityContent, buildInsuranceCountyContent } from "../insuranceContent.mjs";
import { buildProviderMarketContent, facilityDensityPer100k } from "../providerMarketContent.mjs";
import { renderComposedHtml } from "../composedHtml.mjs";

const CA_STATS = {
  abbr: "CA",
  populationMillions: 39.0,
  overdoseDeathRate: 26.4,
  opioidShare: 62,
  samhsaFacilities: 1200,
  medicaidExpanded: true,
  primaryMetro: "Los Angeles",
  secondaryMetros: ["San Diego", "San Jose", "San Francisco", "Fresno"],
  signatureNote: "California note.",
};
const CA_LIC = {
  regulatoryBody: "California Department of Health Care Services",
  regulatoryAbbr: "DHCS",
  licensureTypes: ["Residential", "Outpatient", "NTP"],
  renewalPeriod: "two-year",
};

/** Every claim shape these pages must never make. */
const FORBIDDEN = [
  { name: "dollar figure", re: /\$\s?\d/ },
  { name: "success/outcome rate", re: /\b\d{1,3}\s?%\s*(success|recovery|sober|completion)/i },
  // Only AFFIRMATIVE guarantees. The composers legitimately use the word
  // inside a disclaimer ("acceptance is not a guarantee of in-network
  // status"), which is the opposite of the claim being guarded against.
  { name: "affirmative guarantee", re: /\b(we|this program|the facility)\s+guarantee|\bguaranteed\s+(results|success|coverage|placement|admission)\b/i },
  { name: "cure claim", re: /\bcures?\b/i },
  { name: "best/#1 superlative", re: /\b(#1|number one|best in the (state|country))\b/i },
];

function allText(content: { intro: string; sections: { heading: string; body: string }[]; faqs: { question: string; answer: string }[]; metaDescription: string }) {
  return [
    content.metaDescription,
    content.intro,
    ...content.sections.flatMap((s) => [s.heading, s.body]),
    ...content.faqs.flatMap((f) => [f.question, f.answer]),
  ].join(" ");
}

describe("profile coverage", () => {
  it("every published insurer has a profile", () => {
    const missing = insurerConfigs.filter((c) => !insurerProfile(c.slug)).map((c) => c.slug);
    expect(missing).toEqual([]);
  });

  it("every near-me type has a topic profile", () => {
    const missing = NEAR_ME_TYPES.filter((t) => !nearMeTopic(t.slug)).map((t) => t.slug);
    expect(missing).toEqual([]);
  });

  it("resolves the several slug spellings of one service onto one profile", () => {
    // A service described three ways in three families must not become
    // three descriptions that drift.
    expect(nearMeSlugForTreatment("detox")).toBe("detox-near-me");
    expect(nearMeSlugForTreatment("residential-inpatient")).toBe("inpatient-rehab-near-me");
    expect(nearMeSlugForTreatment("dual-diagnosis-treatment")).toBe("dual-diagnosis-near-me");
  });

  it("returns null for an unknown service rather than guessing", () => {
    // Attaching the wrong clinical facts to a page is worse than omitting
    // the section, so the resolver must not fall back to a default topic.
    expect(nearMeSlugForTreatment("not-a-real-service")).toBeNull();
    expect(nearMeTopic("not-a-real-service")).toBeNull();
  });

  it("looks an insurer up by display name, which is what the React pages hold", () => {
    expect(insurerProfileByName("Cigna")?.behavioralHealth).toMatch(/Evernorth/);
    expect(insurerProfileByName("UnitedHealthcare")?.behavioralHealth).toMatch(/Optum/);
  });
});

describe("composed content is genuinely distinct", () => {
  const base = {
    cityName: "Fresno",
    stateName: "California",
    stateAbbr: "CA",
    medicaidExpanded: true,
    notableInfo: "California note.",
    population: 542_000,
    primaryMetro: CA_STATS.primaryMetro,
    secondaryMetros: CA_STATS.secondaryMetros,
  };

  it("differs between carriers in the same city", () => {
    const bodies = Object.keys(INSURER_PROFILES).map((slug) =>
      allText(buildInsuranceCityContent({ ...base, insurerSlug: slug })),
    );
    expect(new Set(bodies).size).toBe(bodies.length);
  });

  it("differs between states for the same carrier", () => {
    const ca = allText(buildInsuranceCityContent({ ...base, insurerSlug: "cigna-rehab" }));
    const oh = allText(
      buildInsuranceCityContent({
        ...base,
        insurerSlug: "cigna-rehab",
        cityName: "Toledo",
        stateName: "Ohio",
        stateAbbr: "OH",
        medicaidExpanded: false,
        notableInfo: "Ohio note.",
        primaryMetro: "Columbus",
        secondaryMetros: ["Cleveland", "Cincinnati"],
      }),
    );
    expect(ca).not.toBe(oh);
  });

  it("differs between topics for the same place", () => {
    const bodies = Object.keys(NEAR_ME_TOPICS).map((slug) =>
      allText(buildNearMeContent({ topicSlug: slug, topicLabel: slug, stateName: "California", stats: CA_STATS, licensing: CA_LIC })),
    );
    expect(new Set(bodies).size).toBe(bodies.length);
  });

  it("clears the thin-content floor on a fully-populated page", () => {
    const html = renderComposedHtml(buildInsuranceCityContent({ ...base, insurerSlug: "cigna-rehab", facilityCount: 3 }));
    const words = (html.replace(/<[^>]+>/g, " ").toLowerCase().match(/[a-z][a-z'-]+/g) ?? []).length;
    expect(words).toBeGreaterThan(300);
  });
});

describe("truth constraints", () => {
  const samples = [
    ...Object.keys(INSURER_PROFILES).map((slug) =>
      buildInsuranceCityContent({ insurerSlug: slug, cityName: "Fresno", stateName: "California", stateAbbr: "CA", medicaidExpanded: true, population: 542_000, facilityCount: 2 }),
    ),
    ...Object.keys(INSURER_PROFILES).map((slug) =>
      buildInsuranceCountyContent({ insurerSlug: slug, countyName: "Fresno", countySeat: "Fresno", countyPopulation: 1_008_654, majorCities: ["Fresno", "Clovis"], stateName: "California", stateAbbr: "CA", medicaidExpanded: true }),
    ),
    ...Object.keys(NEAR_ME_TOPICS).map((slug) =>
      buildNearMeContent({ topicSlug: slug, topicLabel: slug, stateName: "California", stats: CA_STATS, licensing: CA_LIC }),
    ),
    buildProviderMarketContent({ stateName: "California", stats: CA_STATS, licensing: CA_LIC, treatmentName: "Detox" }),
  ];

  for (const { name, re } of FORBIDDEN) {
    it(`never states a ${name}`, () => {
      const offenders = samples.filter((s) => re.test(allText(s)));
      expect(offenders.map((s) => s.metaDescription)).toEqual([]);
    });
  }

  it("never asserts that a listed facility IS in-network", () => {
    // Facilities REPORT acceptance; only the carrier can confirm network
    // status. Phase 2 held this line for matching semantics and the copy
    // has to hold it too.
    //
    // The word "in-network" appears legitimately in two shapes — telling
    // the reader what to ASK ("whether it is in-network for your plan")
    // and telling them what acceptance is NOT ("acceptance is not the
    // same as being in-network"). What may never appear is an assertion
    // that some facility on this page is in fact in-network.
    const ASSERTS_IN_NETWORK =
      /\b(facilities|programs|centers|centres|listings)\s+(here|below|in [A-Z][a-z]+)?\s*are in-network\b/i;
    for (const s of samples) {
      expect(allText(s)).not.toMatch(ASSERTS_IN_NETWORK);
    }
  });

  it("carries the acceptance-is-not-network disclaimer wherever it discusses network status", () => {
    // The positive half of the guard above: pages that raise network
    // status must also say what acceptance does and does not mean.
    const insuranceSamples = samples.filter((s) => /in-network/i.test(allText(s)));
    expect(insuranceSamples.length).toBeGreaterThan(0);
    for (const s of insuranceSamples) {
      expect(allText(s)).toMatch(/acceptance is not (the same as|a guarantee)/i);
    }
  });

  it("omits a facility count entirely when the caller does not know one", () => {
    const unknown = allText(buildInsuranceCityContent({ insurerSlug: "cigna-rehab", cityName: "Fresno", stateName: "California", stateAbbr: "CA" }));
    expect(unknown).not.toMatch(/RehabLookup lists \d+/);
    const known = allText(buildInsuranceCityContent({ insurerSlug: "cigna-rehab", cityName: "Fresno", stateName: "California", stateAbbr: "CA", facilityCount: 4 }));
    expect(known).toMatch(/RehabLookup lists 4 facilities/);
  });

  it("says zero plainly rather than deflecting when the exact count is zero", () => {
    const zero = allText(buildInsuranceCityContent({ insurerSlug: "cigna-rehab", cityName: "Fresno", stateName: "California", stateAbbr: "CA", facilityCount: 0 }));
    expect(zero).toMatch(/does not currently list a facility/i);
  });
});

describe("derived market figures", () => {
  it("computes density from the two real inputs", () => {
    // 1,200 facilities over 39.0m residents → 3.1 per 100k.
    expect(facilityDensityPer100k(1200, 39.0)).toBe(3.1);
  });

  it("returns null rather than a number when an input is missing", () => {
    expect(facilityDensityPer100k(undefined as unknown as number, 39)).toBeNull();
    expect(facilityDensityPer100k(1200, 0)).toBeNull();
  });
});

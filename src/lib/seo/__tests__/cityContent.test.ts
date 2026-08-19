/**
 * Guards for the city-level content axis.
 *
 * The 63 `<treatment>-in-<city>` families were 73% duplicate because
 * every block on them was keyed on STATE. This layer is what makes two
 * cities in one state say different things, so the property worth
 * asserting is exactly that — not that the code runs, but that its
 * output actually SEPARATES pages that used to collide.
 *
 * The second thing asserted here is the line Phase 2 drew. These pages
 * now discuss where a city sits relative to other markets, which is
 * precisely the territory where proximity language creeps back in. This
 * codebase holds no provider coordinates, so any sentence implying we
 * know what is nearest would be a claim we cannot support.
 */

import { describe, expect, it } from "vitest";

import { statesData } from "@/data/locationSeoData";
import { stateCountyData } from "@/data/countySeoData";
import { buildCityIndex, populationBand } from "../cityProfiles.mjs";
import { buildCityTreatmentContent, careSettingFor, CARE_SETTINGS } from "../cityTreatmentContent.mjs";

const index = buildCityIndex({ statesData, stateCountyData });

function allText(c: { intro: string; sections: { heading: string; body: string }[]; faqs: { question: string; answer: string }[]; metaDescription: string }) {
  return [
    c.metaDescription,
    c.intro,
    ...c.sections.flatMap((s) => [s.heading, s.body]),
    ...c.faqs.flatMap((f) => [f.question, f.answer]),
  ].join(" ");
}

const build = (slug: string, label = "Alcohol Rehab", treatmentSlug = "alcohol-rehab", facilityCount: number | null = 0) =>
  buildCityTreatmentContent({ profile: index.get(slug), treatmentLabel: label, treatmentSlug, facilityCount });

/** Strip the page's own geography the way the corpus audit does, so a
 *  collision here means the same collision the audit would report.
 *
 *  Digits go, and so do the ordinal suffixes left behind when they do —
 *  otherwise "15th" and "2nd" reduce to "th" and "nd" and separate two
 *  pages that are otherwise word-for-word identical. That is not the
 *  separation this layer is supposed to provide, and a guard that
 *  accepts it would pass even with the whole county block deleted. */
function deGeo(text: string, ...words: string[]) {
  let out = text.toLowerCase();
  for (const w of words) out = out.replaceAll(w.toLowerCase(), " ");
  return out
    .replace(/\d+(st|nd|rd|th)\b/g, " ")
    .replace(/\d/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

describe("city profiles", () => {
  it("covers the cities the directory lists", () => {
    // Both key shapes resolve: slug, and state|name for the families
    // that spell the slug differently.
    expect(index.get("akron")?.county?.name).toBe("Summit");
    expect(index.get("ohio|akron")?.city).toBe("Akron");
  });

  it("ranks a city only against what this directory actually lists", () => {
    const akron = index.get("akron");
    expect(akron.rankInState).toBeGreaterThan(0);
    expect(akron.rankInState).toBeLessThanOrEqual(akron.listedInState);
    expect(akron.listedInState).toBe(statesData.find((s) => s.slug === "ohio")!.cities.length);
  });

  it("leaves unknown facts null instead of estimating them", () => {
    // A city the population table does not carry must not acquire a
    // population, a rank or a size band on the way through.
    const reduced = buildCityIndex({
      statesData,
      stateCountyData,
      extraCities: [{ name: "Fremont", slug: "fremont", stateSlug: "california", stateAbbr: "CA" }],
    }).get("fremont");
    expect(reduced.population).toBeNull();
    expect(reduced.rankInState).toBeNull();
    expect(reduced.band).toBeNull();
    // …but what IS known still lands.
    expect(reduced.county?.name).toBe("Alameda");
  });

  it("does not invent a county for a city it cannot place", () => {
    const unplaced = buildCityIndex({
      statesData,
      stateCountyData,
      extraCities: [{ name: "Nowhereville", slug: "nowhereville", stateSlug: "texas", stateAbbr: "TX" }],
    }).get("nowhereville");
    expect(unplaced.county).toBeNull();
    expect(unplaced.countyPeers).toEqual([]);
  });

  it("bands by population, and refuses to band without one", () => {
    expect(populationBand(900_000)?.id).toBe("major");
    expect(populationBand(120_000)?.id).toBe("midsize");
    expect(populationBand(40_000)?.id).toBe("small");
    expect(populationBand(undefined as unknown as number)).toBeNull();
  });
});

describe("care settings", () => {
  it("routes each published prefix to a setting", () => {
    expect(careSettingFor("iop-in-")).toBe("visit");
    expect(careSettingFor("methadone-clinic")).toBe("dosing");
    expect(careSettingFor("90-day-rehab-in-")).toBe("bed");
    expect(careSettingFor("detox-in-")).toBe("detox");
  });

  it("falls back to the hedged setting rather than guessing a level of care", () => {
    // Attaching "this is residential" to a page about a payer or a
    // substance would be a clinical claim the slug does not support.
    expect(careSettingFor("medicaid-rehab-in-")).toBe("mixed");
    expect(careSettingFor("something-invented-in-")).toBe("mixed");
  });

  it("assigns no slug to two settings", () => {
    const seen = new Set<string>();
    const dupes: string[] = [];
    for (const slugs of Object.values(CARE_SETTINGS) as string[][]) {
      for (const s of slugs) {
        if (seen.has(s)) dupes.push(s);
        seen.add(s);
      }
    }
    expect(dupes).toEqual([]);
  });
});

describe("two cities in one state no longer say the same thing", () => {
  it("separates same-state cities after their own geography is removed", () => {
    // This is the exact failure the family had: Chula Vista and Akron
    // were fine, but Chula Vista and San Diego were byte-identical.
    const pairs: [string, string][] = [
      ["chula-vista", "san-diego"],
      ["akron", "toledo"],
      ["fresno", "sacramento"],
    ];
    for (const [a, b] of pairs) {
      const A = index.get(a);
      const B = index.get(b);
      const textA = deGeo(allText(build(a)), A.city, A.state, A.stateAbbr);
      const textB = deGeo(allText(build(b)), B.city, B.state, B.stateAbbr);
      expect(textA).not.toBe(textB);
    }
  });

  it("names the county, which is the axis that does most of the separating", () => {
    const c = build("akron");
    const text = allText(c);
    expect(text).toContain("Summit County");
    expect(text).toContain("Cuyahoga Falls"); // a county peer, not a state fact
  });

  it("separates two reduced profiles on their curated associations alone", () => {
    // Cities with neither a population nor a county still have to differ,
    // and the only thing left is the market association the caller passes.
    const reduced = buildCityIndex({
      statesData,
      stateCountyData,
      extraCities: [
        { name: "Aville", slug: "aville", stateSlug: "texas", stateAbbr: "TX", relatedMarkets: ["Midland", "Lubbock"] },
        { name: "Bville", slug: "bville", stateSlug: "texas", stateAbbr: "TX", relatedMarkets: ["Waco", "Tyler"] },
      ],
    });
    const mk = (slug: string) =>
      buildCityTreatmentContent({ profile: reduced.get(slug), treatmentLabel: "Detox", treatmentSlug: "detox", facilityCount: 0 });
    const a = deGeo(allText(mk("aville")), "Aville", "Texas", "TX");
    const b = deGeo(allText(mk("bville")), "Bville", "Texas", "TX");
    expect(a).not.toBe(b);
  });

  it("separates the same city across care settings", () => {
    const iop = allText(build("akron", "IOP", "iop"));
    const bed = allText(build("akron", "90-Day Rehab", "90-day-rehab"));
    expect(iop).not.toBe(bed);
  });

  it("keeps acronym labels readable mid-sentence", () => {
    const text = allText(build("akron", "IOP", "iop"));
    expect(text).toContain("IOP");
    expect(text).not.toMatch(/\biop\b/);
  });
});

describe("truth constraints", () => {
  const samples = ["akron", "chula-vista", "fresno", "buffalo", "boise"]
    .filter((s) => index.has(s))
    .flatMap((slug) => [
      build(slug, "Detox", "detox"),
      build(slug, "IOP", "iop"),
      build(slug, "Methadone Clinic", "methadone-clinic"),
      build(slug, "90-Day Rehab", "90-day-rehab"),
    ]);

  it("has samples to check", () => {
    expect(samples.length).toBeGreaterThan(0);
  });

  it("never implies it knows what is closest", () => {
    // Phase 2 removed proximity language from every public surface
    // because there are no coordinates to compute it from. The words
    // below may appear ONLY inside the disclaimer that says we cannot
    // rank by distance, which is why the assertion is on the affirmative
    // shapes rather than on the bare words.
    const PROXIMITY = [
      /\bnearest\b/i,
      /\b\d+\s?miles?\b/i,
      /\bwithin\s+\d+\s?(miles|minutes)\b/i,
      /\bclosest (facility|program|provider|center|option)\b/i,
      /\bclose by\b/i,
      /\bdrive time\b/i,
    ];
    for (const s of samples) {
      const text = allText(s);
      for (const re of PROXIMITY) expect(text).not.toMatch(re);
    }
  });

  it("says out loud that its market associations are not distances", () => {
    // The positive half of the guard above: a page that names other
    // markets must also say what that naming is and is not.
    const withPeers = samples.filter((s) => /Related .* markets/.test(allText(s)));
    expect(withPeers.length).toBeGreaterThan(0);
    for (const s of withPeers) {
      expect(allText(s)).toMatch(/not a distance calculation|comparable in size, not in distance/);
    }
  });

  it("never states a price, an outcome rate or a guarantee", () => {
    for (const s of samples) {
      const text = allText(s);
      expect(text).not.toMatch(/\$\s?\d/);
      expect(text).not.toMatch(/\b\d{1,3}\s?%\s*(success|recovery|sober|completion)/i);
      expect(text).not.toMatch(/\bguaranteed\s+(results|success|coverage|placement|admission)\b/i);
      expect(text).not.toMatch(/\bcures?\b/i);
    }
  });

  it("does not claim a size it was never given", () => {
    const reduced = buildCityIndex({
      statesData,
      stateCountyData,
      extraCities: [{ name: "Fremont", slug: "fremont", stateSlug: "california", stateAbbr: "CA" }],
    }).get("fremont");
    const text = allText(
      buildCityTreatmentContent({ profile: reduced, treatmentLabel: "Detox", treatmentSlug: "detox", facilityCount: 0 }),
    );
    expect(text).not.toMatch(/market this size|a market of this size|city of about/i);
  });

  it("reports a zero count plainly rather than deflecting", () => {
    const text = allText(build("akron", "Detox", "detox", 0));
    expect(text).toMatch(/does not currently list/i);
  });

  it("states a count only when it was given one", () => {
    const unknown = allText(build("akron", "Detox", "detox", null));
    expect(unknown).not.toMatch(/RehabLookup (currently )?lists \d/);
    const known = allText(build("akron", "Detox", "detox", 4));
    expect(known).toMatch(/lists 4 facilities/);
  });
});

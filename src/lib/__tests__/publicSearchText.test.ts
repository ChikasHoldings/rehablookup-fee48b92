/**
 * PHASE 3A — FREE-TEXT SEARCH CONTRACT.
 *
 * The old `?q=` matcher concatenated every field into one string and ran
 * `word.includes(token)` over it. That is not a search, it is a coincidence
 * detector: `mat` matched "traumatic", `iop` matched "biopsy", and a
 * one-character query matched the entire catalogue while the page announced
 * `Results for "x"`.
 *
 * The corpus below is planted specifically to catch a matcher that has
 * regressed to substring behaviour — every misleading substring the old
 * implementation fired on is present in narrative text.
 */

import { describe, expect, it } from "vitest";

import {
  isMeaningfulQuery,
  matchesFreeTextQuery,
  queryTokens,
  tokenize,
  type FreeTextSearchableFacility,
} from "@/lib/publicSearchText";

const facility = (
  overrides: Partial<FreeTextSearchableFacility> & { name: string },
): FreeTextSearchableFacility => ({
  city: "Chicago",
  state: "Illinois",
  zipCode: "60601",
  facilityType: "Outpatient Program",
  treatmentTypes: [],
  insuranceAccepted: [],
  description: "",
  ...overrides,
});

/** Structured MAT provider — "mat" is a real token in a real service label. */
const MAT_CLINIC = facility({
  name: "Lakeshore Recovery",
  treatmentTypes: ["Medication-Assisted Treatment (MAT)", "Detox"],
  insuranceAccepted: ["Medicaid", "Self-Pay/Private Pay"],
  description: "Opioid use disorder care with daily dosing.",
});

/**
 * The trap. No structured MAT anywhere; "mat" only ever appears INSIDE
 * longer narrative words. A substring matcher returns this for `q=mat`.
 */
const TRAUMA_ONLY = facility({
  name: "Riverbend Counseling",
  city: "Peoria",
  treatmentTypes: ["Trauma Therapy"],
  insuranceAccepted: ["Aetna"],
  description:
    "Traumatic stress recovery in a formatted, informative program. Automatic intake.",
});

/**
 * Narrative traps carrying the retired Amenities inference vocabulary.
 * `CARPOOL_TRAP` holds "pool" ONLY as the tail of a longer word, which is
 * precisely what the old `includes()` matcher fired on.
 */
const CARPOOL_TRAP = facility({
  name: "Northside Wellness",
  city: "Evanston",
  treatmentTypes: ["Outpatient"],
  description: "We arrange carpool and vanpool support for transportation.",
});

const POOLING_PREFIX = facility({
  name: "Southside Wellness",
  city: "Berwyn",
  treatmentTypes: ["Outpatient"],
  description: "We use risk-pooling to keep program fees predictable.",
});

const CBT_STRUCTURED = facility({
  name: "Loop Behavioral Health",
  treatmentTypes: ["Cognitive Behavioral Therapy (CBT)"],
  insuranceAccepted: ["Blue Cross Blue Shield"],
  description: "Evidence-based therapy.",
});

const IOP_STRUCTURED = facility({
  name: "Westside IOP Center",
  treatmentTypes: ["Intensive Outpatient (IOP)"],
  description: "Biopsy referrals are not offered here.",
});

const APOSTROPHE_NAME = facility({
  name: "St. Mary’s Recovery House",
  city: "Saint Louis",
  state: "Missouri",
  zipCode: "63101",
});

const DESCRIPTION_ONLY = facility({
  name: "Prairie Center",
  city: "Springfield",
  treatmentTypes: ["Outpatient"],
  description: "Our equine-assisted programming runs every weekend.",
});

describe("publicSearchText — tokenisation", () => {
  it("splits a service label into words INCLUDING the parenthesised acronym", () => {
    expect(tokenize("Medication-Assisted Treatment (MAT)")).toEqual([
      "medication",
      "assisted",
      "treatment",
      "mat",
    ]);
  });

  it("folds case, punctuation and collapsed whitespace to the same tokens", () => {
    expect(tokenize("  St. MARY'S   Recovery  ")).toEqual(["st", "mary", "s", "recovery"]);
  });

  it("folds a Unicode apostrophe onto the ASCII one", () => {
    expect(tokenize("St. Mary’s")).toEqual(tokenize("St. Mary's"));
  });

  it("folds en/em dashes onto the ASCII hyphen boundary", () => {
    expect(tokenize("Trauma—Informed")).toEqual(["trauma", "informed"]);
  });

  it("drops sub-2-character tokens from a query", () => {
    expect(queryTokens("st. mary's")).toEqual(["st", "mary"]);
  });
});

describe("publicSearchText — unusable input", () => {
  it("treats a one-character query as unusable, not as 'match everything'", () => {
    expect(isMeaningfulQuery("x")).toBe(false);
    expect(matchesFreeTextQuery(MAT_CLINIC, "x")).toBe(false);
    expect(matchesFreeTextQuery(TRAUMA_ONLY, "x")).toBe(false);
  });

  it("treats punctuation-only and empty input as unusable", () => {
    for (const q of ["", "   ", "!", "-", "?!"]) {
      expect(isMeaningfulQuery(q)).toBe(false);
      expect(matchesFreeTextQuery(MAT_CLINIC, q)).toBe(false);
    }
  });

  it("accepts a two-character query", () => {
    expect(isMeaningfulQuery("aa")).toBe(true);
  });
});

describe("publicSearchText — structured field membership", () => {
  it("matches an exact facility name", () => {
    expect(matchesFreeTextQuery(MAT_CLINIC, "Lakeshore Recovery")).toBe(true);
    expect(matchesFreeTextQuery(TRAUMA_ONLY, "Lakeshore Recovery")).toBe(false);
  });

  it("matches a city token", () => {
    expect(matchesFreeTextQuery(MAT_CLINIC, "chicago")).toBe(true);
    expect(matchesFreeTextQuery(TRAUMA_ONLY, "chicago")).toBe(false);
  });

  it("matches a state token", () => {
    expect(matchesFreeTextQuery(MAT_CLINIC, "illinois")).toBe(true);
    expect(matchesFreeTextQuery(APOSTROPHE_NAME, "illinois")).toBe(false);
  });

  it("matches a ZIP token exactly and by prefix", () => {
    expect(matchesFreeTextQuery(MAT_CLINIC, "60601")).toBe(true);
    expect(matchesFreeTextQuery(MAT_CLINIC, "606")).toBe(true);
    expect(matchesFreeTextQuery(MAT_CLINIC, "63101")).toBe(false);
  });

  it("matches a service/treatment label token", () => {
    expect(matchesFreeTextQuery(MAT_CLINIC, "detox")).toBe(true);
    expect(matchesFreeTextQuery(CBT_STRUCTURED, "detox")).toBe(false);
  });

  it("matches a payment/insurance label token", () => {
    expect(matchesFreeTextQuery(MAT_CLINIC, "medicaid")).toBe(true);
    expect(matchesFreeTextQuery(CBT_STRUCTURED, "medicaid")).toBe(false);
    expect(matchesFreeTextQuery(CBT_STRUCTURED, "blue cross")).toBe(true);
  });

  it("matches a facility-type token", () => {
    expect(matchesFreeTextQuery(MAT_CLINIC, "outpatient program")).toBe(true);
  });
});

describe("publicSearchText — multi-token AND across fields", () => {
  it("lets one token come from the service list and another from the city", () => {
    expect(matchesFreeTextQuery(MAT_CLINIC, "detox chicago")).toBe(true);
  });

  it("fails the facility when ANY token matches nothing", () => {
    expect(matchesFreeTextQuery(MAT_CLINIC, "detox boston")).toBe(false);
    expect(matchesFreeTextQuery(MAT_CLINIC, "detox chicago unicorn")).toBe(false);
  });

  it("is order-independent", () => {
    expect(matchesFreeTextQuery(MAT_CLINIC, "chicago detox")).toBe(true);
  });
});

describe("publicSearchText — acronyms may not match inside unrelated words", () => {
  it("does not let `mat` match 'traumatic' / 'format' / 'automatic'", () => {
    expect(matchesFreeTextQuery(TRAUMA_ONLY, "mat")).toBe(false);
  });

  it("does let `mat` match the structured 'Medication-Assisted Treatment (MAT)' token", () => {
    expect(matchesFreeTextQuery(MAT_CLINIC, "mat")).toBe(true);
    expect(matchesFreeTextQuery(MAT_CLINIC, "MAT")).toBe(true);
  });

  it("does not let `iop` match 'biopsy' in narrative text", () => {
    const narrativeOnly = facility({
      name: "Plainfield Clinic",
      treatmentTypes: ["Detox"],
      description: "Biopsy referrals are not offered here.",
    });
    expect(matchesFreeTextQuery(narrativeOnly, "iop")).toBe(false);
  });

  it("does let `iop` match the structured 'Intensive Outpatient (IOP)' token", () => {
    expect(matchesFreeTextQuery(IOP_STRUCTURED, "iop")).toBe(true);
  });

  it("does let `cbt` match the structured CBT service label", () => {
    expect(matchesFreeTextQuery(CBT_STRUCTURED, "cbt")).toBe(true);
    expect(matchesFreeTextQuery(MAT_CLINIC, "cbt")).toBe(false);
  });

  it("does not let `pool` match the TAIL of 'carpool' / 'vanpool'", () => {
    expect(matchesFreeTextQuery(CARPOOL_TRAP, "pool")).toBe(false);
  });

  /**
   * Pinning the documented boundary, not an accident: a >=4-character token
   * IS allowed to prefix-match a description word, so "pool" reaches
   * "pooling". That is a word-prefix hit a reader can verify in the copy —
   * unlike the retired Amenities filter, which took the same substring and
   * published it as a structured "Swimming Pool" attribute of the facility.
   * Free-text membership may say "this word starts here"; it may not say
   * "this facility has a pool".
   */
  it("does let `pool` prefix-match 'pooling', and exposes it as text, not as an amenity", () => {
    expect(matchesFreeTextQuery(POOLING_PREFIX, "pool")).toBe(true);
    expect(matchesFreeTextQuery(POOLING_PREFIX, "swimming")).toBe(false);
  });
});

describe("publicSearchText — description fallback", () => {
  it("matches a long meaningful word that appears only in the description", () => {
    expect(matchesFreeTextQuery(DESCRIPTION_ONLY, "equine")).toBe(true);
  });

  it("matches a word PREFIX in the description, never mid-word", () => {
    // "program" is a prefix of "programming" → match.
    expect(matchesFreeTextQuery(DESCRIPTION_ONLY, "program")).toBe(true);
    // "ramming" sits inside "programming" → no match.
    expect(matchesFreeTextQuery(DESCRIPTION_ONLY, "ramming")).toBe(false);
  });

  it("refuses to let a 3-character token reach the description at all", () => {
    // "wee" prefixes "weekend" but is under the narrative threshold.
    expect(matchesFreeTextQuery(DESCRIPTION_ONLY, "wee")).toBe(false);
    // …while the 4-character form is allowed.
    expect(matchesFreeTextQuery(DESCRIPTION_ONLY, "week")).toBe(true);
  });
});

describe("publicSearchText — no fuzzy matching", () => {
  it("does not match a one-character typo (no Levenshtein)", () => {
    expect(matchesFreeTextQuery(MAT_CLINIC, "detux")).toBe(false);
    expect(matchesFreeTextQuery(MAT_CLINIC, "chicaog")).toBe(false);
    expect(matchesFreeTextQuery(MAT_CLINIC, "lakeshoer")).toBe(false);
  });

  it("does not match a transposed or truncated-then-extended token", () => {
    expect(matchesFreeTextQuery(CBT_STRUCTURED, "bct")).toBe(false);
  });
});

describe("publicSearchText — normalization", () => {
  it("ignores case, surrounding whitespace and trailing punctuation", () => {
    for (const q of ["  CHICAGO  ", "Chicago!", "chicago,"]) {
      expect(matchesFreeTextQuery(MAT_CLINIC, q)).toBe(true);
    }
  });

  it("matches a name containing a Unicode apostrophe from an ASCII query", () => {
    expect(matchesFreeTextQuery(APOSTROPHE_NAME, "mary's recovery")).toBe(true);
    expect(matchesFreeTextQuery(APOSTROPHE_NAME, "marys")).toBe(false);
  });
});

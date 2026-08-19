/**
 * PHASE 3A — ONE CANONICAL PUBLIC FILTER STATE.
 *
 * The contract under test:
 *
 *   ONE user search → ONE canonical filter state → ONE result set,
 *   with counts, chips, cards and the URL all describing that same set.
 *
 * The defect this replaces: `treatment`, `treatmentTypes` and `type` were
 * three INDEPENDENT, AND-ed treatment constraints, and `insurance` /
 * `insuranceTypes` two more. Only one of each pair was ever displayed, so a
 * stale link could narrow the result set by a filter no surface showed and no
 * control could remove.
 */

import { describe, expect, it } from "vitest";

import {
  ALL_PUBLIC_SEARCH_PARAMS,
  activeFilterCount,
  canonicalizeSearchParams,
  clearAllSearchParams,
  insuranceLabel,
  parsePublicSearchState,
  treatmentLabel,
  TYPE_PRESETS,
} from "@/lib/publicSearchState";

const parse = (qs: string) => parsePublicSearchState(new URLSearchParams(qs));
const treatmentOf = (qs: string) => parse(qs).treatment.values;
const insuranceOf = (qs: string) => parse(qs).insurance.values;

describe("publicSearchState — treatment precedence", () => {
  it("reads the canonical `treatmentTypes` param", () => {
    expect(treatmentOf("treatmentTypes=detox")).toEqual(["detox"]);
    expect(treatmentOf("treatmentTypes=detox,outpatient")).toEqual(["detox", "outpatient"]);
  });

  it("reads the legacy `treatment` param when the canonical one is absent", () => {
    expect(treatmentOf("treatment=detox")).toEqual(["detox"]);
    expect(parse("treatment=detox").treatment.source).toBe("legacy");
  });

  it("accepts a legacy param written as a human LABEL, as old links do", () => {
    // e.g. FentanylRehabNearMe links `?treatment=Detox`.
    expect(treatmentOf("treatment=Detox")).toEqual(["detox"]);
    expect(treatmentOf("treatment=Dual%20Diagnosis")).toEqual(["dual-diagnosis"]);
  });

  it("lets the canonical param WIN when both are present — never ANDs them", () => {
    const values = treatmentOf("treatment=detox&treatmentTypes=outpatient");
    expect(values).toEqual(["outpatient"]);
    expect(values).not.toContain("detox");
    expect(parse("treatment=detox&treatmentTypes=outpatient").treatment.source).toBe("canonical");
  });

  it("lets the canonical param win over a `type=` preset too", () => {
    expect(treatmentOf("type=residential&treatmentTypes=outpatient")).toEqual(["outpatient"]);
  });

  it("lets the legacy param win over a `type=` preset", () => {
    expect(treatmentOf("type=residential&treatment=outpatient")).toEqual(["outpatient"]);
  });

  it("falls through to the legacy param when the canonical one holds only junk", () => {
    expect(treatmentOf("treatmentTypes=defunct-old-filter&treatment=detox")).toEqual(["detox"]);
  });

  it("de-duplicates values that resolve to the same canonical filter", () => {
    // "residential" is a documented alias of "inpatient".
    expect(treatmentOf("treatmentTypes=inpatient,residential,Inpatient")).toEqual(["inpatient"]);
  });
});

describe("publicSearchState — insurance precedence", () => {
  it("reads the canonical `insuranceTypes` param", () => {
    expect(insuranceOf("insuranceTypes=medicaid")).toEqual(["medicaid"]);
    expect(insuranceOf("insuranceTypes=medicaid,private-pay")).toEqual(["medicaid", "private-pay"]);
  });

  it("reads the legacy `insurance` param when the canonical one is absent", () => {
    expect(insuranceOf("insurance=medicaid")).toEqual(["medicaid"]);
    expect(insuranceOf("insurance=Medicaid")).toEqual(["medicaid"]);
  });

  it("lets the canonical param WIN when both are present — never ANDs them", () => {
    const values = insuranceOf("insurance=aetna&insuranceTypes=medicaid");
    expect(values).toEqual(["medicaid"]);
    expect(values).not.toContain("aetna");
  });
});

describe("publicSearchState — legacy `type=` presets", () => {
  it("maps type=residential onto the canonical inpatient filter", () => {
    expect(treatmentOf("type=residential")).toEqual(["inpatient"]);
  });

  it("maps type=outpatient onto the canonical outpatient filter", () => {
    expect(treatmentOf("type=outpatient")).toEqual(["outpatient"]);
  });

  it("maps type=mental-health onto the canonical dual-diagnosis filter", () => {
    expect(treatmentOf("type=mental-health")).toEqual(["dual-diagnosis"]);
  });

  it("maps type=drug and type=alcohol onto Detox / Inpatient / Outpatient", () => {
    expect(treatmentOf("type=drug")).toEqual(["detox", "inpatient", "outpatient"]);
    expect(treatmentOf("type=alcohol")).toEqual(["detox", "inpatient", "outpatient"]);
  });

  /**
   * Preserved AS FOUND, not endorsed. `type=holistic` has always mapped to
   * inpatient + outpatient, which is a pre-existing mapping defect — but
   * treatment membership is frozen for this phase, so the mapping stands and
   * the UI now REVEALS both presets instead of hiding them.
   */
  it("preserves the pre-existing type=holistic mapping verbatim", () => {
    expect(treatmentOf("type=holistic")).toEqual(["inpatient", "outpatient"]);
  });

  it("marks a `type=` source so the UI can reveal the resulting preset", () => {
    expect(parse("type=residential").treatment.source).toBe("type-preset");
  });

  it("treats an unknown `type=` as unsupported input, not as a filter", () => {
    expect(treatmentOf("type=made-up")).toEqual([]);
    expect(parse("type=made-up").treatment.unsupported).toContain("made-up");
  });

  it("keeps every preset target a REAL canonical treatment value", () => {
    for (const [preset, values] of Object.entries(TYPE_PRESETS)) {
      for (const value of values) {
        expect(treatmentLabel(value), `${preset} → ${value}`).not.toBe(value);
      }
    }
  });
});

describe("publicSearchState — unknown / stale values are inert, never zeroing", () => {
  it("ignores an unknown treatment value instead of failing every facility", () => {
    const state = parse("treatmentTypes=defunct-old-filter");
    expect(state.treatment.values).toEqual([]);
    expect(state.treatment.unsupported).toEqual(["defunct-old-filter"]);
    expect(activeFilterCount(state)).toBe(0);
  });

  it("ignores an unknown insurance value the same way", () => {
    const state = parse("insuranceTypes=bogus-payer");
    expect(state.insurance.values).toEqual([]);
    expect(state.insurance.unsupported).toEqual(["bogus-payer"]);
  });

  it("keeps the VALID values from a mixed list and drops only the junk", () => {
    const state = parse("treatmentTypes=detox,defunct-old-filter,outpatient");
    expect(state.treatment.values).toEqual(["detox", "outpatient"]);
    expect(state.treatment.unsupported).toEqual(["defunct-old-filter"]);
  });

  it("never guesses an unknown value into another category", () => {
    // "medicaid" is an INSURANCE value; asked for as a treatment it resolves
    // to nothing rather than being re-homed.
    expect(treatmentOf("treatmentTypes=medicaid")).toEqual([]);
    expect(insuranceOf("insuranceTypes=detox")).toEqual([]);
  });

  it("does not count an unsupported value as an active filter", () => {
    expect(activeFilterCount(parse("treatmentTypes=nope&insuranceTypes=nope"))).toBe(0);
  });
});

describe("publicSearchState — active filter count is canonical", () => {
  it("counts one dimension once even when three spellings are present", () => {
    expect(
      activeFilterCount(parse("treatment=detox&treatmentTypes=detox&type=residential")),
    ).toBe(1);
  });

  it("counts both quick filters", () => {
    expect(activeFilterCount(parse("verified=true&featuredOnly=true"))).toBe(2);
  });

  it("does not count location, free text or state as filter chips", () => {
    expect(activeFilterCount(parse("location=Chicago,%20IL&q=detox&state=IL"))).toBe(0);
  });
});

describe("publicSearchState — canonicalizeSearchParams (every user interaction)", () => {
  it("writes the canonical param and DELETES the legacy treatment spelling", () => {
    const next = canonicalizeSearchParams(new URLSearchParams("treatment=detox"));
    expect(next.get("treatmentTypes")).toBe("detox");
    expect(next.get("treatment")).toBeNull();
  });

  it("deletes `type=` once the preset has been written canonically", () => {
    const next = canonicalizeSearchParams(new URLSearchParams("type=residential"));
    expect(next.get("treatmentTypes")).toBe("inpatient");
    expect(next.get("type")).toBeNull();
  });

  it("deletes the legacy insurance spelling", () => {
    const next = canonicalizeSearchParams(new URLSearchParams("insurance=Medicaid"));
    expect(next.get("insuranceTypes")).toBe("medicaid");
    expect(next.get("insurance")).toBeNull();
  });

  it("drops stale unsupported values from the canonical param", () => {
    const next = canonicalizeSearchParams(
      new URLSearchParams("treatmentTypes=detox,defunct-old-filter"),
    );
    expect(next.get("treatmentTypes")).toBe("detox");
  });

  it("removes an unsupported-only dimension entirely", () => {
    const next = canonicalizeSearchParams(new URLSearchParams("treatmentTypes=defunct"));
    expect(next.get("treatmentTypes")).toBeNull();
  });

  it("deletes the inert `amenities` and `distance` leftovers", () => {
    const next = canonicalizeSearchParams(
      new URLSearchParams("location=Chicago&amenities=pool&distance=25"),
    );
    expect(next.get("amenities")).toBeNull();
    expect(next.get("distance")).toBeNull();
    expect(next.get("location")).toBe("Chicago");
  });

  it("resets pagination because the result set just changed", () => {
    const next = canonicalizeSearchParams(new URLSearchParams("page=4&treatmentTypes=detox"));
    expect(next.get("page")).toBeNull();
  });

  it("preserves location, free text, state, sort and the quick filters", () => {
    const next = canonicalizeSearchParams(
      new URLSearchParams("location=Chicago,%20IL&q=detox&state=IL&sort=name-asc&verified=true"),
    );
    expect(next.get("location")).toBe("Chicago, IL");
    expect(next.get("q")).toBe("detox");
    expect(next.get("state")).toBe("IL");
    expect(next.get("sort")).toBe("name-asc");
    expect(next.get("verified")).toBe("true");
  });

  it("applies an explicit override to one dimension only", () => {
    const next = canonicalizeSearchParams(
      new URLSearchParams("treatmentTypes=detox&insuranceTypes=medicaid"),
      { treatment: ["outpatient", "mat"] },
    );
    expect(next.get("treatmentTypes")).toBe("outpatient,mat");
    expect(next.get("insuranceTypes")).toBe("medicaid");
  });

  it("clears a dimension when the override is empty", () => {
    const next = canonicalizeSearchParams(
      new URLSearchParams("treatmentTypes=detox&insuranceTypes=medicaid"),
      { treatment: [] },
    );
    expect(next.get("treatmentTypes")).toBeNull();
    expect(next.get("insuranceTypes")).toBe("medicaid");
  });

  it("is idempotent — canonicalizing twice changes nothing further", () => {
    const once = canonicalizeSearchParams(
      new URLSearchParams("treatment=detox&type=residential&amenities=pool&page=3"),
    );
    const twice = canonicalizeSearchParams(once);
    expect(twice.toString()).toBe(once.toString());
  });
});

describe("publicSearchState — clear all", () => {
  const EVERYTHING =
    "location=Chicago,%20IL&q=detox&state=IL&treatmentTypes=detox&insuranceTypes=medicaid" +
    "&treatment=inpatient&insurance=aetna&type=residential&verified=true&featuredOnly=true" +
    "&amenities=pool&distance=25&page=3&sort=name-asc";

  it("removes every public refinement, including the hidden legacy ones", () => {
    const cleared = clearAllSearchParams(new URLSearchParams(EVERYTHING));
    for (const key of ALL_PUBLIC_SEARCH_PARAMS) {
      expect(cleared.get(key), `${key} survived clear-all`).toBeNull();
    }
    expect(activeFilterCount(parsePublicSearchState(cleared))).toBe(0);
  });

  it("leaves a non-filter param (e.g. the 404 referral tag) alone", () => {
    const cleared = clearAllSearchParams(new URLSearchParams(`${EVERYTHING}&from=404`));
    expect(cleared.get("from")).toBe("404");
  });
});

describe("publicSearchState — labels", () => {
  it("resolves canonical values to their human labels for chips", () => {
    expect(treatmentLabel("dual-diagnosis")).toBe("Dual Diagnosis");
    expect(treatmentLabel("inpatient")).toBe("Inpatient / Residential");
    expect(insuranceLabel("private-pay")).toBe("Self-Pay / Private Pay");
    expect(insuranceLabel("bcbs")).toBe("Blue Cross Blue Shield");
  });

  it("falls back to the raw value rather than throwing on an unknown one", () => {
    expect(treatmentLabel("nope")).toBe("nope");
    expect(insuranceLabel("nope")).toBe("nope");
  });
});

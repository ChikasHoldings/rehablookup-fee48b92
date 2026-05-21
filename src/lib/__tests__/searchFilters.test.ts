import { describe, expect, it } from "vitest";
import {
  matchesTreatmentFilter,
  matchesInsuranceFilter,
  countTreatmentFacets,
  countInsuranceFacets,
  TREATMENT_FILTERS,
  INSURANCE_FILTERS,
  type SearchableFacility,
} from "../searchFilters";

const make = (overrides: Partial<SearchableFacility> = {}): SearchableFacility => ({
  treatmentTypes: [],
  insuranceAccepted: [],
  description: null,
  facilityType: null,
  ...overrides,
});

describe("searchFilters — insurance matching (F1 regression)", () => {
  // F1: the highest-coverage value in `facility_insurance` is
  // "Self-Pay/Private Pay" (no spaces). The prior matcher compared against
  // the UI label "Self-Pay / Private Pay" (with spaces) which never
  // resolved, silently excluding ~2,918 facilities.
  it("matches 'private-pay' against catalog string 'Self-Pay/Private Pay' (no spaces)", () => {
    const f = make({ insuranceAccepted: ["Self-Pay/Private Pay"] });
    expect(matchesInsuranceFilter(f, "private-pay")).toBe(true);
  });

  it("matches 'private-pay' against label 'Self-Pay / Private Pay' (with spaces)", () => {
    const f = make({ insuranceAccepted: ["Self-Pay / Private Pay"] });
    expect(matchesInsuranceFilter(f, "private-pay")).toBe(true);
  });

  it("matches 'private-pay' against alias 'Private Pay'", () => {
    const f = make({ insuranceAccepted: ["Private Pay"] });
    expect(matchesInsuranceFilter(f, "private-pay")).toBe(true);
  });

  it("matches 'bcbs' against 'Blue Cross Blue Shield'", () => {
    expect(matchesInsuranceFilter(make({ insuranceAccepted: ["Blue Cross Blue Shield"] }), "bcbs")).toBe(true);
  });

  it("matches 'bcbs' against alias 'BCBS'", () => {
    expect(matchesInsuranceFilter(make({ insuranceAccepted: ["BCBS"] }), "bcbs")).toBe(true);
  });

  it("matches 'united' against 'United Healthcare' / 'UnitedHealthcare' / 'UHC'", () => {
    expect(matchesInsuranceFilter(make({ insuranceAccepted: ["United Healthcare"] }), "united")).toBe(true);
    expect(matchesInsuranceFilter(make({ insuranceAccepted: ["UnitedHealthcare"] }), "united")).toBe(true);
    expect(matchesInsuranceFilter(make({ insuranceAccepted: ["UHC"] }), "united")).toBe(true);
  });

  it("matches 'medicaid' against state-Medicaid alias 'Medi-Cal'", () => {
    expect(matchesInsuranceFilter(make({ insuranceAccepted: ["Medi-Cal"] }), "medicaid")).toBe(true);
  });

  it("does not falsely match unrelated insurers", () => {
    const f = make({ insuranceAccepted: ["Medicare"] });
    expect(matchesInsuranceFilter(f, "medicaid")).toBe(false);
    expect(matchesInsuranceFilter(f, "aetna")).toBe(false);
  });

  it("returns false on a facility with no insurance data", () => {
    expect(matchesInsuranceFilter(make({ insuranceAccepted: [] }), "medicaid")).toBe(false);
  });

  it("returns true when no filter is requested (empty string)", () => {
    expect(matchesInsuranceFilter(make(), "")).toBe(true);
  });

  it("returns false for an unknown filter value", () => {
    expect(matchesInsuranceFilter(make({ insuranceAccepted: ["Medicaid"] }), "not-a-real-filter")).toBe(false);
  });
});

describe("searchFilters — treatment matching (F2, F3 regressions)", () => {
  // F2: production catalog has zero rows tagged `Inpatient` or `Residential`
  // in `facility_services`; the only signal is `facility_type =
  // 'Residential Treatment Center'`. The fallback chain must surface those.
  it("matches 'inpatient' via facility_type='Residential Treatment Center'", () => {
    const f = make({ facilityType: "Residential Treatment Center", treatmentTypes: ["Outpatient"] });
    expect(matchesTreatmentFilter(f, "inpatient")).toBe(true);
  });

  it("matches 'inpatient' even when facility_type uses 'Residential'", () => {
    expect(matchesTreatmentFilter(make({ facilityType: "Residential" }), "inpatient")).toBe(true);
  });

  it("does not falsely match 'inpatient' for an Outpatient Program facility_type", () => {
    expect(matchesTreatmentFilter(make({ facilityType: "Outpatient Program", treatmentTypes: ["Outpatient"] }), "inpatient")).toBe(false);
  });

  // F3: catalog has no "Holistic" service rows. Description fallback recovers
  // facilities that mention yoga/meditation/mindfulness in their narrative.
  it("matches 'holistic' via description keywords", () => {
    expect(matchesTreatmentFilter(make({ description: "We offer yoga, meditation, and equine therapy." }), "holistic")).toBe(true);
    expect(matchesTreatmentFilter(make({ description: "Holistic, mindfulness-based recovery program." }), "holistic")).toBe(true);
  });

  it("does not match 'holistic' on a generic description", () => {
    expect(matchesTreatmentFilter(make({ description: "Substance use disorder treatment center." }), "holistic")).toBe(false);
  });

  it("matches 'detox' via service_name 'Detoxification'", () => {
    expect(matchesTreatmentFilter(make({ treatmentTypes: ["Detoxification"] }), "detox")).toBe(true);
  });

  it("matches 'outpatient' via 'Intensive Outpatient (IOP)' service", () => {
    expect(matchesTreatmentFilter(make({ treatmentTypes: ["Intensive Outpatient (IOP)"] }), "outpatient")).toBe(true);
  });

  it("matches 'outpatient' via 'Partial Hospitalization (PHP)' service", () => {
    expect(matchesTreatmentFilter(make({ treatmentTypes: ["Partial Hospitalization (PHP)"] }), "outpatient")).toBe(true);
  });

  it("matches 'dual-diagnosis' via service_name 'Dual Diagnosis'", () => {
    expect(matchesTreatmentFilter(make({ treatmentTypes: ["Dual Diagnosis"] }), "dual-diagnosis")).toBe(true);
  });

  it("returns true when no filter is requested", () => {
    expect(matchesTreatmentFilter(make(), "")).toBe(true);
  });

  it("supports legacy URL aliases (iop, php, mental-health, residential)", () => {
    expect(matchesTreatmentFilter(make({ treatmentTypes: ["Intensive Outpatient (IOP)"] }), "iop")).toBe(true);
    expect(matchesTreatmentFilter(make({ treatmentTypes: ["Partial Hospitalization (PHP)"] }), "php")).toBe(true);
    expect(matchesTreatmentFilter(make({ treatmentTypes: ["Dual Diagnosis"] }), "mental-health")).toBe(true);
    expect(matchesTreatmentFilter(make({ facilityType: "Residential Treatment Center" }), "residential")).toBe(true);
  });

  it("matches the new MAT, CBT, Trauma, Aftercare, 12-Step, Family options", () => {
    expect(matchesTreatmentFilter(make({ treatmentTypes: ["Medication-Assisted Treatment (MAT)"] }), "mat")).toBe(true);
    expect(matchesTreatmentFilter(make({ treatmentTypes: ["Cognitive Behavioral Therapy (CBT)"] }), "cbt")).toBe(true);
    expect(matchesTreatmentFilter(make({ treatmentTypes: ["Trauma Therapy"] }), "trauma")).toBe(true);
    expect(matchesTreatmentFilter(make({ treatmentTypes: ["Aftercare/Continuing Care"] }), "aftercare")).toBe(true);
    expect(matchesTreatmentFilter(make({ treatmentTypes: ["12-Step Programs"] }), "twelve-step")).toBe(true);
    expect(matchesTreatmentFilter(make({ treatmentTypes: ["Family Therapy"] }), "family")).toBe(true);
  });
});

describe("searchFilters — facet counts", () => {
  const fixtures: SearchableFacility[] = [
    make({ treatmentTypes: ["Detoxification"], insuranceAccepted: ["Medicaid", "Self-Pay/Private Pay"] }),
    make({ treatmentTypes: ["Outpatient", "Dual Diagnosis"], insuranceAccepted: ["Medicaid"] }),
    make({
      facilityType: "Residential Treatment Center",
      treatmentTypes: [],
      insuranceAccepted: ["Self-Pay/Private Pay", "BCBS"],
    }),
    make({ description: "Holistic recovery with yoga and meditation.", insuranceAccepted: ["Medicare"] }),
  ];

  it("counts treatment facets across the canonical filter set", () => {
    const counts = countTreatmentFacets(fixtures);
    expect(counts.detox).toBe(1);
    expect(counts.inpatient).toBe(1); // via facility_type
    expect(counts.outpatient).toBe(1);
    expect(counts["dual-diagnosis"]).toBe(1);
    expect(counts.holistic).toBe(1); // via description
  });

  it("counts insurance facets correctly", () => {
    const counts = countInsuranceFacets(fixtures);
    expect(counts.medicaid).toBe(2);
    expect(counts.medicare).toBe(1);
    expect(counts["private-pay"]).toBe(2); // both Self-Pay/Private Pay rows match
    expect(counts.bcbs).toBe(1);
  });

  it("returns a zero entry for every defined filter (no `undefined`)", () => {
    const counts = countTreatmentFacets([]);
    for (const opt of TREATMENT_FILTERS) {
      expect(counts[opt.value]).toBe(0);
    }
    const insCounts = countInsuranceFacets([]);
    for (const opt of INSURANCE_FILTERS) {
      expect(insCounts[opt.value]).toBe(0);
    }
  });
});

describe("searchFilters — label + alias resolution", () => {
  // The hero SearchForm + sticky SearchResultsForm legacy-write human labels
  // straight into URL params (e.g. ?treatment=Detox). The matcher must
  // accept those without requiring every URL-writer to migrate.
  it("matches treatment by display label 'Detox'", () => {
    expect(matchesTreatmentFilter(make({ treatmentTypes: ["Detoxification"] }), "Detox")).toBe(true);
  });

  it("matches treatment by display label 'Inpatient' → routes to facility_type fallback", () => {
    expect(matchesTreatmentFilter(make({ facilityType: "Residential Treatment Center" }), "Inpatient")).toBe(true);
  });

  it("matches treatment by mixed-case + extra spaces ('Dual Diagnosis')", () => {
    expect(matchesTreatmentFilter(make({ treatmentTypes: ["Dual Diagnosis"] }), "Dual Diagnosis")).toBe(true);
  });

  it("matches insurance by display label 'Blue Cross Blue Shield'", () => {
    expect(matchesInsuranceFilter(make({ insuranceAccepted: ["Blue Cross Blue Shield"] }), "Blue Cross Blue Shield")).toBe(true);
  });

  it("matches insurance alias 'bluecross' (legacy SeekerSearch URL)", () => {
    expect(matchesInsuranceFilter(make({ insuranceAccepted: ["Blue Cross Blue Shield"] }), "bluecross")).toBe(true);
  });

  it("matches insurance alias 'UHC' / 'unitedhealthcare'", () => {
    expect(matchesInsuranceFilter(make({ insuranceAccepted: ["UnitedHealthcare"] }), "UHC")).toBe(true);
    expect(matchesInsuranceFilter(make({ insuranceAccepted: ["United Healthcare"] }), "unitedhealthcare")).toBe(true);
  });

  it("matches insurance by display label 'TRICARE'", () => {
    expect(matchesInsuranceFilter(make({ insuranceAccepted: ["Tricare"] }), "TRICARE")).toBe(true);
  });

  it("returns false on a string that resolves to no filter", () => {
    expect(matchesTreatmentFilter(make({ treatmentTypes: ["Detox"] }), "completely-fake-treatment")).toBe(false);
    expect(matchesInsuranceFilter(make({ insuranceAccepted: ["Medicaid"] }), "fake-insurer")).toBe(false);
  });
});

describe("searchFilters — canonical option lists", () => {
  it("has exactly one entry per documented treatment value", () => {
    const values = TREATMENT_FILTERS.map((o) => o.value);
    expect(new Set(values).size).toBe(values.length);
    expect(values).toEqual(
      expect.arrayContaining([
        "detox",
        "inpatient",
        "outpatient",
        "dual-diagnosis",
        "holistic",
        "mat",
        "cbt",
        "trauma",
        "aftercare",
        "twelve-step",
        "family",
      ]),
    );
  });

  it("has exactly one entry per documented insurance value", () => {
    const values = INSURANCE_FILTERS.map((o) => o.value);
    expect(new Set(values).size).toBe(values.length);
    expect(values).toEqual(
      expect.arrayContaining([
        "aetna",
        "bcbs",
        "cigna",
        "united",
        "kaiser",
        "humana",
        "anthem",
        "medicare",
        "medicaid",
        "tricare",
        "private-pay",
        "sliding-scale",
      ]),
    );
  });
});

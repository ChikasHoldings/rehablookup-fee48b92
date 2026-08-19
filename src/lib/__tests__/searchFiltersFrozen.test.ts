/**
 * PHASE 3A — TREATMENT / INSURANCE DEFINITIONS ARE FROZEN.
 *
 * Phase 3A routes MORE callers through the shared matchers (the legacy
 * `?type=` presets in particular, which used to do raw `includes()` checks on
 * service names). It must not change what those matchers MEAN.
 *
 * This is a structural snapshot of every semantic field of every filter:
 * value, label, `serviceMatches`, `facilityTypeMatches`, `descriptionMatches`,
 * insurance `matches`, and both alias maps. Any edit to a matching rule —
 * adding a pattern, removing one, renaming a value, retargeting an alias —
 * fails here with a diff naming exactly what moved.
 *
 * KNOWN DEFECTS DELIBERATELY PINNED AS-IS, all deferred past Phase 3A:
 *   • `tricare` matches "VA" / "Veterans Affairs" — TRICARE and VA are
 *     different programs.
 *   • `outpatient` swallows IOP and PHP, which are distinct levels of care.
 *   • `cbt` swallows DBT and Dialectical Behavior.
 *   • `holistic` infers membership from description keywords.
 * Pinning them is the point: this file records what the definitions ARE
 * today, so a future phase that fixes one has to do it deliberately.
 */

import { describe, expect, it } from "vitest";

import {
  INSURANCE_FILTERS,
  INSURANCE_FILTER_ALIASES,
  TREATMENT_FILTERS,
  TREATMENT_FILTER_ALIASES,
  matchesInsuranceFilter,
  matchesTreatmentFilter,
} from "@/lib/searchFilters";

describe("Phase 3A invariant — TREATMENT_FILTERS definitions unchanged", () => {
  it("matches the recorded snapshot exactly", () => {
    const snapshot = TREATMENT_FILTERS.map((o) => ({
      value: o.value,
      label: o.label,
      serviceMatches: [...o.serviceMatches],
      facilityTypeMatches: o.facilityTypeMatches ? [...o.facilityTypeMatches] : undefined,
      descriptionMatches: o.descriptionMatches ? [...o.descriptionMatches] : undefined,
    }));

    expect(snapshot).toEqual([
      {
        value: "detox",
        label: "Detox",
        serviceMatches: ["Detox", "Detoxification", "Withdrawal Management"],
        facilityTypeMatches: ["Detox Center"],
        descriptionMatches: undefined,
      },
      {
        value: "inpatient",
        label: "Inpatient / Residential",
        serviceMatches: ["Inpatient", "Residential"],
        facilityTypeMatches: ["Residential Treatment Center", "Residential", "Inpatient"],
        descriptionMatches: undefined,
      },
      {
        value: "outpatient",
        label: "Outpatient",
        // DEFERRED DEFECT: IOP and PHP are folded into Outpatient.
        serviceMatches: [
          "Outpatient",
          "Intensive Outpatient (IOP)",
          "Partial Hospitalization (PHP)",
          "IOP",
          "PHP",
        ],
        facilityTypeMatches: [
          "Outpatient Program",
          "Intensive Outpatient (IOP)",
          "Partial Hospitalization (PHP)",
        ],
        descriptionMatches: undefined,
      },
      {
        value: "dual-diagnosis",
        label: "Dual Diagnosis",
        serviceMatches: ["Dual Diagnosis", "Co-Occurring", "Co-occurring"],
        facilityTypeMatches: ["Dual Diagnosis"],
        descriptionMatches: ["mental health", "co-occurring"],
      },
      {
        value: "holistic",
        label: "Holistic Therapy",
        serviceMatches: ["Holistic", "Holistic Therapy"],
        facilityTypeMatches: undefined,
        // DEFERRED DEFECT: membership inferred from narrative keywords.
        descriptionMatches: [
          "yoga",
          "meditation",
          "mindfulness",
          "art therapy",
          "equine",
          "holistic",
        ],
      },
      {
        value: "mat",
        label: "Medication-Assisted (MAT)",
        serviceMatches: [
          "Medication-Assisted Treatment (MAT)",
          "Medication Assisted",
          "MAT",
          "Suboxone",
          "Methadone",
          "Vivitrol",
        ],
        facilityTypeMatches: undefined,
        descriptionMatches: undefined,
      },
      {
        value: "cbt",
        label: "Cognitive Behavioral (CBT)",
        // DEFERRED DEFECT: DBT is folded into CBT.
        serviceMatches: [
          "Cognitive Behavioral Therapy (CBT)",
          "Cognitive Behavioral",
          "CBT",
          "DBT",
          "Dialectical Behavior",
        ],
        facilityTypeMatches: undefined,
        descriptionMatches: undefined,
      },
      {
        value: "trauma",
        label: "Trauma Therapy",
        serviceMatches: ["Trauma Therapy", "Trauma-Informed", "EMDR", "PTSD"],
        facilityTypeMatches: undefined,
        descriptionMatches: undefined,
      },
      {
        value: "aftercare",
        label: "Aftercare / Continuing Care",
        serviceMatches: ["Aftercare/Continuing Care", "Aftercare", "Continuing Care", "Alumni"],
        facilityTypeMatches: undefined,
        descriptionMatches: undefined,
      },
      {
        value: "twelve-step",
        label: "12-Step Programs",
        serviceMatches: [
          "12-Step Programs",
          "12-Step",
          "12 Step",
          "AA",
          "Alcoholics Anonymous",
          "NA",
          "Narcotics Anonymous",
        ],
        facilityTypeMatches: undefined,
        descriptionMatches: undefined,
      },
      {
        value: "family",
        label: "Family Therapy",
        serviceMatches: ["Family Therapy", "Family Counseling", "Family Program"],
        facilityTypeMatches: undefined,
        descriptionMatches: undefined,
      },
    ]);
  });
});

describe("Phase 3A invariant — INSURANCE_FILTERS definitions unchanged", () => {
  it("matches the recorded snapshot exactly", () => {
    const snapshot = INSURANCE_FILTERS.map((o) => ({
      value: o.value,
      label: o.label,
      matches: [...o.matches],
    }));

    expect(snapshot).toEqual([
      { value: "aetna", label: "Aetna", matches: ["Aetna"] },
      {
        value: "bcbs",
        label: "Blue Cross Blue Shield",
        matches: [
          "Blue Cross Blue Shield",
          "BCBS",
          "Blue Cross",
          "BlueCross",
          "Anthem Blue Cross",
          "Empire Blue",
          "Highmark",
        ],
      },
      { value: "cigna", label: "Cigna", matches: ["Cigna", "Evernorth"] },
      {
        value: "united",
        label: "United Healthcare",
        matches: ["United Healthcare", "UnitedHealthcare", "United Health", "UHC", "Optum"],
      },
      { value: "kaiser", label: "Kaiser Permanente", matches: ["Kaiser Permanente", "Kaiser"] },
      { value: "humana", label: "Humana", matches: ["Humana"] },
      { value: "anthem", label: "Anthem", matches: ["Anthem", "Anthem Blue Cross"] },
      { value: "medicare", label: "Medicare", matches: ["Medicare"] },
      {
        value: "medicaid",
        label: "Medicaid",
        matches: ["Medicaid", "Medi-Cal", "AHCCCS", "MassHealth", "Apple Health"],
      },
      {
        value: "tricare",
        label: "TRICARE",
        // DEFERRED DEFECT: VA is a separate system from TRICARE.
        matches: ["Tricare", "TRICARE", "VA", "Veterans Affairs", "VA Healthcare"],
      },
      {
        value: "private-pay",
        label: "Self-Pay / Private Pay",
        matches: [
          "Self-Pay/Private Pay",
          "Self-Pay",
          "Private Pay",
          "Self Pay",
          "Out of Pocket",
          "Cash Pay",
        ],
      },
      {
        value: "sliding-scale",
        label: "Sliding Scale / Financial Assistance",
        matches: [
          "Sliding Scale/Financial Assistance",
          "Sliding Scale",
          "Financial Assistance",
          "Scholarship",
        ],
      },
    ]);
  });
});

describe("Phase 3A invariant — alias maps unchanged", () => {
  it("keeps the treatment aliases pointing at the same canonical values", () => {
    expect({ ...TREATMENT_FILTER_ALIASES }).toEqual({
      iop: "outpatient",
      php: "outpatient",
      "mental-health": "dual-diagnosis",
      residential: "inpatient",
    });
  });

  it("keeps the insurance aliases pointing at the same canonical values", () => {
    expect({ ...INSURANCE_FILTER_ALIASES }).toEqual({
      bluecross: "bcbs",
      "blue-cross": "bcbs",
      uhc: "united",
      unitedhealthcare: "united",
      "united-healthcare": "united",
      vahealthcare: "tricare",
      va: "tricare",
    });
  });
});

/**
 * Behavioural spot-checks over the SAME rules — a snapshot of the data alone
 * would still pass if someone rewrote the matcher functions around it.
 */
describe("Phase 3A invariant — matcher BEHAVIOUR unchanged", () => {
  const f = (over: Partial<Parameters<typeof matchesTreatmentFilter>[0]> = {}) => ({
    treatmentTypes: [],
    insuranceAccepted: [],
    description: null,
    facilityType: null,
    ...over,
  });

  it("still resolves inpatient through the facility_type fallback", () => {
    expect(
      matchesTreatmentFilter(f({ facilityType: "Residential Treatment Center" }), "inpatient"),
    ).toBe(true);
  });

  it("still resolves holistic through the description fallback", () => {
    expect(matchesTreatmentFilter(f({ description: "Daily yoga and meditation." }), "holistic")).toBe(
      true,
    );
  });

  it("still folds cosmetic whitespace on the private-pay label", () => {
    expect(
      matchesInsuranceFilter(f({ insuranceAccepted: ["Self-Pay/Private Pay"] }), "private-pay"),
    ).toBe(true);
  });

  it("still treats an unresolvable filter value as a non-match at the matcher level", () => {
    // The MATCHER keeps returning false for junk — the page-level contract
    // that junk must not zero the catalogue is enforced upstream, in
    // publicSearchState, by never passing junk to the matcher at all.
    expect(matchesTreatmentFilter(f({ treatmentTypes: ["Detox"] }), "defunct-old-filter")).toBe(
      false,
    );
  });

  it("still returns true for an empty filter value", () => {
    expect(matchesTreatmentFilter(f(), "")).toBe(true);
    expect(matchesInsuranceFilter(f(), "")).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import {
  credentialFaqAnswer,
  facilityProvenance,
  findFacilitySchemaViolations,
  presentListingDescription,
  provenanceNotice,
} from "../facilityTruth.mjs";
import { generateLocalBusinessSchema } from "@/components/SEO";

const IMPORTED_DESCRIPTION =
  "Nebraska Urban Indian Health Coalition is a licensed addiction treatment provider in Omaha, Nebraska. " +
  "The facility is recognized by CARF International and State Substance Use Treatment Agency. " +
  "Verify insurance coverage and learn about admissions by contacting the center directly.";

const baseFacility = {
  name: "Example Recovery Center",
  address: "1 Main St",
  city: "Omaha",
  state: "Nebraska",
  zipCode: "68102",
  phone: "",
  description: "Example description.",
  services: ["Outpatient", "Medication-Assisted Treatment (MAT)"],
  insurance: ["Medicaid", "Self-Pay/Private Pay"],
  accreditations: ["CARF International"],
  slug: "example-recovery-center-omaha-ne-12345678",
};

describe("facility provenance", () => {
  it("classifies SAMHSA imports, claimed listings and staff entries", () => {
    expect(facilityProvenance({ data_source: "samhsa_import", is_claimed: false })).toBe("government_directory");
    expect(facilityProvenance({ data_source: "samhsa_import", is_claimed: true })).toBe("provider");
    expect(facilityProvenance({ data_source: "admin_created" })).toBe("staff_entered");
  });

  it("never describes a listing as verified by RehabLookup", () => {
    for (const f of [
      { data_source: "samhsa_import" },
      { data_source: "samhsa_import", is_claimed: true },
      { data_source: "self_listed" },
    ]) {
      const notice = provenanceNotice(f);
      expect(notice).toMatch(/not independently verified/i);
      expect(notice).not.toMatch(/verified by RehabLookup(?! )/i);
    }
    expect(provenanceNotice({ data_source: "samhsa_import" })).toMatch(/SAMHSA's FindTreatment\.gov/);
  });

  it("rewrites only the importer's licensed / recognized phrasing", () => {
    const out = presentListingDescription(IMPORTED_DESCRIPTION);
    expect(out).not.toMatch(/is a licensed addiction treatment provider/);
    expect(out).not.toMatch(/The facility is recognized by/);
    expect(out).toContain("is an addiction treatment provider in Omaha, Nebraska.");
    expect(out).toContain("Its SAMHSA listing reports licensing or accreditation from CARF International");
    expect(out).toContain("Verify insurance coverage and learn about admissions");
    expect(presentListingDescription("A facility-written description.")).toBe("A facility-written description.");
  });

  it("words the credential FAQ by source and never answers a bare 'Yes'", () => {
    const a = credentialFaqAnswer("Example", ["CARF International"], { data_source: "samhsa_import" });
    expect(a).toMatch(/^According to its listing in SAMHSA's FindTreatment\.gov directory/);
    expect(a).toMatch(/has not independently verified/);
    expect(a).not.toMatch(/^Yes\b/);
  });
});

describe("facility structured data truth", () => {
  it("flags every attribute the old renderers fabricated", () => {
    const legacy = {
      "@type": ["MedicalOrganization", "MedicalClinic", "MedicalBusiness", "LocalBusiness"],
      geo: { "@type": "GeoCoordinates", addressCountry: "US" },
      openingHoursSpecification: { opens: "00:00", closes: "23:59" },
      isAccessibleForFree: false,
      medicalSpecialty: ["Addiction Medicine", "Psychiatry"],
      isAcceptingNewPatients: true,
      knowsAbout: ["Mental Health Treatment"],
      slogan: "Your Path to Recovery Starts Here",
      priceRange: "$$-$$$$",
      paymentAccepted: ["Cash", "Credit Card", "Insurance", "Medicaid"],
      hasCredential: [{ "@type": "EducationalOccupationalCredential", name: "CARF International" }],
      makesOffer: [{ "@type": "Offer", availability: "https://schema.org/InStock" }],
      potentialAction: [{ "@type": "ReserveAction" }],
      reviewedBy: { "@type": "Organization", name: "RehabLookup Editorial Team" },
      lastReviewed: "2026-11-01",
    };
    // 14 legacy attributes; reviewedBy + lastReviewed are reported as one violation.
    expect(findFacilitySchemaViolations(legacy)).toHaveLength(13);
  });

  it("the SPA facility schema emits no unsupported attributes", () => {
    const schema = generateLocalBusinessSchema(baseFacility) as Record<string, unknown>;
    expect(findFacilitySchemaViolations(schema)).toEqual([]);
    expect(schema).not.toHaveProperty("openingHoursSpecification");
    expect(schema).not.toHaveProperty("isAcceptingNewPatients");
    expect(schema).not.toHaveProperty("reviewedBy");
    expect(schema.paymentAccepted).toEqual(["Medicaid", "Self-Pay/Private Pay"]);
  });

  it("emits isAcceptingNewPatients only from the facility's own admissions field", () => {
    const yes = generateLocalBusinessSchema({ ...baseFacility, acceptingAdmissions: true }) as Record<string, unknown>;
    expect(yes.isAcceptingNewPatients).toBe(true);
    expect(findFacilitySchemaViolations(yes, { acceptingAdmissions: true })).toEqual([]);
    const unknown = generateLocalBusinessSchema({ ...baseFacility, acceptingAdmissions: null }) as Record<string, unknown>;
    expect(unknown).not.toHaveProperty("isAcceptingNewPatients");
  });
});

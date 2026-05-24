/**
 * Unit tests for the Add-Location wizard's per-step validation —
 * the gate every new facility passes through before it can be created.
 * Covers the required-field contract (step 0 identity), the Pro media
 * URL format checks (step 4), and the staff name/title/bio rules
 * (step 5). These run client-side; the DB CHECK constraints
 * (migration 20260814000000) + RLS are the server-side backstop.
 */
import { describe, it, expect } from "vitest";
import { validateStep, INITIAL_DRAFT, type AddLocationDraft } from "../useAddLocationWizard";

function validDraft(overrides: Partial<AddLocationDraft> = {}): AddLocationDraft {
  return {
    ...INITIAL_DRAFT,
    name: "Sunrise Recovery",
    facility_type: "treatment_center",
    address: "123 Main St",
    city: "Los Angeles",
    state: "CA",
    zip_code: "90210",
    phone: "(555) 123-4567",
    ...overrides,
  };
}

describe("validateStep — step 0 (core identity)", () => {
  it("passes a fully-valid identity step", () => {
    expect(validateStep(0, validDraft())).toEqual([]);
  });

  it("flags every missing required field on an empty draft", () => {
    const errs = validateStep(0, INITIAL_DRAFT);
    expect(errs).toContain("Facility name is required");
    expect(errs).toContain("Facility type is required");
    expect(errs).toContain("Address is required");
    expect(errs).toContain("City is required");
    expect(errs).toContain("State is required");
    expect(errs).toContain("Valid 5-digit ZIP required");
    expect(errs).toContain("Valid phone number required");
  });

  it("rejects a 4-digit ZIP", () => {
    expect(validateStep(0, validDraft({ zip_code: "9021" }))).toContain("Valid 5-digit ZIP required");
  });

  it("rejects a ZIP with letters", () => {
    expect(validateStep(0, validDraft({ zip_code: "9021a" }))).toContain("Valid 5-digit ZIP required");
  });

  it("rejects a phone with fewer than 10 digits", () => {
    expect(validateStep(0, validDraft({ phone: "555-1234" }))).toContain("Valid phone number required");
  });

  it("accepts a phone with formatting punctuation as long as it has 10 digits", () => {
    expect(validateStep(0, validDraft({ phone: "(555) 123-4567" }))).not.toContain("Valid phone number required");
  });

  it("rejects a malformed email but allows empty (email is optional)", () => {
    expect(validateStep(0, validDraft({ email: "not-an-email" }))).toContain("Email is invalid");
    expect(validateStep(0, validDraft({ email: "" }))).not.toContain("Email is invalid");
    expect(validateStep(0, validDraft({ email: "admissions@facility.com" }))).not.toContain("Email is invalid");
  });

  it("requires website to start with http(s):// when provided", () => {
    expect(validateStep(0, validDraft({ website: "facility.com" }))).toContain(
      "Website must start with http:// or https://",
    );
    expect(validateStep(0, validDraft({ website: "https://facility.com" }))).not.toContain(
      "Website must start with http:// or https://",
    );
  });

  it("rejects a year_established below 1900 or in the future", () => {
    const nextYear = String(new Date().getFullYear() + 1);
    expect(validateStep(0, validDraft({ year_established: "1899" }))).toEqual(
      expect.arrayContaining([expect.stringContaining("Year established must be between 1900")]),
    );
    expect(validateStep(0, validDraft({ year_established: nextYear }))).toEqual(
      expect.arrayContaining([expect.stringContaining("Year established must be between 1900")]),
    );
  });

  it("accepts a plausible year_established and an empty one", () => {
    expect(validateStep(0, validDraft({ year_established: "2008" }))).toEqual([]);
    expect(validateStep(0, validDraft({ year_established: "" }))).toEqual([]);
  });
});

describe("validateStep — step 4 (Pro media URLs)", () => {
  it("passes when both URLs are blank", () => {
    expect(validateStep(4, validDraft())).toEqual([]);
  });

  it("rejects a non-http video URL", () => {
    expect(validateStep(4, validDraft({ video_url: "youtube.com/watch" }))).toContain(
      "Video URL must start with http:// or https://",
    );
  });

  it("rejects a non-http virtual tour URL", () => {
    expect(validateStep(4, validDraft({ virtual_tour_url: "matterport.com/x" }))).toContain(
      "Virtual tour URL must start with http:// or https://",
    );
  });

  it("accepts well-formed https media URLs", () => {
    expect(
      validateStep(4, validDraft({
        video_url: "https://youtube.com/watch?v=abc",
        virtual_tour_url: "https://my.matterport.com/show/?m=xyz",
      })),
    ).toEqual([]);
  });
});

describe("validateStep — step 5 (staff)", () => {
  it("passes with no staff", () => {
    expect(validateStep(5, validDraft({ staff: [] }))).toEqual([]);
  });

  it("flags a staff member with a name but no title", () => {
    expect(validateStep(5, validDraft({ staff: [{ name: "Dr. Smith", job_title: "", bio: "" }] }))).toContain(
      "Staff member 1 needs a job title",
    );
  });

  it("flags a staff member with a title but no name", () => {
    expect(validateStep(5, validDraft({ staff: [{ name: "", job_title: "Director", bio: "" }] }))).toContain(
      "Staff member 1 needs a name",
    );
  });

  it("flags a bio over 500 characters", () => {
    expect(
      validateStep(5, validDraft({ staff: [{ name: "Dr. Smith", job_title: "Director", bio: "x".repeat(501) }] })),
    ).toContain("Staff member 1 bio is over 500 characters");
  });

  it("passes a complete staff member with a 500-char bio (boundary)", () => {
    expect(
      validateStep(5, validDraft({ staff: [{ name: "Dr. Smith", job_title: "Director", bio: "x".repeat(500) }] })),
    ).toEqual([]);
  });

  it("reports per-index errors for multiple invalid staff", () => {
    const errs = validateStep(5, validDraft({
      staff: [
        { name: "A", job_title: "", bio: "" },
        { name: "", job_title: "Nurse", bio: "" },
      ],
    }));
    expect(errs).toContain("Staff member 1 needs a job title");
    expect(errs).toContain("Staff member 2 needs a name");
  });
});

import { describe, it, expect } from "vitest";
import { getListingStatusMeta } from "@/lib/listingStatus";

describe("getListingStatusMeta", () => {
  it("maps approved to a public Live state", () => {
    const m = getListingStatusMeta("approved");
    expect(m.label).toBe("Live");
    expect(m.tone).toBe("live");
    expect(m.isPublic).toBe(true);
  });

  it("maps pending and pending_review to a non-public Under Review state", () => {
    for (const s of ["pending", "pending_review"]) {
      const m = getListingStatusMeta(s);
      expect(m.label).toBe("Under Review");
      expect(m.tone).toBe("review");
      expect(m.isPublic).toBe(false);
    }
  });

  it("surfaces rejected distinctly (NOT as Draft) so the provider knows to act", () => {
    const m = getListingStatusMeta("rejected");
    expect(m.label).toBe("Not Approved");
    expect(m.tone).toBe("attention");
    expect(m.isPublic).toBe(false);
    // Regression guard: the old code collapsed this to "Draft".
    expect(m.label).not.toBe("Draft");
  });

  it("surfaces needs_edits distinctly (NOT as Draft)", () => {
    const m = getListingStatusMeta("needs_edits");
    expect(m.label).toBe("Changes Requested");
    expect(m.tone).toBe("attention");
    expect(m.label).not.toBe("Draft");
  });

  it("falls back to Draft for draft / unknown / nullish statuses", () => {
    for (const s of ["draft", "something_new", "", null, undefined]) {
      const m = getListingStatusMeta(s);
      expect(m.label).toBe("Draft");
      expect(m.tone).toBe("draft");
      expect(m.isPublic).toBe(false);
    }
  });

  it("suspended takes precedence over any status (even approved) and is never public", () => {
    const m = getListingStatusMeta("approved", true);
    expect(m.label).toBe("Paused");
    expect(m.tone).toBe("paused");
    expect(m.isPublic).toBe(false);
  });

  it("does not treat suspended=false as paused", () => {
    const m = getListingStatusMeta("approved", false);
    expect(m.label).toBe("Live");
    expect(m.isPublic).toBe(true);
  });
});

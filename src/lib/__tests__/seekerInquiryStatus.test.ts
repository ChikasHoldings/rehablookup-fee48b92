import { describe, it, expect } from "vitest";
import {
  resolveSeekerInquiryStatus,
  hasFacilityResponded,
} from "@/lib/seekerInquiryStatus";

// Regression guard for the inquiry/leads lifecycle: a seeker must only see
// "Facility Responded" when the provider has actually responded — NOT merely
// because the admin/provider pipeline status is 'contacted'.
describe("resolveSeekerInquiryStatus", () => {
  it("does NOT mark pipeline status='contacted' as responded without a provider response", () => {
    expect(
      resolveSeekerInquiryStatus({
        status: "contacted",
        providerRespondedAt: null,
        providerResponseStatus: null,
      }),
    ).toBe("in_progress");
    expect(hasFacilityResponded({ status: "contacted" })).toBe(false);
  });

  it("marks responded when provider_responded_at is set, regardless of pipeline status", () => {
    expect(
      resolveSeekerInquiryStatus({ status: "new", providerRespondedAt: "2026-06-21T00:00:00Z" }),
    ).toBe("responded");
    expect(
      resolveSeekerInquiryStatus({ status: "contacted", providerRespondedAt: "2026-06-21T00:00:00Z" }),
    ).toBe("responded");
  });

  it("marks responded when provider_response_status === 'responded'", () => {
    expect(
      resolveSeekerInquiryStatus({ status: "new", providerResponseStatus: "responded" }),
    ).toBe("responded");
    expect(hasFacilityResponded({ providerResponseStatus: "responded" })).toBe(true);
  });

  it("maps pipeline states without a provider response to seeker-safe labels", () => {
    expect(resolveSeekerInquiryStatus({ status: "new" })).toBe("pending");
    expect(resolveSeekerInquiryStatus({ status: "in_progress" })).toBe("in_progress");
    expect(resolveSeekerInquiryStatus({ status: "closed" })).toBe("closed");
    expect(resolveSeekerInquiryStatus({ status: "converted" })).toBe("closed");
    expect(resolveSeekerInquiryStatus({ status: "expired" })).toBe("expired");
    expect(resolveSeekerInquiryStatus({ status: "totally_unknown" })).toBe("submitted");
    expect(resolveSeekerInquiryStatus({})).toBe("submitted");
  });
});

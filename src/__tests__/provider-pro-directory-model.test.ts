import { describe, expect, it } from "vitest";
import {
  FEATURED_DIRECTORY_NOTE,
  PRO_DIRECTORY_BENEFITS,
  PRO_DIRECTORY_TRUST_NOTE,
} from "@/lib/proDirectoryBenefits";

const salesCopy = [
  ...PRO_DIRECTORY_BENEFITS.flatMap((benefit) => [benefit.title, benefit.description]),
  PRO_DIRECTORY_TRUST_NOTE,
  FEATURED_DIRECTORY_NOTE,
].join(" ");

describe("directory-only Pro product contract", () => {
  it("sells listing features, not trust or organic rank", () => {
    expect(PRO_DIRECTORY_BENEFITS.map((benefit) => benefit.key)).toEqual([
      "direct-contact",
      "enhanced-profile",
      "rich-media",
      "multi-location",
    ]);
    expect(salesCopy).not.toMatch(/priority\s+(search\s+)?(ranking|placement|position)/i);
    expect(salesCopy).not.toMatch(/verified\s+badge/i);
    expect(salesCopy).not.toMatch(/qualified\s+leads?/i);
    expect(PRO_DIRECTORY_TRUST_NOTE).toMatch(/Verification .* independently/i);
  });

  it("keeps Featured separate from organic directory position", () => {
    expect(FEATURED_DIRECTORY_NOTE).toMatch(/separate, clearly labeled advertising product/i);
    expect(FEATURED_DIRECTORY_NOTE).toMatch(/does not change organic directory position/i);
  });
});

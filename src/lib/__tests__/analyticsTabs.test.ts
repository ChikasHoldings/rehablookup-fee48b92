import { describe, it, expect } from "vitest";
import { resolveInitialAnalyticsTab, ANALYTICS_TAB_KEYS } from "@/lib/analyticsTabs";

// Regression guard for the dashboard → Analytics deep-link hand-off
// (e.g. /provider/analytics?tab=subscription must open the Subscription tab,
// not silently fall back to Overview).
describe("resolveInitialAnalyticsTab", () => {
  it("returns the requested tab when it is a valid key", () => {
    for (const key of ANALYTICS_TAB_KEYS) {
      expect(resolveInitialAnalyticsTab(key)).toBe(key);
    }
  });

  it("honors the subscription deep-link specifically", () => {
    expect(resolveInitialAnalyticsTab("subscription")).toBe("subscription");
  });

  it("falls back to overview for missing/unknown params", () => {
    expect(resolveInitialAnalyticsTab(null)).toBe("overview");
    expect(resolveInitialAnalyticsTab(undefined)).toBe("overview");
    expect(resolveInitialAnalyticsTab("")).toBe("overview");
    expect(resolveInitialAnalyticsTab("nope")).toBe("overview");
    expect(resolveInitialAnalyticsTab("SUBSCRIPTION")).toBe("overview"); // case-sensitive
  });
});

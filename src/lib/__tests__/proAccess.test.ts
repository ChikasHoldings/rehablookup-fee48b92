import { describe, it, expect } from "vitest";
import { isActiveProRow } from "@/lib/proAccess";

const NOW = new Date("2026-06-20T00:00:00Z");
const FUTURE = "2026-12-31T00:00:00Z";
const PAST = "2026-01-01T00:00:00Z";

describe("isActiveProRow — grace-aware Pro predicate (mirrors has_active_pro)", () => {
  it("is false for null / missing row", () => {
    expect(isActiveProRow(null, NOW)).toBe(false);
    expect(isActiveProRow(undefined, NOW)).toBe(false);
  });

  it("is false when tier is not pro, regardless of status", () => {
    expect(isActiveProRow({ tier: "free", status: "active", current_period_end: FUTURE }, NOW)).toBe(false);
    expect(isActiveProRow({ tier: null, status: "active" }, NOW)).toBe(false);
  });

  it("is true for active Pro within the current period", () => {
    expect(isActiveProRow({ tier: "pro", status: "active", current_period_end: FUTURE }, NOW)).toBe(true);
  });

  it("is true for active Pro with no period end set", () => {
    expect(isActiveProRow({ tier: "pro", status: "active", current_period_end: null }, NOW)).toBe(true);
  });

  it("is false for active Pro whose period has expired", () => {
    expect(isActiveProRow({ tier: "pro", status: "active", current_period_end: PAST }, NOW)).toBe(false);
  });

  it("is true for past_due Pro (Stripe dunning grace window) — the key regression", () => {
    // past_due providers are still paying customers in grace; they must keep
    // Pro benefits and must NOT be shown a second-subscription upsell.
    expect(isActiveProRow({ tier: "pro", status: "past_due", current_period_end: PAST }, NOW)).toBe(true);
    expect(isActiveProRow({ tier: "pro", status: "past_due", current_period_end: null }, NOW)).toBe(true);
  });

  it("is true for trialing Pro (defensive — webhook normally maps it to active)", () => {
    expect(isActiveProRow({ tier: "pro", status: "trialing", current_period_end: FUTURE }, NOW)).toBe(true);
  });

  it("is false for canceled / incomplete / unpaid Pro", () => {
    expect(isActiveProRow({ tier: "pro", status: "canceled", current_period_end: FUTURE }, NOW)).toBe(false);
    expect(isActiveProRow({ tier: "pro", status: "incomplete", current_period_end: FUTURE }, NOW)).toBe(false);
  });
});

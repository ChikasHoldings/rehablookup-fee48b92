/**
 * Regression guard for Stripe Basil billing-period resolution.
 *
 * Stripe removed subscription-level `current_period_end` in API version
 * 2025-03-31 and moved it onto subscription items. Every Stripe client here
 * pins a later version, so the old `sub.current_period_end * 1000` reads
 * produced `new Date(NaN)` — which THREW on `.toISOString()` (aborting Pro
 * activation in stripe-webhook) or went silently NaN in day-count arithmetic
 * (so renewal/expiry alerts never fired).
 *
 * The resolver lives in the edge-function _shared layer; we import it directly
 * here the same way stripe-price-resolution.test.ts exercises its helper.
 */
import { describe, it, expect } from "vitest";
import {
  getSubscriptionPeriodEnd,
  getSubscriptionPeriodEndDate,
  getSubscriptionPeriodEndISO,
} from "../../supabase/functions/_shared/stripe-subscription-period";

const SECONDS = 1774000000; // 2026-03-20T02:26:40.000Z

describe("getSubscriptionPeriodEnd — Basil item-level billing periods", () => {
  it("reads the period end from the subscription item (Basil 2025-03-31+)", () => {
    expect(
      getSubscriptionPeriodEnd({ items: { data: [{ current_period_end: SECONDS }] } }),
    ).toBe(SECONDS);
  });

  it("falls back to the legacy subscription-level field on pre-Basil versions", () => {
    expect(getSubscriptionPeriodEnd({ current_period_end: SECONDS })).toBe(SECONDS);
  });

  it("prefers the item-level value when both are present", () => {
    expect(
      getSubscriptionPeriodEnd({
        current_period_end: 1,
        items: { data: [{ current_period_end: SECONDS }] },
      }),
    ).toBe(SECONDS);
  });

  it("uses the latest period end across multiple items", () => {
    expect(
      getSubscriptionPeriodEnd({
        items: {
          data: [
            { current_period_end: SECONDS },
            { current_period_end: SECONDS + 86_400 },
            { current_period_end: SECONDS - 86_400 },
          ],
        },
      }),
    ).toBe(SECONDS + 86_400);
  });

  it("returns null rather than NaN when Stripe reports no period at all", () => {
    // The exact runtime shape that used to throw: Basil subscription with the
    // top-level field gone and items not expanded.
    expect(getSubscriptionPeriodEnd({})).toBeNull();
    expect(getSubscriptionPeriodEnd({ items: { data: [] } })).toBeNull();
    expect(getSubscriptionPeriodEnd({ items: { data: [{}] } })).toBeNull();
    expect(getSubscriptionPeriodEnd(null)).toBeNull();
    expect(getSubscriptionPeriodEnd(undefined)).toBeNull();
  });

  it("ignores non-finite and non-numeric values instead of propagating them", () => {
    expect(getSubscriptionPeriodEnd({ current_period_end: null })).toBeNull();
    expect(getSubscriptionPeriodEnd({ current_period_end: NaN })).toBeNull();
    expect(
      getSubscriptionPeriodEnd({ items: { data: [{ current_period_end: NaN }] } }),
    ).toBeNull();
  });
});

describe("getSubscriptionPeriodEndDate / ISO — no Invalid Date, no throw", () => {
  it("converts seconds to a Date and an ISO string", () => {
    const sub = { items: { data: [{ current_period_end: SECONDS }] } };
    expect(getSubscriptionPeriodEndDate(sub)?.getTime()).toBe(SECONDS * 1000);
    expect(getSubscriptionPeriodEndISO(sub)).toBe(new Date(SECONDS * 1000).toISOString());
  });

  it("returns null instead of throwing RangeError when the period is missing", () => {
    // `new Date(undefined * 1000).toISOString()` threw here before the fix.
    expect(() => getSubscriptionPeriodEndISO({})).not.toThrow();
    expect(getSubscriptionPeriodEndISO({})).toBeNull();
    expect(getSubscriptionPeriodEndDate({})).toBeNull();
  });
});

/**
 * Regression guard for create-checkout's FAIL-CLOSED Stripe price resolution.
 *
 * create-checkout used to fall back to a hardcoded Pro price id
 * (price_1Sel1C9fxdThyiakWLfgbl9K) when the rl_pro_monthly_v1 lookup key did
 * not resolve, risking silently billing a stale/unintended price. The pure
 * selector must now fail closed in every non-resolving case and NEVER return a
 * hardcoded fallback.
 *
 * The selector lives in the edge-function _shared layer; we import it directly
 * here the same way stripe-error-classification.test.ts / with-timeout.test.ts
 * exercise their _shared helpers.
 */
import { describe, it, expect } from "vitest";
import {
  selectActivePriceId,
  PriceResolutionError,
} from "../../supabase/functions/_shared/stripe-price";

describe("selectActivePriceId — create-checkout fail-closed price resolution", () => {
  const HARDCODED_FALLBACK = "price_1Sel1C9fxdThyiakWLfgbl9K";

  it("returns the price id when the lookup key resolves to exactly one active price", () => {
    expect(selectActivePriceId([{ id: "price_live_123" }])).toBe("price_live_123");
  });

  it("throws a controlled PRICE_NOT_FOUND error when nothing resolves", () => {
    let err: unknown;
    try {
      selectActivePriceId([]);
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(PriceResolutionError);
    expect((err as PriceResolutionError).code).toBe("PRICE_NOT_FOUND");
    // user-safe, non-technical copy — no Stripe jargon, no ids
    expect((err as PriceResolutionError).message).toMatch(/temporarily unavailable/i);
    expect((err as PriceResolutionError).message).not.toContain("price_");
  });

  it("fails closed when the lookup key is ambiguous (>1 active price)", () => {
    expect(() =>
      selectActivePriceId([{ id: "price_a" }, { id: "price_b" }]),
    ).toThrow(PriceResolutionError);
  });

  it("fails closed when the single price has no usable id", () => {
    expect(() => selectActivePriceId([{ id: null }])).toThrow(PriceResolutionError);
    expect(() => selectActivePriceId([{}])).toThrow(PriceResolutionError);
    expect(() => selectActivePriceId([{ id: "" }])).toThrow(PriceResolutionError);
  });

  it("NEVER returns the legacy hardcoded fallback price for any input", () => {
    const nonResolving: { id?: string | null }[][] = [
      [],
      [{ id: null }],
      [{}],
      [{ id: "" }],
      [{ id: "price_a" }, { id: "price_b" }],
    ];
    for (const input of nonResolving) {
      let result: string | undefined;
      try {
        result = selectActivePriceId(input);
      } catch {
        result = undefined; // fail-closed path
      }
      expect(result).not.toBe(HARDCODED_FALLBACK);
      expect(result).toBeUndefined();
    }
    // The only success path returns exactly the resolved id — not the fallback.
    expect(selectActivePriceId([{ id: "price_resolved" }])).toBe("price_resolved");
  });
});

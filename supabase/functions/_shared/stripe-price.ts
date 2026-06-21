// Fail-closed Stripe price resolution.
//
// `create-checkout` used to fall back to a hardcoded Pro price id when the
// `rl_pro_monthly_v1` lookup key did not resolve. That risked silently
// billing a stale or unintended price if the key was ever missing, rotated,
// or duplicated. Resolution now FAILS CLOSED: if a lookup key does not map to
// EXACTLY ONE active Stripe price, checkout errors out with a controlled,
// user-safe message instead of charging a fallback.
//
// The decision logic is split out from the Deno/Stripe-coupled index.ts so it
// can be unit-tested in isolation — mirroring how `_shared/stripe-errors.ts`
// and `_shared/with-timeout.ts` are exercised from `src/test/`.

/** Minimal shape of a Stripe Price we need for resolution. */
export interface MinimalStripePrice {
  id?: string | null;
}

/**
 * Thrown when a lookup key cannot be resolved to exactly one active Stripe
 * price. Carries a client-safe `message` and a stable `code`
 * (`PRICE_NOT_FOUND`, mirroring create-checkout-session) so callers can return
 * a controlled response and fail closed instead of billing a fallback price.
 */
export class PriceResolutionError extends Error {
  readonly code = "PRICE_NOT_FOUND";
  constructor(
    message = "This plan is temporarily unavailable. Please contact support.",
  ) {
    super(message);
    this.name = "PriceResolutionError";
  }
}

/**
 * Pure fail-closed selector. Returns the single active price id, or throws
 * `PriceResolutionError`. It NEVER returns a hardcoded fallback.
 *
 * Callers should fetch with `active: true` and `limit: 2` so a duplicated
 * lookup key surfaces here as "ambiguous" rather than being silently accepted.
 *
 *   - 0 prices  → not configured        → throw (fail closed)
 *   - >1 prices → ambiguous/misconfig   → throw (fail closed)
 *   - 1 w/o id  → malformed             → throw (fail closed)
 *   - exactly 1 active price with an id → return that id
 */
export function selectActivePriceId(
  prices: ReadonlyArray<MinimalStripePrice>,
): string {
  if (prices.length === 1) {
    const id = prices[0]?.id;
    if (typeof id === "string" && id.length > 0) return id;
  }
  throw new PriceResolutionError();
}

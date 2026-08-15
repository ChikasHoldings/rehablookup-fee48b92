/**
 * Test double for `https://esm.sh/stripe`.
 *
 * `new Stripe(key, opts)` returns whatever object the test registered through
 * `__setStripe`, so tests can record the exact arguments the edge function
 * passes to `stripe.checkout.sessions.create`, `stripe.prices.list`, etc.
 *
 * No network access, no live Stripe keys — the registered object is a plain
 * recorder supplied per-test.
 */
let impl: Record<string, unknown> | null = null;
let lastConstructorArgs: { key: string; opts?: unknown } | null = null;

export function __setStripe(o: Record<string, unknown> | null): void {
  impl = o;
  lastConstructorArgs = null;
}

export function __getStripeConstructorArgs(): { key: string; opts?: unknown } | null {
  return lastConstructorArgs;
}

export default class Stripe {
  constructor(key: string, opts?: unknown) {
    lastConstructorArgs = { key, opts };
    if (!impl) {
      throw new Error(
        "[test] new Stripe() was called but no test double is registered. Call __setStripe(...) first.",
      );
    }
    // Returning an object from a constructor replaces `this`.
    return impl as unknown as Stripe;
  }
}

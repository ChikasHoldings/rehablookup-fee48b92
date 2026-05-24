/**
 * Unit tests for the Stripe error classifier that powers user-facing
 * billing error messages in customer-portal + create-checkout-session.
 *
 * The same source file (supabase/functions/_shared/stripe-errors.ts) is
 * imported by both edge functions, so verifying the mapping here verifies
 * the production runtime behavior: a free provider hitting a Stripe
 * outage / rate-limit / declined card gets a recoverable message + the
 * correct retryable flag, never a raw SDK string.
 */
import { describe, it, expect } from "vitest";
import { classifyStripeError } from "../../supabase/functions/_shared/stripe-errors";

describe("classifyStripeError — Stripe SDK error types", () => {
  it("rate-limit → retryable 429", () => {
    const r = classifyStripeError({ type: "StripeRateLimitError", message: "Too many requests" });
    expect(r.code).toBe("RATE_LIMITED");
    expect(r.retryable).toBe(true);
    expect(r.httpStatus).toBe(429);
  });

  it("connection error → retryable 503", () => {
    const r = classifyStripeError({ type: "StripeConnectionError" });
    expect(r.code).toBe("STRIPE_UNREACHABLE");
    expect(r.retryable).toBe(true);
    expect(r.httpStatus).toBe(503);
  });

  it("API error → retryable 503 (same bucket as connection)", () => {
    const r = classifyStripeError({ type: "StripeAPIError" });
    expect(r.code).toBe("STRIPE_UNREACHABLE");
    expect(r.retryable).toBe(true);
  });

  it("auth error → NOT retryable 500 (our key is broken, not the user)", () => {
    const r = classifyStripeError({ type: "StripeAuthenticationError" });
    expect(r.code).toBe("STRIPE_AUTH_FAILED");
    expect(r.retryable).toBe(false);
    expect(r.httpStatus).toBe(500);
  });

  it("card declined → NOT retryable 402, surfaces the granular code + raw message", () => {
    const r = classifyStripeError({ type: "StripeCardError", code: "card_declined", message: "Your card was declined." });
    expect(r.code).toBe("CARD_CARD_DECLINED");
    expect(r.retryable).toBe(false);
    expect(r.httpStatus).toBe(402);
    // Card errors pass the raw Stripe message through (it's user-actionable).
    expect(r.message).toBe("Your card was declined.");
  });

  it("card error without granular code falls back to CARD_DECLINED", () => {
    const r = classifyStripeError({ type: "StripeCardError", message: "Card problem" });
    expect(r.code).toBe("CARD_DECLINED");
  });

  it("invalid request → NOT retryable 400 (likely our bug, hides jargon)", () => {
    const r = classifyStripeError({ type: "StripeInvalidRequestError", message: "No such price: rl_pro_x" });
    expect(r.code).toBe("STRIPE_INVALID_REQUEST");
    expect(r.retryable).toBe(false);
    // Must NOT leak the raw "No such price" jargon to the provider.
    expect(r.message).not.toContain("No such price");
  });

  it("permission error → NOT retryable 500", () => {
    const r = classifyStripeError({ type: "StripePermissionError" });
    expect(r.code).toBe("STRIPE_PERMISSION");
    expect(r.retryable).toBe(false);
  });

  it("idempotency error → retryable 409", () => {
    const r = classifyStripeError({ type: "StripeIdempotencyError" });
    expect(r.code).toBe("STRIPE_IDEMPOTENCY");
    expect(r.retryable).toBe(true);
    expect(r.httpStatus).toBe(409);
  });
});

describe("classifyStripeError — our own TimeoutError", () => {
  it("TimeoutError (by type tag) → retryable 504 upstream timeout", () => {
    const r = classifyStripeError({ type: "TimeoutError", message: "stripe.customers.list timed out after 12000ms" });
    expect(r.code).toBe("UPSTREAM_TIMEOUT");
    expect(r.retryable).toBe(true);
    expect(r.httpStatus).toBe(504);
  });
});

describe("classifyStripeError — non-SDK thrown Error fallbacks", () => {
  it("'No Stripe customer found' → NOT retryable 404", () => {
    const r = classifyStripeError(new Error("No Stripe customer found. Please subscribe to a plan first."));
    expect(r.code).toBe("NO_CUSTOMER");
    expect(r.retryable).toBe(false);
    expect(r.httpStatus).toBe(404);
  });

  it("'Authentication error' → NOT retryable 401", () => {
    const r = classifyStripeError(new Error("Authentication error: token expired"));
    expect(r.code).toBe("AUTH_EXPIRED");
    expect(r.httpStatus).toBe(401);
  });

  it("'No authorization header' → 401", () => {
    const r = classifyStripeError(new Error("No authorization header provided"));
    expect(r.code).toBe("AUTH_EXPIRED");
  });

  it("missing STRIPE_SECRET_KEY → MISCONFIG 500", () => {
    const r = classifyStripeError(new Error("STRIPE_SECRET_KEY is not set"));
    expect(r.code).toBe("MISCONFIG");
    expect(r.httpStatus).toBe(500);
  });

  it("unknown error → generic retryable 500 (never leaks the raw string)", () => {
    const r = classifyStripeError(new Error("kaboom internal detail xyz"));
    expect(r.code).toBe("UNHANDLED_EXCEPTION");
    expect(r.retryable).toBe(true);
    expect(r.message).not.toContain("kaboom");
  });

  it("string (non-Error) input doesn't crash", () => {
    const r = classifyStripeError("plain string error");
    expect(r.code).toBe("UNHANDLED_EXCEPTION");
  });

  it("null / undefined input doesn't crash", () => {
    expect(classifyStripeError(null).code).toBe("UNHANDLED_EXCEPTION");
    expect(classifyStripeError(undefined).code).toBe("UNHANDLED_EXCEPTION");
  });
});

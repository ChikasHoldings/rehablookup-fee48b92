/**
 * Unit tests for the edge-function timeout helper that guards every
 * upstream Stripe / Supabase call in customer-portal +
 * create-checkout-session. A stalled upstream must reject as a
 * TimeoutError (which classifyStripeError maps to a retryable 504),
 * never hang until Deno's hard ceiling.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { withTimeout, makeTimeoutController, TimeoutError } from "../../supabase/functions/_shared/with-timeout";

describe("withTimeout", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("resolves with the value when the promise settles before the deadline", async () => {
    const p = withTimeout(Promise.resolve("ok"), 1000, "test");
    await expect(p).resolves.toBe("ok");
  });

  it("rejects with the original error when the promise rejects before the deadline", async () => {
    const p = withTimeout(Promise.reject(new Error("upstream boom")), 1000, "test");
    await expect(p).rejects.toThrow("upstream boom");
  });

  it("rejects with TimeoutError when the promise never settles", async () => {
    const never = new Promise<string>(() => { /* never resolves */ });
    const p = withTimeout(never, 5000, "stripe.customers.list");
    const assertion = expect(p).rejects.toMatchObject({
      type: "TimeoutError",
      httpStatus: 504,
    });
    await vi.advanceTimersByTimeAsync(5001);
    await assertion;
  });

  it("TimeoutError message names the labeled operation + duration", async () => {
    const never = new Promise<string>(() => {});
    const p = withTimeout(never, 3000, "stripe.checkout.sessions.create");
    const assertion = expect(p).rejects.toThrow(/stripe\.checkout\.sessions\.create timed out after 3000ms/);
    await vi.advanceTimersByTimeAsync(3001);
    await assertion;
  });

  it("a promise that resolves AT the deadline still resolves (timer cleared)", async () => {
    let resolveFn: (v: string) => void = () => {};
    const slow = new Promise<string>((res) => { resolveFn = res; });
    const p = withTimeout(slow, 1000, "test");
    resolveFn("just in time");
    await expect(p).resolves.toBe("just in time");
  });
});

describe("makeTimeoutController", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("exposes an AbortSignal that is not aborted before the deadline", () => {
    const { signal, clear } = makeTimeoutController(5000);
    expect(signal.aborted).toBe(false);
    clear();
  });

  it("aborts the signal after the deadline", async () => {
    const { signal } = makeTimeoutController(2000);
    expect(signal.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(2001);
    expect(signal.aborted).toBe(true);
  });

  it("clear() prevents the abort from firing", async () => {
    const { signal, clear } = makeTimeoutController(2000);
    clear();
    await vi.advanceTimersByTimeAsync(2001);
    expect(signal.aborted).toBe(false);
  });
});

describe("TimeoutError", () => {
  it("carries the type tag + 504 httpStatus that classifyStripeError keys off", () => {
    const e = new TimeoutError("x", 100);
    expect(e.type).toBe("TimeoutError");
    expect(e.httpStatus).toBe(504);
    expect(e).toBeInstanceOf(Error);
  });
});

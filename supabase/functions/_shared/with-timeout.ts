/**
 * Wrap a promise (typically an upstream API call: Stripe, Resend,
 * Google Places) so it rejects after `ms` if it hasn't settled.
 *
 * Without this, a stalled upstream (Stripe slow, Resend regional
 * outage, network blackhole) holds an edge-function invocation open
 * up to Deno's hard ~150s ceiling — burning a connection slot and
 * leaving the caller's UI stuck on a spinner with no signal.
 *
 * Use the AbortSignal overload when the underlying SDK supports it
 * (fetch, Stripe v11+) so the in-flight request is actually canceled
 * server-side, not just abandoned client-side.
 *
 * @example
 *   const customer = await withTimeout(
 *     stripe.customers.list({ email, limit: 1 }),
 *     10_000,
 *     "Stripe.customers.list",
 *   );
 *
 * @example with AbortSignal:
 *   const ctrl = makeTimeoutController(10_000);
 *   const res = await fetch(url, { signal: ctrl.signal });
 *   ctrl.clear();
 */

export class TimeoutError extends Error {
  readonly type = "TimeoutError" as const;
  readonly httpStatus = 504;
  constructor(label: string, ms: number) {
    super(`${label} timed out after ${ms}ms`);
    this.name = "TimeoutError";
  }
}

export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label = "upstream",
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new TimeoutError(label, ms));
    }, ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

/**
 * Build an AbortController that auto-aborts after `ms`. Use when the
 * underlying SDK accepts an `AbortSignal` (fetch, Stripe v11+,
 * supabase-js, etc.) so the request is cancelled at the network
 * layer instead of just abandoned client-side.
 *
 * Returns `{ signal, clear }`. ALWAYS call `clear()` in a finally
 * block — leaking the timer is a slow memory leak under load.
 */
export function makeTimeoutController(ms: number): {
  signal: AbortSignal;
  clear: () => void;
} {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(new TimeoutError("aborted", ms)), ms);
  return {
    signal: ctrl.signal,
    clear: () => clearTimeout(timer),
  };
}

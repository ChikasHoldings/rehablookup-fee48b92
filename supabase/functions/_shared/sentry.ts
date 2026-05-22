/**
 * Shared Sentry instrumentation for Supabase Edge Functions.
 *
 * Why this lives in _shared
 * ─────────────────────────
 * 170+ edge functions. Inlining Sentry init into each one would be a
 * mountain of duplicate boilerplate and a guarantee of drift — one
 * function's tags would diverge from the next, and a future SDK upgrade
 * would mean touching every file. Pulling all of it through this one
 * module means one place to upgrade, one place to add new tags, one
 * place to swap the SDK.
 *
 * Usage
 * ─────
 *   import { initSentry, withSentry } from "../_shared/sentry.ts";
 *
 *   initSentry({ functionSlug: "stripe-webhook" });
 *
 *   Deno.serve(withSentry("stripe-webhook", async (req) => {
 *     // ... your handler ...
 *   }));
 *
 * withSentry() wraps the handler so any uncaught exception is reported
 * to Sentry before propagating. The `functionSlug` tag is set on every
 * event so you can filter by function in the Sentry UI.
 *
 * SDK choice
 * ──────────
 * `@sentry/deno` via esm.sh's denonext target — same pattern as every
 * other shared module here (supabase-js, stripe, zod, etc.). Works in
 * Supabase's Deno edge runtime without a network-level workaround.
 *
 * DSN + release
 * ─────────────
 * SENTRY_DSN must be set in each function's environment (Supabase
 * Dashboard → Edge Functions → Secrets). When unset, initSentry()
 * silently no-ops so functions deployed before the operator finishes
 * the rollout keep running. The release tag prefers SENTRY_RELEASE
 * (which a CI deploy step can set to the git SHA); falls back to
 * "unknown-edge" so events still attribute somewhere.
 *
 * Failure modes
 * ─────────────
 * If the Sentry CDN is unreachable at cold start, the import throws.
 * We catch and continue — the function should still serve traffic
 * even if observability is degraded. Reported via console.warn so the
 * Supabase Functions logs at least show the degradation.
 */

// deno-lint-ignore no-explicit-any
type Sentry = any;

let sentry: Sentry | null = null;
let initPromise: Promise<void> | null = null;

interface InitOptions {
  /** Slug of the function (e.g. "stripe-webhook"). Tagged on every event. */
  functionSlug: string;
  /** Override the env-var-derived environment (e.g. "production", "staging"). */
  environment?: string;
  /** Sampling rate for traces. Default 0.1 (10%). */
  tracesSampleRate?: number;
}

/**
 * Initialize Sentry for this function. Safe to call multiple times;
 * idempotent and lazy. Returns immediately even if SENTRY_DSN is unset
 * (logs a one-line note and proceeds).
 */
export function initSentry(opts: InitOptions): Promise<void> {
  if (initPromise) return initPromise;
  const dsn = Deno.env.get("SENTRY_DSN");
  if (!dsn) {
    initPromise = Promise.resolve();
    return initPromise;
  }
  const release =
    Deno.env.get("SENTRY_RELEASE") ||
    Deno.env.get("VERCEL_GIT_COMMIT_SHA") ||
    "unknown-edge";
  // opts.environment > SENTRY_ENVIRONMENT > implicit (deployed = prod,
  // local = dev). DENO_DEPLOYMENT_ID is set on Supabase / Deno Deploy.
  const environment =
    opts.environment ||
    Deno.env.get("SENTRY_ENVIRONMENT") ||
    (Deno.env.get("DENO_DEPLOYMENT_ID") ? "production" : "development");

  initPromise = (async () => {
    try {
      // @ts-expect-error remote ESM import
      const mod = await import("https://esm.sh/@sentry/deno@7.120.0?target=denonext");
      sentry = mod;
      mod.init({
        dsn,
        release,
        environment,
        tracesSampleRate: opts.tracesSampleRate ?? 0.1,
        defaultIntegrations: false,
      });
      mod.setTag("function", opts.functionSlug);
    } catch (err) {
      console.warn(
        `[sentry/${opts.functionSlug}] init failed — continuing without observability:`,
        err instanceof Error ? err.message : String(err),
      );
      sentry = null;
    }
  })();
  return initPromise;
}

/**
 * Wrap a Deno.serve handler so any uncaught exception is reported to
 * Sentry before propagating. Synchronous errors and rejected promises
 * are both captured. The slug is added as a tag on every event so the
 * Sentry UI can filter by function.
 */
export function withSentry<Args extends unknown[], R>(
  functionSlug: string,
  handler: (...args: Args) => Promise<R> | R,
): (...args: Args) => Promise<R> {
  return async (...args: Args): Promise<R> => {
    try {
      return await handler(...args);
    } catch (err) {
      await captureEdgeException(err, { functionSlug });
      throw err;
    }
  };
}

/** Explicit capture for places that catch + recover but still want to log. */
export async function captureEdgeException(
  err: unknown,
  context?: { functionSlug?: string; extra?: Record<string, unknown> },
): Promise<void> {
  await initPromise; // make sure init completed if it was started
  if (!sentry) return;
  try {
    sentry.captureException(err, {
      tags: context?.functionSlug ? { function: context.functionSlug } : undefined,
      extra: context?.extra,
    });
    // Edge functions have ephemeral lifetimes — flush before returning
    // so the event isn't lost when the isolate is recycled.
    await sentry.flush(2000);
  } catch {
    // Don't let observability failures cascade into the user's request.
  }
}

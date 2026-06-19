/**
 * Best-effort extraction of a friendly message from a failed
 * `supabase.functions.invoke` call.
 *
 * Our edge functions return business/Stripe failures as
 * `{ error, code, retryable }`. On a non-2xx response supabase-js raises a
 * FunctionsHttpError whose `context` is the raw Response, so the classified
 * body lives there rather than in `data`. Read it so callers can surface the
 * real reason instead of the opaque "Edge Function returned a non-2xx status
 * code" (audit L9). Returns null when no classified message is available.
 */
export async function readFunctionError(error: unknown): Promise<string | null> {
  const ctx = (error as { context?: unknown } | null)?.context;
  if (ctx instanceof Response) {
    try {
      const body = await ctx.clone().json();
      if (body && typeof body.error === "string" && body.error.trim()) {
        return body.error;
      }
    } catch {
      // Body wasn't JSON, was empty, or was already consumed — fall through.
    }
  }
  return null;
}

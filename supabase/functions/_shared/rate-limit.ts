// ========================================
// SHARED RATE LIMITING UTILITY
// For Edge Functions — uses rate_limit_log table
// ========================================
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.4?target=denonext";

export interface RateLimitOptions {
  /** The identifier to rate limit (email, IP hash, or user ID) */
  identifier: string;
  /** The action type for grouping (e.g. "submit_lead", "verify_code", "create_checkout") */
  actionType: string;
  /** Max allowed attempts in the time window */
  maxAttempts: number;
  /** Time window in minutes */
  windowMinutes: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

/**
 * Check and enforce rate limiting using the rate_limit_log table.
 * Uses the service-role Supabase client to bypass RLS.
 *
 * @returns RateLimitResult — if allowed is false, return a 429 response immediately.
 */
export async function checkRateLimit(
  supabaseAdmin: SupabaseClient,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const { identifier, actionType, maxAttempts, windowMinutes } = options;
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
  const resetAt = new Date(Date.now() + windowMinutes * 60 * 1000);

  try {
    const { count } = await supabaseAdmin
      .from("rate_limit_log")
      .select("*", { count: "exact", head: true })
      .eq("identifier", identifier)
      .eq("action_type", actionType)
      .gte("created_at", windowStart);

    const attempts = count ?? 0;
    const remaining = Math.max(0, maxAttempts - attempts);
    const allowed = attempts < maxAttempts;

    return { allowed, remaining, resetAt };
  } catch {
    // On DB error, fail open (allow the request) to avoid blocking legitimate users
    return { allowed: true, remaining: 1, resetAt };
  }
}

/**
 * Log a rate limit attempt to the rate_limit_log table.
 * Call this AFTER the main action succeeds or fails.
 */
export async function logRateLimitAttempt(
  supabaseAdmin: SupabaseClient,
  identifier: string,
  actionType: string,
  success: boolean,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await supabaseAdmin
      .from("rate_limit_log")
      .insert({
        identifier,
        action_type: actionType,
        success,
        metadata: metadata ?? {},
      });
  } catch {
    // Non-critical — don't throw if logging fails
  }
}

/**
 * Extract a privacy-safe identifier from a request.
 * Prefers the Authorization header user ID, falls back to IP hash.
 */
export function getRequestIdentifier(req: Request, userId?: string | null): string {
  if (userId) return `user:${userId}`;
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  // Simple hash to avoid storing raw IPs
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    hash = (hash << 5) - hash + ip.charCodeAt(i);
    hash |= 0;
  }
  return `ip:${Math.abs(hash).toString(36)}`;
}

/**
 * Standard 429 Too Many Requests response.
 */
export function rateLimitResponse(corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({
      error: "Too many requests. Please wait a few minutes and try again.",
      code: "RATE_LIMITED",
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Retry-After": "300",
      },
    }
  );
}

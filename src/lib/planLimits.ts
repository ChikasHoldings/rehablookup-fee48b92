/**
 * Plan limits — single source of truth for what each tier can do.
 *
 * Mirrored server-side by the provider_plan_limit_check trigger
 * (supabase/migrations/2026..._provider_plan_limits.sql). Update
 * BOTH if the limits change.
 *
 * Pricing copy lives in src/lib/planConstants.ts; this module is
 * purely about feature gates so plan-gated components can import it
 * without pulling in the marketing copy bundle.
 */

export type PlanTier = "free" | "pro";

export interface PlanLimits {
  /** Max gallery photos (excludes the logo). */
  photos: number;
  /** Max facility videos. */
  videos: number;
}

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  free: { photos: 5, videos: 0 },
  pro: { photos: 10, videos: 1 },
};

/**
 * Resolve a profile's effective plan. NULL → 'free' so unconfigured
 * provider profiles behave as Free rather than blocking the UI.
 */
export function resolvePlan(value: string | null | undefined): PlanTier {
  return value === "pro" ? "pro" : "free";
}

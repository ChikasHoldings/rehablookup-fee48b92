/**
 * Canonical, grace-aware "is this facility on an active Pro plan?" predicate
 * for the CLIENT. It mirrors the database source of truth — the
 * `public.has_active_pro(facility_id)` function — so the UI never disagrees
 * with what the backend actually enforces:
 *
 *   tier = 'pro'
 *   AND (
 *     (status = 'active' AND (current_period_end IS NULL OR current_period_end > now))
 *     OR status = 'past_due'          -- Stripe dunning grace window
 *   )
 *
 * `past_due` is the dunning grace window: Stripe is auto-retrying the failed
 * invoice and the provider KEEPS their Pro benefits until the subscription is
 * actually canceled. Teardown happens on cancellation, not on the first
 * failed charge. Treating past_due as "not Pro" (as several call-sites used
 * to) locks a paying provider out of tools they still own AND can push them
 * toward buying a second subscription — both real defects this consolidates.
 *
 * `trialing` is included defensively: the Stripe webhook maps a Stripe
 * `trialing` status to a stored `active` row, so facility_subscriptions rows
 * never actually carry 'trialing' — but a Stripe-sourced caller might, and
 * counting it as Pro is correct in every case.
 */
export interface ProAccessRow {
  tier?: string | null;
  status?: string | null;
  current_period_end?: string | null;
}

/** Subscription statuses that grant Pro benefits (active + grace window). */
export const PRO_ACTIVE_STATUSES = ["active", "trialing", "past_due"] as const;

export function isActiveProRow(
  row: ProAccessRow | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!row || row.tier !== "pro") return false;
  const status = row.status ?? "";
  if (status === "past_due" || status === "trialing") return true;
  if (status === "active") {
    if (!row.current_period_end) return true;
    return new Date(row.current_period_end).getTime() > now.getTime();
  }
  return false;
}

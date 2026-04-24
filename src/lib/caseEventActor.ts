/**
 * Resolves the granular `actor_type` value to persist on `concierge_case_events`
 * rows. We deliberately avoid the legacy literal "admin" so timeline filtering,
 * audit reviews, and BI queries can distinguish a super-admin override from a
 * routine customer-rep / advisor / manager action.
 *
 * Returns one of: "super_admin" | "manager" | "customer_rep" | "advisor"
 *               | "system" (no resolved admin role)
 *
 * Pair with `useAdminAuth().adminRole` at call-sites; `null`/`undefined`
 * intentionally collapses to "system" rather than "admin" so unauthenticated
 * server-side or fallback writes are still visibly distinct.
 *
 * The seeker-side flow (SeekerConcierge.tsx) writes `actor_type: "seeker"`
 * directly and must NOT use this helper.
 */
export function getCaseEventActorType(
  adminRole: string | null | undefined,
): string {
  if (!adminRole) return "system";
  return adminRole;
}

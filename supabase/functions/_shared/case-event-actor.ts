/**
 * Server-side mirror of `src/lib/caseEventActor.ts` (client helper).
 *
 * Resolves the granular `actor_type` literal we persist on
 * `concierge_case_events` / `international_case_events` /
 * `placement_fee_events` rows from an admin's role.
 *
 * Returns one of:
 *   "super_admin" | "manager" | "customer_rep" | "advisor" | "system"
 *
 * Edge functions called by an authenticated admin MUST pass the
 * `adminRole` resolved from `requireAdmin()` (or the equivalent JWT-backed
 * lookup against `admin_user_profiles.admin_role`) — never the legacy
 * literal "admin". `null` / `undefined` collapses to "system" so
 * service-role / cron writes are visibly distinct.
 *
 * Provider-side (`"provider"`) and seeker-side (`"seeker"`) flows write
 * those literals directly and must NOT use this helper.
 */
export type CaseEventActorType =
  | "super_admin"
  | "manager"
  | "customer_rep"
  | "advisor"
  | "provider"
  | "seeker"
  | "system";

export function getCaseEventActorType(
  adminRole: string | null | undefined,
): CaseEventActorType {
  if (!adminRole) return "system";
  // Trust the role string from admin_user_profiles.admin_role; the enum
  // domain there already matches the granular taxonomy.
  return adminRole as CaseEventActorType;
}

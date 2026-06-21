// Pure provider-RBAC role helpers (no Supabase / no React imports) so the
// permission matrix is unit-testable in isolation. The data-fetching hook lives
// in src/hooks/useFacilityRole.ts and re-exports these.

export type FacilityRole = "owner" | "manager" | "viewer" | null;

/**
 * Pure mapping from an effective facility role to UI capability flags — the
 * single place the provider permission matrix lives.
 *   • canEdit (owner|manager) mirrors the backend `user_can_edit_facility`
 *     helper (listing/leads/reviews/marketing content writes).
 *   • viewer is strictly read-only.
 *   • null = no access.
 */
export function facilityRoleFlags(role: FacilityRole) {
  return {
    role,
    isOwner: role === "owner",
    isManager: role === "manager",
    isViewer: role === "viewer",
    canEdit: role === "owner" || role === "manager",
  };
}

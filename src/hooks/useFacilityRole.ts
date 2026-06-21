import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { facilityRoleFlags, type FacilityRole } from "@/lib/facilityRole";

export { facilityRoleFlags, type FacilityRole };

/**
 * Resolves the signed-in user's effective role for a facility via the
 * authoritative `facility_role()` RPC — the single source of truth for
 * provider RBAC:
 *   • owner   = facilities.user_id (any plan)
 *   • manager = active facility_team_members row, ONLY while the facility is on
 *               Pro (fail-closed when Pro lapses)
 *   • viewer  = active member, Pro-gated, read-only
 *   • null    = no access
 *
 * Use this to gate UI affordances (e.g. make a viewer's editor inert, hide
 * owner-only actions). RLS / SECURITY DEFINER RPCs remain the real enforcement
 * — this is a UI-truthfulness helper, never the security boundary.
 */
export function useFacilityRole(facilityId: string | null | undefined) {
  const { data, isLoading } = useQuery({
    queryKey: ["facility-role", facilityId],
    queryFn: async (): Promise<FacilityRole> => {
      if (!facilityId) return null;
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return null;
      const { data: role, error } = await supabase.rpc(
        "facility_role" as never,
        { _facility_id: facilityId, _user_id: uid } as never,
      );
      if (error) return null;
      return ((role as FacilityRole) ?? null);
    },
    enabled: !!facilityId,
    staleTime: 1000 * 60,
  });

  const role = (data ?? null) as FacilityRole;
  // Content writes (listing/leads/reviews/marketing content) = owner|manager.
  return { ...facilityRoleFlags(role), isLoading };
}

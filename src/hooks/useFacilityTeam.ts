import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type TeamRole = "owner" | "manager" | "viewer";
export type TeamStatus = "active" | "pending" | "revoked";

export interface TeamMember {
  memberId: string | null; // null for the owner (synthetic row)
  userId: string | null;
  email: string | null;
  role: TeamRole;
  status: TeamStatus;
  displayName: string | null;
  isOwner: boolean;
}

interface RawTeamRow {
  member_id: string | null;
  user_id: string | null;
  email: string | null;
  role: TeamRole;
  status: TeamStatus;
  display_name: string | null;
  is_owner: boolean;
}

/**
 * Provider team management for a facility. Reads the roster via the
 * get_facility_team RPC (owner + active/pending members, SECURITY DEFINER
 * so display names resolve). Invites go through invite_facility_team_member
 * (owner-only, Pro-gated, server-side). Role change + removal are direct
 * writes guarded by the owner-only RLS policy on facility_team_members.
 */
export function useFacilityTeam(facilityId: string | null | undefined) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const key = ["facility-team", facilityId];

  const roster = useQuery({
    queryKey: key,
    queryFn: async (): Promise<TeamMember[]> => {
      if (!facilityId) return [];
      const { data, error } = await supabase.rpc(
        "get_facility_team" as never,
        { p_facility_id: facilityId } as never,
      );
      if (error) throw new Error(error.message || "Failed to load team");
      return ((data ?? []) as unknown as RawTeamRow[]).map((r) => ({
        memberId: r.member_id,
        userId: r.user_id,
        email: r.email,
        role: r.role,
        status: r.status,
        displayName: r.display_name,
        isOwner: r.is_owner,
      }));
    },
    enabled: !!facilityId,
    staleTime: 1000 * 30,
  });

  const invite = useMutation({
    mutationFn: async (args: { email: string; role: Exclude<TeamRole, "owner"> }) => {
      const { data, error } = await supabase.rpc(
        "invite_facility_team_member" as never,
        { p_facility_id: facilityId, p_email: args.email, p_role: args.role } as never,
      );
      if (error) throw new Error(error.message || "Couldn't add team member");
      return (data ?? [])[0] as { id: string; status: string; linked: boolean } | undefined;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: key });
      toast({
        title: res?.linked ? "Team member added" : "Invitation saved",
        description: res?.linked
          ? "They now have access to this facility."
          : "They'll get access automatically the next time they sign in with this email.",
      });
    },
    onError: (e: Error) => {
      toast({ title: "Couldn't add team member", description: e.message, variant: "destructive" });
    },
  });

  const changeRole = useMutation({
    mutationFn: async (args: { memberId: string; role: Exclude<TeamRole, "owner"> }) => {
      // .select() + row-count check so an RLS-blocked write (a non-owner, or an
      // owner whose Pro lapsed mid-session) surfaces as an error instead of a
      // false "Role updated" toast. The team-table write policy is owner-only.
      const { data, error } = await supabase
        .from("facility_team_members")
        .update({ role: args.role })
        .eq("id", args.memberId)
        .select("id");
      if (error) throw new Error(error.message);
      if (!data || data.length === 0) {
        throw new Error("You don't have permission to change this member, or it no longer exists.");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key });
      toast({ title: "Role updated" });
    },
    onError: (e: Error) => {
      toast({ title: "Couldn't update role", description: e.message, variant: "destructive" });
    },
  });

  const remove = useMutation({
    mutationFn: async (memberId: string) => {
      const { data, error } = await supabase
        .from("facility_team_members")
        .delete()
        .eq("id", memberId)
        .select("id");
      if (error) throw new Error(error.message);
      if (!data || data.length === 0) {
        throw new Error("You don't have permission to remove this member, or it no longer exists.");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key });
      toast({ title: "Team member removed" });
    },
    onError: (e: Error) => {
      toast({ title: "Couldn't remove member", description: e.message, variant: "destructive" });
    },
  });

  return {
    members: roster.data ?? [],
    isLoading: roster.isLoading,
    isError: roster.isError,
    refetch: roster.refetch,
    invite,
    changeRole,
    remove,
  };
}

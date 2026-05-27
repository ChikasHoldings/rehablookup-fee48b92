import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const supabaseRelaxed = supabase as unknown as { from: (relation: string) => unknown };

/**
 * Per-lead unread message counts for the lead-message thread, from the
 * viewer's perspective (provider counts unread seeker messages; seeker
 * counts unread provider messages). RLS scopes lead_messages to the
 * viewer's own leads, so a single query returns only their threads.
 *
 * Invalidated by LeadMessageThread when a thread is opened (mark-read), and
 * refetched on focus — good enough for a list badge without polling.
 */
export function useLeadUnreadCounts(viewerType: "provider" | "seeker", enabled = true) {
  return useQuery({
    queryKey: ["lead-unread-counts", viewerType],
    queryFn: async (): Promise<Record<string, number>> => {
      const otherSender = viewerType === "provider" ? "seeker" : "provider";
      const { data, error } = await (
        supabaseRelaxed.from("lead_messages") as ReturnType<
          typeof supabase.from<"facility_reviews", { lead_id: string }>
        >
      )
        .select("lead_id")
        .eq("sender_type", otherSender)
        .is("read_at", null)
        .limit(1000);
      if (error) return {};
      const counts: Record<string, number> = {};
      for (const row of (data ?? []) as unknown as { lead_id: string }[]) {
        counts[row.lead_id] = (counts[row.lead_id] ?? 0) + 1;
      }
      return counts;
    },
    enabled,
    staleTime: 1000 * 30,
    refetchOnWindowFocus: true,
  });
}

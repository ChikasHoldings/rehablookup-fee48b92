import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RedirectedInquiryRow {
  id: string;
  created_at: string;
  level_of_care: string | null;
  insurance: string | null;
  urgency: string | null;
  location: string | null;
}

/**
 * Free-tier visibility into inquiries that arrived on a facility's
 * listing and were routed through the concierge. PII-redacted by
 * design — the Free-tier facility never sees the seeker's contact
 * info; only LoC / insurance / urgency / location / timestamp.
 *
 * The hook itself isn't gated by tier — the consumer decides whether
 * to render. (Pro facilities have their own direct-leads inbox; this
 * data is irrelevant to them.)
 */
export function useRedirectedInquiries(
  facilityId: string | null | undefined,
  options: { lookbackDays?: number; limit?: number } = {},
) {
  const lookbackDays = options.lookbackDays ?? 30;
  const limit = options.limit ?? 50;

  return useQuery({
    queryKey: ["redirected-inquiries", facilityId, lookbackDays, limit],
    queryFn: async (): Promise<RedirectedInquiryRow[]> => {
      if (!facilityId) return [];
      const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("concierge_inquiries")
        .select("id, created_at, intake_data")
        .eq("originating_facility_id", facilityId)
        .eq("routing_mode", "free_tier_redirect")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) {
        console.error("[useRedirectedInquiries] fetch failed", error);
        return [];
      }
      // Extract only the non-PII fields from intake_data. The full
      // intake_data IS readable to the facility (by RLS — the
      // originating_facility_id ties it back), but the UI deliberately
      // doesn't surface seeker contact info even though it could.
      return (data ?? []).map((row) => {
        const intake = (row.intake_data as Record<string, unknown> | null) ?? {};
        return {
          id: row.id as string,
          created_at: row.created_at as string,
          level_of_care: (intake.level_of_care as string | null) ?? null,
          insurance:
            (intake.insurance_provider as string | null) ??
            (intake.insurance_type as string | null) ??
            null,
          urgency: (intake.urgency as string | null) ?? null,
          location:
            (intake.location_city_state as string | null) ??
            (intake.location_zip as string | null) ??
            null,
        };
      });
    },
    enabled: !!facilityId,
    staleTime: 1000 * 60 * 2,
  });
}

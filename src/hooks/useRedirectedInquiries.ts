import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RedirectedInquiryRow {
  id: string;
  created_at: string;
  originating_facility_id: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  level_of_care: string | null;
  insurance: string | null;
  urgency: string | null;
  location: string | null;
  message: string | null;
}

/**
 * Inquiries that arrived on a (free / unclaimed) facility's listing and
 * were routed to concierge placement on submission
 * (routing_mode = 'free_tier_redirect'). Surfaced to the originating
 * facility's owner so a Free provider still SEES the inquiry — full
 * contact, NOT exclusive (the concierge team is also working it; Pro is
 * the upsell to exclusive, direct leads).
 *
 * Row access is gated by the concierge_inquiries
 * `_select_originating_facility` RLS policy (originating_facility_id must
 * belong to the caller). Returns [] for Pro facilities — their inquiries
 * become exclusive `leads` rows and never route here.
 */
export function useRedirectedInquiries(
  facilityIds: string[] | null | undefined,
  options: { lookbackDays?: number; limit?: number } = {},
) {
  const lookbackDays = options.lookbackDays ?? 30;
  const limit = options.limit ?? 50;
  const ids = facilityIds ?? [];

  return useQuery({
    queryKey: ["redirected-inquiries", ids, lookbackDays, limit],
    queryFn: async (): Promise<RedirectedInquiryRow[]> => {
      if (ids.length === 0) return [];
      const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("concierge_inquiries")
        .select("id, created_at, originating_facility_id, user_name, user_email, user_phone, intake_data")
        .in("originating_facility_id", ids)
        .eq("routing_mode", "free_tier_redirect")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) {
        console.error("[useRedirectedInquiries] fetch failed", error);
        return [];
      }
      return (data ?? []).map((row) => {
        const intake = (row.intake_data as Record<string, unknown> | null) ?? {};
        return {
          id: row.id as string,
          created_at: row.created_at as string,
          originating_facility_id: (row.originating_facility_id as string | null) ?? null,
          name: (row.user_name as string | null) ?? (intake.name as string | null) ?? null,
          email: (row.user_email as string | null) ?? (intake.email as string | null) ?? null,
          phone: (row.user_phone as string | null) ?? (intake.phone as string | null) ?? null,
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
          message: (intake.message as string | null) ?? null,
        };
      });
    },
    enabled: ids.length > 0,
    staleTime: 1000 * 60 * 2,
  });
}

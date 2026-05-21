import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AnalyticsRange = "last_7d" | "last_30d" | "last_90d" | "last_12m" | "custom";

export interface FacilityAnalyticsResponse {
  ok: true;
  facility: { id: string; name: string };
  subscription: {
    tier: string;
    billing_period: string | null;
    has_featured: boolean;
    has_concierge_partner: boolean;
    is_pro: boolean;
  } | null;
  range: { start: string; end: string };
  previous_range: { start: string; end: string };
  summary: {
    profile_views: { current: number; prev: number; delta_pct: number };
    phone_clicks: { current: number; prev: number; delta_pct: number };
    inquiries: { current: number; prev: number; delta_pct: number };
    avg_response_time_hours: { current: number; prev: number | null; delta_hrs: number | null };
  };
  featured_breakdown: Array<{
    placement_type: string;
    placement_value: string;
    impressions: number;
    phone_clicks: number;
    ctr_pct: number;
    is_active: boolean;
  }> | null;
  featured_impressions_total: number;
  featured_impressions_prev: number;
  funnel: {
    profile_views: number;
    phone_clicks: number;
    inquiries_submitted: number;
    inquiries_responded: number;
    inquiries_converted: number;
  };
  concierge_breakdown: Array<{
    inquiries_presented: number;
    response_avg_hours: number;
    chosen: number;
  }> | null;
  concierge_compliance: {
    non_partner_alternatives_presented_pct: number;
    response_under_24h_pct: number;
  } | null;
  reviews: {
    received: number;
    avg_rating: number;
    responded: number;
    pending: number;
  } | null;
  renewal_forecast: {
    period_end: string;
    estimated_charge_cents: number;
    cost_per_phone_click_cents: number;
    cost_per_inquiry_cents: number;
  } | null;
  generated_at: string;
}

/**
 * Subscription / Featured / Concierge analytics for a single facility,
 * served by the get-facility-analytics edge function.
 *
 * The hook caches per (facility_id, range) tuple with a 5-minute stale
 * window per spec — the same data is heavy to recompute and doesn't
 * change second-to-second; refetch on focus is OFF.
 */
export function useFacilityAnalytics(args: {
  facilityId: string | null | undefined;
  range: AnalyticsRange;
  customStart?: string;
  customEnd?: string;
}) {
  const { facilityId, range, customStart, customEnd } = args;
  return useQuery({
    queryKey: ["facility-analytics", facilityId, range, customStart ?? null, customEnd ?? null],
    enabled: !!facilityId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<FacilityAnalyticsResponse> => {
      if (!facilityId) throw new Error("facilityId required");
      const { data, error } = await supabase.functions.invoke("get-facility-analytics", {
        body: { facility_id: facilityId, range, custom_start: customStart, custom_end: customEnd },
      });
      if (error) {
        console.error("[useFacilityAnalytics] invoke failed", error);
        throw error;
      }
      return data as FacilityAnalyticsResponse;
    },
  });
}

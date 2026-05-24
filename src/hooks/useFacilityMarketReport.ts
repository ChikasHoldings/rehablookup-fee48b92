import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MarketReportTopItem {
  value: string;
  count: number;
}

export interface MarketReport {
  month: string;
  facility_state: string;
  state_total_inquiries: number;
  facility_inquiries: number;
  facility_share_pct: number;
  state_rank: number;
  state_total_facilities: number;
  state_verified_count: number;
  state_verified_share_pct: number;
  top_substances: MarketReportTopItem[];
  top_levels_of_care: MarketReportTopItem[];
  top_insurance_providers: MarketReportTopItem[];
  is_pro: boolean;
  generated_at: string;
}

/**
 * Monthly market-report digest for a single facility. Backed by the
 * get_facility_market_report SECURITY DEFINER RPC which scopes by
 * ownership server-side. Default month = current month (first of
 * month); pass an explicit ISO date to retrieve any historical month.
 */
export function useFacilityMarketReport(
  facilityId: string | undefined,
  month?: string,
) {
  return useQuery({
    queryKey: ["facility-market-report", facilityId, month ?? "current"],
    enabled: !!facilityId,
    queryFn: async (): Promise<MarketReport | null> => {
      if (!facilityId) return null;
      const { data, error } = await supabase.rpc("get_facility_market_report", {
        p_facility_id: facilityId,
        ...(month ? { p_month: month } : {}),
      });
      if (error) throw error;
      return (data as MarketReport) ?? null;
    },
    staleTime: 1000 * 60 * 10, // 10min — market data shifts slowly
    refetchOnWindowFocus: false,
  });
}

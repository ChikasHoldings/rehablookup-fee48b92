import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { BarChart3 } from "lucide-react";
import { useProviderData } from "@/hooks/useProviderData";
import { LeadAnalyticsDashboard } from "@/components/provider/LeadAnalyticsDashboard";
import { supabase } from "@/integrations/supabase/client";

export default function ProviderAnalyticsPage() {
  const queryClient = useQueryClient();
  const { data: providerData } = useProviderData();
  const facilityId = providerData?.facility?.id;

  // Real-time subscription for analytics updates
  useEffect(() => {
    if (!facilityId) return;
    
    const channel = supabase
      .channel("analytics-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "leads",
          filter: `facility_id=eq.${facilityId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["lead-analytics", facilityId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [facilityId, queryClient]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Analytics</h1>
            <p className="text-muted-foreground">
              Track your lead performance and conversion metrics
            </p>
          </div>
        </div>
      </div>

      {/* Analytics Dashboard */}
      <LeadAnalyticsDashboard facilityId={facilityId} />
    </div>
  );
}

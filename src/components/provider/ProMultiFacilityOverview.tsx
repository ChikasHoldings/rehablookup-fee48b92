import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Building2, Eye, Users, TrendingUp, ChevronRight, CheckCircle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface FacilitySummary {
  id: string;
  name: string;
  status: string;
  views: number;
  leads: number;
  newLeads: number;
}

interface ProMultiFacilityOverviewProps {
  facilities: Array<{ id: string; name: string; status: string }>;
}

export function ProMultiFacilityOverview({ facilities }: ProMultiFacilityOverviewProps) {
  const { data: summaries = [], isLoading } = useQuery({
    queryKey: ["pro-facility-summaries", facilities.map(f => f.id)],
    queryFn: async (): Promise<FacilitySummary[]> => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const results = await Promise.all(
        facilities.map(async (facility) => {
          const [viewsResult, leadsResult] = await Promise.all([
            supabase
              .from("provider_events")
              .select("id", { count: "exact", head: true })
              .eq("facility_id", facility.id)
              .eq("event_type", "profile_view")
              .gte("created_at", thirtyDaysAgo.toISOString()),
            supabase.rpc("get_facility_leads_count", { p_facility_id: facility.id }),
          ]);

          const totalLeads = Number(leadsResult.data?.[0]?.total_count) || 0;

          // Get new leads count
          const { count: newCount } = await supabase
            .from("leads_provider_view")
            .select("id", { count: "exact", head: true })
            .eq("facility_id", facility.id)
            .eq("status", "new");

          return {
            id: facility.id,
            name: facility.name,
            status: facility.status,
            views: viewsResult.count ?? 0,
            leads: totalLeads,
            newLeads: newCount ?? 0,
          };
        })
      );

      return results;
    },
    enabled: facilities.length > 1,
    staleTime: 1000 * 60 * 3,
  });

  if (facilities.length <= 1) return null;

  const totalViews = summaries.reduce((sum, f) => sum + f.views, 0);
  const totalLeads = summaries.reduce((sum, f) => sum + f.leads, 0);
  const totalNew = summaries.reduce((sum, f) => sum + f.newLeads, 0);

  return (
    <Card>
      <CardHeader className="p-3.5 pb-2.5 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold">All Facilities</CardTitle>
            <Badge variant="secondary" className="text-xs">{facilities.length}</Badge>
          </div>
          <Button variant="ghost" size="sm" className="h-7 text-xs px-2.5" asChild>
            <Link to="/provider/analytics">
              Details <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-3.5">
        {/* Aggregated totals */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-bold text-foreground tabular-nums">{isLoading ? "…" : totalViews}</p>
            <p className="text-xs text-muted-foreground">Views</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-bold text-foreground tabular-nums">{isLoading ? "…" : totalLeads}</p>
            <p className="text-xs text-muted-foreground">Leads</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-bold text-foreground tabular-nums">{isLoading ? "…" : totalNew}</p>
            <p className="text-xs text-muted-foreground">New</p>
          </div>
        </div>

        {/* Per-facility breakdown */}
        <div className="space-y-1.5">
          {isLoading ? (
            Array.from({ length: facilities.length }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-lg" />
            ))
          ) : (
            summaries.map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Building2 className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-foreground truncate">{f.name}</p>
                    {f.status === "approved" ? (
                      <CheckCircle className="h-3 w-3 text-success shrink-0" />
                    ) : (
                      <Clock className="h-3 w-3 text-warning shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    <span className="flex items-center gap-0.5">
                      <Eye className="h-3 w-3" /> {f.views}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Users className="h-3 w-3" /> {f.leads}
                    </span>
                    {f.newLeads > 0 && (
                      <Badge variant="secondary" className="text-xs h-4 px-1 bg-success/10 text-success border-0">
                        {f.newLeads} new
                      </Badge>
                    )}
                  </div>
                </div>
                {f.views > 0 && (
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {f.leads > 0 ? `${Math.round((f.leads / f.views) * 100)}%` : "0%"}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

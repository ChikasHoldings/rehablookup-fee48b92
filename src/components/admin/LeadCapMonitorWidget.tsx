import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AlertTriangle, TrendingUp, ArrowUpRight, Users, Gauge } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

interface ProviderLeadUsage {
  facilityId: string;
  facilityName: string;
  userId: string;
  providerEmail: string;
  usedLeads: number;
  leadLimit: number;
  usagePercent: number;
  plan: string;
}

export default function LeadCapMonitorWidget() {
  const { data: providersAtRisk, isLoading } = useQuery<ProviderLeadUsage[]>({
    queryKey: ["admin-lead-cap-monitor"],
    queryFn: async () => {
      // Get all approved facilities with their user info
      const { data: facilities, error: facilitiesError } = await supabase
        .from("facilities")
        .select("id, name, user_id, email")
        .eq("status", "approved");

      if (facilitiesError || !facilities) {
        console.error("Error fetching facilities:", facilitiesError);
        return [];
      }

      // Get unique user IDs
      const userIds = [...new Set(facilities.map(f => f.user_id))];
      
      // Get profiles for emails
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, email")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.email]) || []);

      // Get start of current month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      // Get lead counts grouped by facility for this month
      const { data: leadCounts } = await supabase
        .from("leads")
        .select("facility_id")
        .gte("created_at", startOfMonth.toISOString());

      // Count leads per facility
      const leadCountMap = new Map<string, number>();
      leadCounts?.forEach(lead => {
        if (lead.facility_id) {
          leadCountMap.set(lead.facility_id, (leadCountMap.get(lead.facility_id) || 0) + 1);
        }
      });

      // Group facilities by user to aggregate leads across locations
      const userFacilitiesMap = new Map<string, { facilities: typeof facilities; totalLeads: number }>();
      
      facilities.forEach(facility => {
        const existing = userFacilitiesMap.get(facility.user_id) || { facilities: [], totalLeads: 0 };
        existing.facilities.push(facility);
        existing.totalLeads += leadCountMap.get(facility.id) || 0;
        userFacilitiesMap.set(facility.user_id, existing);
      });

      // Check subscriptions via edge function for each user
      const providersWithUsage: ProviderLeadUsage[] = [];
      
      for (const [userId, userData] of userFacilitiesMap) {
        const providerEmail = profileMap.get(userId);
        if (!providerEmail) continue;

        try {
          // Call get-facility-plan to get subscription info
          const { data: planData } = await supabase.functions.invoke("get-facility-plan", {
            body: { providerEmail }
          });

          if (!planData) continue;

          const leadLimit = planData.lead_limit || 0;
          if (leadLimit === 0) continue; // Skip basic plan (no limit)

          const usedLeads = userData.totalLeads;
          const usagePercent = Math.round((usedLeads / leadLimit) * 100);

          // Only include providers at 70%+ usage
          if (usagePercent >= 70) {
            providersWithUsage.push({
              facilityId: userData.facilities[0].id,
              facilityName: userData.facilities[0].name + (userData.facilities.length > 1 ? ` (+${userData.facilities.length - 1})` : ""),
              userId,
              providerEmail,
              usedLeads,
              leadLimit,
              usagePercent: Math.min(usagePercent, 100),
              plan: planData.plan || "professional",
            });
          }
        } catch (error) {
          console.error("Error checking plan for user:", userId, error);
        }
      }

      // Sort by usage percent descending
      return providersWithUsage.sort((a, b) => b.usagePercent - a.usagePercent);
    },
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  const getStatusBadge = (percent: number) => {
    if (percent >= 100) {
      return (
        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
          <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
          Limit Reached
        </Badge>
      );
    }
    if (percent >= 90) {
      return (
        <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/10 text-[10px] px-1.5 py-0">
          Critical
        </Badge>
      );
    }
    if (percent >= 80) {
      return (
        <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 text-[10px] px-1.5 py-0">
          Warning
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 text-[10px] px-1.5 py-0">
        Approaching
      </Badge>
    );
  };

  const getProgressColor = (percent: number) => {
    if (percent >= 100) return "[&>div]:bg-destructive";
    if (percent >= 90) return "[&>div]:bg-destructive";
    if (percent >= 80) return "[&>div]:bg-amber-500";
    return "[&>div]:bg-blue-500";
  };

  const atLimit = providersAtRisk?.filter(p => p.usagePercent >= 100).length || 0;
  const nearLimit = providersAtRisk?.filter(p => p.usagePercent >= 80 && p.usagePercent < 100).length || 0;

  return (
    <Card className="border-0 shadow-card bg-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-100 to-amber-50 flex items-center justify-center">
            <Gauge className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">Lead Cap Monitor</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Providers approaching or at their monthly limits
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="shadow-none" asChild>
          <Link to="/admin/providers">
            View All
            <ArrowUpRight className="h-3.5 w-3.5 ml-1.5" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {/* Summary badges */}
        {!isLoading && providersAtRisk && providersAtRisk.length > 0 && (
          <div className="flex gap-2 mb-4">
            {atLimit > 0 && (
              <div className="flex items-center gap-1.5 text-xs bg-destructive/10 text-destructive px-2.5 py-1 rounded-full">
                <AlertTriangle className="h-3 w-3" />
                <span className="font-medium">{atLimit} at limit</span>
              </div>
            )}
            {nearLimit > 0 && (
              <div className="flex items-center gap-1.5 text-xs bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full">
                <TrendingUp className="h-3 w-3" />
                <span className="font-medium">{nearLimit} near limit</span>
              </div>
            )}
          </div>
        )}

        {/* Providers list */}
        <div className="divide-y divide-border">
          {isLoading ? (
            <>
              {[1, 2, 3].map((i) => (
                <div key={i} className="py-3 first:pt-0">
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-3 w-full" />
                </div>
              ))}
            </>
          ) : providersAtRisk && providersAtRisk.length > 0 ? (
            providersAtRisk.slice(0, 5).map((provider) => (
              <div
                key={provider.userId}
                className="py-3 first:pt-0 last:pb-0 group"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-medium text-foreground truncate">
                      {provider.facilityName}
                    </span>
                    {getStatusBadge(provider.usagePercent)}
                  </div>
                  <Badge 
                    variant="outline" 
                    className={`text-[10px] capitalize shrink-0 ${
                      provider.plan === "featured" 
                        ? "border-amber-300 bg-amber-50 text-amber-700" 
                        : "border-blue-300 bg-blue-50 text-blue-700"
                    }`}
                  >
                    {provider.plan}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{provider.usedLeads} / {provider.leadLimit} leads</span>
                    <span className={provider.usagePercent >= 100 ? "text-destructive font-medium" : ""}>
                      {provider.usagePercent}%
                    </span>
                  </div>
                  <Progress 
                    value={provider.usagePercent} 
                    className={`h-1.5 ${getProgressColor(provider.usagePercent)}`}
                  />
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Users className="h-10 w-10 mb-2 opacity-40" />
              <p className="text-sm">No providers near their limits</p>
              <p className="text-xs mt-1">All providers have capacity for more leads</p>
            </div>
          )}
        </div>

        {/* Show more indicator */}
        {!isLoading && providersAtRisk && providersAtRisk.length > 5 && (
          <div className="pt-3 mt-3 border-t border-border">
            <Link 
              to="/admin/providers" 
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              +{providersAtRisk.length - 5} more providers near limits
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

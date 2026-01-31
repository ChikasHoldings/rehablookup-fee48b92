import { forwardRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AlertTriangle, TrendingDown, ArrowUpRight, Users, Wallet, CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

interface ProviderCreditStatus {
  facilityId: string;
  facilityName: string;
  userId: string;
  providerEmail: string;
  balanceCents: number;
  isPro: boolean;
  hasUnlockedRecently: boolean;
}

// Threshold for low credits warning (in cents)
const LOW_CREDIT_THRESHOLD_CENTS = 5000; // $50

const LowCreditMonitorWidget = forwardRef<HTMLDivElement>(function LowCreditMonitorWidget(_, ref) {
  const { data: lowCreditProviders, isLoading } = useQuery<ProviderCreditStatus[]>({
    queryKey: ["admin-low-credit-monitor"],
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

      // Get credit balances for all providers
      const { data: creditBalances } = await supabase
        .from("provider_credits")
        .select("provider_id, balance_cents")
        .in("provider_id", userIds);

      const creditMap = new Map(creditBalances?.map(c => [c.provider_id, c.balance_cents]) || []);

      // Get Pro subscription status
      const { data: proSubs } = await supabase
        .from("pro_subscriptions")
        .select("provider_id, status")
        .eq("status", "active")
        .in("provider_id", userIds);

      const proProviderIds = new Set(proSubs?.map(s => s.provider_id) || []);

      // Get recent unlock activity (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: recentUnlocks } = await supabase
        .from("lead_unlocks")
        .select("facility_id")
        .gte("unlocked_at", thirtyDaysAgo.toISOString());

      const facilityWithRecentUnlocks = new Set(recentUnlocks?.map(u => u.facility_id) || []);

      // Build provider credit status list
      const providersWithLowCredits: ProviderCreditStatus[] = [];
      
      // Group facilities by user
      const userFacilitiesMap = new Map<string, typeof facilities>();
      facilities.forEach(facility => {
        const existing = userFacilitiesMap.get(facility.user_id) || [];
        existing.push(facility);
        userFacilitiesMap.set(facility.user_id, existing);
      });

      for (const [userId, userFacilities] of userFacilitiesMap) {
        const providerEmail = profileMap.get(userId);
        if (!providerEmail) continue;

        const balanceCents = creditMap.get(userId) || 0;
        const isPro = proProviderIds.has(userId);
        const hasUnlockedRecently = userFacilities.some(f => facilityWithRecentUnlocks.has(f.id));

        // Only include providers with low credits who have been active
        if (balanceCents < LOW_CREDIT_THRESHOLD_CENTS && hasUnlockedRecently) {
          providersWithLowCredits.push({
            facilityId: userFacilities[0].id,
            facilityName: userFacilities[0].name + (userFacilities.length > 1 ? ` (+${userFacilities.length - 1})` : ""),
            userId,
            providerEmail,
            balanceCents,
            isPro,
            hasUnlockedRecently,
          });
        }
      }

      // Sort by balance ascending (lowest first)
      return providersWithLowCredits.sort((a, b) => a.balanceCents - b.balanceCents);
    },
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  const getStatusBadge = (balanceCents: number) => {
    if (balanceCents <= 0) {
      return (
        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
          <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
          No Credits
        </Badge>
      );
    }
    if (balanceCents < 2500) {
      return (
        <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/10 text-[10px] px-1.5 py-0">
          Critical
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 text-[10px] px-1.5 py-0">
        Low
      </Badge>
    );
  };

  const formatBalance = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const getProgressValue = (balanceCents: number) => {
    // Show progress as percentage of threshold
    return Math.min((balanceCents / LOW_CREDIT_THRESHOLD_CENTS) * 100, 100);
  };

  const getProgressColor = (balanceCents: number) => {
    if (balanceCents <= 0) return "[&>div]:bg-destructive";
    if (balanceCents < 2500) return "[&>div]:bg-destructive";
    return "[&>div]:bg-amber-500";
  };

  const noCredits = lowCreditProviders?.filter(p => p.balanceCents <= 0).length || 0;
  const lowCredits = lowCreditProviders?.filter(p => p.balanceCents > 0 && p.balanceCents < LOW_CREDIT_THRESHOLD_CENTS).length || 0;

  return (
    <Card ref={ref} className="border-0 shadow-card bg-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-100 to-amber-50 flex items-center justify-center">
            <Wallet className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">Low Credit Monitor</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Active providers with low credit balances
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
        {!isLoading && lowCreditProviders && lowCreditProviders.length > 0 && (
          <div className="flex gap-2 mb-4">
            {noCredits > 0 && (
              <div className="flex items-center gap-1.5 text-xs bg-destructive/10 text-destructive px-2.5 py-1 rounded-full">
                <AlertTriangle className="h-3 w-3" />
                <span className="font-medium">{noCredits} no credits</span>
              </div>
            )}
            {lowCredits > 0 && (
              <div className="flex items-center gap-1.5 text-xs bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full">
                <TrendingDown className="h-3 w-3" />
                <span className="font-medium">{lowCredits} low balance</span>
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
          ) : lowCreditProviders && lowCreditProviders.length > 0 ? (
            lowCreditProviders.slice(0, 5).map((provider) => (
              <div
                key={provider.userId}
                className="py-3 first:pt-0 last:pb-0 group"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-medium text-foreground truncate">
                      {provider.facilityName}
                    </span>
                    {getStatusBadge(provider.balanceCents)}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {provider.isPro && (
                      <Badge 
                        variant="outline" 
                        className="text-[10px] capitalize shrink-0 border-amber-300 bg-amber-50 text-amber-700"
                      >
                        Pro
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Balance: {formatBalance(provider.balanceCents)}</span>
                    <span className={provider.balanceCents <= 0 ? "text-destructive font-medium" : ""}>
                      {Math.round((provider.balanceCents / LOW_CREDIT_THRESHOLD_CENTS) * 100)}% of threshold
                    </span>
                  </div>
                  <Progress 
                    value={getProgressValue(provider.balanceCents)} 
                    className={`h-1.5 ${getProgressColor(provider.balanceCents)}`}
                  />
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <CreditCard className="h-10 w-10 mb-2 opacity-40" />
              <p className="text-sm">No providers with low credits</p>
              <p className="text-xs mt-1">All active providers have sufficient balance</p>
            </div>
          )}
        </div>

        {/* Show more indicator */}
        {!isLoading && lowCreditProviders && lowCreditProviders.length > 5 && (
          <div className="pt-3 mt-3 border-t border-border">
            <Link 
              to="/admin/providers" 
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              +{lowCreditProviders.length - 5} more providers with low credits
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

LowCreditMonitorWidget.displayName = "LowCreditMonitorWidget";

export default LowCreditMonitorWidget;

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  Phone,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { differenceInHours, startOfMonth, subMonths } from "date-fns";
import { cn } from "@/lib/utils";

interface LeadConversionWidgetProps {
  facilityIds: string[];
}

interface LeadStats {
  total: number;
  converted: number;
  contacted: number;
  avgResponseTimeHours: number;
  conversionRate: number;
  contactRate: number;
}

export function LeadConversionWidget({ facilityIds }: LeadConversionWidgetProps) {
  const { data: leads = [], isLoading, isError } = useQuery({
    queryKey: ["lead-conversion-stats", facilityIds],
    queryFn: async () => {
      if (facilityIds.length === 0) return [];
      
      const startOfLastMonth = startOfMonth(subMonths(new Date(), 1));
      
      const { data, error } = await supabase
        .from("leads")
        .select("id, status, created_at, assigned_at, qualified")
        .in("facility_id", facilityIds)
        .gte("created_at", startOfLastMonth.toISOString())
        .order("created_at", { ascending: false })
        .limit(500);
        
      if (error) {
        console.error("[LeadConversionWidget] Query error:", error);
        throw error;
      }
      return data || [];
    },
    enabled: facilityIds.length > 0,
    staleTime: 1000 * 60 * 5,
    retry: 2,
  });

  const stats = useMemo(() => {
    const now = new Date();
    const startOfCurrentMonth = startOfMonth(now);
    
    // Split leads by month
    const currentMonthLeads = leads.filter(l => new Date(l.created_at) >= startOfCurrentMonth);
    const lastMonthLeads = leads.filter(l => new Date(l.created_at) < startOfCurrentMonth);
    
    const calculateStats = (leadsList: typeof leads): LeadStats => {
      const total = leadsList.length;
      if (total === 0) return { 
        total: 0, 
        converted: 0, 
        contacted: 0, 
        avgResponseTimeHours: 0, 
        conversionRate: 0,
        contactRate: 0 
      };
      
      const converted = leadsList.filter(l => l.status === "converted").length;
      const contacted = leadsList.filter(l => 
        ["contacted", "converted", "qualified", "in_progress"].includes(l.status)
      ).length;
      
      // Calculate response time for leads that have been contacted
      const respondedLeads = leadsList.filter(l => 
        l.assigned_at && ["contacted", "converted", "qualified", "in_progress"].includes(l.status)
      );
      
      const totalResponseTime = respondedLeads.reduce((acc, lead) => {
        const created = new Date(lead.created_at);
        const responded = new Date(lead.assigned_at!);
        return acc + differenceInHours(responded, created);
      }, 0);
      
      const avgResponseTimeHours = respondedLeads.length > 0 
        ? Math.round(totalResponseTime / respondedLeads.length) 
        : 0;
      
      return {
        total,
        converted,
        contacted,
        avgResponseTimeHours,
        conversionRate: Math.round((converted / total) * 100),
        contactRate: Math.round((contacted / total) * 100),
      };
    };
    
    const current = calculateStats(currentMonthLeads);
    const last = calculateStats(lastMonthLeads);
    
    // Calculate trends
    const conversionTrend = last.conversionRate > 0 
      ? current.conversionRate - last.conversionRate 
      : current.conversionRate > 0 ? 100 : 0;
      
    const contactTrend = last.contactRate > 0 
      ? current.contactRate - last.contactRate 
      : current.contactRate > 0 ? 100 : 0;
    
    return {
      current,
      last,
      conversionTrend,
      contactTrend,
    };
  }, [leads]);

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <ArrowUpRight className="h-3 w-3" />;
    if (trend < 0) return <ArrowDownRight className="h-3 w-3" />;
    return <Minus className="h-3 w-3" />;
  };

  const getTrendColor = (trend: number) => {
    if (trend > 0) return "text-emerald-600";
    if (trend < 0) return "text-red-600";
    return "text-muted-foreground";
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Lead Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Lead Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">Unable to load performance data</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Lead Performance
        </CardTitle>
        <p className="text-xs text-muted-foreground">This month vs last month</p>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Conversion Rate */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Conversion Rate</span>
              <span className={cn("text-xs font-medium flex items-center gap-0.5", getTrendColor(stats.conversionTrend))}>
                {getTrendIcon(stats.conversionTrend)}
                {Math.abs(stats.conversionTrend)}%
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold">{stats.current.conversionRate}%</span>
            </div>
            <Progress 
              value={stats.current.conversionRate} 
              className="h-1.5 [&>div]:bg-emerald-500" 
            />
            <p className="text-xs text-muted-foreground">
              {stats.current.converted} of {stats.current.total} converted
            </p>
          </div>

          {/* Contact Rate */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Contact Rate</span>
              <span className={cn("text-xs font-medium flex items-center gap-0.5", getTrendColor(stats.contactTrend))}>
                {getTrendIcon(stats.contactTrend)}
                {Math.abs(stats.contactTrend)}%
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold">{stats.current.contactRate}%</span>
            </div>
            <Progress 
              value={stats.current.contactRate} 
              className="h-1.5 [&>div]:bg-blue-500" 
            />
            <p className="text-xs text-muted-foreground">
              {stats.current.contacted} of {stats.current.total} contacted
            </p>
          </div>
        </div>

        {/* Response Time */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/50">
          <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground">Avg. Response Time</p>
            <p className="text-lg font-bold">
              {stats.current.avgResponseTimeHours === 0 
                ? "—" 
                : stats.current.avgResponseTimeHours < 24 
                  ? `${stats.current.avgResponseTimeHours}h`
                  : `${Math.round(stats.current.avgResponseTimeHours / 24)}d`
              }
            </p>
          </div>
          {stats.current.avgResponseTimeHours > 0 && stats.current.avgResponseTimeHours <= 24 && (
            <div className="px-2 py-1 rounded bg-emerald-100 dark:bg-emerald-950">
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Good</span>
            </div>
          )}
          {stats.current.avgResponseTimeHours > 24 && (
            <div className="px-2 py-1 rounded bg-amber-100 dark:bg-amber-950">
              <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Improve</span>
            </div>
          )}
        </div>

        {/* Quick Tips */}
        {stats.current.total > 0 && stats.current.contactRate < 80 && (
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/10">
            <Phone className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="font-medium text-foreground">Tip:</span> Contacting leads within 5 minutes increases conversion rates by up to 400%.
            </p>
          </div>
        )}

        {stats.current.total === 0 && (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">No leads this month yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

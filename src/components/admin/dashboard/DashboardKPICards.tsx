import { memo, forwardRef, Ref } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Activity,
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface TrendDataPoint {
  date: string;
  value: number;
}

interface SparklineProps {
  data: TrendDataPoint[];
  color?: string;
  height?: number;
}

const Sparkline = memo(forwardRef<HTMLDivElement, SparklineProps>(function Sparkline({ 
  data, 
  color = "hsl(var(--primary))", 
  height = 40 
}, ref) {
  if (!data || data.length === 0) return null;
  const gradientId = `sparkline-gradient-${color.replace(/[^a-zA-Z0-9]/g, '')}`;
  
  return (
    <div ref={ref} className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#${gradientId})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}));

interface RevenueStats {
  monthlyRevenue: number;
  previousMonthRevenue: number;
  percentChange: number;
  activeSubscriptions: number;
  totalCustomers: number;
  configured: boolean;
}

interface ProviderStats {
  total: number;
  approved: number;
  pending: number;
  suspended: number;
  pro: number;
  placement: number;
  featured?: number;
  verified?: number;
}

interface LeadStats {
  totalMonth: number;
  totalAll: number;
  verified: number;
  verificationRate: number;
  newLeads: number;
  unlockedMonth: number;
  unlockedAll: number;
  unlockRevenueMonth: number;
  unlockRate: number;
  assigned?: number;
}

interface WeeklyTrends {
  leads: TrendDataPoint[];
  providers: TrendDataPoint[];
}

interface DashboardKPICardsProps {
  revenueStats?: RevenueStats;
  providerStats?: ProviderStats;
  leadStats?: LeadStats;
  weeklyTrends?: WeeklyTrends;
  loadingRevenue: boolean;
  loadingProviders: boolean;
  loadingLeads: boolean;
}

// Semantic chart colors using CSS variables
const CHART_COLORS = {
  primary: "hsl(var(--primary))",
  success: "hsl(var(--success, 142 71% 45%))",
  warning: "hsl(var(--warning, 45 93% 47%))",
  info: "hsl(var(--info, 217 91% 60%))",
  accent: "hsl(var(--accent))",
  muted: "hsl(var(--muted-foreground))",
};

export const DashboardKPICards = forwardRef<HTMLDivElement, DashboardKPICardsProps>(
  function DashboardKPICards({
    revenueStats,
    providerStats,
    leadStats,
    weeklyTrends,
    loadingRevenue,
    loadingProviders,
    loadingLeads,
  }, ref) {
  // Action items: pending providers + new (unprocessed) leads
  const actionItemsCount = (providerStats?.pending || 0) + (leadStats?.newLeads || 0);
  
  // Calculate total revenue: Stripe revenue + lead unlock revenue this month
  const totalMonthlyRevenue = (revenueStats?.monthlyRevenue || 0) + ((leadStats?.unlockRevenueMonth || 0) / 100);

  return (
    <div ref={ref} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Revenue - Combined from Stripe + Lead Unlocks */}
      <Card className="border-0 bg-primary text-primary-foreground shadow-md overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium opacity-90 truncate pr-2">Monthly Revenue</CardTitle>
          <DollarSign className="h-4 w-4 opacity-70 shrink-0" />
        </CardHeader>
        <CardContent className="min-h-[60px]">
          {loadingRevenue || loadingLeads ? (
            <Skeleton className="h-8 w-24 bg-white/20" />
          ) : (
            <>
              <div className="text-2xl font-bold truncate">
                ${totalMonthlyRevenue?.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || "0"}
              </div>
              <p className="text-xs opacity-70 mt-1 flex items-center gap-1 truncate">
                {revenueStats?.percentChange && revenueStats.percentChange >= 0 ? (
                  <TrendingUp className="h-3 w-3 shrink-0" />
                ) : (
                  <TrendingDown className="h-3 w-3 shrink-0" />
                )}
                <span className="truncate">
                  {revenueStats?.percentChange ? `${revenueStats.percentChange >= 0 ? "+" : ""}${revenueStats.percentChange}%` : "—"} vs last month
                </span>
              </p>
              {leadStats?.unlockRevenueMonth ? (
                <p className="text-[10px] opacity-60 mt-0.5">
                  Incl. ${(leadStats.unlockRevenueMonth / 100).toLocaleString()} lead unlocks
                </p>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      {/* Providers - Show Pro/Placement breakdown */}
      <Card className="border shadow-sm overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium text-muted-foreground truncate pr-2">Providers</CardTitle>
          <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
        </CardHeader>
        <CardContent className="pb-0 min-h-[40px]">
          {loadingProviders ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <>
              <div className="text-2xl font-bold tabular-nums">{providerStats?.total?.toLocaleString()}</div>
              <div className="flex gap-2 text-[10px] text-muted-foreground mt-0.5">
                <span className="text-success">{providerStats?.pro || 0} Pro</span>
                <span>•</span>
                <span className="text-info">{providerStats?.placement || 0} Placement</span>
              </div>
            </>
          )}
        </CardContent>
        {weeklyTrends?.providers && (
          <div className="mt-2 -mx-6 -mb-6">
            <Sparkline data={weeklyTrends.providers} color={CHART_COLORS.info} height={40} />
          </div>
        )}
      </Card>

      {/* Leads - Show unlock metrics */}
      <Card className="border shadow-sm overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium text-muted-foreground truncate pr-2">Leads</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground shrink-0" />
        </CardHeader>
        <CardContent className="pb-0 min-h-[40px]">
          {loadingLeads ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <>
              <div className="text-2xl font-bold tabular-nums">{leadStats?.totalAll?.toLocaleString()}</div>
              <div className="flex gap-2 text-[10px] text-muted-foreground mt-0.5">
                <span>{leadStats?.totalMonth?.toLocaleString()} this month</span>
                <span>•</span>
                <span className="text-success">{leadStats?.unlockedMonth || 0} unlocked</span>
              </div>
            </>
          )}
        </CardContent>
        {weeklyTrends?.leads && (
          <div className="mt-2 -mx-6 -mb-6">
            <Sparkline data={weeklyTrends.leads} color={CHART_COLORS.accent} height={40} />
          </div>
        )}
      </Card>

      {/* Actions Needed */}
      <Card className={`border shadow-sm overflow-hidden ${actionItemsCount > 0 ? "border-warning/50 bg-warning/5" : ""}`}>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium text-muted-foreground truncate pr-2">Actions Needed</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground shrink-0" />
        </CardHeader>
        <CardContent className="min-h-[60px]">
          {loadingProviders || loadingLeads ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <>
              <div className="text-2xl font-bold tabular-nums">{actionItemsCount}</div>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {providerStats?.pending ? (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 bg-warning/20 text-warning-foreground hover:bg-warning/20 whitespace-nowrap">
                    {providerStats.pending} pending
                  </Badge>
                ) : null}
                {leadStats?.newLeads ? (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 bg-info/20 text-info-foreground hover:bg-info/20 whitespace-nowrap">
                    {leadStats.newLeads} new
                  </Badge>
                ) : null}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
});

DashboardKPICards.displayName = "DashboardKPICards";

import React from "react";
import { 
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  TrendingUp, 
  Users, 
  Target,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  PieChartIcon,
  Star,
  Share2,
  Lock,
  Building2,
} from "lucide-react";
import { useCentralizedLeadAnalytics } from "@/hooks/useCentralizedLeadAnalytics";
import { useSubscription, PLAN_DETAILS } from "@/hooks/useSubscription";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { type DateRange } from "@/hooks/useLeadAnalytics";

interface CentralizedLeadAnalyticsDashboardProps {
  dateRange?: DateRange;
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

const STATUS_COLORS: Record<string, string> = {
  New: "hsl(217, 91%, 60%)",
  Contacted: "hsl(38, 92%, 50%)",
  Qualified: "hsl(280, 65%, 60%)",
  Converted: "hsl(142, 71%, 45%)",
  Lost: "hsl(0, 84%, 60%)",
};

const STATUS_BG_COLORS: Record<string, string> = {
  New: "bg-blue-500/10 text-blue-600 border-blue-200",
  Contacted: "bg-amber-500/10 text-amber-600 border-amber-200",
  Qualified: "bg-purple-500/10 text-purple-600 border-purple-200",
  Converted: "bg-green-500/10 text-green-600 border-green-200",
  Lost: "bg-red-500/10 text-red-600 border-red-200",
};

export function CentralizedLeadAnalyticsDashboard({ dateRange }: CentralizedLeadAnalyticsDashboardProps) {
  const { data: analytics, isLoading } = useCentralizedLeadAnalytics(dateRange);
  const { data: subscription } = useSubscription();

  const plan = subscription?.plan || 'basic';
  const planDetails = PLAN_DETAILS[plan] || PLAN_DETAILS.basic;
  const isExclusivePlan = plan === 'featured';

  if (isLoading) {
    return <AnalyticsSkeleton />;
  }

  if (!analytics || analytics.totalLeads === 0) {
    return <EmptyAnalytics />;
  }

  const conversionRate = analytics.totalLeads > 0 
    ? Math.round((analytics.conversionFunnel.converted / analytics.totalLeads) * 100)
    : 0;

  const leadCapPercentage = Math.round(((analytics.leadCap - analytics.leadsRemaining) / analytics.leadCap) * 100);
  const isAtCap = analytics.leadsRemaining === 0;
  const hasMultipleFacilities = analytics.facilityBreakdown.length > 1;

  return (
    <div className="space-y-6">
      {/* Account Lead Cap & Plan Indicator */}
      <Card className={isAtCap ? "border-red-300 bg-red-50/50" : "border-primary/20"}>
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-xl ${isExclusivePlan ? "bg-amber-500/10" : "bg-primary/10"} flex items-center justify-center`}>
                {isExclusivePlan ? (
                  <Star className="h-5 w-5 text-amber-600" />
                ) : (
                  <Share2 className="h-5 w-5 text-primary" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">{planDetails.name} Plan</span>
                  <Badge variant="outline" className={isExclusivePlan ? "bg-amber-100 text-amber-700 border-amber-300" : "bg-blue-100 text-blue-700 border-blue-300"}>
                    {isExclusivePlan ? (
                      <><Lock className="h-3 w-3 mr-1" /> Exclusive Leads</>
                    ) : (
                      <><Share2 className="h-3 w-3 mr-1" /> Shared Leads</>
                    )}
                  </Badge>
                  {hasMultipleFacilities && (
                    <Badge variant="secondary" className="gap-1">
                      <Building2 className="h-3 w-3" />
                      {analytics.facilityBreakdown.length} Locations
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isExclusivePlan 
                    ? "All leads are delivered exclusively to you" 
                    : "Leads may be shared with up to one other provider"}
                </p>
              </div>
            </div>
            <div className="sm:text-right">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-foreground">
                  {analytics.leadCap - analytics.leadsRemaining}
                </span>
                <span className="text-muted-foreground">/ {analytics.leadCap}</span>
              </div>
              <p className="text-xs text-muted-foreground">Account leads this billing cycle</p>
              <div className="mt-2 w-full sm:w-40">
                <Progress 
                  value={leadCapPercentage} 
                  className={`h-2 ${isAtCap ? "[&>div]:bg-red-500" : ""}`} 
                />
              </div>
              {isAtCap && (
                <p className="text-xs text-red-600 font-medium mt-1">Lead cap reached</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Per-Facility Breakdown (if multiple) */}
      {hasMultipleFacilities && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Leads by Location</CardTitle>
                <CardDescription className="text-xs">Performance breakdown per facility</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {analytics.facilityBreakdown.map((facility) => (
                <div
                  key={facility.facilityId}
                  className="p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm text-foreground truncate">{facility.facilityName}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {facility.totalLeads} total
                        </Badge>
                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                          {facility.convertedLeads} converted
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-foreground">{facility.thisMonthLeads}</p>
                      <p className="text-[10px] text-muted-foreground">this month</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Leads"
          value={analytics.totalLeads}
          icon={Users}
          trend={analytics.growthRate}
          subtitle={hasMultipleFacilities ? "Across all locations" : "All time"}
          iconBg="bg-blue-500/10"
          iconColor="text-blue-600"
        />
        <StatCard
          title="This Month"
          value={analytics.thisMonthLeads}
          icon={TrendingUp}
          trend={analytics.growthRate}
          subtitle={`vs ${analytics.lastMonthLeads} last month`}
          iconBg="bg-green-500/10"
          iconColor="text-green-600"
        />
        <StatCard
          title="Conversion Rate"
          value={`${conversionRate}%`}
          icon={Target}
          subtitle={`${analytics.conversionFunnel.converted} converted`}
          iconBg="bg-purple-500/10"
          iconColor="text-purple-600"
        />
        <StatCard
          title="Leads Remaining"
          value={analytics.leadsRemaining}
          icon={Zap}
          subtitle={isAtCap ? "Cap reached" : `${leadCapPercentage}% used this cycle`}
          iconBg={isAtCap ? "bg-red-500/10" : "bg-amber-500/10"}
          iconColor={isAtCap ? "text-red-600" : "text-amber-600"}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Monthly Trend */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BarChart3 className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Lead Trends</CardTitle>
                  <CardDescription className="text-xs">
                    {hasMultipleFacilities ? "Combined monthly volume" : "Monthly lead volume over time"}
                  </CardDescription>
                </div>
              </div>
              {analytics.growthRate !== 0 && (
                <Badge 
                  variant="outline" 
                  className={analytics.growthRate > 0 
                    ? "bg-green-500/10 text-green-600 border-green-200" 
                    : "bg-red-500/10 text-red-600 border-red-200"
                  }
                >
                  {analytics.growthRate > 0 ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                  {Math.abs(analytics.growthRate)}% vs last month
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.monthlyTrends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="leadGradientCentral" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                  <XAxis 
                    dataKey="month" 
                    className="text-xs fill-muted-foreground"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis 
                    className="text-xs fill-muted-foreground"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11 }}
                    width={30}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                    formatter={(value: number) => [`${value} leads`, "Leads"]}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="leads" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2.5}
                    fill="url(#leadGradientCentral)"
                    dot={{ fill: "hsl(var(--primary))", strokeWidth: 0, r: 4 }}
                    activeDot={{ r: 6, fill: "hsl(var(--primary))", stroke: "hsl(var(--background))", strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Status Breakdown */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <PieChartIcon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Lead Status</CardTitle>
                <CardDescription className="text-xs">Current distribution</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.statusBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="count"
                    nameKey="status"
                  >
                    {analytics.statusBreakdown.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={STATUS_COLORS[entry.status] || COLORS[index % COLORS.length]}
                        stroke="hsl(var(--background))"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    }}
                    formatter={(value: number, name: string) => [`${value} leads (${analytics.statusBreakdown.find(s => s.status === name)?.percentage || 0}%)`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-2 mt-2 justify-center">
              {analytics.statusBreakdown.map((entry) => (
                <Badge 
                  key={entry.status} 
                  variant="outline" 
                  className={`text-[10px] px-2 py-0.5 ${STATUS_BG_COLORS[entry.status] || ""}`}
                >
                  {entry.status}: {entry.count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conversion Funnel */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Target className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <CardTitle className="text-base">Conversion Funnel</CardTitle>
              <CardDescription className="text-xs">
                {hasMultipleFacilities ? "Combined lead progression" : "Lead progression stages"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "New", value: analytics.conversionFunnel.new, color: "bg-blue-500", textColor: "text-blue-600" },
              { label: "Contacted", value: analytics.conversionFunnel.contacted, color: "bg-amber-500", textColor: "text-amber-600" },
              { label: "Qualified", value: analytics.conversionFunnel.qualified, color: "bg-purple-500", textColor: "text-purple-600" },
              { label: "Converted", value: analytics.conversionFunnel.converted, color: "bg-green-500", textColor: "text-green-600" },
            ].map((stage) => {
              const maxValue = Math.max(
                analytics.conversionFunnel.new,
                analytics.conversionFunnel.contacted,
                analytics.conversionFunnel.qualified,
                analytics.conversionFunnel.converted,
                1
              );
              const percentage = Math.round((stage.value / maxValue) * 100);
              
              return (
                <div key={stage.label} className="text-center">
                  <div className={`text-2xl font-bold ${stage.textColor}`}>{stage.value}</div>
                  <div className="text-xs text-muted-foreground mb-2">{stage.label}</div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${stage.color} transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: number;
  subtitle?: string;
  iconBg: string;
  iconColor: string;
}

function StatCard({ title, value, icon: Icon, trend, subtitle, iconBg, iconColor }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className={`h-10 w-10 rounded-xl ${iconBg} flex items-center justify-center`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
          {trend !== undefined && trend !== 0 && (
            <Badge 
              variant="outline" 
              className={trend > 0 
                ? "bg-green-500/10 text-green-600 border-green-200 text-[10px] px-1.5" 
                : "bg-red-500/10 text-red-600 border-red-200 text-[10px] px-1.5"
              }
            >
              {trend > 0 ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
              {Math.abs(trend)}%
            </Badge>
          )}
        </div>
        <div className="mt-3">
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{title}</p>
          {subtitle && (
            <p className="text-[10px] text-muted-foreground/70 mt-1">{subtitle}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-24 w-full" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-5">
        <Skeleton className="h-80 lg:col-span-3" />
        <Skeleton className="h-80 lg:col-span-2" />
      </div>
    </div>
  );
}

function EmptyAnalytics() {
  return (
    <Card className="py-12">
      <CardContent className="flex flex-col items-center justify-center text-center">
        <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <Users className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">No Lead Data Yet</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Once you start receiving leads, you'll see detailed analytics here including trends, 
          conversion rates, and performance metrics across all your locations.
        </p>
      </CardContent>
    </Card>
  );
}

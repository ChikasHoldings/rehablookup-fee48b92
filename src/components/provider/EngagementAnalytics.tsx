import { 
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Phone, 
  Globe,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  MousePointerClick,
  Eye,
  LayoutList,
  Users,
} from "lucide-react";
import { useInteractionAnalytics } from "@/hooks/useInteractionAnalytics";
import { useProviderEventAnalytics } from "@/hooks/useProviderEventAnalytics";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { type DateRange } from "@/hooks/useLeadAnalytics";

interface EngagementAnalyticsProps {
  facilityId: string | undefined;
  dateRange?: DateRange;
}

export function EngagementAnalytics({ facilityId, dateRange }: EngagementAnalyticsProps) {
  const { data: legacyAnalytics, isLoading: legacyLoading } = useInteractionAnalytics(facilityId, dateRange);
  const { data: eventAnalytics, isLoading: eventLoading } = useProviderEventAnalytics(facilityId, dateRange);

  const isLoading = legacyLoading || eventLoading;

  if (isLoading) {
    return <EngagementSkeleton />;
  }

  const hasLegacyData = legacyAnalytics && (legacyAnalytics.totalCalls > 0 || legacyAnalytics.totalWebsiteClicks > 0);
  const hasEventData = eventAnalytics && (
    eventAnalytics.totalImpressions > 0 || 
    eventAnalytics.totalProfileViews > 0 || 
    eventAnalytics.totalClickToCalls > 0 || 
    eventAnalytics.totalWebsiteClicks > 0
  );

  if (!hasLegacyData && !hasEventData) {
    return <EmptyEngagement />;
  }

  // Merge data - prefer new event analytics when available
  const totalCalls = eventAnalytics?.periodClickToCalls || legacyAnalytics?.totalCalls || 0;
  const totalWebsite = eventAnalytics?.periodWebsiteClicks || legacyAnalytics?.totalWebsiteClicks || 0;
  const callGrowth = eventAnalytics?.clickToCallGrowth || legacyAnalytics?.callGrowthRate || 0;
  const websiteGrowth = eventAnalytics?.websiteClickGrowth || legacyAnalytics?.websiteGrowthRate || 0;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* New: Impressions */}
        <StatCard
          title="Listing Impressions"
          value={eventAnalytics?.periodImpressions || 0}
          icon={LayoutList}
          trend={eventAnalytics?.impressionGrowth}
          subtitle="Times shown in search results"
          iconBg="bg-indigo-500/10"
          iconColor="text-indigo-600"
        />
        {/* New: Profile Views */}
        <StatCard
          title="Profile Views"
          value={eventAnalytics?.periodProfileViews || 0}
          icon={Users}
          trend={eventAnalytics?.profileViewGrowth}
          subtitle="Unique profile page visits"
          iconBg="bg-purple-500/10"
          iconColor="text-purple-600"
        />
        <StatCard
          title="Call Clicks"
          value={totalCalls}
          icon={Phone}
          trend={callGrowth}
          subtitle="'Call Now' button clicks"
          iconBg="bg-green-500/10"
          iconColor="text-green-600"
        />
        <StatCard
          title="Website Clicks"
          value={totalWebsite}
          icon={Globe}
          trend={websiteGrowth}
          subtitle="'Visit Website' clicks"
          iconBg="bg-blue-500/10"
          iconColor="text-blue-600"
        />
      </div>

      {/* Conversion Rates */}
      {eventAnalytics && (eventAnalytics.periodImpressions > 0 || eventAnalytics.periodProfileViews > 0) && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Impression → View Rate</p>
                  <p className="text-2xl font-bold text-foreground">{eventAnalytics.impressionToViewRate}%</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                  <Eye className="h-5 w-5 text-indigo-600" />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground/70 mt-1">
                % of impressions that led to profile views
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">View → Call Rate</p>
                  <p className="text-2xl font-bold text-foreground">{eventAnalytics.viewToCallRate}%</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <Phone className="h-5 w-5 text-green-600" />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground/70 mt-1">
                % of profile views that led to calls
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">View → Website Rate</p>
                  <p className="text-2xl font-bold text-foreground">{eventAnalytics.viewToWebsiteRate}%</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Globe className="h-5 w-5 text-blue-600" />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground/70 mt-1">
                % of profile views that clicked website
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Combined Trend Chart */}
        {eventAnalytics && eventAnalytics.dailyTrends.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Engagement Funnel</CardTitle>
                    <CardDescription className="text-xs">Daily impressions, views, and interactions</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
                    <span className="text-xs text-muted-foreground">Impressions</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-purple-500" />
                    <span className="text-xs text-muted-foreground">Views</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                    <span className="text-xs text-muted-foreground">Calls</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={eventAnalytics.dailyTrends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="impressionGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(239, 84%, 67%)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(239, 84%, 67%)" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="viewGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(271, 91%, 65%)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(271, 91%, 65%)" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="callGradientNew" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      className="text-xs fill-muted-foreground"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 10 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis 
                      className="text-xs fill-muted-foreground"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11 }}
                      width={30}
                      allowDecimals={false}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))", 
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      }}
                      labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="impressions" 
                      name="Impressions"
                      stroke="hsl(239, 84%, 67%)" 
                      strokeWidth={2}
                      fill="url(#impressionGradient)"
                      dot={false}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="profileViews" 
                      name="Profile Views"
                      stroke="hsl(271, 91%, 65%)" 
                      strokeWidth={2}
                      fill="url(#viewGradient)"
                      dot={false}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="clickToCalls" 
                      name="Call Clicks"
                      stroke="hsl(142, 71%, 45%)" 
                      strokeWidth={2}
                      fill="url(#callGradientNew)"
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Legacy Call Trends Bar Chart - fallback */}
        {!eventAnalytics?.dailyTrends.length && legacyAnalytics && (
          <>
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <Phone className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Call Click Distribution</CardTitle>
                    <CardDescription className="text-xs">Daily 'Call Now' clicks</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={legacyAnalytics.callTrends.slice(-14)} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                      <XAxis 
                        dataKey="date" 
                        className="text-xs fill-muted-foreground"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis 
                        className="text-xs fill-muted-foreground"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11 }}
                        width={25}
                        allowDecimals={false}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--card))", 
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                        formatter={(value: number) => [`${value} clicks`, "Calls"]}
                      />
                      <Bar 
                        dataKey="count" 
                        fill="hsl(142, 71%, 45%)" 
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Globe className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Website Click Distribution</CardTitle>
                    <CardDescription className="text-xs">Daily 'Visit Website' clicks</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={legacyAnalytics.websiteTrends.slice(-14)} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                      <XAxis 
                        dataKey="date" 
                        className="text-xs fill-muted-foreground"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis 
                        className="text-xs fill-muted-foreground"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11 }}
                        width={25}
                        allowDecimals={false}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--card))", 
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                        formatter={(value: number) => [`${value} clicks`, "Website"]}
                      />
                      <Bar 
                        dataKey="count" 
                        fill="hsl(217, 91%, 60%)" 
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
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

function EngagementSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <Skeleton className="h-8 w-20 mt-3" />
              <Skeleton className="h-4 w-24 mt-1" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyEngagement() {
  return (
    <Card className="py-12">
      <CardContent className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <MousePointerClick className="h-7 w-7 text-muted-foreground" />
        </div>
        <h3 className="font-display text-lg font-semibold text-foreground mb-2">
          No Engagement Data Yet
        </h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          When visitors view your listing, visit your profile, click "Call Now" or "Visit Website", 
          you'll see detailed engagement analytics here.
        </p>
      </CardContent>
    </Card>
  );
}

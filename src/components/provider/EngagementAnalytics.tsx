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
  Legend,
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
} from "lucide-react";
import { useInteractionAnalytics } from "@/hooks/useInteractionAnalytics";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { type DateRange } from "@/hooks/useLeadAnalytics";

interface EngagementAnalyticsProps {
  facilityId: string | undefined;
  dateRange?: DateRange;
}

export function EngagementAnalytics({ facilityId, dateRange }: EngagementAnalyticsProps) {
  const { data: analytics, isLoading } = useInteractionAnalytics(facilityId, dateRange);

  if (isLoading) {
    return <EngagementSkeleton />;
  }

  if (!analytics || (analytics.totalCalls === 0 && analytics.totalWebsiteClicks === 0)) {
    return <EmptyEngagement />;
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Call Clicks"
          value={analytics.totalCalls}
          icon={Phone}
          trend={analytics.callGrowthRate}
          subtitle="Total 'Call Now' clicks"
          iconBg="bg-green-500/10"
          iconColor="text-green-600"
        />
        <StatCard
          title="Website Clicks"
          value={analytics.totalWebsiteClicks}
          icon={Globe}
          trend={analytics.websiteGrowthRate}
          subtitle="Total 'Visit Website' clicks"
          iconBg="bg-blue-500/10"
          iconColor="text-blue-600"
        />
        <StatCard
          title="This Month Calls"
          value={analytics.thisMonthCalls}
          icon={TrendingUp}
          trend={analytics.callGrowthRate}
          subtitle={`vs ${analytics.lastMonthCalls} last month`}
          iconBg="bg-purple-500/10"
          iconColor="text-purple-600"
        />
        <StatCard
          title="This Month Website"
          value={analytics.thisMonthWebsite}
          icon={MousePointerClick}
          trend={analytics.websiteGrowthRate}
          subtitle={`vs ${analytics.lastMonthWebsite} last month`}
          iconBg="bg-amber-500/10"
          iconColor="text-amber-600"
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Combined Trend Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Eye className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Engagement Trends</CardTitle>
                  <CardDescription className="text-xs">Last 30 days call and website clicks</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                  <span className="text-xs text-muted-foreground">Calls</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                  <span className="text-xs text-muted-foreground">Website</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.combinedTrends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="callGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="websiteGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0}/>
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
                    dataKey="calls" 
                    name="Call Clicks"
                    stroke="hsl(142, 71%, 45%)" 
                    strokeWidth={2}
                    fill="url(#callGradient)"
                    dot={false}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="website" 
                    name="Website Clicks"
                    stroke="hsl(217, 91%, 60%)" 
                    strokeWidth={2}
                    fill="url(#websiteGradient)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Call Trends Bar Chart */}
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
                <BarChart data={analytics.callTrends.slice(-14)} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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

        {/* Website Trends Bar Chart */}
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
                <BarChart data={analytics.websiteTrends.slice(-14)} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
          When visitors click "Call Now" or "Visit Website" on your public profile, 
          you'll see detailed engagement analytics here.
        </p>
      </CardContent>
    </Card>
  );
}

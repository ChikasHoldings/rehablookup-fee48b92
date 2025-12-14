import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Clock, 
  CheckCircle,
  Phone,
  Mail,
  BarChart3,
  PieChartIcon,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";
import { useLeadAnalytics } from "@/hooks/useLeadAnalytics";
import { Skeleton } from "@/components/ui/skeleton";

interface LeadAnalyticsDashboardProps {
  facilityId: string | undefined;
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

const STATUS_COLORS: Record<string, string> = {
  New: "hsl(var(--chart-1))",
  Contacted: "hsl(var(--chart-2))",
  Qualified: "hsl(var(--chart-3))",
  Converted: "hsl(var(--chart-4))",
  Lost: "hsl(var(--chart-5))",
};

export function LeadAnalyticsDashboard({ facilityId }: LeadAnalyticsDashboardProps) {
  const { data: analytics, isLoading } = useLeadAnalytics(facilityId);

  if (isLoading) {
    return <AnalyticsSkeleton />;
  }

  if (!analytics || analytics.totalLeads === 0) {
    return <EmptyAnalytics />;
  }

  const conversionRate = analytics.totalLeads > 0 
    ? Math.round((analytics.conversionFunnel.converted / analytics.totalLeads) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          title="Total Leads"
          value={analytics.totalLeads}
          icon={Users}
          trend={analytics.growthRate}
          subtitle="All time"
        />
        <StatCard
          title="This Month"
          value={analytics.thisMonthLeads}
          icon={TrendingUp}
          trend={analytics.growthRate}
          subtitle={`vs ${analytics.lastMonthLeads} last month`}
        />
        <StatCard
          title="Conversion Rate"
          value={`${conversionRate}%`}
          icon={CheckCircle}
          subtitle={`${analytics.conversionFunnel.converted} converted`}
        />
        <StatCard
          title="Avg Response Time"
          value={`${analytics.responseMetrics.avgResponseTime}h`}
          icon={Clock}
          subtitle="To first contact"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Monthly Trend */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Lead Trends</CardTitle>
            </div>
            <CardDescription>Monthly lead volume over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.monthlyTrends}>
                  <defs>
                    <linearGradient id="leadGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="month" 
                    className="text-xs fill-muted-foreground"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    className="text-xs fill-muted-foreground"
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="leads" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    fill="url(#leadGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Status Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Lead Status</CardTitle>
            </div>
            <CardDescription>Current status distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] flex items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.statusBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="count"
                    nameKey="status"
                    label={({ status, percentage }) => `${status} ${percentage}%`}
                    labelLine={false}
                  >
                    {analytics.statusBreakdown.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={STATUS_COLORS[entry.status] || COLORS[index % COLORS.length]} 
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Conversion Funnel */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Conversion Funnel</CardTitle>
            <CardDescription>Lead progression stages</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { label: "New", value: analytics.conversionFunnel.new, color: "bg-blue-500" },
                { label: "Contacted", value: analytics.conversionFunnel.contacted, color: "bg-amber-500" },
                { label: "Qualified", value: analytics.conversionFunnel.qualified, color: "bg-purple-500" },
                { label: "Converted", value: analytics.conversionFunnel.converted, color: "bg-green-500" },
              ].map((stage, index) => {
                const maxValue = Math.max(
                  analytics.conversionFunnel.new,
                  analytics.conversionFunnel.contacted,
                  analytics.conversionFunnel.qualified,
                  analytics.conversionFunnel.converted,
                  1
                );
                const width = (stage.value / maxValue) * 100;
                
                return (
                  <div key={stage.label} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{stage.label}</span>
                      <span className="font-medium">{stage.value}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${stage.color} transition-all duration-500`}
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Response Time */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Response Times</CardTitle>
            <CardDescription>How quickly you respond</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Within 24h</span>
                </div>
                <span className="font-semibold text-green-600">
                  {analytics.responseMetrics.respondedWithin24h}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-600" />
                  <span className="text-sm">24-48h</span>
                </div>
                <span className="font-semibold text-amber-600">
                  {analytics.responseMetrics.respondedWithin48h}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/10">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-destructive" />
                  <span className="text-sm">Not Responded</span>
                </div>
                <span className="font-semibold text-destructive">
                  {analytics.responseMetrics.notResponded}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Preference */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Contact Preference</CardTitle>
            <CardDescription>How leads want to be contacted</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.contactPreference} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                  <XAxis type="number" className="text-xs fill-muted-foreground" />
                  <YAxis 
                    type="category" 
                    dataKey="method" 
                    className="text-xs fill-muted-foreground"
                    width={80}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar 
                    dataKey="count" 
                    fill="hsl(var(--primary))" 
                    radius={[0, 4, 4, 0]}
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
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  trend?: number;
  subtitle?: string;
}

function StatCard({ title, value, icon: Icon, trend, subtitle }: StatCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            {trend !== undefined && (
              <div className={`flex items-center gap-1 text-xs font-medium ${
                trend > 0 ? "text-green-600" : trend < 0 ? "text-destructive" : "text-muted-foreground"
              }`}>
                {trend > 0 ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : trend < 0 ? (
                  <ArrowDownRight className="h-3 w-3" />
                ) : (
                  <Minus className="h-3 w-3" />
                )}
                {Math.abs(trend)}%
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[250px] w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[250px] w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EmptyAnalytics() {
  return (
    <Card className="border-dashed">
      <CardContent className="py-16 text-center">
        <div className="h-16 w-16 rounded-xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
          <BarChart3 className="h-8 w-8 text-muted-foreground/40" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">No analytics yet</h3>
        <p className="text-muted-foreground mt-2 max-w-md mx-auto">
          Analytics will appear here once you start receiving leads. 
          Make sure your listing is complete and approved to attract inquiries.
        </p>
      </CardContent>
    </Card>
  );
}
